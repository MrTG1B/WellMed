export type Medicine = {
  id: string;
  name: string; // English name, used for searching and display
  composition: string; // English composition, used for display
  usage: string; // New field: How and when to use the medicine
  manufacturer: string; // New field: Who manufactured the medicine
  dosage: string; // New field: Recommended dosage
  sideEffects: string; // New field: Potential side effects
  barcode?: string;
};

export type Language = 'en' | 'hi' | 'bn';

