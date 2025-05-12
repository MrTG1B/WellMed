export type Medicine = {
  id: string;
  name: string; // English name, used for searching and display
  composition: string; // English composition, used for display
  barcode?: string;
};

export type Language = 'en' | 'hi' | 'bn';
