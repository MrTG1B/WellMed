"use client";

import type { Language } from "@/types";
import type { TranslationKeys } from "@/lib/translations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="language-select" className="text-sm font-medium">
        {t.languageLabel}:
      </Label>
      <Select
        value={selectedLanguage}
        onValueChange={(value) => onLanguageChange(value as Language)}
      >
        <SelectTrigger id="language-select" className="w-[120px] bg-background text-foreground">
          <SelectValue placeholder={t.languageLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">{t.english}</SelectItem>
          <SelectItem value="hi">{t.hindi}</SelectItem>
          <SelectItem value="bn">{t.bengali}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
