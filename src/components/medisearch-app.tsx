"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { Language, Medicine } from "@/types";
import { getTranslations, type TranslationKeys } from "@/lib/translations";
import { enhanceMedicineSearch } from "@/ai/flows/enhance-medicine-search";
import { fetchMedicineByName } from "@/lib/mockApi";
import { LanguageSelector } from "@/components/medisearch/LanguageSelector";
import { SearchBar } from "@/components/medisearch/SearchBar";
import { MedicineCard } from "@/components/medisearch/MedicineCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

export default function MediSearchApp() {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("en");
  const [t, setT] = useState<TranslationKeys>(getTranslations("en"));
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResult, setSearchResult] = useState<Medicine | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("");

  const { toast } = useToast();

  useEffect(() => {
    setT(getTranslations(selectedLanguage));
    document.documentElement.lang = selectedLanguage;
  }, [selectedLanguage]);

  const handleLanguageChange = useCallback((lang: Language) => {
    setSelectedLanguage(lang);
  }, []);

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setSearchResult(null);
    let finalSearchTerm = searchQuery.trim();

    try {
      setLoadingMessage(t.loadingAi);
      const aiResponse = await enhanceMedicineSearch({ query: searchQuery });
      if (aiResponse && aiResponse.correctedMedicineName) {
        finalSearchTerm = aiResponse.correctedMedicineName;
        toast({
          title: t.appName,
          description: t.searchWithAiResult(finalSearchTerm),
          action: <Info className="h-5 w-5 text-blue-500" />,
        });
      } else {
         toast({
          title: t.appName,
          description: t.errorAi,
          variant: "destructive",
        });
      }
    } catch (aiError) {
      console.error("AI enhancement failed:", aiError);
      toast({
        title: t.appName,
        description: t.errorAi,
        variant: "destructive",
      });
      // Proceed with original query if AI fails
    }

    try {
      setLoadingMessage(t.loadingData);
      const medicine = await fetchMedicineByName(finalSearchTerm);
      setSearchResult(medicine);
      if (!medicine) {
        setError(t.noResults);
      }
    } catch (dataError) {
      console.error("Data fetching failed:", dataError);
      setError(t.errorData);
      toast({
        title: t.appName,
        description: t.errorData,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
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

      <main className="w-full max-w-lg flex flex-col items-center space-y-8">
        <section className="w-full p-6 bg-card rounded-xl shadow-2xl">
          <h2 className="text-2xl font-semibold text-center mb-6 text-foreground">{t.searchTitle}</h2>
          <SearchBar
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSubmit={handleSearch}
            isLoading={isLoading}
            t={t}
          />
        </section>

        {isLoading && (
          <div className="flex flex-col items-center space-y-2 p-4 text-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg">{loadingMessage || t.loadingData}</p>
          </div>
        )}

        {error && !isLoading && (
          <Alert variant="destructive" className="w-full max-w-lg shadow-md">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && searchResult && (
          <section className="w-full mt-4 animate-fadeIn">
            <MedicineCard medicine={searchResult} t={t} />
          </section>
        )}
        
        {!isLoading && !error && !searchResult && searchQuery && !error && (
            // This condition is a bit tricky, basically means search was done, no error, no result
            // This is handled by `setError(t.noResults)` now, so this block might not be needed
            // or can be refined if specific UI for "search attempted, nothing found" is needed beyond the error alert.
            // For now, the error alert for t.noResults covers this.
            <></>
        )}
      </main>
      
      <footer className="mt-auto pt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} {t.appName}. All rights reserved.</p>
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
