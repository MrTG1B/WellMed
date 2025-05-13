"use client";

import React from 'react';

interface SuggestionsListProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
}

export function SuggestionsList({ suggestions, onSuggestionClick }: SuggestionsListProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <ul 
        className="absolute left-0 right-0 mt-1 w-full bg-card border border-border rounded-md shadow-xl max-h-60 overflow-y-auto z-50"
        role="listbox"
    >
      {suggestions.map((suggestion, index) => (
        <li
          key={index}
          className="px-4 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm text-foreground"
          onClick={() => onSuggestionClick(suggestion)}
          role="option"
          aria-selected="false" // This could be enhanced with keyboard navigation
        >
          {suggestion}
        </li>
      ))}
    </ul>
  );
}
