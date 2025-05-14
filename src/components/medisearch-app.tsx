
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import type { Language, Medicine } from "@/types";
import { getTranslations, type TranslationKeys } from "@/lib/translations";
import { enhanceMedicineSearch, type EnhanceMedicineSearchOutput } from "@/ai/flows/enhance-medicine-search";
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
      console.log(`performSearchLogic: enhanceMedicineSearch response:`, JSON.stringify(aiEnhanceResponse, null, 2));
      aiEnhancementSource = aiEnhanceResponse.source || 'ai_failed';

      if (aiEnhanceResponse && aiEnhanceResponse.correctedMedicineName && aiEnhanceResponse.correctedMedicineName.trim() !== '') {
        aiEnhancedSearchTerm = aiEnhanceResponse.correctedMedicineName.trim();
        if (aiEnhanceResponse.source === 'ai_enhanced') {
          toast({
            title: t.appName,
            description: t.searchWithAiResult(aiEnhancedSearchTerm),
            action: <Info className="h-5 w-5 text-primary" />,
          });
        } else if (aiEnhanceResponse.source === 'original_query_used') {
           toast({ title: t.appName, description: t.errorAiEnhancementSkipped, variant: "default" });
        } else if (aiEnhanceResponse.source === 'ai_unavailable') {
            setAiConfigError(t.errorAiNotConfigured);
            setAiConfigErrorType('key_missing');
            toast({ title: t.appName, description: t.errorAiNotConfigured, variant: "destructive" });
        } else { // 'ai_failed' or unexpected value
           toast({ title: t.appName, description: t.errorAi, variant: "destructive" });
           setAiConfigError(t.errorAiFailed);
           setAiConfigErrorType('api_fail');
        }
      } else { // AI enhancement returned nothing valid or failed to produce a corrected name
        toast({ title: t.appName, description: t.errorAi, variant: "destructive" });
        aiEnhancedSearchTerm = termToSearch.trim();
        aiEnhancementSource = 'ai_failed'; // Mark as failed if no valid corrected name
        setAiConfigError(t.errorAiFailed);
        setAiConfigErrorType('api_fail');
      }
    } catch (aiError: any) {
      let message = t.errorAi;
      let errorCauseDetails = '';
       if (aiError?.message) {
          // Prefer the message from the error object if available and more specific
          if (aiError.message.includes('API key not valid') || aiError.message.includes('API_KEY_INVALID') || aiError.message.includes('User location is not supported')) {
              message = t.errorAiNotConfigured;
              setAiConfigError(t.errorAiNotConfigured);
              setAiConfigErrorType('key_missing');
          } else if (aiError.message.includes('server error') || aiError.message.includes('internal error') || aiError.message.includes('flow execution failed')) {
              // Generic AI server-side failure
              message = t.errorAiFailed;
              setAiConfigError(t.errorAiFailed);
              setAiConfigErrorType('api_fail');
          } else {
             message = `${t.errorAi} Details: ${aiError.message}`;
          }
      }
      if (aiError?.cause?.message) { // Sometimes the root cause is nested
        errorCauseDetails = ` (Cause: ${aiError.cause.message})`;
        if (aiError.cause.message.includes('API key not valid') || aiError.cause.message.includes('API_KEY_INVALID') || aiError.cause.message.includes('User location is not supported')) {
            message = t.errorAiNotConfigured; // Overwrite generic message if cause is specific
            setAiConfigError(t.errorAiNotConfigured);
            setAiConfigErrorType('key_missing');
        }
      }
      console.error(`AI enhancement critical failure (medisearch-app.tsx): Query: "${termToSearch}", Error: ${aiError.message || aiError}${errorCauseDetails}`, aiError);
      toast({
        title: t.appName,
        description: message,
        variant: "destructive"
      });
      aiEnhancedSearchTerm = termToSearch.trim(); // Fallback to original term
      aiEnhancementSource = 'ai_failed'; // Ensure this is set
      if (!aiConfigErrorType) { // If not already set by more specific checks
          setAiConfigError(message); // Use the determined message
          setAiConfigErrorType('api_fail'); // Default to api_fail if not key_missing
      }
    }

    setLoadingMessage(t.loadingData);
    console.log(`performSearchLogic: Calling fetchMedicineByName with term: "${aiEnhancedSearchTerm}"`);
    
    try {
      const dbDataArray = await fetchMedicineByName(aiEnhancedSearchTerm);
      console.log(`performSearchLogic: fetchMedicineByName response (found ${dbDataArray.length} items):`, JSON.stringify(dbDataArray, null, 2));

      let processedMedicines: Medicine[] = [];
      if (dbDataArray.length > 0) {
        processedMedicines = dbDataArray.map(dbItem => ({
          id: dbItem.id,
          name: dbItem.name,
          composition: dbItem.composition || t.infoNotAvailable,
          barcode: dbItem.barcode,
          usage: t.infoNotAvailable, 
          manufacturer: t.infoNotAvailable, 
          dosage: t.infoNotAvailable, 
          sideEffects: t.infoNotAvailable, 
          source: 'database_only' as const, 
        }));
      }
      
      setSearchResults(processedMedicines);

      if (aiEnhancementSource === 'ai_unavailable' && !aiConfigError) {
        setAiConfigError(t.errorAiNotConfigured);
        setAiConfigErrorType('key_missing');
      } else if (aiEnhancementSource === 'ai_failed' && !aiConfigError) {
        setAiConfigError(t.errorAiFailed);
        setAiConfigErrorType('api_fail');
      }

    } catch (dataProcessingError: any) {
      let errorMessage = t.errorData;
      let errorCauseDetails = '';
      if (dataProcessingError?.message) {
        errorMessage = `${t.errorData} Details: ${dataProcessingError.message}`;
      }
      if (dataProcessingError?.cause?.message) {
        errorCauseDetails = ` (Cause: ${dataProcessingError.cause.message})`;
      }
      console.error(`Data processing failed (medisearch-app.tsx): Query: "${aiEnhancedSearchTerm}", Error: ${dataProcessingError.message || dataProcessingError}${errorCauseDetails}`, dataProcessingError);
      setError(errorMessage);
      toast({ title: t.appName, description: errorMessage, variant: "destructive" });
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
        <div className="flex items-center justify-center"> {/* Removed negative margins and mb-1, space-x-3 */}
             <Image
                src="/images/logo_transparent.png"
                alt="WellMeds Logo"
                width={320} 
                height={320} 
                priority
                className="object-contain"
                data-ai-hint="logo health"
            />
        </div>

        <section className="w-full p-6 bg-card rounded-xl shadow-2xl"> {/* Removed negative margins */}
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

