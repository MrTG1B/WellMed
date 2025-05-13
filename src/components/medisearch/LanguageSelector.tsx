
"use client";

import type { Language } from "@/types";
import type { TranslationKeys } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages } from "lucide-react";

interface LanguageSelectorProps {
  selectedLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  t: TranslationKeys;
}

export function LanguageSelector({
  selectedLanguage,
  onLanguageChange,
  t,
}: LanguageSelectorProps) {
  const getCurrentLanguageName = (lang: Language, translations: TranslationKeys) => {
    switch (lang) {
      case "en":
        return translations.english;
      case "hi":
        return translations.hindi;
      case "bn":
        return translations.bengali;
      default:
        return "";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="text-foreground hover:bg-primary/10 hover:text-primary focus-visible:ring-ring"
        >
          <Languages className="mr-2 h-5 w-5" />
          {getCurrentLanguageName(selectedLanguage, t)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-border shadow-lg">
        <DropdownMenuItem
          onSelect={() => onLanguageChange("en")}
          className="cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
        >
          {t.english}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => onLanguageChange("hi")}
          className="cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
        >
          {t.hindi}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => onLanguageChange("bn")}
          className="cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
        >
          {t.bengali}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

