
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
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
import { Loader2, AlertCircle, Info, RotateCcw, KeyRound, ServerCrash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


export default function MediSearchApp() {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("en");
  const [t, setT] = useState<TranslationKeys>(getTranslations("en"));
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Medicine[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [aiConfigError, setAiConfigError] = useState<string | null>(null);
  const [aiConfigErrorType, setAiConfigErrorType] = useState<'key_missing' | 'api_fail' | null>(null);
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
    setAiConfigError(null);
    setAiConfigErrorType(null);
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
    setAiConfigError(null); 
    setAiConfigErrorType(null);
    setSearchResults(null);
    setSearchAttempted(true);
    setShowSuggestions(false);
    let aiEnhancedSearchTerm = termToSearch.trim();
    let aiEnhancementSource: EnhanceMedicineSearchOutput['source'] = 'original_query_used';


    try {
      setLoadingMessage(t.loadingAi);
      console.log(`performSearchLogic: Calling enhanceMedicineSearch with query: "${termToSearch}"`);
      const aiEnhanceResponse = await enhanceMedicineSearch({ query: termToSearch });
      console.log(`performSearchLogic: enhanceMedicineSearch response:`, aiEnhanceResponse);
      aiEnhancementSource = aiEnhanceResponse.source || 'ai_failed';

      if (aiEnhanceResponse && aiEnhanceResponse.correctedMedicineName && aiEnhanceResponse.correctedMedicineName.trim() !== '') {
        if (aiEnhanceResponse.source === 'ai_enhanced') {
          aiEnhancedSearchTerm = aiEnhanceResponse.correctedMedicineName;
          toast({
            title: t.appName,
            description: t.searchWithAiResult(aiEnhancedSearchTerm),
            action: <Info className="h-5 w-5 text-primary" />,
          });
        } else if (aiEnhanceResponse.source === 'original_query_used') {
           toast({ title: t.appName, description: t.errorAiEnhancementSkipped, variant: "default" });
           aiEnhancedSearchTerm = aiEnhanceResponse.correctedMedicineName; 
        } else { 
           toast({ title: t.appName, description: t.errorAi, variant: "default" });
           aiEnhancedSearchTerm = termToSearch; 
        }
      } else {
        toast({ title: t.appName, description: t.errorAi, variant: "default" });
        aiEnhancedSearchTerm = termToSearch;
        aiEnhancementSource = 'ai_failed';
      }
    } catch (aiError: unknown) { 
      let message = "AI enhancement failed. Using original query.";
      if (aiError instanceof Error) message = `${message} Details: ${aiError.message}`;
      console.error("AI enhancement critical failure (medisearch-app.tsx):", aiError);
      toast({
        title: t.appName,
        description: message,
        variant: "destructive"
      });
      aiEnhancedSearchTerm = termToSearch; 
      aiEnhancementSource = 'ai_failed';
    }

    setLoadingMessage(t.loadingData);
    console.log(`performSearchLogic: Calling fetchMedicineByName with term: "${aiEnhancedSearchTerm}"`);
    const dbDataArray = await fetchMedicineByName(aiEnhancedSearchTerm);
    console.log(`performSearchLogic: fetchMedicineByName response:`, dbDataArray);

    try {
      let processedMedicines: Medicine[] = [];
      if (dbDataArray.length > 0) {
        setLoadingMessage(t.loadingAiDetails + ` (${dbDataArray.length} item(s))`);
        const medicinePromises = dbDataArray.map(dbItem =>
          generateMedicineDetails({ 
            searchTermOrName: dbItem.name, 
            language: selectedLanguage,
            contextName: dbItem.name,
            contextComposition: dbItem.composition,
            contextBarcode: dbItem.barcode,
          }).then(aiDetails => {
            console.log(`performSearchLogic: generateMedicineDetails response for ${dbItem.name}:`, aiDetails);
            return { 
              id: dbItem.id,
              name: aiDetails.name, 
              composition: aiDetails.composition, 
              barcode: aiDetails.barcode, 
              usage: aiDetails.usage,
              manufacturer: aiDetails.manufacturer,
              dosage: aiDetails.dosage,
              sideEffects: aiDetails.sideEffects,
              source: aiDetails.source, 
            };
          })
          .catch(err => { 
            let errMessage = t.infoNotAvailable;
            if (err instanceof Error) errMessage = err.message;
            console.error(`Critical error during generateMedicineDetails promise for ${dbItem.name} (medisearch-app.tsx):`, err);
            toast({
              title: `AI Error for ${dbItem.name}`,
              description: `${t.errorAiDetailsShort} ${errMessage}`,
              variant: "destructive"
            });
            return { 
              id: dbItem.id,
              name: dbItem.name,
              composition: dbItem.composition || t.infoNotAvailable,
              barcode: dbItem.barcode,
              usage: t.infoNotAvailable,
              manufacturer: t.infoNotAvailable,
              dosage: t.infoNotAvailable,
              sideEffects: t.infoNotAvailable,
              source: 'database_only' as const, 
            };
          })
        );
        processedMedicines = await Promise.all(medicinePromises);
      } else {
        setLoadingMessage(t.loadingAiDetails);
        toast({ title: t.appName, description: t.notFoundInDbAiGenerating,  action: <Info className="h-5 w-5 text-primary" /> });
        console.log(`performSearchLogic: No DB data for "${aiEnhancedSearchTerm}". Calling generateMedicineDetails for pure AI generation.`);
        const aiDetails = await generateMedicineDetails({
          searchTermOrName: aiEnhancedSearchTerm, 
          language: selectedLanguage,
        });
        console.log(`performSearchLogic: generateMedicineDetails (pure AI) response:`, aiDetails);
        
        processedMedicines = [{
          id: `ai-${aiEnhancedSearchTerm.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
          name: aiDetails.name,
          composition: aiDetails.composition,
          barcode: aiDetails.barcode,
          usage: aiDetails.usage,
          manufacturer: aiDetails.manufacturer,
          dosage: aiDetails.dosage,
          sideEffects: aiDetails.sideEffects,
          source: aiDetails.source,
        }];
      }
      setSearchResults(processedMedicines);

      const anyAiUnavailable = processedMedicines.some(med => med.source === 'ai_unavailable') || aiEnhancementSource === 'ai_unavailable';
      const anyAiFailed = processedMedicines.some(med => med.source === 'ai_failed') || aiEnhancementSource === 'ai_failed';
      
      if (anyAiUnavailable) {
        setAiConfigError(t.errorAiNotConfigured);
        setAiConfigErrorType('key_missing');
      } else if (anyAiFailed && !anyAiUnavailable) { // only show general API fail if not specific key_missing
        setAiConfigError(t.errorAiFailed);
        setAiConfigErrorType('api_fail');
      }


    } catch (dataProcessingError: unknown) { 
      let errorMessage = t.errorData;
      if (dataProcessingError instanceof Error) {
        errorMessage = `${t.errorData} Details: ${dataProcessingError.message}`;
      }
      console.error("Data processing or DB fetch failed (medisearch-app.tsx):", dataProcessingError);
      setError(errorMessage);
      toast({ title: t.appName, description: errorMessage, variant: "destructive" });

      if (dbDataArray.length > 0 && (!searchResults || searchResults.every(r => r.source === 'database_only'))) {
         setSearchResults(dbDataArray.map(dbItem => ({
            id: dbItem.id,
            name: dbItem.name,
            composition: dbItem.composition || t.infoNotAvailable,
            barcode: dbItem.barcode,
            usage: t.infoNotAvailable,
            manufacturer: t.infoNotAvailable,
            dosage: t.infoNotAvailable,
            sideEffects: t.infoNotAvailable,
            source: 'database_only' as const,
        })));
        setError(null); 
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
      if (aiConfigError) {
        setAiConfigError(null);
        setAiConfigErrorType(null);
      }
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
        <div className="flex items-center justify-center mb-8 space-x-3 text-primary">
            <Image 
                src="/images/logo_transparent.png" 
                alt="WellMeds Logo" 
                width={280} // Adjust width as needed
                height={80} // Adjust height to maintain aspect ratio
                priority // Load the logo faster
                className="object-contain"
            />
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

        {aiConfigError && !isLoading && (
          <Alert variant="destructive" className="w-full max-w-lg shadow-md">
            {aiConfigErrorType === 'key_missing' ? <KeyRound className="h-5 w-5" /> : <ServerCrash className="h-5 w-5" />}
            <AlertTitle>{aiConfigErrorType === 'key_missing' ? t.errorAiNotConfiguredTitle : t.errorAiFailedTitle}</AlertTitle>
            <AlertDescription>
              {aiConfigError}
              {aiConfigErrorType === 'key_missing' && (
                <p className="mt-2 text-xs">
                  {t.errorAiNotConfiguredDetail}
                </p>
              )}
               {aiConfigErrorType === 'api_fail' && (
                <p className="mt-2 text-xs">
                 {t.errorAiFailedDetail}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

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

        {!isLoading && !error && searchResults && searchResults.length === 0 && searchAttempted && !aiConfigError && (
            <Alert className="w-full max-w-lg shadow-md">
                <Info className="h-5 w-5" />
                <AlertTitle>{t.noResultsTitle}</AlertTitle>
                <AlertDescription>{t.noResults}</AlertDescription>
            </Alert>
        )}


        {!isLoading && !searchAttempted && !aiConfigError && (
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
declare global {
  interface EnhanceMedicineSearchOutput {
    correctedMedicineName: string;
    source?: 'ai_enhanced' | 'ai_unavailable' | 'ai_failed' | 'original_query_used';
  }
}
