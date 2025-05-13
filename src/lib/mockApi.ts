
import type { Medicine } from '@/types';
import { db } from './firebase'; // Import Realtime Database instance
import { ref, get, child } from 'firebase/database'; // Changed from firestore

// mockMedicinesDB remains the source for non-Firebase fields (usage, manufacturer, etc.)
// and a fallback for barcode/composition if Firebase entry doesn't exist or fetch fails.
const mockMedicinesDB: (Omit<Medicine, 'composition' | 'barcode'> & { composition?: string; barcode?: string })[] = [
  {
    id: 'paracetamol', // Using lowercase and hyphenated IDs consistent with AdminUploadForm
    name: 'Paracetamol',
    composition: 'Paracetamol 500mg', 
    barcode: '1234567890123', 
    usage: 'For relief from fever and mild to moderate pain.',
    manufacturer: 'Generic Pharma Ltd.',
    dosage: '1-2 tablets every 4-6 hours as needed, not exceeding 8 tablets in 24 hours.',
    sideEffects: 'Rare, but may include allergic reactions, skin rash. Nausea if taken on empty stomach.',
  },
  {
    id: 'amoxicillin',
    name: 'Amoxicillin',
    composition: 'Amoxicillin 250mg', 
    barcode: '0987654321098', 
    usage: 'Bacterial infections such as chest infections (including pneumonia) and dental abscesses.',
    manufacturer: 'Rx Drugs Inc.',
    dosage: 'Typically 250mg to 500mg three times a day, or as prescribed by doctor.',
    sideEffects: 'Nausea, diarrhea, rash. Seek medical attention for severe allergic reactions.',
  },
  {
    id: 'dolo-650',
    name: 'Dolo 650',
    composition: 'Paracetamol 650mg', 
    barcode: '1122334455667', 
    usage: 'Higher strength for fever and pain relief.',
    manufacturer: 'Micro Labs Ltd.',
    dosage: 'One tablet every 4-6 hours, not exceeding 4 tablets in 24 hours.',
    sideEffects: 'Similar to Paracetamol 500mg, but with higher single dose. Liver damage risk with overdose.',
  },
  {
    id: 'crocin',
    name: 'Crocin',
    composition: 'Paracetamol 500mg',
    usage: 'For symptomatic relief of fever, headache, and body ache.',
    manufacturer: 'GSK Consumer Healthcare',
    dosage: '1-2 tablets up to 4 times a day.',
    sideEffects: 'Generally well-tolerated. Overdose can cause liver damage.',
  },
  {
    id: 'aspirin',
    name: 'Aspirin',
    composition: 'Acetylsalicylic acid 75mg', 
    barcode: '5556667778889', 
    usage: 'Low dose for prevention of heart attacks and strokes in high-risk individuals. Pain relief at higher doses.',
    manufacturer: 'Bayer AG',
    dosage: '75mg daily for prevention, or as directed by a physician for pain.',
    sideEffects: 'Stomach irritation, bleeding, tinnitus (ringing in ears). Not for children with viral infections.',
  },
  {
    id: 'ibuprofen',
    name: 'Ibuprofen',
    composition: 'Ibuprofen 200mg', 
    usage: 'Pain relief, fever reduction, anti-inflammatory for conditions like arthritis.',
    manufacturer: 'Various Generic Manufacturers',
    dosage: '200mg-400mg every 4-6 hours as needed. Max 1200mg/day (OTC).',
    sideEffects: 'Nausea, heartburn, stomach ulcers (with long-term use), increased risk of heart attack or stroke.',
  },
  {
    id: 'cetirizine',
    name: 'Cetirizine',
    composition: 'Cetirizine Dihydrochloride 10mg', 
    barcode: '2244668800112', 
    usage: 'Relief of symptoms of hay fever and other allergic conditions (e.g., sneezing, runny nose, itchy eyes).',
    manufacturer: 'Dr. Reddy\'s Laboratories',
    dosage: '10mg once daily.',
    sideEffects: 'Drowsiness, dry mouth, fatigue. Less sedating than older antihistamines.',
  },
  {
    id: 'omeprazole',
    name: 'Omeprazole',
    composition: 'Omeprazole 20mg', 
    barcode: '3355779911223', 
    usage: 'Treatment of heartburn, acid reflux (GERD), and stomach ulcers.',
    manufacturer: 'AstraZeneca',
    dosage: '20mg once daily, usually before breakfast.',
    sideEffects: 'Headache, diarrhea, abdominal pain. Long-term use may have other effects.',
  },
];

export const fetchMedicineByName = async (query: string): Promise<Medicine | null> => {
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));

  const normalizedQuery = query.toLowerCase().trim();
  const medicineIdForFirebase = normalizedQuery.replace(/\s+/g, "-").replace(/[^\w-]+/g, '');


  let baseMedicineData = mockMedicinesDB.find(
    med => med.name.toLowerCase() === normalizedQuery || med.id === medicineIdForFirebase
  );

  if (!baseMedicineData) {
    baseMedicineData = mockMedicinesDB.find(
      med => med.barcode === normalizedQuery 
    );
  }
  
  if (!baseMedicineData) {
    baseMedicineData = mockMedicinesDB.find(
      med => med.composition?.toLowerCase().includes(normalizedQuery) 
    );
  }
  
  // If still no base data, try to construct a minimal one if query itself is a potential ID
  if (!baseMedicineData && medicineIdForFirebase) {
      // This case implies the ID might exist in RTDB but not in mock.
      // We'll rely on RTDB fetch entirely for name, composition, barcode.
      // For other fields, we can't provide them.
      console.log(`No mock data for query '${query}', will attempt RTDB fetch with ID '${medicineIdForFirebase}'.`)
  }


  // If no base mock data found at all, and it's not just an ID lookup, return null early
  if (!baseMedicineData && !medicineIdForFirebase) {
    return null; 
  }
  
  const effectiveMedicineId = baseMedicineData ? baseMedicineData.id : medicineIdForFirebase;

  if (!effectiveMedicineId) {
      console.warn(`Could not determine an effective medicine ID for query: ${query}`);
      return null;
  }


  // Initialize medicine object, prioritizing mock data if available
  let medicine: Medicine = {
    id: effectiveMedicineId,
    name: baseMedicineData?.name || query, // Use query as fallback name if only ID was matched
    usage: baseMedicineData?.usage || "Usage information not available.",
    manufacturer: baseMedicineData?.manufacturer || "Manufacturer information not available.",
    dosage: baseMedicineData?.dosage || "Dosage information not available.",
    sideEffects: baseMedicineData?.sideEffects || "Side effects information not available.",
    composition: baseMedicineData?.composition || "Composition details not available.",
    barcode: baseMedicineData?.barcode,
  };

  try {
    if (!db) {
      console.error("Firebase Realtime Database (db) is not initialized in mockApi. Using only mock data.");
      // If baseMedicineData was found, 'medicine' is already populated with it.
      // If only an ID was derived, it will have many "not available" fields.
      return baseMedicineData ? medicine : null;
    }

    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));
    
    const medicineRTDBRef = child(ref(db, 'medicines'), effectiveMedicineId);
    const snapshot = await get(medicineRTDBRef);

    if (snapshot.exists()) {
      const firebaseData = snapshot.val();
      
      // Override with Firebase data if available
      if (firebaseData) {
        medicine.name = firebaseData.name || medicine.name; // Keep mock name if RTDB name is missing
        
        if (typeof firebaseData.composition === 'string' && firebaseData.composition.trim() !== '') {
          medicine.composition = firebaseData.composition;
        } else if (firebaseData.composition === undefined && !baseMedicineData?.composition) {
          medicine.composition = "Composition details not available.";
        }
        // else, keep mock composition if firebaseData.composition is not a valid string

        if (firebaseData.barcode !== undefined) { // RTDB can store null, which is fine
            medicine.barcode = typeof firebaseData.barcode === 'string' ? firebaseData.barcode : undefined;
        } else if (baseMedicineData?.barcode !== undefined) {
            // If firebase barcode is undefined, keep mock barcode
            medicine.barcode = baseMedicineData.barcode;
        }
        // If both are undefined, medicine.barcode remains undefined.
      }
    } else {
      console.log(`Medicine ID ${effectiveMedicineId} not found in Realtime Database. Using local mock values if available.`);
      // If not in RTDB, and we didn't find it in mockMedicinesDB earlier, then it doesn't exist
      if (!baseMedicineData) return null; 
    }
  } catch (error) {
    console.error('Error fetching medicine data from Firebase Realtime Database:', error);
    // In case of error, 'medicine' is already populated with mock data (if found)
    // or with "not available" fallbacks.
    // If no baseMedicineData was found, it should return null.
    return baseMedicineData ? medicine : null;
  }

  return medicine;
};
