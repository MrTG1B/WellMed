"use client";

import React from "react";
import type { TranslationKeys } from "@/lib/translations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";

interface SearchBarProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  t: TranslationKeys;
}

export function SearchBar({
  searchQuery,
  onSearchQueryChange,
  onSubmit,
  isLoading,
  t,
}: SearchBarProps) {
  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-lg items-center space-x-2">
      <Input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        placeholder={t.searchPlaceholder}
        className="flex-grow text-base"
        aria-label={t.searchPlaceholder}
        disabled={isLoading}
      />
      <Button type="submit" disabled={isLoading || !searchQuery.trim()} className="min-w-[100px]">
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Search className="mr-2 h-4 w-4" />
        )}
        {t.searchButton}
      </Button>
    </form>
  );
}
