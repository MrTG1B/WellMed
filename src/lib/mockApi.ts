import type { Medicine } from '@/types';

const mockMedicinesDB: Medicine[] = [
  { id: '1', name: 'Paracetamol', composition: 'Paracetamol 500mg', barcode: '1234567890123' },
  { id: '2', name: 'Amoxicillin', composition: 'Amoxicillin 250mg', barcode: '0987654321098' },
  { id: '3', name: 'Dolo 650', composition: 'Paracetamol 650mg', barcode: '1122334455667' },
  { id: '4', name: 'Crocin', composition: 'Paracetamol 500mg' }, // No barcode
  { id: '5', name: 'Aspirin', composition: 'Acetylsalicylic acid 75mg', barcode: '5556667778889' },
  { id: '6', name: 'Ibuprofen', composition: 'Ibuprofen 200mg' },
  { id: '7', name: 'Cetirizine', composition: 'Cetirizine Dihydrochloride 10mg', barcode: '2244668800112' },
  { id: '8', name: 'Omeprazole', composition: 'Omeprazole 20mg', barcode: '3355779911223' },
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
