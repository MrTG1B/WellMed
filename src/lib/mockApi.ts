import type { Medicine } from '@/types';
import { db } from './firebase'; 
import { ref, get, child, query as dbQuery, orderByChild, equalTo, limitToFirst, startAt, endAt } from 'firebase/database';

interface DbMedicineResult {
  id: string;
  name: string;
  composition: string;
  barcode?: string;
  foundInDb: true;
}

// Helper function to check if a term might be a barcode
const isPotentiallyBarcode = (term: string): boolean => {
  return /^\d{8,14}$/.test(term);
};


export const fetchMedicineByName = async (
  searchTerm: string 
): Promise<DbMedicineResult[]> => {
  if (!db) {
    console.error("[mockApi] Firebase Realtime Database (db) is not initialized. Cannot fetch from DB.");
    return [];
  }
  if (!searchTerm || searchTerm.trim() === "") {
    console.log("[mockApi] Search term is empty. Returning no results.");
    return [];
  }

  const normalizedAiEnhancedSearchTerm = searchTerm.toLowerCase().trim();
  const originalSearchTermTrimmed = searchTerm.trim();
  console.log(`[mockApi] Starting search for term: "${searchTerm}", Normalized for name/composition: "${normalizedAiEnhancedSearchTerm}", Original for barcode: "${originalSearchTermTrimmed}"`);
  const medicinesRef = ref(db, 'medicines');
  const allMatches: DbMedicineResult[] = [];
  const foundIds = new Set<string>(); // To avoid duplicates if a medicine matches multiple criteria

  // Attempt 1: Direct ID lookup
  const potentialIdsToTry = new Set<string>();
  potentialIdsToTry.add(normalizedAiEnhancedSearchTerm.replace(/\s+/g, '-')); // Common ID format
  potentialIdsToTry.add(originalSearchTermTrimmed.replace(/\s+/g, '-'));
  potentialIdsToTry.add(originalSearchTermTrimmed); // Exact term as ID

  console.log(`[mockApi] Potential IDs for direct lookup:`, Array.from(potentialIdsToTry));
  for (const potentialId of potentialIdsToTry) {
    if (!potentialId.match(/^[a-zA-Z0-9-_]+$/)) continue; // Skip if not valid ID format
    try {
      console.log(`[mockApi] Attempting direct ID lookup for: "${potentialId}"`);
      const directIdSnapshot = await get(child(medicinesRef, potentialId));
      if (directIdSnapshot.exists()) {
        const data = directIdSnapshot.val();
        if (data && data.name && data.composition && !foundIds.has(potentialId)) {
          console.log(`[mockApi] Found by direct ID: "${potentialId}". Data:`, data);
          allMatches.push({
            id: directIdSnapshot.key!,
            name: data.name,
            composition: data.composition,
            barcode: data.barcode,
            foundInDb: true,
          });
          foundIds.add(potentialId);
          // If ID match found, typically this is the most specific, so we can prioritize it.
          // For "show all matches", we might not want to return early.
          // However, an ID match is usually definitive. Let's return if an ID match is found.
          return allMatches; 
        }
      }
    } catch (e: any) {
      console.error(`[mockApi] Error fetching medicine by direct ID '${potentialId}':`, e.message);
    }
  }
  
  // Attempt 2: Query by barcode (conditionally)
  if (isPotentiallyBarcode(originalSearchTermTrimmed)) {
    console.log(`[mockApi] Term "${originalSearchTermTrimmed}" appears to be a barcode. Attempting barcode query.`);
    try {
      const barcodeQueryInstance = dbQuery(medicinesRef, orderByChild('barcode'), equalTo(originalSearchTermTrimmed)); // Removed limitToFirst
      const barcodeSnapshot = await get(barcodeQueryInstance);
      if (barcodeSnapshot.exists()) {
        const data = barcodeSnapshot.val();
        Object.keys(data).forEach(id => {
          const medicine = data[id];
          if (medicine && medicine.name && medicine.composition && !foundIds.has(id)) {
            console.log(`[mockApi] Found by barcode: "${originalSearchTermTrimmed}". ID: ${id}, Data:`, medicine);
            allMatches.push({
              id,
              name: medicine.name,
              composition: medicine.composition,
              barcode: medicine.barcode,
              foundInDb: true,
            });
            foundIds.add(id);
          }
        });
         // If barcode matches found, these are also quite specific.
         if (allMatches.length > 0) return allMatches;
      } else {
        console.log(`[mockApi] No match for barcode: "${originalSearchTermTrimmed}"`);
      }
    } catch (e: any) // ... (error handling as before)
    {
      console.error(`[mockApi] Error fetching medicine by barcode '${originalSearchTermTrimmed}':`, e.message);
      if (e.message?.toLowerCase().includes("indexon") || e.message?.toLowerCase().includes("orderbychild")) {
          console.error(
            "🔴 IMPORTANT: Firebase Realtime Database: Query by 'barcode' failed likely due to a missing index. " +
            "Please add an index for 'barcode' in your Realtime Database security rules for efficient querying: \n" +
            "{\n" +
            "  \"rules\": {\n" +
            "    \"medicines\": {\n" +
            "      \".indexOn\": [\"barcode\", \"name_lowercase\"] // Ensure 'barcode' is listed here (and 'name_lowercase' if used elsewhere)\n" +
            "    }\n" +
            "    // ... your other rules ...\n" +
            "  }\n" +
            "}"
          );
      }
    }
  } else {
    console.log(`[mockApi] Term "${originalSearchTermTrimmed}" does not appear to be a barcode. Skipping barcode-specific query.`);
  }
  
  // Attempt 3: Full scan for Name (exact or includes, case-insensitive) or Composition (includes, case-insensitive)
  console.log(`[mockApi] Starting full scan of all medicines for name/composition match against normalized term: "${normalizedAiEnhancedSearchTerm}"`);
  try {
    const allMedicinesSnapshot = await get(medicinesRef);
    if (allMedicinesSnapshot.exists()) {
      const medicinesData = allMedicinesSnapshot.val();
      console.log(`[mockApi] Full Scan: Processing ${Object.keys(medicinesData).length} records.`);

      for (const id in medicinesData) {
        if (foundIds.has(id)) continue; // Skip if already added

        const medicine = medicinesData[id];
        if (!medicine || typeof medicine.name !== 'string' || typeof medicine.composition !== 'string') {
          console.log(`[mockApi] Full Scan: Skipping malformed/incomplete record for ID ${id}:`, medicine);
          continue;
        }

        const currentMedicineNameLower = medicine.name.toLowerCase();
        const currentMedicineCompositionLower = medicine.composition.toLowerCase();

        // Prioritize exact name match, then broader matches
        if (currentMedicineNameLower === normalizedAiEnhancedSearchTerm) {
          console.log(`[mockApi] Full Scan: Found by EXACT NAME match: ID ${id}, Name: "${medicine.name}"`);
          allMatches.push({ id, name: medicine.name, composition: medicine.composition, barcode: medicine.barcode, foundInDb: true });
          foundIds.add(id);
        } else if (currentMedicineNameLower.includes(normalizedAiEnhancedSearchTerm)) {
          console.log(`[mockApi] Full Scan: Found by NAME INCLUDES match: ID ${id}, Name: "${medicine.name}"`);
          allMatches.push({ id, name: medicine.name, composition: medicine.composition, barcode: medicine.barcode, foundInDb: true });
          foundIds.add(id);
        } else if (currentMedicineCompositionLower.includes(normalizedAiEnhancedSearchTerm)) {
           // Check if already added by name match to avoid duplicate on same item
           if (!foundIds.has(id)) {
             console.log(`[mockApi] Full Scan: Found by COMPOSITION INCLUDES: ID ${id}, Name: "${medicine.name}"`);
             allMatches.push({ id, name: medicine.name, composition: medicine.composition, barcode: medicine.barcode, foundInDb: true });
             foundIds.add(id);
           }
        }
      }
      console.log(`[mockApi] Full Scan: Completed. Total unique matches: ${allMatches.length}.`);
    } else {
      console.log("[mockApi] Full Scan: No medicines data exists at 'medicines' path.");
    }
  } catch (e: any) {
      console.error(`[mockApi] Error during full scan for name/composition query (normalized term: '${normalizedAiEnhancedSearchTerm}'):`, e.message);
  }

  if (allMatches.length === 0) {
    console.log(`[mockApi] Medicine not found in DB after all checks for search term: '${searchTerm}' (normalized: '${normalizedAiEnhancedSearchTerm}')`);
  }
  return allMatches;
};


export const fetchSuggestions = async (query: string): Promise<string[]> => {
  if (!db || query.trim().length < 2) { // Minimum 2 chars for suggestions
    return [];
  }
  const normalizedQuery = query.toLowerCase().trim();
  const medicinesRef = ref(db, 'medicines');
  const suggestions: string[] = [];
  const addedSuggestions = new Set<string>(); // To avoid duplicate suggestion strings

  try {
    // Firebase RTDB does not support "contains" or "LIKE" queries efficiently without full scan.
    // For "startsWith" on name:
    // An index on a lowercase version of the name would be ideal. E.g., `name_lowercase`.
    // If `name_lowercase` is not available, we have to scan.
    // For this example, we'll do a full scan and client-side filter for startsWith on name, and includes on composition.
    
    const snapshot = await get(medicinesRef);
    if (snapshot.exists()) {
      const medicinesData = snapshot.val();
      for (const id in medicinesData) {
        if (suggestions.length >= 7) break; // Limit suggestions

        const medicine = medicinesData[id];
        if (medicine && typeof medicine.name === 'string') {
          const lowerName = medicine.name.toLowerCase();
          if (lowerName.startsWith(normalizedQuery) && !addedSuggestions.has(medicine.name)) {
            suggestions.push(medicine.name);
            addedSuggestions.add(medicine.name);
          }
        }
        if (suggestions.length >= 7) break;
        // Optionally, also check composition for suggestions
        if (medicine && typeof medicine.composition === 'string') {
            const lowerComposition = medicine.composition.toLowerCase();
            if (lowerComposition.includes(normalizedQuery) && !addedSuggestions.has(medicine.composition) && suggestions.length < 7) {
                 // To make composition suggestions more relevant, perhaps return the medicine name
                 // if (lowerComposition.includes(normalizedQuery) && !addedSuggestions.has(medicine.name)) {
                 // suggestions.push(medicine.name); // Suggest medicine name if composition matches
                 // addedSuggestions.add(medicine.name);
                 // For now, let's stick to suggesting the composition string itself if it's unique
                 if (!addedSuggestions.has(medicine.composition)) {
                    suggestions.push(medicine.composition);
                    addedSuggestions.add(medicine.composition);
                 }
            }
        }
      }
    }
  } catch (error) {
    console.error("Error fetching suggestions:", error);
  }
  console.log(`[mockApi] Suggestions for "${query}":`, suggestions);
  return suggestions.slice(0, 7); // Ensure limit
};

