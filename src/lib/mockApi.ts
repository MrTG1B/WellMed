
import type { Medicine } from '@/types';
import { db } from './firebase'; 
import { ref, get, child, query as dbQuery, orderByChild, equalTo, limitToFirst } from 'firebase/database';

interface DbMedicineResult {
  id: string;
  name: string;
  composition: string;
  barcode?: string;
  foundInDb: true;
}

interface NotFoundResult {
  foundInDb: false;
}

export const fetchMedicineByName = async (
  searchTerm: string // This searchTerm is expected to be the AI-enhanced term from enhanceMedicineSearch
): Promise<DbMedicineResult | NotFoundResult> => {
  if (!db) {
    console.error("[mockApi] Firebase Realtime Database (db) is not initialized. Cannot fetch from DB.");
    return { foundInDb: false };
  }
  if (!searchTerm || searchTerm.trim() === "") {
    console.log("[mockApi] Search term is empty. Returning not found.");
    return { foundInDb: false };
  }

  const normalizedAiEnhancedSearchTerm = searchTerm.toLowerCase().trim();
  console.log(`[mockApi] Starting search for term: "${searchTerm}", Normalized: "${normalizedAiEnhancedSearchTerm}"`);
  const medicinesRef = ref(db, 'medicines');

  // Attempt 1: Direct ID lookup
  const potentialIdsToTry = new Set<string>();
  potentialIdsToTry.add(normalizedAiEnhancedSearchTerm); 
  if (searchTerm.trim().match(/^[a-zA-Z0-9-_]+$/) && searchTerm.trim() !== normalizedAiEnhancedSearchTerm) {
    potentialIdsToTry.add(searchTerm.trim());
  }
  console.log(`[mockApi] Potential IDs for direct lookup:`, Array.from(potentialIdsToTry));

  for (const potentialId of potentialIdsToTry) {
    try {
      console.log(`[mockApi] Attempting direct ID lookup for: "${potentialId}"`);
      const directIdSnapshot = await get(child(medicinesRef, potentialId));
      if (directIdSnapshot.exists()) {
        const data = directIdSnapshot.val();
        if (data && data.name && data.composition) {
          console.log(`[mockApi] Found by direct ID: "${potentialId}". Data:`, data);
          return {
            id: directIdSnapshot.key!,
            name: data.name,
            composition: data.composition,
            barcode: data.barcode,
            foundInDb: true,
          };
        } else {
          console.log(`[mockApi] Direct ID "${potentialId}" exists but data is malformed:`, data);
        }
      } else {
        console.log(`[mockApi] No match for direct ID: "${potentialId}"`);
      }
    } catch (e: any) {
      console.error(`[mockApi] Error fetching medicine by direct ID '${potentialId}':`, e.message);
    }
  }
  
  // Attempt 2: Query by barcode
  const originalSearchTermTrimmed = searchTerm.trim();
  console.log(`[mockApi] Attempting barcode query for: "${originalSearchTermTrimmed}"`);
  try {
    const barcodeQueryInstance = dbQuery(medicinesRef, orderByChild('barcode'), equalTo(originalSearchTermTrimmed), limitToFirst(1));
    const barcodeSnapshot = await get(barcodeQueryInstance);
    if (barcodeSnapshot.exists()) {
      const data = barcodeSnapshot.val();
      const id = Object.keys(data)[0];
      const medicine = data[id];
      if (medicine && medicine.name && medicine.composition) {
        console.log(`[mockApi] Found by barcode: "${originalSearchTermTrimmed}". Data:`, medicine);
        return {
          id,
          name: medicine.name,
          composition: medicine.composition,
          barcode: medicine.barcode,
          foundInDb: true,
        };
      } else {
         console.log(`[mockApi] Barcode query for "${originalSearchTermTrimmed}" successful but data malformed:`, medicine);
      }
    } else {
      console.log(`[mockApi] No match for barcode: "${originalSearchTermTrimmed}"`);
    }
  } catch (e: any) {
    console.error(`[mockApi] Error fetching medicine by barcode '${originalSearchTermTrimmed}':`, e.message);
    if (e.message?.toLowerCase().includes("indexon") || e.message?.toLowerCase().includes("orderbychild")) {
        console.error(
          "🔴 IMPORTANT: Firebase Realtime Database: Query by 'barcode' failed likely due to a missing index. " +
          "Please add an index for 'barcode' in your Realtime Database security rules for efficient querying: \n" +
          "{\n" +
          "  \"rules\": {\n" +
          "    \"medicines\": {\n" +
          "      \".indexOn\": [\"barcode\", \"name_lowercase\"] // Ensure 'barcode' is listed here\n" +
          "    }\n" +
          "    // ... your other rules ...\n" +
          "  }\n" +
          "}"
        );
    }
  }
  
  // Attempt 3 & 4: Full scan for Name (exact match) or Composition (includes match)
  console.log(`[mockApi] Starting full scan of all medicines for name/composition match against "${normalizedAiEnhancedSearchTerm}"`);
  try {
    const allMedicinesSnapshot = await get(medicinesRef);
    if (allMedicinesSnapshot.exists()) {
      const medicinesData = allMedicinesSnapshot.val();
      
      let firstMatchByNameExact: DbMedicineResult | null = null;
      let firstMatchByComposition: DbMedicineResult | null = null;

      console.log(`[mockApi] Full Scan: Processing ${Object.keys(medicinesData).length} records.`);

      for (const id in medicinesData) {
        const medicine = medicinesData[id];
        if (!medicine || typeof medicine.name !== 'string' || typeof medicine.composition !== 'string') {
          console.log(`[mockApi] Full Scan: Skipping malformed/incomplete record for ID ${id}:`, medicine);
          continue;
        }

        const currentMedicineNameLower = medicine.name.toLowerCase();
        const currentMedicineCompositionLower = medicine.composition.toLowerCase();

        // console.log(`[mockApi] Full Scan DEBUG: Checking ID ${id}, Name: "${currentMedicineNameLower}", Composition (first 50 chars): "${currentMedicineCompositionLower.substring(0,50)}"`);

        // Check for exact name match (case-insensitive)
        if (currentMedicineNameLower === normalizedAiEnhancedSearchTerm) {
          console.log(`[mockApi] Full Scan: Found by EXACT NAME match: ID ${id}, Name: "${medicine.name}"`);
          firstMatchByNameExact = {
            id,
            name: medicine.name,
            composition: medicine.composition,
            barcode: medicine.barcode,
            foundInDb: true,
          };
          break; // Prioritize exact name match, stop scan
        }

        // Check for composition 'includes' (case-insensitive) - only if no exact name match yet
        if (!firstMatchByComposition && currentMedicineCompositionLower.includes(normalizedAiEnhancedSearchTerm)) {
          console.log(`[mockApi] Full Scan: Found by COMPOSITION INCLUDES: ID ${id}, Name: "${medicine.name}", Matched Composition against "${normalizedAiEnhancedSearchTerm}"`);
          firstMatchByComposition = {
            id,
            name: medicine.name,
            composition: medicine.composition,
            barcode: medicine.barcode,
            foundInDb: true,
          };
          // Continue scan in case an exact name match is found later for higher priority. 
          // If exact name match is prioritized and breaks, this will only be set if no exact name match is found in the entire dataset.
        }
      }

      if (firstMatchByNameExact) {
        console.log("[mockApi] Full Scan: Returning match by exact name.");
        return firstMatchByNameExact;
      }
      if (firstMatchByComposition) {
        console.log("[mockApi] Full Scan: Returning match by composition.");
        return firstMatchByComposition;
      }
      console.log("[mockApi] Full Scan: No matches found by name or composition.");
    } else {
      console.log("[mockApi] Full Scan: No medicines data exists at 'medicines' path.");
    }
  } catch (e: any) {
      console.error(`[mockApi] Error during full scan for name/composition query (normalized term: '${normalizedAiEnhancedSearchTerm}'):`, e.message);
  }

  console.log(`[mockApi] Medicine not found in DB after all checks for search term: '${searchTerm}' (normalized: '${normalizedAiEnhancedSearchTerm}')`);
  return { foundInDb: false };
};

