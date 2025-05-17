
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import type { Language, Medicine } from "@/types";
import { getTranslations, type TranslationKeys } from "@/lib/translations";
import { enhanceMedicineSearch, type EnhanceMedicineSearchOutput } from "@/ai/flows/enhance-medicine-search";
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
  const [aiConfigErrorType, setAiConfigErrorType] = useState<'key_or_model' | 'api_fail' | null>(null);
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
      const aiEnhanceResponse = await enhanceMedicineSearch({ query: termToSearch });
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
            setAiConfigError(t.errorAiNotConfiguredOrModel);
            setAiConfigErrorType('key_or_model');
            toast({ title: t.appName, description: t.errorAiNotConfiguredOrModel, variant: "destructive" });
        } else {
           toast({ title: t.appName, description: t.errorAi, variant: "destructive" });
           setAiConfigError(t.errorAiFailed);
           setAiConfigErrorType('api_fail');
        }
      } else {
        toast({ title: t.appName, description: t.errorAi, variant: "destructive" });
        aiEnhancedSearchTerm = termToSearch.trim();
        aiEnhancementSource = 'ai_failed';
        setAiConfigError(t.errorAiFailed);
        setAiConfigErrorType('api_fail');
      }
    } catch (aiError: any) {
      let message = t.errorAi;
      let toastVariant: "default" | "destructive" = "destructive";

      console.error(`[MediSearchApp] AI enhancement critical failure. Query: "${termToSearch}"`);
      console.error(`[MediSearchApp] Error Message: ${aiError?.message || 'No message'}`);
      console.error(`[MediSearchApp] Error Stack: ${aiError?.stack || 'No stack'}`);
      console.error(`[MediSearchApp] Full Error Object:`, aiError);


      if (aiError?.message) {
          if (aiError.message.includes('API key not valid') || aiError.message.includes('API_KEY_INVALID') || aiError.message.includes('User location is not supported') || aiError.message.includes('permission') || aiError.message.includes('denied') || aiError.message.includes('model not found') || aiError.message.includes('Could not find model') || aiError.message.includes('404 Not Found') || aiError.message.includes('gemini-1.5-flash-latest') || aiError.message.includes('gemini-pro') ) {
              message = t.errorAiNotConfiguredOrModel;
              setAiConfigError(t.errorAiNotConfiguredOrModel);
              setAiConfigErrorType('key_or_model');
          } else if (aiError.message.includes('server error') || aiError.message.includes('internal error') || aiError.message.includes('flow execution failed')) {
              message = t.errorAiFailed;
              setAiConfigError(t.errorAiFailed);
              setAiConfigErrorType('api_fail');
          } else {
             message = `${t.errorAi} Details: ${aiError.message}`;
             if (!aiConfigErrorType) {
                setAiConfigError(message);
                setAiConfigErrorType('api_fail');
             }
          }
      } else {
         if (!aiConfigErrorType) {
            setAiConfigError(message);
            setAiConfigErrorType('api_fail');
         }
      }

      toast({
        title: t.appName,
        description: message,
        variant: toastVariant,
      });
      aiEnhancedSearchTerm = termToSearch.trim();
      aiEnhancementSource = 'ai_failed';
    }

    setLoadingMessage(t.loadingData);

    try {
      const dbDataArray = await fetchMedicineByName(aiEnhancedSearchTerm);
      let processedMedicines: Medicine[] = [];

      if (dbDataArray.length > 0) {
        setLoadingMessage(t.loadingAiDetails);

        processedMedicines = await Promise.all(
          dbDataArray.map(async (dbItem) => {
            try {
                const aiDetails = await generateMedicineDetails({
                searchTermOrName: dbItem.name,
                language: selectedLanguage,
                contextName: dbItem.name,
                contextComposition: dbItem.composition,
                contextBarcode: dbItem.barcode,
                contextMrp: dbItem.mrp,
                contextUom: dbItem.uom,
                });

                if (aiDetails.source === 'ai_failed' || aiDetails.source === 'ai_unavailable') {
                    toast({
                        title: t.appName,
                        description: t.errorAiDetails(dbItem.name, aiDetails.source),
                        variant: "destructive",
                    });
                     if (aiDetails.source === 'ai_unavailable' && !aiConfigError) {
                        setAiConfigError(t.errorAiNotConfiguredOrModelForDetails(dbItem.name));
                        setAiConfigErrorType('key_or_model');
                    } else if (aiDetails.source === 'ai_failed' && !aiConfigError) {
                        setAiConfigError(t.errorAiFailedForDetails(dbItem.name));
                        setAiConfigErrorType('api_fail');
                    }
                } else if (aiDetails.source === 'database_only' && (aiDetails.usage === t.infoNotAvailable || aiDetails.manufacturer === t.infoNotAvailable)){
                     toast({
                        title: t.appName,
                        description: t.aiCouldNotEnhance(dbItem.name),
                        variant: "default",
                    });
                }

                return {
                id: dbItem.id,
                ...aiDetails
                };
            } catch (genDetailsError: any) {
                console.error(`[MediSearchApp] Critical error during generateMedicineDetails promise for ${dbItem.name}:`, genDetailsError.message, genDetailsError.stack, genDetailsError);
                 toast({
                    title: t.appName,
                    description: t.errorAiDetailsCritical(dbItem.name),
                    variant: "destructive",
                });
                if (!aiConfigError) { // Prioritize Key/Model error if not already set
                    if(genDetailsError?.message?.toLowerCase().includes('api key') || genDetailsError?.message?.toLowerCase().includes('model not found')) {
                        setAiConfigError(t.errorAiNotConfiguredOrModelForDetails(dbItem.name));
                        setAiConfigErrorType('key_or_model');
                    } else {
                        setAiConfigError(t.errorAiDetailsCritical(dbItem.name));
                        setAiConfigErrorType('api_fail');
                    }
                }
                return {
                    id: dbItem.id,
                    name: dbItem.name,
                    composition: dbItem.composition,
                    barcode: dbItem.barcode,
                    mrp: dbItem.mrp,
                    uom: dbItem.uom,
                    usage: t.infoNotAvailable,
                    manufacturer: t.infoNotAvailable,
                    dosage: t.infoNotAvailable,
                    sideEffects: t.infoNotAvailable,
                    source: 'ai_failed'
                };
            }
          })
        );
      } else if (aiEnhancementSource === 'ai_enhanced' || aiEnhancementSource === 'original_query_used') {
          setLoadingMessage(t.loadingAiDetails);
          try {
            const aiOnlyDetails = await generateMedicineDetails({
                searchTermOrName: aiEnhancedSearchTerm,
                language: selectedLanguage,
            });
             if (aiOnlyDetails.name && aiOnlyDetails.name !== t.infoNotAvailable && aiOnlyDetails.composition !== t.infoNotAvailable ) {
                 processedMedicines = [{ id: `ai-${Date.now()}`, ...aiOnlyDetails }];
             } else {
                 processedMedicines = [];
             }

            if (aiOnlyDetails.source === 'ai_failed' || aiOnlyDetails.source === 'ai_unavailable') {
                 toast({
                    title: t.appName,
                    description: t.errorAiDetails(aiEnhancedSearchTerm, aiOnlyDetails.source),
                    variant: "destructive",
                });
                 if (aiOnlyDetails.source === 'ai_unavailable' && !aiConfigError) {
                    setAiConfigError(t.errorAiNotConfiguredOrModelForDetails(aiEnhancedSearchTerm));
                    setAiConfigErrorType('key_or_model');
                } else if (aiOnlyDetails.source === 'ai_failed' && !aiConfigError) {
                    setAiConfigError(t.errorAiFailedForDetails(aiEnhancedSearchTerm));
                    setAiConfigErrorType('api_fail');
                }
            }
          } catch (aiOnlyGenError: any) {
            console.error(`[MediSearchApp] Critical error during AI-only generateMedicineDetails for "${aiEnhancedSearchTerm}":`, aiOnlyGenError.message, aiOnlyGenError.stack, aiOnlyGenError);
             toast({
                title: t.appName,
                description: t.errorAiDetailsCritical(aiEnhancedSearchTerm),
                variant: "destructive",
            });
            if (!aiConfigError) { // Prioritize Key/Model error
                 if(aiOnlyGenError?.message?.toLowerCase().includes('api key') || aiOnlyGenError?.message?.toLowerCase().includes('model not found')) {
                    setAiConfigError(t.errorAiNotConfiguredOrModelForDetails(aiEnhancedSearchTerm));
                    setAiConfigErrorType('key_or_model');
                 } else {
                    setAiConfigError(t.errorAiDetailsCritical(aiEnhancedSearchTerm));
                    setAiConfigErrorType('api_fail');
                 }
            }
          }
      }

      setSearchResults(processedMedicines);

      if (aiEnhancementSource === 'ai_unavailable' && !aiConfigError) {
        setAiConfigError(t.errorAiNotConfiguredOrModel);
        setAiConfigErrorType('key_or_model');
      } else if (aiEnhancementSource === 'ai_failed' && !aiConfigError) {
        setAiConfigError(t.errorAiFailed);
        setAiConfigErrorType('api_fail');
      }

    } catch (dataProcessingError: any) {
      let errorMessage = t.errorData;
      if (dataProcessingError?.message) {
        errorMessage = `${t.errorData} Details: ${dataProcessingError.message}`;
      }
      console.error(`[MediSearchApp] Data processing failed. Query: "${aiEnhancedSearchTerm}", Error: ${dataProcessingError.message || dataProcessingError}`, dataProcessingError);
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
      debounceTimeoutRef.current = setTimeout(async () => {
        try {
            const fetchedSuggestions = await fetchSuggestions(query);
            setSuggestions(fetchedSuggestions);
            setShowSuggestions(fetchedSuggestions.length > 0);
        } catch (e) {
            console.error("[MediSearchApp] Failed to fetch suggestions:", e);
            setSuggestions([]);
            setShowSuggestions(false);
        }
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

      <main className="w-full flex flex-col items-center space-y-6 px-4 pb-8 pt-2 sm:pt-6">
        <div className="flex items-center justify-center mb-2">
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

        <section className="w-full max-w-lg p-6 bg-card rounded-xl shadow-2xl">
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
            {aiConfigErrorType === 'key_or_model' ? <KeyRound className="h-5 w-5" /> : <ServerCrash className="h-5 w-5" />}
            <AlertTitle>{aiConfigErrorType === 'key_or_model' ? t.errorAiNotConfiguredOrModelTitle : t.errorAiFailedTitle}</AlertTitle>
            <AlertDescription>
              {aiConfigError}
              {aiConfigErrorType === 'key_or_model' && (
                <p className="mt-2 text-xs">
                  {t.errorAiNotConfiguredOrModelDetail}
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
          <section className="w-full mt-0 animate-fadeIn space-y-6 flex flex-col items-center">
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
