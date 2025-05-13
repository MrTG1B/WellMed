import type { Medicine } from '@/types';

const mockMedicinesDB: Medicine[] = [
  {
    id: '1',
    name: 'Paracetamol',
    composition: 'Paracetamol 500mg',
    usage: 'For relief from fever and mild to moderate pain.',
    manufacturer: 'Generic Pharma Ltd.',
    dosage: '1-2 tablets every 4-6 hours as needed, not exceeding 8 tablets in 24 hours.',
    sideEffects: 'Rare, but may include allergic reactions, skin rash. Nausea if taken on empty stomach.',
    barcode: '1234567890123',
  },
  {
    id: '2',
    name: 'Amoxicillin',
    composition: 'Amoxicillin 250mg',
    usage: 'Bacterial infections such as chest infections (including pneumonia) and dental abscesses.',
    manufacturer: 'Rx Drugs Inc.',
    dosage: 'Typically 250mg to 500mg three times a day, or as prescribed by doctor.',
    sideEffects: 'Nausea, diarrhea, rash. Seek medical attention for severe allergic reactions.',
    barcode: '0987654321098',
  },
  {
    id: '3',
    name: 'Dolo 650',
    composition: 'Paracetamol 650mg',
    usage: 'Higher strength for fever and pain relief.',
    manufacturer: 'Micro Labs Ltd.',
    dosage: 'One tablet every 4-6 hours, not exceeding 4 tablets in 24 hours.',
    sideEffects: 'Similar to Paracetamol 500mg, but with higher single dose. Liver damage risk with overdose.',
    barcode: '1122334455667',
  },
  {
    id: '4',
    name: 'Crocin',
    composition: 'Paracetamol 500mg',
    usage: 'For symptomatic relief of fever, headache, and body ache.',
    manufacturer: 'GSK Consumer Healthcare',
    dosage: '1-2 tablets up to 4 times a day.',
    sideEffects: 'Generally well-tolerated. Overdose can cause liver damage.',
    // No barcode
  },
  {
    id: '5',
    name: 'Aspirin',
    composition: 'Acetylsalicylic acid 75mg',
    usage: 'Low dose for prevention of heart attacks and strokes in high-risk individuals. Pain relief at higher doses.',
    manufacturer: 'Bayer AG',
    dosage: '75mg daily for prevention, or as directed by a physician for pain.',
    sideEffects: 'Stomach irritation, bleeding, tinnitus (ringing in ears). Not for children with viral infections.',
    barcode: '5556667778889',
  },
  {
    id: '6',
    name: 'Ibuprofen',
    composition: 'Ibuprofen 200mg',
    usage: 'Pain relief, fever reduction, anti-inflammatory for conditions like arthritis.',
    manufacturer: 'Various Generic Manufacturers',
    dosage: '200mg-400mg every 4-6 hours as needed. Max 1200mg/day (OTC).',
    sideEffects: 'Nausea, heartburn, stomach ulcers (with long-term use), increased risk of heart attack or stroke.',
  },
  {
    id: '7',
    name: 'Cetirizine',
    composition: 'Cetirizine Dihydrochloride 10mg',
    usage: 'Relief of symptoms of hay fever and other allergic conditions (e.g., sneezing, runny nose, itchy eyes).',
    manufacturer: 'Dr. Reddy\'s Laboratories',
    dosage: '10mg once daily.',
    sideEffects: 'Drowsiness, dry mouth, fatigue. Less sedating than older antihistamines.',
    barcode: '2244668800112',
  },
  {
    id: '8',
    name: 'Omeprazole',
    composition: 'Omeprazole 20mg',
    usage: 'Treatment of heartburn, acid reflux (GERD), and stomach ulcers.',
    manufacturer: 'AstraZeneca',
    dosage: '20mg once daily, usually before breakfast.',
    sideEffects: 'Headache, diarrhea, abdominal pain. Long-term use may have other effects.',
    barcode: '3355779911223',
  },
];

export const fetchMedicineByName = async (name: string): Promise<Medicine | null> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 700 + Math.random() * 500));

  const searchTerm = name.toLowerCase().trim();
  const foundMedicine = mockMedicinesDB.find(
    med => med.name.toLowerCase() === searchTerm
  );

  if (foundMedicine) {
    return { ...foundMedicine }; // Return a copy
  }
  return null;
};
