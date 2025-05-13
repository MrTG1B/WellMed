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
import Image from "next/image";

export default function MediSearchApp() {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("en");
  const [t, setT] = useState<TranslationKeys>(getTranslations("en"));
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Medicine[] | null>(null); // Changed to array
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
    setShowSuggestions(false); // Hide suggestions once search starts
    let aiEnhancedSearchTerm = termToSearch.trim();

    try {
      setLoadingMessage(t.loadingAi);
      const aiEnhanceResponse = await enhanceMedicineSearch({ query: termToSearch });
      if (aiEnhanceResponse && aiEnhanceResponse.correctedMedicineName) {
        aiEnhancedSearchTerm = aiEnhanceResponse.correctedMedicineName;
        toast({
          title: t.appName,
          description: t.searchWithAiResult(aiEnhancedSearchTerm),
          action: <Info className="h-5 w-5 text-blue-500" />,
        });
      } else {
        toast({ title: t.appName, description: t.errorAi, variant: "destructive" });
      }
    } catch (aiError) {
      console.error("AI enhancement failed:", aiError);
      toast({ title: t.appName, description: t.errorAi, variant: "destructive" });
    }

    setLoadingMessage(t.loadingData);
    const dbDataArray = await fetchMedicineByName(aiEnhancedSearchTerm);

    try {
      if (dbDataArray.length > 0) {
        setLoadingMessage(t.loadingAiDetails + ` (${dbDataArray.length} item(s))`);
        const medicinePromises = dbDataArray.map(dbItem =>
          generateMedicineDetails({
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
            source: 'database_ai_enhanced' as const,
          }))
          .catch(err => { // Handle individual AI generation failure
            console.error(`AI details generation failed for ${dbItem.name}:`, err);
            toast({ title: `AI Error for ${dbItem.name}`, description: t.errorAiDetailsShort, variant: "destructive" });
            return { // Fallback to DB data only
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
        toast({ title: t.appName, description: t.notFoundInDbAiGenerating,  action: <Info className="h-5 w-5 text-blue-500" /> });
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
          source: 'ai_generated' as const,
        }]);
      }
    } catch (flowError) {
      console.error("Main AI details generation failed:", flowError);
      setError(t.errorAiDetails);
      toast({ title: t.appName, description: t.errorAiDetails, variant: "destructive" });
      // Fallback for general AI failure after DB search, might already be handled by individual catches
      if (dbDataArray.length > 0 && (!searchResults || searchResults.every(r => r.source === 'database_only'))) {
         // If all results are already db_only due to individual errors, no need to reset
      } else if (dbDataArray.length > 0) {
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
      }
      setError(null); // Clear major error if showing partial data
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
      }, 300); // 300ms debounce
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
    // Delay hiding suggestions to allow click event on suggestion items
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  };


  return (
    <div className="flex flex-col items-center min-h-screen p-4 pt-8 sm:p-6 md:p-8 bg-background">
      <header className="w-full max-w-4xl mb-8 flex flex-col sm:flex-row justify-between items-center">
        <div className="flex items-center space-x-3 mb-4 sm:mb-0">
          <Image src="https://picsum.photos/64/64" alt="MediSearch Logo" width={48} height={48} className="rounded-lg" data-ai-hint="medical logo" />
          <h1 className="text-3xl sm:text-4xl font-bold text-primary">{t.appName}</h1>
        </div>
        <LanguageSelector
          selectedLanguage={selectedLanguage}
          onLanguageChange={handleLanguageChange}
          t={t}
        />
      </header>

      <main className="w-full max-w-lg flex flex-col items-center space-y-6">
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

      <footer className="mt-auto pt-8 text-center text-sm text-muted-foreground">
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
