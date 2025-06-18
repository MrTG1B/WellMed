
import type { Medicine } from '@/types';
import { db } from './firebase';
import { ref, get, child, query as dbQuery, orderByChild, equalTo, limitToFirst, startAt, endAt } from 'firebase/database';

interface DbMedicineData {
  drugName: string;
  saltName: string;
  drugCategory?: string;
  drugGroup?: string;
  drugType?: string;
  hsnCode?: string;
  searchKey?: string;
  mrp?: string;
  uom?: string;
  // lastUpdated is not explicitly part of Medicine type but exists in DB
}

interface DbMedicineResult extends DbMedicineData {
  drugCode: string; // This will be the Firebase key
  foundInDb: true;
}


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

  const normalizedSearchTerm = searchTerm.toLowerCase().trim();
  const searchTermOriginalCase = searchTerm.trim(); // For exact HSN/Drug Code matching
  const allMatches: DbMedicineResult[] = [];
  const foundDrugCodes = new Set<string>();

  // 1. Attempt to fetch by direct drugCode (Firebase key)
  // Firebase keys are strings, but often numeric. Users might type "01" or "1".
  // We'll try the original input as a key first.
  try {
    const directIdSnapshot = await get(child(medicinesRef, searchTermOriginalCase));
    if (directIdSnapshot.exists()) {
      const data = directIdSnapshot.val() as DbMedicineData;
      if (data && data.drugName && data.saltName && !foundDrugCodes.has(searchTermOriginalCase)) {
        allMatches.push({
          drugCode: directIdSnapshot.key!,
          ...data,
          foundInDb: true,
        });
        foundDrugCodes.add(searchTermOriginalCase);
        // If found by direct code, it's likely the most specific match, return immediately.
        return allMatches;
      }
    }
  } catch (e: any) {
    console.error(`[mockApi] Error fetching medicine by direct drugCode '${searchTermOriginalCase}':`, e.message);
  }


  // 2. Full scan for HSN Code, Drug Name, Salt Name, Search Key
  const medicinesRef = ref(db, 'medicines');
  try {
    const allMedicinesSnapshot = await get(medicinesRef);
    if (allMedicinesSnapshot.exists()) {
      const medicinesData = allMedicinesSnapshot.val();
      const searchTermsParts = normalizedSearchTerm.split(/\s+/).filter(part => part.length > 1);

      for (const drugCodeKey in medicinesData) {
        if (foundDrugCodes.has(drugCodeKey)) continue;

        const medicine = medicinesData[drugCodeKey] as DbMedicineData;
        if (!medicine || typeof medicine.drugName !== 'string' || typeof medicine.saltName !== 'string') {
          continue;
        }

        const drugNameLower = medicine.drugName.toLowerCase();
        const saltNameLower = medicine.saltName.toLowerCase();
        const searchKeyLower = medicine.searchKey?.toLowerCase() || "";
        const hsnCodeOriginal = medicine.hsnCode || ""; // Match HSN code case-sensitively or as stored

        let match = false;

        // Exact HSN Code match
        if (hsnCodeOriginal && hsnCodeOriginal === searchTermOriginalCase) {
          match = true;
        }
        // Exact Drug Code match (if not caught by key lookup, e.g., if key has non-numeric parts but user searches for it)
        else if (drugCodeKey.toLowerCase() === normalizedSearchTerm) {
            match = true;
        }
        // Substring matches for name, salt, searchKey
        else if (drugNameLower.includes(normalizedSearchTerm) || saltNameLower.includes(normalizedSearchTerm) || searchKeyLower.includes(normalizedSearchTerm)) {
          match = true;
        }
        // Multi-part search term match
        else if (searchTermsParts.length > 0) {
            const nameMatches = searchTermsParts.every(part => drugNameLower.includes(part));
            const saltMatches = searchTermsParts.every(part => saltNameLower.includes(part));
            const searchKeyMatches = searchTermsParts.every(part => searchKeyLower.includes(part));
            if (nameMatches || saltMatches || searchKeyMatches) {
                match = true;
            }
        }
        
        if (match) {
          allMatches.push({
            drugCode: drugCodeKey,
            ...medicine,
            foundInDb: true,
          });
          foundDrugCodes.add(drugCodeKey);
        }
      }
    }
  } catch (e: any) {
      console.error(`[mockApi] Error during full scan for query (normalized term: '${normalizedSearchTerm}'):`, e.message);
  }
  
  // Sort results for consistency, perhaps by drugName
  allMatches.sort((a, b) => a.drugName.localeCompare(b.drugName));
  
  return allMatches;
};


export const fetchSuggestions = async (query: string): Promise<string[]> => {
  if (!db || query.trim().length < 2) {
    return [];
  }
  const normalizedQuery = query.toLowerCase().trim();
  const medicinesRef = ref(db, 'medicines');
  const suggestions: string[] = [];
  const addedSuggestions = new Set<string>();

  try {
    const snapshot = await get(medicinesRef);
    if (snapshot.exists()) {
      const medicinesData = snapshot.val();
      for (const drugCodeKey in medicinesData) {
        if (suggestions.length >= 7) break;

        const medicine = medicinesData[drugCodeKey] as DbMedicineData;
        if (medicine) {
          // Suggest Drug Name
          if (medicine.drugName && medicine.drugName.toLowerCase().includes(normalizedQuery) && !addedSuggestions.has(medicine.drugName)) {
            suggestions.push(medicine.drugName);
            addedSuggestions.add(medicine.drugName);
          }
          if (suggestions.length >= 7) break;
          
          // Suggest Salt Name
          if (medicine.saltName && medicine.saltName.toLowerCase().includes(normalizedQuery) && !addedSuggestions.has(medicine.saltName)) {
            suggestions.push(medicine.saltName);
            addedSuggestions.add(medicine.saltName);
          }
          if (suggestions.length >= 7) break;

          // Suggest Search Key
          if (medicine.searchKey && medicine.searchKey.toLowerCase().includes(normalizedQuery) && !addedSuggestions.has(medicine.searchKey)) {
             if (!addedSuggestions.has(medicine.drugName) && !addedSuggestions.has(medicine.saltName)) { // Avoid redundant suggestions if searchKey is same as name/salt
                suggestions.push(medicine.searchKey);
                addedSuggestions.add(medicine.searchKey);
             }
          }
           if (suggestions.length >= 7) break;

          // Suggest Drug Code (if query is numeric or starts with it)
          if (drugCodeKey.toLowerCase().startsWith(normalizedQuery) && !addedSuggestions.has(drugCodeKey)) {
            suggestions.push(drugCodeKey);
            addedSuggestions.add(drugCodeKey);
          }
          if (suggestions.length >= 7) break;

          // Suggest HSN Code (if query matches start of HSN)
          if (medicine.hsnCode && medicine.hsnCode.toLowerCase().startsWith(normalizedQuery) && !addedSuggestions.has(medicine.hsnCode)) {
            suggestions.push(medicine.hsnCode);
            addedSuggestions.add(medicine.hsnCode);
          }
        }
      }
    }
  } catch (error) {
    console.error("[mockApi] Error fetching suggestions:", error);
  }
  // Remove duplicates that might have been added if searchKey is same as drugName/saltName but was added separately
  return Array.from(new Set(suggestions)).slice(0, 7);
};

    