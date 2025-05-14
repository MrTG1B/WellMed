
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
  // loadingAiDetails: string; // Removed
  errorOccurred: string;
  errorAi: string;
  errorData: string;
  // errorAiDetails: string; // Removed
  // errorAiDetailsShort: string; // Removed
  searchWithAiResult: (correctedName: string) => string;
  clearSearchButton: string;
  // sourceDbAiMessage: string; // No longer relevant for card
  // sourceAiOnlyMessage: string; // No longer relevant for card
  sourceDbOnlyMessage: string;
  // sourceAiUnavailableMessage: string; // No longer relevant for card details
  // sourceAiFailedMessage: string; // No longer relevant for card details
  // notFoundInDbAiGenerating: string; // Removed
  barcodeNotAvailable: string;
  initialHelperText: string;
  allRightsReserved: string;
  infoNotAvailable: string;
  errorAiNotConfiguredTitle: string;
  errorAiNotConfigured: string;
  errorAiNotConfiguredDetail: string;
  errorAiFailedTitle: string;
  errorAiFailed: string;
  errorAiFailedDetail: string;
  errorAiEnhancementSkipped: string;
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
    noResults: 'No medicine found matching your query.',
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
    // loadingAiDetails: 'Generating details with AI...', // Removed
    errorOccurred: 'An Error Occurred',
    errorAi: 'AI search enhancement failed or was skipped. Using original query.',
    errorData: 'Failed to fetch medicine data from database.',
    // errorAiDetails: 'AI failed to generate complete details.', // Removed
    // errorAiDetailsShort: 'AI details failed.', // Removed
    searchWithAiResult: (correctedName: string) => `AI suggested: "${correctedName}". Searching with this term.`,
    clearSearchButton: 'Clear Search',
    // sourceDbAiMessage: 'Details from database, enhanced by AI.', // No longer relevant for card
    // sourceAiOnlyMessage: 'Medicine not in database. Details primarily AI-generated.', // No longer relevant for card
    sourceDbOnlyMessage: 'Details from database.', // Simplified
    // sourceAiUnavailableMessage: 'AI features are not available. Details might be incomplete.', // No longer relevant for card details
    // sourceAiFailedMessage: 'AI generation failed for this medicine. Details might be incomplete.', // No longer relevant for card details
    // notFoundInDbAiGenerating: 'Medicine not found in database. Attempting to generate details with AI.', // Removed
    barcodeNotAvailable: 'Not available',
    initialHelperText: 'Enter a medicine name, barcode, or composition to begin your search.',
    allRightsReserved: 'All rights reserved.',
    infoNotAvailable: "Information not available.",
    errorAiNotConfiguredTitle: "AI Not Configured",
    errorAiNotConfigured: "AI-powered search enhancement is currently unavailable because the system is not configured for AI processing.",
    errorAiNotConfiguredDetail: "Please ensure the GEMINI_API_KEY (or GOOGLE_API_KEY) is set in your .env file and restart the server. You can obtain a key from Google AI Studio.",
    errorAiFailedTitle: "AI Processing Error",
    errorAiFailed: "There was an error while trying to enhance your search using AI.",
    errorAiFailedDetail: "Please check your server logs (terminal where `npm run dev` is running) for more specific error details from the AI service. This could be due to an invalid API key, quota issues, or network problems.",
    errorAiEnhancementSkipped: "AI search enhancement was skipped (possibly due to AI unavailability). Using your original query.",
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
    noResults: 'आपकी क्वेरी से मेल खाने वाली कोई दवा नहीं मिली।',
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
    // loadingAiDetails: 'एआई द्वारा विवरण तैयार किया जा रहा है...', // Removed
    errorOccurred: 'एक त्रुटि हुई',
    errorAi: 'एआई खोज वृद्धि विफल रही या छोड़ दी गई। मूल क्वेरी का उपयोग किया जा रहा है।',
    errorData: 'डेटाबेस से दवा डेटा लाने में विफल।',
    // errorAiDetails: 'एआई पूर्ण विवरण उत्पन्न करने में विफल रहा।', // Removed
    // errorAiDetailsShort: 'एआई विवरण विफल।', // Removed
    searchWithAiResult: (correctedName: string) => `एआई ने सुझाया: "${correctedName}"। इस शब्द के साथ खोज रहे हैं।`,
    clearSearchButton: 'खोज साफ़ करें',
    sourceDbOnlyMessage: 'डेटाबेस से विवरण।', // Simplified
    barcodeNotAvailable: 'उपलब्ध नहीं है',
    initialHelperText: 'अपनी खोज शुरू करने के लिए दवा का नाम, बारकोड या संरचना दर्ज करें।',
    allRightsReserved: 'सभी अधिकार सुरक्षित।',
    infoNotAvailable: "जानकारी उपलब्ध नहीं है।",
    errorAiNotConfiguredTitle: "एआई कॉन्फ़िगर नहीं है",
    errorAiNotConfigured: "एआई-संचालित खोज वृद्धि वर्तमान में अनुपलब्ध है क्योंकि सिस्टम एआई प्रसंस्करण के लिए कॉन्फ़िगर नहीं किया गया है।",
    errorAiNotConfiguredDetail: "कृपया सुनिश्चित करें कि GEMINI_API_KEY (या GOOGLE_API_KEY) आपकी .env फ़ाइल में सेट है और सर्वर को पुनरारंभ करें। आप Google AI Studio से एक कुंजी प्राप्त कर सकते हैं।",
    errorAiFailedTitle: "एआई प्रसंस्करण त्रुटि",
    errorAiFailed: "एआई का उपयोग करके आपकी खोज को बढ़ाने का प्रयास करते समय एक त्रुटि हुई।",
    errorAiFailedDetail: "एआई सेवा से अधिक विशिष्ट त्रुटि विवरण के लिए कृपया अपने सर्वर लॉग (टर्मिनल जहां `npm run dev` चल रहा है) की जांच करें। यह एक अमान्य एपीआई कुंजी, कोटा समस्याओं, या नेटवर्क समस्याओं के कारण हो सकता है।",
    errorAiEnhancementSkipped: "एआई खोज वृद्धि छोड़ दी गई थी (संभवतः एआई अनुपलब्धता के कारण)। आपकी मूल क्वेरी का उपयोग किया जा रहा है।",
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
    noResults: 'আপনার প্রশ্নের সাথে মেলে এমন কোন ওষুধ পাওয়া যায়নি।',
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
    // loadingAiDetails: 'এআই দ্বারা বিস্তারিত তৈরি করা হচ্ছে...', // Removed
    errorOccurred: 'একটি ত্রুটি ঘটেছে',
    errorAi: 'এআই অনুসন্ধান উন্নতি ব্যর্থ হয়েছে বা এড়িয়ে যাওয়া হয়েছে। মূল কোয়েরি ব্যবহার করা হচ্ছে।',
    errorData: 'ডাটাবেস থেকে ওষুধের ডেটা আনতে ব্যর্থ হয়েছে।',
    // errorAiDetails: 'এআই সম্পূর্ণ বিবরণ তৈরি করতে ব্যর্থ হয়েছে।', // Removed
    // errorAiDetailsShort: 'এআই বিস্তারিত ব্যর্থ হয়েছে।', // Removed
    searchWithAiResult: (correctedName: string) => `এআই প্রস্তাবিত: "${correctedName}"। এই শব্দটি দিয়ে অনুসন্ধান করা হচ্ছে।`,
    clearSearchButton: 'অনুসন্ধান সাফ করুন',
    sourceDbOnlyMessage: 'ডাটাবেস থেকে বিস্তারিত।', // Simplified
    barcodeNotAvailable: 'উপলব্ধ নয়',
    initialHelperText: 'আপনার অনুসন্ধান শুরু করতে একটি ওষুধের নাম, বারকোড বা রচনা লিখুন।',
    allRightsReserved: 'সর্বস্বত্ব সংরক্ষিত।',
    infoNotAvailable: "তথ্য উপলব্ধ নেই।",
    errorAiNotConfiguredTitle: "এআই কনফিগার করা হয়নি",
    errorAiNotConfigured: "এআই-চালিত অনুসন্ধান বৃদ্ধি বর্তমানে অনুপলব্ধ কারণ সিস্টেম এআই প্রক্রিয়াকরণের জন্য কনফিগার করা হয়নি।",
    errorAiNotConfiguredDetail: "দয়া করে নিশ্চিত করুন যে GEMINI_API_KEY (বা GOOGLE_API_KEY) আপনার .env ফাইলে সেট করা আছে এবং সার্ভারটি পুনরায় চালু করুন। আপনি Google AI Studio থেকে একটি কী পেতে পারেন।",
    errorAiFailedTitle: "এআই প্রক্রিয়াকরণ ত্রুটি",
    errorAiFailed: "এআই ব্যবহার করে আপনার অনুসন্ধান উন্নত করার চেষ্টা করার সময় একটি ত্রুটি ঘটেছে।",
    errorAiFailedDetail: "এআই পরিষেবা থেকে আরও নির্দিষ্ট ত্রুটির বিবরণের জন্য অনুগ্রহ করে আপনার সার্ভার লগগুলি (টার্মিনাল যেখানে `npm run dev` চলছে) পরীক্ষা করুন। এটি একটি অবৈধ API কী, কোটা সমস্যা বা নেটওয়ার্ক সমস্যার কারণে হতে পারে।",
    errorAiEnhancementSkipped: "এআই অনুসন্ধান বৃদ্ধি এড়িয়ে যাওয়া হয়েছে (সম্ভবত এআই অনুপলব্ধতার কারণে)। আপনার আসল ক্যোয়ারী ব্যবহার করা হচ্ছে।",
  },
};

export const getTranslations = (lang: Language): TranslationKeys => translations[lang];
