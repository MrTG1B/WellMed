
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

// Helper function to check if a term might be a barcode
const isPotentiallyBarcode = (term: string): boolean => {
  // Simple check: consists of 8 to 14 digits.
  // Adjust regex as needed for your specific barcode formats (e.g., EAN-13, UPC-A).
  return /^\d{8,14}$/.test(term);
};


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
  const originalSearchTermTrimmed = searchTerm.trim(); // Use this for barcode check
  console.log(`[mockApi] Starting search for term: "${searchTerm}", Normalized for name/composition: "${normalizedAiEnhancedSearchTerm}", Original for barcode: "${originalSearchTermTrimmed}"`);
  const medicinesRef = ref(db, 'medicines');

  // Attempt 1: Direct ID lookup
  const potentialIdsToTry = new Set<string>();
  potentialIdsToTry.add(normalizedAiEnhancedSearchTerm); 
  // Also try the original trimmed search term if it's a valid ID format and different from normalized
  if (originalSearchTermTrimmed.match(/^[a-zA-Z0-9-_]+$/) && originalSearchTermTrimmed !== normalizedAiEnhancedSearchTerm) {
    potentialIdsToTry.add(originalSearchTermTrimmed);
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
  
  // Attempt 2: Query by barcode (conditionally)
  if (isPotentiallyBarcode(originalSearchTermTrimmed)) {
    console.log(`[mockApi] Term "${originalSearchTermTrimmed}" appears to be a barcode. Attempting barcode query.`);
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
  
  // Attempt 3 & 4: Full scan for Name (exact match using normalized term) or Composition (includes match using normalized term)
  console.log(`[mockApi] Starting full scan of all medicines for name/composition match against normalized term: "${normalizedAiEnhancedSearchTerm}"`);
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

        // Check for exact name match (case-insensitive) with normalized AI-enhanced term
        if (currentMedicineNameLower === normalizedAiEnhancedSearchTerm) {
          console.log(`[mockApi] Full Scan: Found by EXACT NAME match: ID ${id}, Name: "${medicine.name}" (matched against "${normalizedAiEnhancedSearchTerm}")`);
          firstMatchByNameExact = {
            id,
            name: medicine.name,
            composition: medicine.composition,
            barcode: medicine.barcode,
            foundInDb: true,
          };
          break; 
        }

        // Check for composition 'includes' (case-insensitive) - only if no exact name match yet
        if (!firstMatchByComposition && currentMedicineCompositionLower.includes(normalizedAiEnhancedSearchTerm)) {
          console.log(`[mockApi] Full Scan: Found by COMPOSITION INCLUDES: ID ${id}, Name: "${medicine.name}" (matched "${currentMedicineCompositionLower}" against "${normalizedAiEnhancedSearchTerm}")`);
          firstMatchByComposition = {
            id,
            name: medicine.name,
            composition: medicine.composition,
            barcode: medicine.barcode,
            foundInDb: true,
          };
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
      console.log("[mockApi] Full Scan: No matches found by name or composition using normalized term:", normalizedAiEnhancedSearchTerm);
    } else {
      console.log("[mockApi] Full Scan: No medicines data exists at 'medicines' path.");
    }
  } catch (e: any) {
      console.error(`[mockApi] Error during full scan for name/composition query (normalized term: '${normalizedAiEnhancedSearchTerm}'):`, e.message);
  }

  console.log(`[mockApi] Medicine not found in DB after all checks for search term: '${searchTerm}' (normalized: '${normalizedAiEnhancedSearchTerm}')`);
  return { foundInDb: false };
};

