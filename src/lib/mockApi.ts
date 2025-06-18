
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
  const medicinesRef = ref(db, 'medicines');
  const allMatches: DbMedicineResult[] = [];
  const foundDrugCodes = new Set<string>();

  // 1. Attempt to fetch by direct drugCode (if searchTerm is numeric, as Firebase keys are numeric strings)
  if (/^\d+$/.test(normalizedSearchTerm)) {
    try {
      const directIdSnapshot = await get(child(medicinesRef, normalizedSearchTerm));
      if (directIdSnapshot.exists()) {
        const data = directIdSnapshot.val() as DbMedicineData;
        if (data && data.drugName && data.saltName && !foundDrugCodes.has(normalizedSearchTerm)) {
          allMatches.push({
            drugCode: directIdSnapshot.key!,
            ...data,
            foundInDb: true,
          });
          foundDrugCodes.add(normalizedSearchTerm);
          // If found by direct code, assume it's the most specific match
          return allMatches;
        }
      }
    } catch (e: any) {
      console.error(`[mockApi] Error fetching medicine by direct drugCode '${normalizedSearchTerm}':`, e.message);
    }
  }

  // 2. Full scan and match against drugName, saltName, searchKey (case-insensitive)
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

        let match = false;
        if (drugNameLower.includes(normalizedSearchTerm) || saltNameLower.includes(normalizedSearchTerm) || searchKeyLower.includes(normalizedSearchTerm)) {
          match = true;
        } else if (searchTermsParts.length > 0) {
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
      console.error(`[mockApi] Error during full scan for name/salt/key query (normalized term: '${normalizedSearchTerm}'):`, e.message);
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
          if (medicine.drugName && medicine.drugName.toLowerCase().startsWith(normalizedQuery) && !addedSuggestions.has(medicine.drugName)) {
            suggestions.push(medicine.drugName);
            addedSuggestions.add(medicine.drugName);
          }
          if (suggestions.length >= 7) break;
          
          if (medicine.saltName && medicine.saltName.toLowerCase().includes(normalizedQuery) && !addedSuggestions.has(medicine.saltName) && suggestions.length < 7) {
            suggestions.push(medicine.saltName);
            addedSuggestions.add(medicine.saltName);
          }
           if (suggestions.length >= 7) break;

          if (medicine.searchKey && medicine.searchKey.toLowerCase().includes(normalizedQuery) && !addedSuggestions.has(medicine.searchKey) && suggestions.length < 7) {
             // Only add searchKey if it's different from drugName or saltName already added
             if (!addedSuggestions.has(medicine.drugName) && !addedSuggestions.has(medicine.saltName)) {
                suggestions.push(medicine.searchKey);
                addedSuggestions.add(medicine.searchKey);
             }
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

