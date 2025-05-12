import type { Language } from '@/types';

export type TranslationKeys = {
  appName: string;
  searchTitle: string;
  searchPlaceholder: string;
  searchButton: string;
  languageLabel: string;
  english: string;
  hindi: string;
  bengali: string;
  resultsTitle: string;
  noResults: string;
  medicineNameLabel: string;
  compositionLabel: string;
  barcodeLabel: string;
  loadingAi: string;
  loadingData: string;
  errorOccurred: string;
  errorAi: string;
  errorData: string;
  searchWithAiResult: (correctedName: string) => string;
};

export const translations: Record<Language, TranslationKeys> = {
  en: {
    appName: 'MediSearch',
    searchTitle: 'Search for Medicines',
    searchPlaceholder: 'Enter medicine name (e.g., Paracetamol)',
    searchButton: 'Search',
    languageLabel: 'Language',
    english: 'English',
    hindi: 'Hindi',
    bengali: 'Bengali',
    resultsTitle: 'Search Result',
    noResults: 'No medicine found matching your query.',
    medicineNameLabel: 'Name',
    compositionLabel: 'Composition',
    barcodeLabel: 'Barcode',
    loadingAi: 'Enhancing search with AI...',
    loadingData: 'Fetching medicine details...',
    errorOccurred: 'An error occurred. Please try again.',
    errorAi: 'AI search enhancement failed.',
    errorData: 'Failed to fetch medicine data.',
    searchWithAiResult: (correctedName: string) => `AI suggested: "${correctedName}". Searching with this term.`,
  },
  hi: {
    appName: 'मेडि सर्च',
    searchTitle: 'दवाएं खोजें',
    searchPlaceholder: 'दवा का नाम दर्ज करें (जैसे, पैरासिटामोल)',
    searchButton: 'खोजें',
    languageLabel: 'भाषा',
    english: 'अंग्रेज़ी',
    hindi: 'हिंदी',
    bengali: 'बंगाली',
    resultsTitle: 'खोज परिणाम',
    noResults: 'आपकी क्वेरी से मेल खाने वाली कोई दवा नहीं मिली।',
    medicineNameLabel: 'नाम',
    compositionLabel: 'संरचना',
    barcodeLabel: 'बारकोड',
    loadingAi: 'एआई के साथ खोज को बढ़ाया जा रहा है...',
    loadingData: 'दवा का विवरण प्राप्त किया जा रहा है...',
    errorOccurred: 'एक त्रुटि हुई। कृपया पुन: प्रयास करें।',
    errorAi: 'एआई खोज वृद्धि विफल रही।',
    errorData: 'दवा डेटा लाने में विफल।',
    searchWithAiResult: (correctedName: string) => `एआई ने सुझाया: "${correctedName}"। इस शब्द के साथ खोज रहे हैं।`,
  },
  bn: {
    appName: 'মেডিসার্চ',
    searchTitle: 'ওষুধ অনুসন্ধান করুন',
    searchPlaceholder: 'ওষুধের নাম লিখুন (যেমন, প্যারাসিটামল)',
    searchButton: 'অনুসন্ধান',
    languageLabel: 'ভাষা',
    english: 'ইংরেজি',
    hindi: 'হিন্দি',
    bengali: 'বাংলা',
    resultsTitle: 'অনুসন্ধানের ফলাফল',
    noResults: 'আপনার প্রশ্নের সাথে মেলে এমন কোন ওষুধ পাওয়া যায়নি।',
    medicineNameLabel: 'নাম',
    compositionLabel: 'গঠন',
    barcodeLabel: 'বারকোড',
    loadingAi: 'এআই দিয়ে অনুসন্ধান উন্নত করা হচ্ছে...',
    loadingData: 'ওষুধের বিবরণ আনা হচ্ছে...',
    errorOccurred: 'একটি ত্রুটি ঘটেছে। আবার চেষ্টা করুন.',
    errorAi: 'এআই অনুসন্ধান উন্নতি ব্যর্থ হয়েছে।',
    errorData: 'ওষুধের ডেটা আনতে ব্যর্থ হয়েছে।',
    searchWithAiResult: (correctedName: string) => `এআই প্রস্তাবিত: "${correctedName}"। এই শব্দটি দিয়ে অনুসন্ধান করা হচ্ছে।`,
  },
};

export const getTranslations = (lang: Language): TranslationKeys => translations[lang];
