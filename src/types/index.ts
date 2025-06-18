
export type Medicine = {
  drugCode: string; // The primary key from Firebase (e.g., "1", "2")
  drugName: string;
  saltName: string; // Replaces 'composition'
  drugCategory?: string;
  drugGroup?: string;
  drugType?: string;
  hsnCode?: string;
  searchKey?: string;
  // AI Generated fields
  usage: string;
  manufacturer: string;
  dosage: string;
  sideEffects: string;
  // Source field
  source: 'database_ai_enhanced' | 'ai_generated' | 'database_only' | 'ai_unavailable' | 'ai_failed';
};

export type Language = 'en' | 'hi' | 'bn';

