
import type { Medicine } from '@/types';
import { db } from './firebase';
import { ref, get, child, query as dbQuery, orderByChild, equalTo, limitToFirst, startAt, endAt } from 'firebase/database';

interface DbMedicineResult {
  id: string;
  name: string;
  composition: string;
  barcode?: string;
  mrp?: string | number;
  uom?: string;
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
    console.warn("[mockApi] Firebase Realtime Database (db) is not initialized. Cannot fetch from DB.");
    return [];
  }
  if (!searchTerm || searchTerm.trim() === "") {
    return [];
  }

  const normalizedAiEnhancedSearchTerm = searchTerm.toLowerCase().trim();
  const originalSearchTermTrimmed = searchTerm.trim();
  const medicinesRef = ref(db, 'medicines');
  const allMatches: DbMedicineResult[] = [];
  const foundIds = new Set<string>();

  const potentialIdsToTry = new Set<string>();
  potentialIdsToTry.add(normalizedAiEnhancedSearchTerm.replace(/\s+/g, '-'));
  potentialIdsToTry.add(originalSearchTermTrimmed.replace(/\s+/g, '-'));
  potentialIdsToTry.add(originalSearchTermTrimmed);

  for (const potentialId of potentialIdsToTry) {
    if (!potentialId.match(/^[a-zA-Z0-9-_]+$/)) continue;
    try {
      const directIdSnapshot = await get(child(medicinesRef, potentialId));
      if (directIdSnapshot.exists()) {
        const data = directIdSnapshot.val();
        if (data && data.name && data.composition && !foundIds.has(potentialId)) {
          allMatches.push({
            id: directIdSnapshot.key!,
            name: data.name,
            composition: data.composition,
            barcode: data.barcode,
            mrp: data.mrp,
            uom: data.uom,
            foundInDb: true,
          });
          foundIds.add(potentialId);
          return allMatches;
        }
      }
    } catch (e: any) {
      console.error(`[mockApi] Error fetching medicine by direct ID '${potentialId}':`, e.message);
    }
  }

  if (isPotentiallyBarcode(originalSearchTermTrimmed)) {
    try {
      const barcodeQueryInstance = dbQuery(medicinesRef, orderByChild('barcode'), equalTo(originalSearchTermTrimmed));
      const barcodeSnapshot = await get(barcodeQueryInstance);
      if (barcodeSnapshot.exists()) {
        const data = barcodeSnapshot.val();
        Object.keys(data).forEach(id => {
          const medicine = data[id];
          if (medicine && medicine.name && medicine.composition && !foundIds.has(id)) {
            allMatches.push({
              id,
              name: medicine.name,
              composition: medicine.composition,
              barcode: medicine.barcode,
              mrp: medicine.mrp,
              uom: medicine.uom,
              foundInDb: true,
            });
            foundIds.add(id);
          }
        });
         if (allMatches.length > 0) return allMatches;
      }
    }
    catch (e: any)
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
  }

  try {
    const allMedicinesSnapshot = await get(medicinesRef);
    if (allMedicinesSnapshot.exists()) {
      const medicinesData = allMedicinesSnapshot.val();

      for (const id in medicinesData) {
        if (foundIds.has(id)) continue;

        const medicine = medicinesData[id];
        if (!medicine || typeof medicine.name !== 'string' || typeof medicine.composition !== 'string') {
          continue;
        }

        const currentMedicineNameLower = medicine.name.toLowerCase();
        const currentMedicineCompositionLower = medicine.composition.toLowerCase();

        // Normalize search term parts for "includes" check
        const searchTermsParts = normalizedAiEnhancedSearchTerm.split(/\s+/).filter(part => part.length > 1); // Split and filter small parts

        const nameMatches = searchTermsParts.every(part => currentMedicineNameLower.includes(part));
        const compositionMatches = searchTermsParts.every(part => currentMedicineCompositionLower.includes(part));

        if (currentMedicineNameLower === normalizedAiEnhancedSearchTerm || nameMatches) {
          if (!foundIds.has(id)) {
            allMatches.push({ id, name: medicine.name, composition: medicine.composition, barcode: medicine.barcode, mrp: medicine.mrp, uom: medicine.uom, foundInDb: true });
            foundIds.add(id);
          }
        } else if (compositionMatches) {
           if (!foundIds.has(id)) {
             allMatches.push({ id, name: medicine.name, composition: medicine.composition, barcode: medicine.barcode, mrp: medicine.mrp, uom: medicine.uom, foundInDb: true });
             foundIds.add(id);
           }
        }
      }
    }
  } catch (e: any) {
      console.error(`[mockApi] Error during full scan for name/composition query (normalized term: '${normalizedAiEnhancedSearchTerm}'):`, e.message);
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
        if (medicine && typeof medicine.composition === 'string') {
            const lowerComposition = medicine.composition.toLowerCase();
            if (lowerComposition.includes(normalizedQuery) && !addedSuggestions.has(medicine.composition) && suggestions.length < 7) {
                 if (!addedSuggestions.has(medicine.composition)) {
                    suggestions.push(medicine.composition);
                    addedSuggestions.add(medicine.composition);
                 }
            }
        }
      }
    }
  } catch (error) {
    console.error("[mockApi] Error fetching suggestions:", error);
  }
  return suggestions.slice(0, 7); // Ensure limit
};
