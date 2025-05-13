"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { Language, Medicine } from "@/types";
import { getTranslations, type TranslationKeys } from "@/lib/translations";
import { enhanceMedicineSearch } from "@/ai/flows/enhance-medicine-search";
import { generateMedicineDetails } from "@/ai/flows/generate-medicine-details";
import { fetchMedicineByName, fetchSuggestions } from "@/lib/mockApi";
import { LanguageSelector } from "@/components/medisearch/LanguageSelector";
import { SearchBar } from "@/components/medisearch/SearchBar";
import { MedicineCard } from "@/components/medisearch/MedicineCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Info, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const pillIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(180, 100%, 25.1%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>`;


export default function MediSearchApp() {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("en");
  const [t, setT] = useState<TranslationKeys>(getTranslations("en"));
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Medicine[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [searchAttempted, setSearchAttempted] = useState<boolean>(false);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    setT(getTranslations(selectedLanguage));
    document.documentElement.lang = selectedLanguage;
  }, [selectedLanguage]);

  const handleLanguageChange = useCallback((lang: Language) => {
    setSelectedLanguage(lang);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults(null);
    setError(null);
    setSearchAttempted(false);
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  const performSearchLogic = async (termToSearch: string) => {
    if (!termToSearch.trim()) {
      handleClearSearch();
      return;
    }

    setIsLoading(true);
    setError(null);
    setSearchResults(null);
    setSearchAttempted(true);
    setShowSuggestions(false);
    let aiEnhancedSearchTerm = termToSearch.trim();

    try {
      setLoadingMessage(t.loadingAi);
      const aiEnhanceResponse = await enhanceMedicineSearch({ query: termToSearch });
      if (aiEnhanceResponse && aiEnhanceResponse.correctedMedicineName) {
        aiEnhancedSearchTerm = aiEnhanceResponse.correctedMedicineName;
        toast({
          title: t.appName,
          description: t.searchWithAiResult(aiEnhancedSearchTerm),
          action: <Info className="h-5 w-5 text-primary" />,
        });
      } else {
        // This case means enhanceMedicineSearch returned a fallback (original query) due to an internal error or AI unavailability.
        // The flow wrapper for enhanceMedicineSearch already console.warns/errors.
        toast({ title: t.appName, description: t.errorAi, variant: "default" }); // Use default variant as it's a soft failure
      }
    } catch (aiError: unknown) { // Catch errors if enhanceMedicineSearch itself throws unexpectedly
      let message = "AI enhancement failed. Using original query.";
      if (aiError instanceof Error) message = `${message} Details: ${aiError.message}`;
      console.error("AI enhancement critical failure:", aiError);
      toast({
        title: t.appName,
        description: message,
        variant: "destructive"
      });
    }

    setLoadingMessage(t.loadingData);
    const dbDataArray = await fetchMedicineByName(aiEnhancedSearchTerm);

    try {
      if (dbDataArray.length > 0) {
        setLoadingMessage(t.loadingAiDetails + ` (${dbDataArray.length} item(s))`);
        const medicinePromises = dbDataArray.map(dbItem =>
          generateMedicineDetails({ // This function is expected to resolve, even on internal AI failure, with fallback data
            searchTermOrName: dbItem.name, 
            language: selectedLanguage,
            contextName: dbItem.name,
            contextComposition: dbItem.composition,
            contextBarcode: dbItem.barcode,
          }).then(aiDetails => ({ 
            id: dbItem.id,
            name: aiDetails.name, 
            composition: aiDetails.composition, 
            barcode: aiDetails.barcode, 
            usage: aiDetails.usage,
            manufacturer: aiDetails.manufacturer,
            dosage: aiDetails.dosage,
            sideEffects: aiDetails.sideEffects,
            source: aiDetails.source, 
          }))
          // This catch is for *unexpected* rejections from generateMedicineDetails, 
          // which shouldn't happen if its wrapper is correct.
          .catch(err => { 
            let errMessage = t.infoNotAvailable;
            if (err instanceof Error) errMessage = err.message;
            console.error(`Critical error during generateMedicineDetails promise for ${dbItem.name}:`, err);
            toast({
              title: `AI Error for ${dbItem.name}`,
              description: `${t.errorAiDetailsShort} ${errMessage}`,
              variant: "destructive"
            });
            return { 
              id: dbItem.id,
              name: dbItem.name,
              composition: dbItem.composition,
              barcode: dbItem.barcode,
              usage: t.infoNotAvailable,
              manufacturer: t.infoNotAvailable,
              dosage: t.infoNotAvailable,
              sideEffects: t.infoNotAvailable,
              source: 'database_only' as const,
            };
          })
        );
        const detailedMedicines = await Promise.all(medicinePromises);
        setSearchResults(detailedMedicines);
      } else {
        setLoadingMessage(t.loadingAiDetails);
        toast({ title: t.appName, description: t.notFoundInDbAiGenerating,  action: <Info className="h-5 w-5 text-primary" /> });
        
        // generateMedicineDetails should always resolve with a GenerateMedicineDetailsOutput object
        const aiDetails = await generateMedicineDetails({
          searchTermOrName: aiEnhancedSearchTerm, 
          language: selectedLanguage,
        });
        
        setSearchResults([{
          id: `ai-${aiEnhancedSearchTerm.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
          name: aiDetails.name,
          composition: aiDetails.composition,
          barcode: aiDetails.barcode,
          usage: aiDetails.usage,
          manufacturer: aiDetails.manufacturer,
          dosage: aiDetails.dosage,
          sideEffects: aiDetails.sideEffects,
          source: aiDetails.source,
        }]);
      }
    } catch (dataProcessingError: unknown) { 
      let errorMessage = t.errorData;
      if (dataProcessingError instanceof Error) {
        errorMessage = `${t.errorData} Details: ${dataProcessingError.message}`;
      }
      console.error("Data processing or DB fetch failed:", dataProcessingError);
      setError(errorMessage);
      toast({ title: t.appName, description: errorMessage, variant: "destructive" });

      // Fallback to show DB data if AI details part failed but DB data was retrieved
      if (dbDataArray.length > 0 && (!searchResults || searchResults.every(r => r.source === 'database_only'))) {
         setSearchResults(dbDataArray.map(dbItem => ({
            id: dbItem.id,
            name: dbItem.name,
            composition: dbItem.composition,
            barcode: dbItem.barcode,
            usage: t.infoNotAvailable,
            manufacturer: t.infoNotAvailable,
            dosage: t.infoNotAvailable,
            sideEffects: t.infoNotAvailable,
            source: 'database_only' as const,
        })));
        setError(null); // Clear general error if we are showing partial data
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handleSearchSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await performSearchLogic(searchQuery);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    await performSearchLogic(suggestion);
  };

  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (query.length > 1) {
      debounceTimeoutRef.current = setTimeout(async () => {
        const fetchedSuggestions = await fetchSuggestions(query);
        setSuggestions(fetchedSuggestions);
        setShowSuggestions(fetchedSuggestions.length > 0);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleInputFocus = () => {
    if (searchQuery.length > 1 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150); 
  };


  return (
    <div className="flex flex-col items-center min-h-screen bg-background">
      <header className="w-full p-4 flex justify-end sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <LanguageSelector
          selectedLanguage={selectedLanguage}
          onLanguageChange={handleLanguageChange}
          t={t}
        />
      </header>

      <main className="w-full max-w-lg flex flex-col items-center space-y-6 px-4 pb-8 pt-2 sm:pt-6">
        <div className="flex items-center justify-center mb-8 space-x-2 text-primary">
          <div dangerouslySetInnerHTML={{ __html: pillIconSvg.replace('stroke="hsl(180, 100%, 25.1%)"', 'stroke="currentColor"') }} className="h-10 w-10 sm:h-12 sm:w-12" />
          <h1 className="text-4xl sm:text-5xl font-bold ">{t.appName}</h1>
        </div>

        <section className="w-full p-6 bg-card rounded-xl shadow-2xl">
          <h2 className="text-2xl font-semibold text-center mb-6 text-foreground">{t.searchTitle}</h2>
          <SearchBar
            searchQuery={searchQuery}
            onSearchQueryChange={handleSearchQueryChange}
            onSubmit={handleSearchSubmit}
            isLoading={isLoading}
            t={t}
            suggestions={suggestions}
            showSuggestions={showSuggestions}
            onSuggestionClick={handleSuggestionClick}
            onInputFocus={handleInputFocus}
            onInputBlur={handleInputBlur}
          />
        </section>

        {searchAttempted && !isLoading && (
          <Button variant="outline" onClick={handleClearSearch} className="self-center shadow-sm hover:shadow-md transition-shadow">
            <RotateCcw className="mr-2 h-4 w-4" />
            {t.clearSearchButton}
          </Button>
        )}

        {isLoading && (
          <div className="flex flex-col items-center space-y-2 p-4 text-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg">{loadingMessage || t.loadingData}</p>
          </div>
        )}

        {error && !isLoading && (
          <Alert variant="destructive" className="w-full max-w-lg shadow-md">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>{t.errorOccurred}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && searchResults && searchResults.length > 0 && (
          <section className="w-full mt-0 animate-fadeIn space-y-6">
            {searchResults.map(medicine => (
              <MedicineCard key={medicine.id} medicine={medicine} t={t} />
            ))}
          </section>
        )}

        {!isLoading && !error && searchResults && searchResults.length === 0 && searchAttempted && (
            <Alert className="w-full max-w-lg shadow-md">
                <Info className="h-5 w-5" />
                <AlertTitle>{t.noResultsTitle}</AlertTitle>
                <AlertDescription>{t.noResults}</AlertDescription>
            </Alert>
        )}


        {!isLoading && !searchAttempted && (
            <div className="text-center p-4 text-muted-foreground">
                {t.initialHelperText}
            </div>
        )}

      </main>

      <footer className="mt-auto pt-8 pb-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} {t.appName}. {t.allRightsReserved}</p>
      </footer>
       <style jsx global>{`
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

