
export type Medicine = {
  id: string; // If from DB, it's the DB key. If AI-generated, it's a derived/temporary ID.
  name: string;
  composition: string;
  usage: string;
  manufacturer: string;
  dosage: string;
  sideEffects: string;
  barcode?: string;
  mrp?: string | number; // Maximum Retail Price
  uom?: string; // Unit of Measure (e.g., "10 tablets", "100ml bottle")
  source: 'database_ai_enhanced' | 'ai_generated' | 'database_only' | 'ai_unavailable' | 'ai_failed'; // Indicates the origin of the data
};

export type Language = 'en' | 'hi' | 'bn';
