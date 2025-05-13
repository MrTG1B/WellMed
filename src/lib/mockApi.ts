import type { Medicine } from '@/types';
import { db } from './firebase'; // Import Firestore instance
import { doc, getDoc } from 'firebase/firestore';

// mockMedicinesDB remains the source for non-Firebase fields (usage, manufacturer, etc.)
// and a fallback for barcode/composition if Firebase entry doesn't exist or fetch fails.
// The 'composition' and 'barcode' fields here act as fallbacks.
const mockMedicinesDB: (Omit<Medicine, 'composition' | 'barcode'> & { composition?: string; barcode?: string })[] = [
  {
    id: '1',
    name: 'Paracetamol',
    composition: 'Paracetamol 500mg (from mock)', // Fallback
    barcode: '1234567890123 (from mock)', // Fallback
    usage: 'For relief from fever and mild to moderate pain.',
    manufacturer: 'Generic Pharma Ltd.',
    dosage: '1-2 tablets every 4-6 hours as needed, not exceeding 8 tablets in 24 hours.',
    sideEffects: 'Rare, but may include allergic reactions, skin rash. Nausea if taken on empty stomach.',
  },
  {
    id: '2',
    name: 'Amoxicillin',
    composition: 'Amoxicillin 250mg (from mock)', // Fallback
    barcode: '0987654321098 (from mock)', // Fallback
    usage: 'Bacterial infections such as chest infections (including pneumonia) and dental abscesses.',
    manufacturer: 'Rx Drugs Inc.',
    dosage: 'Typically 250mg to 500mg three times a day, or as prescribed by doctor.',
    sideEffects: 'Nausea, diarrhea, rash. Seek medical attention for severe allergic reactions.',
  },
  {
    id: '3',
    name: 'Dolo 650',
    composition: 'Paracetamol 650mg (from mock)', // Fallback
    barcode: '1122334455667 (from mock)', // Fallback
    usage: 'Higher strength for fever and pain relief.',
    manufacturer: 'Micro Labs Ltd.',
    dosage: 'One tablet every 4-6 hours, not exceeding 4 tablets in 24 hours.',
    sideEffects: 'Similar to Paracetamol 500mg, but with higher single dose. Liver damage risk with overdose.',
  },
  {
    id: '4',
    name: 'Crocin',
    composition: 'Paracetamol 500mg (from mock)', // Fallback
    // barcode is optional, can be undefined here or in Firebase
    usage: 'For symptomatic relief of fever, headache, and body ache.',
    manufacturer: 'GSK Consumer Healthcare',
    dosage: '1-2 tablets up to 4 times a day.',
    sideEffects: 'Generally well-tolerated. Overdose can cause liver damage.',
  },
  {
    id: '5',
    name: 'Aspirin',
    composition: 'Acetylsalicylic acid 75mg (from mock)', // Fallback
    barcode: '5556667778889 (from mock)', // Fallback
    usage: 'Low dose for prevention of heart attacks and strokes in high-risk individuals. Pain relief at higher doses.',
    manufacturer: 'Bayer AG',
    dosage: '75mg daily for prevention, or as directed by a physician for pain.',
    sideEffects: 'Stomach irritation, bleeding, tinnitus (ringing in ears). Not for children with viral infections.',
  },
  {
    id: '6',
    name: 'Ibuprofen',
    composition: 'Ibuprofen 200mg (from mock)', // Fallback
    usage: 'Pain relief, fever reduction, anti-inflammatory for conditions like arthritis.',
    manufacturer: 'Various Generic Manufacturers',
    dosage: '200mg-400mg every 4-6 hours as needed. Max 1200mg/day (OTC).',
    sideEffects: 'Nausea, heartburn, stomach ulcers (with long-term use), increased risk of heart attack or stroke.',
  },
  {
    id: '7',
    name: 'Cetirizine',
    composition: 'Cetirizine Dihydrochloride 10mg (from mock)', // Fallback
    barcode: '2244668800112 (from mock)', // Fallback
    usage: 'Relief of symptoms of hay fever and other allergic conditions (e.g., sneezing, runny nose, itchy eyes).',
    manufacturer: 'Dr. Reddy\'s Laboratories',
    dosage: '10mg once daily.',
    sideEffects: 'Drowsiness, dry mouth, fatigue. Less sedating than older antihistamines.',
  },
  {
    id: '8',
    name: 'Omeprazole',
    composition: 'Omeprazole 20mg (from mock)', // Fallback
    barcode: '3355779911223 (from mock)', // Fallback
    usage: 'Treatment of heartburn, acid reflux (GERD), and stomach ulcers.',
    manufacturer: 'AstraZeneca',
    dosage: '20mg once daily, usually before breakfast.',
    sideEffects: 'Headache, diarrhea, abdominal pain. Long-term use may have other effects.',
  },
];

export const fetchMedicineByName = async (name: string): Promise<Medicine | null> => {
  // Simulate network delay for the initial mock search part
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));

  const searchTerm = name.toLowerCase().trim();
  
  const baseMedicineData = mockMedicinesDB.find(
    med => med.name.toLowerCase() === searchTerm
  );

  if (!baseMedicineData) {
    return null; 
  }

  // Initialize medicine object with base data and fallbacks from mock
  // This ensures that 'composition' is always a string, fulfilling the Medicine type.
  let medicine: Medicine = {
    id: baseMedicineData.id,
    name: baseMedicineData.name,
    usage: baseMedicineData.usage,
    manufacturer: baseMedicineData.manufacturer,
    dosage: baseMedicineData.dosage,
    sideEffects: baseMedicineData.sideEffects,
    composition: baseMedicineData.composition || "Composition details not available.", // Fallback
    barcode: baseMedicineData.barcode, // Fallback
  };

  try {
    // Simulate network delay for Firebase fetch.
    // In a real app, Firestore handles its own network latency.
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));
    
    const medicineDocRef = doc(db, 'medicines', baseMedicineData.id);
    const medicineDocSnap = await getDoc(medicineDocRef);

    if (medicineDocSnap.exists()) {
      const firebaseData = medicineDocSnap.data();
      
      // Override with Firebase data if available and valid
      // Composition is expected to be a string.
      if (firebaseData && typeof firebaseData.composition === 'string' && firebaseData.composition.trim() !== '') {
        medicine.composition = firebaseData.composition;
      } else if (firebaseData && firebaseData.composition === undefined) {
        // If composition is explicitly undefined or missing in Firebase, keep the fallback.
        console.warn(`Composition missing or invalid in Firebase for ID ${baseMedicineData.id}. Using fallback.`);
      }

      // Barcode is optional (string or undefined).
      if (firebaseData && (typeof firebaseData.barcode === 'string' || firebaseData.barcode === undefined)) {
         medicine.barcode = firebaseData.barcode;
      }
    } else {
      // Document doesn't exist in Firebase, use the mock data values already set.
      console.log(`Medicine ID ${baseMedicineData.id} (${baseMedicineData.name}) not found in Firebase. Using mock values for composition/barcode.`);
    }
  } catch (error) {
    console.error('Error fetching medicine data from Firebase:', error);
    // In case of error, we're already using mock data as fallback.
    // Toast notifications for errors are handled in MediSearchApp component.
  }

  return medicine;
};
