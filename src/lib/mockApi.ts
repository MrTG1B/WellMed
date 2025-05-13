
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
  searchTerm: string
): Promise<DbMedicineResult | NotFoundResult> => {
  if (!db) {
    console.error("Firebase Realtime Database (db) is not initialized in mockApi. Cannot fetch from DB.");
    return { foundInDb: false };
  }
  if (!searchTerm || searchTerm.trim() === "") {
    return { foundInDb: false };
  }

  const normalizedQuery = searchTerm.toLowerCase().trim();
  const medicinesRef = ref(db, 'medicines');

  // Attempt 1: Direct ID lookup (if searchTerm could be an ID)
  // An ID is typically one word, possibly with hyphens/numbers, e.g., "paracetamol-500"
  if (/^[a-z0-9-]+$/.test(normalizedQuery)) {
    try {
      const directIdSnapshot = await get(child(medicinesRef, normalizedQuery));
      if (directIdSnapshot.exists()) {
        const data = directIdSnapshot.val();
        return {
          id: directIdSnapshot.key!,
          name: data.name,
          composition: data.composition,
          barcode: data.barcode,
          foundInDb: true,
        };
      }
    } catch (e) {
      console.error(`Error fetching medicine by direct ID '${normalizedQuery}':`, e);
    }
  }
  

  // Attempt 2: Query by name (exact match, case-insensitive handled by normalization)
  // Firebase RTDB queries are case-sensitive for strings. We fetch all and filter, or store a normalized name.
  // For simplicity with current structure, we'll fetch all and filter. This is not efficient for large datasets.
  // A more scalable solution would involve pre-normalized fields or using a search service like Algolia/Elasticsearch.
  try {
    const snapshot = await get(medicinesRef);
    if (snapshot.exists()) {
      const medicinesData = snapshot.val();
      for (const id in medicinesData) {
        const medicine = medicinesData[id];
        if (medicine.name && medicine.name.toLowerCase() === normalizedQuery) {
          return {
            id,
            name: medicine.name,
            composition: medicine.composition,
            barcode: medicine.barcode,
            foundInDb: true,
          };
        }
      }
    }
  } catch (e) {
      console.error(`Error fetching all medicines for name query '${normalizedQuery}':`, e);
  }


  // Attempt 3: Query by barcode
  try {
     // This requires an index on 'barcode' in Realtime Database rules for performance.
     // { "rules": { "medicines": { ".indexOn": ["barcode"] } } }
    const barcodeQuery = dbQuery(medicinesRef, orderByChild('barcode'), equalTo(searchTerm.trim()), limitToFirst(1));
    const barcodeSnapshot = await get(barcodeQuery);
    if (barcodeSnapshot.exists()) {
      const data = barcodeSnapshot.val();
      const id = Object.keys(data)[0];
      const medicine = data[id];
      return {
        id,
        name: medicine.name,
        composition: medicine.composition,
        barcode: medicine.barcode,
        foundInDb: true,
      };
    }
  } catch (e) {
    console.error(`Error fetching medicine by barcode '${searchTerm.trim()}':`, e);
  }
  

  // Attempt 4: Query by composition (contains, case-insensitive)
  // Similar to name, this is inefficient without proper indexing/search service.
  try {
    const snapshot = await get(medicinesRef); // Re-fetch if not cached or if previous attempts failed early
    if (snapshot.exists()) {
      const medicinesData = snapshot.val();
      for (const id in medicinesData) {
        const medicine = medicinesData[id];
        if (medicine.composition && medicine.composition.toLowerCase().includes(normalizedQuery)) {
          return {
            id,
            name: medicine.name,
            composition: medicine.composition,
            barcode: medicine.barcode,
            foundInDb: true,
          };
        }
      }
    }
  } catch(e) {
      console.error(`Error fetching all medicines for composition query '${normalizedQuery}':`, e);
  }

  return { foundInDb: false };
};

// The mockMedicinesDB array is no longer used as the primary source for name/composition/barcode.
// AI will generate usage, manufacturer, dosage, sideEffects.
// If you need a hardcoded fallback for the entire app for some reason, it could be placed here,
// but the current request implies Firebase then AI.
