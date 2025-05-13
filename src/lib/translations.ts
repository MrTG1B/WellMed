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
  noResultsTitle: string; 
  medicineNameLabel: string;
  compositionLabel: string;
  usageLabel: string;
  manufacturerLabel: string;
  dosageLabel: string;
  sideEffectsLabel: string;
  barcodeLabel: string;
  loadingAi: string;
  loadingData: string;
  loadingAiDetails: string; 
  errorOccurred: string;
  errorAi: string;
  errorData: string;
  errorAiDetails: string; 
  errorAiDetailsShort: string;
  searchWithAiResult: (correctedName: string) => string;
  clearSearchButton: string;
  sourceDbAiMessage: string; 
  sourceAiOnlyMessage: string; 
  sourceDbOnlyMessage: string; 
  sourceAiUnavailableMessage: string; // New
  sourceAiFailedMessage: string; // New
  notFoundInDbAiGenerating: string; 
  barcodeNotAvailable: string; 
  initialHelperText: string; 
  allRightsReserved: string; 
  infoNotAvailable: string; 
};

export const translations: Record<Language, TranslationKeys> = {
  en: {
    appName: 'WellMeds',
    searchTitle: 'Search for Medicines',
    searchPlaceholder: 'Enter medicine name, barcode, or composition...',
    searchButton: 'Search',
    languageLabel: 'Language',
    english: 'English',
    hindi: 'Hindi',
    bengali: 'Bengali',
    resultsTitle: 'Search Result',
    noResults: 'No medicine found matching your query. AI is attempting to provide general information if possible.',
    noResultsTitle: 'No Specific Match Found',
    medicineNameLabel: 'Name',
    compositionLabel: 'Composition',
    usageLabel: 'Usage',
    manufacturerLabel: 'Manufacturer',
    dosageLabel: 'Dosage',
    sideEffectsLabel: 'Side Effects',
    barcodeLabel: 'Barcode',
    loadingAi: 'Enhancing search with AI...',
    loadingData: 'Searching database...',
    loadingAiDetails: 'Generating details with AI...',
    errorOccurred: 'An Error Occurred',
    errorAi: 'AI search enhancement failed. Using original query.',
    errorData: 'Failed to fetch medicine data from database.',
    errorAiDetails: 'AI failed to generate complete details.',
    errorAiDetailsShort: 'AI details failed.',
    searchWithAiResult: (correctedName: string) => `AI suggested: "${correctedName}". Searching with this term.`,
    clearSearchButton: 'Clear Search',
    sourceDbAiMessage: 'Details from database, enhanced by AI.',
    sourceAiOnlyMessage: 'Medicine not in database. Details primarily AI-generated.',
    sourceDbOnlyMessage: 'Details from database. AI enhancement for full details failed.',
    sourceAiUnavailableMessage: 'Details from database. AI not available for full details.', // New
    sourceAiFailedMessage: 'Medicine not in database. AI generation failed.', // New
    notFoundInDbAiGenerating: 'Medicine not found in database. Attempting to generate details with AI.',
    barcodeNotAvailable: 'Not available',
    initialHelperText: 'Enter a medicine name, barcode, or composition to begin your search.',
    allRightsReserved: 'All rights reserved.',
    infoNotAvailable: "Information not available.",
  },
  hi: {
    appName: 'वेलमेड्स',
    searchTitle: 'दवाएं खोजें',
    searchPlaceholder: 'दवा का नाम, बारकोड, या संरचना दर्ज करें...',
    searchButton: 'खोजें',
    languageLabel: 'भाषा',
    english: 'अंग्रेज़ी',
    hindi: 'हिंदी',
    bengali: 'बंगाली',
    resultsTitle: 'खोज परिणाम',
    noResults: 'आपकी क्वेरी से मेल खाने वाली कोई दवा नहीं मिली। यदि संभव हो तो AI सामान्य जानकारी प्रदान करने का प्रयास कर रहा है।',
    noResultsTitle: 'कोई विशिष्ट मिलान नहीं मिला',
    medicineNameLabel: 'नाम',
    compositionLabel: 'संरचना',
    usageLabel: 'उपयोग',
    manufacturerLabel: 'निर्माता',
    dosageLabel: 'खुराक',
    sideEffectsLabel: 'दुष्प्रभाव',
    barcodeLabel: 'बारकोड',
    loadingAi: 'एआई के साथ खोज को बढ़ाया जा रहा है...',
    loadingData: 'डेटाबेस में खोजा जा रहा है...',
    loadingAiDetails: 'एआई द्वारा विवरण तैयार किया जा रहा है...',
    errorOccurred: 'एक त्रुटि हुई',
    errorAi: 'एआई खोज वृद्धि विफल रही। मूल क्वेरी का उपयोग किया जा रहा है।',
    errorData: 'डेटाबेस से दवा डेटा लाने में विफल।',
    errorAiDetails: 'एआई पूर्ण विवरण उत्पन्न करने में विफल रहा।',
    errorAiDetailsShort: 'एआई विवरण विफल।',
    searchWithAiResult: (correctedName: string) => `एआई ने सुझाया: "${correctedName}"। इस शब्द के साथ खोज रहे हैं।`,
    clearSearchButton: 'खोज साफ़ करें',
    sourceDbAiMessage: 'डेटाबेस से विवरण, एआई द्वारा संवर्धित।',
    sourceAiOnlyMessage: 'दवा डेटाबेस में नहीं है। विवरण मुख्य रूप से एआई-जनित।',
    sourceDbOnlyMessage: 'डेटाबेस से विवरण। पूर्ण विवरण के लिए एआई वृद्धि विफल रही।',
    sourceAiUnavailableMessage: 'डेटाबेस से विवरण। पूर्ण विवरण के लिए एआई उपलब्ध नहीं है।', // New
    sourceAiFailedMessage: 'दवा डेटाबेस में नहीं है। एआई उत्पादन विफल रहा।', // New
    notFoundInDbAiGenerating: 'दवा डेटाबेस में नहीं मिली। एआई के साथ विवरण उत्पन्न करने का प्रयास किया जा रहा है।',
    barcodeNotAvailable: 'उपलब्ध नहीं है',
    initialHelperText: 'अपनी खोज शुरू करने के लिए दवा का नाम, बारकोड या संरचना दर्ज करें।',
    allRightsReserved: 'सभी अधिकार सुरक्षित।',
    infoNotAvailable: "जानकारी उपलब्ध नहीं है।",
  },
  bn: {
    appName: 'ওয়েলমেডস',
    searchTitle: 'ওষুধ অনুসন্ধান করুন',
    searchPlaceholder: 'ওষুধের নাম, বারকোড, বা গঠন লিখুন...',
    searchButton: 'অনুসন্ধান',
    languageLabel: 'ভাষা',
    english: 'ইংরেজি',
    hindi: 'হিন্দি',
    bengali: 'বাংলা',
    resultsTitle: 'অনুসন্ধানের ফলাফল',
    noResults: 'আপনার প্রশ্নের সাথে মেলে এমন কোন ওষুধ পাওয়া যায়নি। যদি সম্ভব হয় AI সাধারণ তথ্য প্রদান করার চেষ্টা করছে।',
    noResultsTitle: 'কোন নির্দিষ্ট মিল পাওয়া যায়নি',
    medicineNameLabel: 'নাম',
    compositionLabel: 'গঠন',
    usageLabel: 'ব্যবহার',
    manufacturerLabel: 'প্রস্তুতকারক',
    dosageLabel: 'মাত্রা',
    sideEffectsLabel: 'পার্শ্ব প্রতিক্রিয়া',
    barcodeLabel: 'বারকোড',
    loadingAi: 'এআই দিয়ে অনুসন্ধান উন্নত করা হচ্ছে...',
    loadingData: 'ডাটাবেস অনুসন্ধান করা হচ্ছে...',
    loadingAiDetails: 'এআই দ্বারা বিস্তারিত তৈরি করা হচ্ছে...',
    errorOccurred: 'একটি ত্রুটি ঘটেছে',
    errorAi: 'এআই অনুসন্ধান উন্নতি ব্যর্থ হয়েছে। মূল কোয়েরি ব্যবহার করা হচ্ছে।',
    errorData: 'ডাটাবেস থেকে ওষুধের ডেটা আনতে ব্যর্থ হয়েছে।',
    errorAiDetails: 'এআই সম্পূর্ণ বিবরণ তৈরি করতে ব্যর্থ হয়েছে।',
    errorAiDetailsShort: 'এআই বিস্তারিত ব্যর্থ হয়েছে।',
    searchWithAiResult: (correctedName: string) => `এআই প্রস্তাবিত: "${correctedName}"। এই শব্দটি দিয়ে অনুসন্ধান করা হচ্ছে।`,
    clearSearchButton: 'অনুসন্ধান সাফ করুন',
    sourceDbAiMessage: 'ডাটাবেস থেকে বিস্তারিত, এআই দ্বারা উন্নত।',
    sourceAiOnlyMessage: 'ওষুধ ডাটাবেসে নেই। বিস্তারিত প্রধানত এআই-উত্পন্ন।',
    sourceDbOnlyMessage: 'ডাটাবেস থেকে বিস্তারিত। সম্পূর্ণ বিবরণের জন্য এআই উন্নতি ব্যর্থ হয়েছে।',
    sourceAiUnavailableMessage: 'ডাটাবেস থেকে বিস্তারিত। সম্পূর্ণ বিবরণের জন্য এআই উপলব্ধ নেই।', // New
    sourceAiFailedMessage: 'ওষুধ ডাটাবেসে নেই। এআই তৈরি ব্যর্থ হয়েছে।', // New
    notFoundInDbAiGenerating: 'ওষুধ ডাটাবেসে পাওয়া যায়নি। এআই দিয়ে বিস্তারিত তৈরি করার চেষ্টা করা হচ্ছে।',
    barcodeNotAvailable: 'উপলব্ধ নয়',
    initialHelperText: 'আপনার অনুসন্ধান শুরু করতে একটি ওষুধের নাম, বারকোড বা রচনা লিখুন।',
    allRightsReserved: 'সর্বস্বত্ব সংরক্ষিত।',
    infoNotAvailable: "তথ্য উপলব্ধ নেই।",
  },
};

export const getTranslations = (lang: Language): TranslationKeys => translations[lang];