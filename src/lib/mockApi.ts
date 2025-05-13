
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
    console.error("Firebase Realtime Database (db) is not initialized in mockApi. Cannot fetch from DB.");
    return { foundInDb: false };
  }
  if (!searchTerm || searchTerm.trim() === "") {
    return { foundInDb: false };
  }

  const normalizedAiEnhancedSearchTerm = searchTerm.toLowerCase().trim();
  const medicinesRef = ref(db, 'medicines');

  // Attempt 1: Direct ID lookup (using the AI-enhanced, normalized term as a potential ID)
  // Assumes IDs are typically lowercase and hyphenated as per AdminUploadForm logic.
  // The regex for medicineId in AdminUploadForm is /^[a-zA-Z0-9-_]+$/ which can be mixed case.
  // For ID lookup, we should try both the normalized form and the original form if it matches ID pattern.
  const potentialIdsToTry = new Set<string>();
  potentialIdsToTry.add(normalizedAiEnhancedSearchTerm); // Try normalized form first
  if (searchTerm.trim().match(/^[a-zA-Z0-9-_]+$/)) { // Check if original search term looks like an ID
    potentialIdsToTry.add(searchTerm.trim());
  }


  for (const potentialId of potentialIdsToTry) {
    try {
      const directIdSnapshot = await get(child(medicinesRef, potentialId));
      if (directIdSnapshot.exists()) {
        const data = directIdSnapshot.val();
        if (data && data.name && data.composition) { // Ensure crucial fields exist
          console.log(`Found by ID: ${potentialId}`);
          return {
            id: directIdSnapshot.key!,
            name: data.name,
            composition: data.composition,
            barcode: data.barcode,
            foundInDb: true,
          };
        }
      }
    } catch (e) {
      console.error(`Error fetching medicine by direct ID '${potentialId}':`, e);
    }
  }
  
  // Attempt 2: Query by barcode
  // Using searchTerm.trim() as barcodes are usually exact and might not be lowercased by AI enhancement.
  // Firebase rule index needed: { "rules": { "medicines": { ".indexOn": "barcode" } } }
  const originalSearchTermTrimmed = searchTerm.trim(); // Use the term before toLowerCase for barcode
  try {
    const barcodeQueryInstance = dbQuery(medicinesRef, orderByChild('barcode'), equalTo(originalSearchTermTrimmed), limitToFirst(1));
    const barcodeSnapshot = await get(barcodeQueryInstance);
    if (barcodeSnapshot.exists()) {
      const data = barcodeSnapshot.val();
      const id = Object.keys(data)[0];
      const medicine = data[id];
      if (medicine && medicine.name && medicine.composition) {
        console.log(`Found by barcode: ${originalSearchTermTrimmed}`);
        return {
          id,
          name: medicine.name,
          composition: medicine.composition,
          barcode: medicine.barcode,
          foundInDb: true,
        };
      }
    }
  } catch (e) {
    console.error(`Error fetching medicine by barcode '${originalSearchTermTrimmed}':`, e);
    // Log this error, especially if it's about missing index.
    if (e instanceof Error && (e.message.includes("indexON") || e.message.includes("orderByChild"))){
        console.warn("Firebase Realtime Database: Consider adding an index for 'barcode' in your security rules for efficient querying: \n{\n  \"rules\": {\n    \"medicines\": {\n      \".indexOn\": [\"barcode\"]\n    }\n  }\n}");
    }
  }
  
  // Attempt 3 & 4: Full scan for Name (exact match) or Composition (includes match)
  // Fetch all medicines once for these checks. This is not efficient for large datasets.
  try {
    const allMedicinesSnapshot = await get(medicinesRef);
    if (allMedicinesSnapshot.exists()) {
      const medicinesData = allMedicinesSnapshot.val();
      
      let foundByName: DbMedicineResult | null = null;
      let foundByComposition: DbMedicineResult | null = null;

      for (const id in medicinesData) {
        const medicine = medicinesData[id];
        if (!medicine || !medicine.name || !medicine.composition) continue; // Skip malformed records

        // Check for exact name match (case-insensitive)
        if (typeof medicine.name === 'string' && medicine.name.toLowerCase() === normalizedAiEnhancedSearchTerm) {
          console.log(`Found by name (exact match): ${medicine.name} (search term: ${normalizedAiEnhancedSearchTerm})`);
          foundByName = {
            id,
            name: medicine.name,
            composition: medicine.composition,
            barcode: medicine.barcode,
            foundInDb: true,
          };
          break; // Prioritize exact name match
        }
      }

      if (foundByName) return foundByName;

      // If not found by exact name, check for composition 'includes' (case-insensitive)
      for (const id in medicinesData) {
        const medicine = medicinesData[id];
         if (!medicine || !medicine.name || !medicine.composition) continue; // Skip malformed records

        if (typeof medicine.composition === 'string' && medicine.composition.toLowerCase().includes(normalizedAiEnhancedSearchTerm)) {
          console.log(`Found by composition (includes): ${medicine.composition} (search term: ${normalizedAiEnhancedSearchTerm})`);
          foundByComposition = { // Don't break here, find the first, but name match would have priority
            id,
            name: medicine.name,
            composition: medicine.composition,
            barcode: medicine.barcode,
            foundInDb: true,
          };
          break; 
        }
      }
      
      if (foundByComposition) return foundByComposition;
    }
  } catch (e) {
      console.error(`Error fetching/processing all medicines for name/composition query (normalized term: '${normalizedAiEnhancedSearchTerm}'):`, e);
  }

  console.log(`Medicine not found in DB for search term: '${searchTerm}' (normalized: '${normalizedAiEnhancedSearchTerm}')`);
  return { foundInDb: false };
};
