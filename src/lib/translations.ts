
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
  drugNameLabel: string;
  saltNameLabel: string;
  drugCodeLabel: string;
  drugCategoryLabel: string;
  drugGroupLabel: string;
  drugTypeLabel: string;
  hsnCodeLabel: string;
  searchKeyLabel: string;
  mrpLabel: string;
  uomLabel: string;
  usageLabel: string;
  manufacturerLabel: string;
  dosageLabel: string;
  sideEffectsLabel: string;
  loadingAi: string;
  loadingData: string;
  loadingAiDetails: string;
  errorOccurred: string;
  errorAi: string;
  errorData: string;
  errorAiDetails: (itemName: string, source: string) => string;
  searchWithAiResult: (correctedName: string) => string;
  clearSearchButton: string;
  sourceDbAiMessage: string;
  sourceAiOnlyMessage: string;
  sourceDbOnlyMessage: string;
  sourceAiUnavailableForDetailsMessage: (medicineName: string) => string;
  sourceAiFailedForDetailsMessage: (medicineName: string) => string;
  initialHelperText: string;
  allRightsReserved: string;
  infoNotAvailable: string;
  errorAiNotConfiguredOrModelTitle: string;
  errorAiNotConfiguredOrModel: string;
  errorAiNotConfiguredOrModelDetail: string;
  errorAiFailedTitle: string;
  errorAiFailed: string;
  errorAiFailedDetail: string;
  errorAiEnhancementSkipped: string;
  errorAiModelNotFound: (modelName: string) => string;
  aiCouldNotEnhance: (itemName: string) => string;
  errorAiNotConfiguredOrModelForDetails: (itemName: string) => string;
  errorAiFailedForDetails: (itemName: string) => string;
  errorAiDetailsCritical: (itemName: string) => string;
  copiedToClipboardTitle: string;
  copiedToClipboardDescription: (fieldName: string, value: string) => string;
  copyFailedTitle: string;
  copyFailedDescription: string;
};

export const translations: Record<Language, TranslationKeys> = {
  en: {
    appName: 'WellMeds',
    searchTitle: 'Search for Medicines',
    searchPlaceholder: 'Enter Drug Name, Salt, Drug Code, HSN Code...',
    searchButton: 'Search',
    languageLabel: 'Language',
    english: 'English',
    hindi: 'Hindi',
    bengali: 'Bengali',
    resultsTitle: 'Search Result',
    noResults: 'No medicine found matching your query.',
    noResultsTitle: 'No Specific Match Found',
    drugNameLabel: 'Drug Name',
    saltNameLabel: 'Salt Name (Composition)',
    drugCodeLabel: 'Drug Code',
    drugCategoryLabel: 'Category',
    drugGroupLabel: 'Group',
    drugTypeLabel: 'Type',
    hsnCodeLabel: 'HSN Code',
    searchKeyLabel: 'Search Key',
    mrpLabel: 'MRP',
    uomLabel: 'UOM',
    usageLabel: 'Usage',
    manufacturerLabel: 'Manufacturer',
    dosageLabel: 'Dosage',
    sideEffectsLabel: 'Side Effects',
    loadingAi: 'Enhancing search with AI...',
    loadingData: 'Searching database...',
    loadingAiDetails: 'Generating details with AI...',
    errorOccurred: 'An Error Occurred',
    errorAi: 'AI search enhancement failed or was skipped. Using original query.',
    errorData: 'Failed to fetch medicine data from database.',
    errorAiDetails: (itemName: string, source: string) => `AI could not generate full details for "${itemName}". Status: ${source}. Displaying available data.`,
    searchWithAiResult: (correctedName: string) => `AI suggested: "${correctedName}". Searching with this term.`,
    clearSearchButton: 'Clear Search',
    sourceDbAiMessage: 'Details from database, enhanced by AI.',
    sourceAiOnlyMessage: 'Details primarily AI-generated.',
    sourceDbOnlyMessage: 'Details from database.',
    sourceAiUnavailableForDetailsMessage: (medicineName: string) => `AI features for enhancing "${medicineName}" details are unavailable due to API key or model issues.`,
    sourceAiFailedForDetailsMessage: (medicineName: string) => `AI enhancement failed for "${medicineName}" details.`,
    initialHelperText: 'Enter a drug name, salt name, drug code, HSN code, or search key to begin.',
    allRightsReserved: 'All rights reserved.',
    infoNotAvailable: "Information not available.",
    errorAiNotConfiguredOrModelTitle: "AI Key/Model Issue",
    errorAiNotConfiguredOrModel: "AI-powered features are currently unavailable due to an issue with the AI configuration (API Key or Model).",
    errorAiNotConfiguredOrModelDetail: "Please ensure the GEMINI_API_KEY is correctly set in your .env file, is valid, has billing enabled, and the specified AI model is accessible. Restart the server after changes.",
    errorAiFailedTitle: "AI Processing Error",
    errorAiFailed: "There was an error while trying to use AI. Some information may be missing or incomplete.",
    errorAiFailedDetail: "Please check your server logs for more specific error details from the AI service. This could be due to network problems or other API issues.",
    errorAiEnhancementSkipped: "AI search enhancement was skipped (possibly due to AI unavailability). Using your original query.",
    errorAiModelNotFound: (modelName: string) => `The AI model "${modelName}" was not found or is not accessible. Please check the model name and your API key permissions.`,
    aiCouldNotEnhance: (itemName: string) => `AI could not provide further details for "${itemName}" beyond what was found in the database.`,
    errorAiNotConfiguredOrModelForDetails: (itemName: string) => `AI features for generating details for "${itemName}" are unavailable due to API key or model configuration issues.`,
    errorAiFailedForDetails: (itemName: string) => `AI failed to generate details for "${itemName}".`,
    errorAiDetailsCritical: (itemName: string) => `A critical error occurred while trying to generate AI details for "${itemName}". Please check server logs.`,
    copiedToClipboardTitle: "Copied to Clipboard",
    copiedToClipboardDescription: (fieldName: string, value: string) => `${fieldName}: "${value}" copied.`,
    copyFailedTitle: "Copy Failed",
    copyFailedDescription: "Could not copy text to clipboard. Please try again.",
  },
  hi: {
    appName: 'वेलमेड्स',
    searchTitle: 'दवाएं खोजें',
    searchPlaceholder: 'दवा का नाम, सॉल्ट, ड्रग कोड, HSN कोड दर्ज करें...',
    searchButton: 'खोजें',
    languageLabel: 'भाषा',
    english: 'अंग्रेज़ी',
    hindi: 'हिंदी',
    bengali: 'বাংলা',
    resultsTitle: 'खोज परिणाम',
    noResults: 'आपकी क्वेरी से मेल खाने वाली कोई दवा नहीं मिली।',
    noResultsTitle: 'कोई विशिष्ट मिलान नहीं मिला',
    drugNameLabel: 'दवा का नाम',
    saltNameLabel: 'सॉल्ट का नाम (संरचना)',
    drugCodeLabel: 'ड्रग कोड',
    drugCategoryLabel: 'श्रेणी',
    drugGroupLabel: 'समूह',
    drugTypeLabel: 'प्रकार',
    hsnCodeLabel: 'एचएसएन कोड',
    searchKeyLabel: 'खोज कुंजी',
    mrpLabel: 'एमआरपी',
    uomLabel: 'यूओएम',
    usageLabel: 'उपयोग',
    manufacturerLabel: 'निर्माता',
    dosageLabel: 'खुराक',
    sideEffectsLabel: 'दुष्प्रभाव',
    loadingAi: 'एआई के साथ खोज को बढ़ाया जा रहा है...',
    loadingData: 'डेटाबेस में खोजा जा रहा है...',
    loadingAiDetails: 'एआई द्वारा विवरण तैयार किया जा रहा है...',
    errorOccurred: 'एक त्रुटि हुई',
    errorAi: 'एआई खोज वृद्धि विफल रही या छोड़ दी गई। मूल क्वेरी का उपयोग किया जा रहा है।',
    errorData: 'डेटाबेस से दवा डेटा लाने में विफल।',
    errorAiDetails: (itemName: string, source: string) => `एआई "${itemName}" के लिए पूर्ण विवरण उत्पन्न नहीं कर सका। स्थिति: ${source}। उपलब्ध डेटा प्रदर्शित किया जा रहा है।`,
    searchWithAiResult: (correctedName: string) => `एआई ने सुझाया: "${correctedName}"। इस शब्द के साथ खोज रहे हैं।`,
    clearSearchButton: 'खोज साफ़ करें',
    sourceDbAiMessage: 'डेटाबेस से विवरण, एआई द्वारा संवर्धित।',
    sourceAiOnlyMessage: 'विवरण मुख्य रूप से एआई-जनित।',
    sourceDbOnlyMessage: 'डेटाबेस से विवरण।',
    sourceAiUnavailableForDetailsMessage: (medicineName: string) => `"${medicineName}" विवरणों को बढ़ाने के लिए एआई सुविधाएँ एपीआई कुंजी या मॉडल समस्याओं के कारण अनुपलब्ध हैं।`,
    sourceAiFailedForDetailsMessage: (medicineName: string) => `"${medicineName}" विवरणों के लिए एआई वृद्धि विफल रही।`,
    initialHelperText: 'अपनी खोज शुरू करने के लिए दवा का नाम, सॉल्ट नाम, ड्रग कोड, HSN कोड, या खोज कुंजी दर्ज करें।',
    allRightsReserved: 'सभी अधिकार सुरक्षित।',
    infoNotAvailable: "जानकारी उपलब्ध नहीं है।",
    errorAiNotConfiguredOrModelTitle: "एआई कुंजी/मॉडल समस्या",
    errorAiNotConfiguredOrModel: "एआई कॉन्फ़िगरेशन (एपीआई कुंजी या मॉडल) के साथ किसी समस्या के कारण एआई-संचालित सुविधाएँ वर्तमान में अनुपलब्ध हैं।",
    errorAiNotConfiguredOrModelDetail: "कृपया सुनिश्चित करें कि GEMINI_API_KEY आपकी .env फ़ाइल में सही ढंग से सेट है, मान्य है, बिलिंग सक्षम है, और निर्दिष्ट एआई मॉडल पहुंच योग्य है। परिवर्तनों के बाद सर्वर को पुनरारंभ करें।",
    errorAiFailedTitle: "एआई प्रसंस्करण त्रुटि",
    errorAiFailed: "एआई का उपयोग करने का प्रयास करते समय एक त्रुटि हुई। कुछ जानकारी गुम या अधूरी हो सकती है।",
    errorAiFailedDetail: "एआई सेवा से अधिक विशिष्ट त्रुटि विवरण के लिए कृपया अपने सर्वर लॉग की जांच करें। यह नेटवर्क समस्याओं या अन्य एपीआई समस्याओं के कारण हो सकता है।",
    errorAiEnhancementSkipped: "एआई खोज वृद्धि छोड़ दी गई थी (संभवतः एआई अनुपलब्धता के कारण)। आपकी मूल क्वेरी का उपयोग किया जा रहा है।",
    errorAiModelNotFound: (modelName: string) => `एआई मॉडल "${modelName}" नहीं मिला या पहुंच योग्य नहीं है। कृपया मॉडल का नाम और अपनी एपीआई कुंजी अनुमतियों की जांच करें।`,
    aiCouldNotEnhance: (itemName: string) => `एआई डेटाबेस में मिली जानकारी के अतिरिक्त "${itemName}" के लिए और विवरण प्रदान नहीं कर सका।`,
    errorAiNotConfiguredOrModelForDetails: (itemName: string) => `एपीआई कुंजी या मॉडल कॉन्फ़िगरेशन समस्याओं के कारण "${itemName}" के लिए विवरण उत्पन्न करने के लिए एआई सुविधाएँ अनुपलब्ध हैं।`,
    errorAiFailedForDetails: (itemName: string) => `एआई "${itemName}" के लिए विवरण उत्पन्न करने में विफल रहा।`,
    errorAiDetailsCritical: (itemName: string) => `"${itemName}" के लिए एआई विवरण उत्पन्न करने का प्रयास करते समय एक गंभीर त्रुटि हुई। कृपया सर्वर लॉग जांचें।`,
    copiedToClipboardTitle: "क्लिपबोर्ड पर कॉपी किया गया",
    copiedToClipboardDescription: (fieldName: string, value: string) => `${fieldName}: "${value}" कॉपी किया गया।`,
    copyFailedTitle: "कॉपी विफल",
    copyFailedDescription: "टेक्स्ट को क्लिपबोर्ड पर कॉपी नहीं किया जा सका। कृपया पुनः प्रयास करें।",
  },
  bn: {
    appName: 'ওয়েলমেডস',
    searchTitle: 'ওষুধ অনুসন্ধান করুন',
    searchPlaceholder: 'ওষুধের নাম, সল্ট, ড্রাগ কোড, HSN কোড লিখুন...',
    searchButton: 'অনুসন্ধান',
    languageLabel: 'ভাষা',
    english: 'ইংরেজি',
    hindi: 'হিন্দি',
    bengali: 'বাংলা',
    resultsTitle: 'অনুসন্ধানের ফলাফল',
    noResults: 'আপনার প্রশ্নের সাথে মেলে এমন কোন ওষুধ পাওয়া যায়নি।',
    noResultsTitle: 'কোন নির্দিষ্ট মিল পাওয়া যায়নি',
    drugNameLabel: 'ওষুধের নাম',
    saltNameLabel: 'সল্টের নাম (গঠন)',
    drugCodeLabel: 'ড্রাগ কোড',
    drugCategoryLabel: 'বিভাগ',
    drugGroupLabel: 'গ্রুপ',
    drugTypeLabel: 'প্রকার',
    hsnCodeLabel: 'এইচএসএন কোড',
    searchKeyLabel: 'সার্চ কী',
    mrpLabel: 'এমআরপি',
    uomLabel: 'ইউওএম',
    usageLabel: 'ব্যবহার',
    manufacturerLabel: 'প্রস্তুতকারক',
    dosageLabel: 'মাত্রা',
    sideEffectsLabel: 'পার্শ্ব প্রতিক্রিয়া',
    loadingAi: 'এআই দিয়ে অনুসন্ধান উন্নত করা হচ্ছে...',
    loadingData: 'ডাটাবেস অনুসন্ধান করা হচ্ছে...',
    loadingAiDetails: 'এআই দ্বারা বিস্তারিত তৈরি করা হচ্ছে...',
    errorOccurred: 'একটি ত্রুটি ঘটেছে',
    errorAi: 'এআই অনুসন্ধান উন্নতি ব্যর্থ হয়েছে বা এড়িয়ে যাওয়া হয়েছে। মূল কোয়েরি ব্যবহার করা হচ্ছে।',
    errorData: 'ডাটাবেস থেকে ওষুধের ডেটা আনতে ব্যর্থ হয়েছে।',
    errorAiDetails: (itemName: string, source: string) => `এআই "${itemName}" এর জন্য সম্পূর্ণ বিবরণ তৈরি করতে পারেনি। স্থিতি: ${source}। উপলব্ধ ডেটা দেখানো হচ্ছে।`,
    searchWithAiResult: (correctedName: string) => `এআই প্রস্তাবিত: "${correctedName}"। এই শব্দটি দিয়ে অনুসন্ধান করা হচ্ছে।`,
    clearSearchButton: 'অনুসন্ধান সাফ করুন',
    sourceDbAiMessage: 'ডাটাবেস থেকে বিস্তারিত, এআই দ্বারা উন্নত।',
    sourceAiOnlyMessage: 'বিস্তারিত প্রধানত এআই-জেনারেটেড।',
    sourceDbOnlyMessage: 'ডাটাবেস থেকে বিস্তারিত।',
    sourceAiUnavailableForDetailsMessage: (medicineName: string) => `"${medicineName}" বিবরণ উন্নত করার জন্য এআই বৈশিষ্ট্যগুলি API কী বা মডেল সমস্যার কারণে অনুপলব্ধ।`,
    sourceAiFailedForDetailsMessage: (medicineName: string) => `"${medicineName}" বিবরণের জন্য এআই উন্নতি ব্যর্থ হয়েছে।`,
    initialHelperText: 'আপনার অনুসন্ধান শুরু করতে একটি ওষুধের নাম, সল্ট নাম, ড্রাগ কোড, HSN কোড, বা সার্চ কী লিখুন।',
    allRightsReserved: 'সর্বস্বত্ব সংরক্ষিত।',
    infoNotAvailable: "তথ্য উপলব্ধ নেই।",
    errorAiNotConfiguredOrModelTitle: "এআই কী/মডেল সমস্যা",
    errorAiNotConfiguredOrModel: "এআই কনফিগারেশন (এপিআই কী বা মডেল) এর সাথে সমস্যার কারণে এআই-চালিত বৈশিষ্ট্যগুলি বর্তমানে অনুপলব্ধ।",
    errorAiNotConfiguredOrModelDetail: "অনুগ্রহ করে নিশ্চিত করুন যে GEMINI_API_KEY আপনার .env ফাইলে সঠিকভাবে সেট করা আছে, বৈধ, বিলিং সক্ষম করা আছে এবং নির্দিষ্ট AI মডেলটি অ্যাক্সেসযোগ্য। পরিবর্তনের পরে সার্ভারটি পুনরায় চালু করুন।",
    errorAiFailedTitle: "এআই প্রক্রিয়াকরণ ত্রুটি",
    errorAiFailed: "এআই ব্যবহার করার চেষ্টা করার সময় একটি ত্রুটি ঘটেছে। কিছু তথ্য অনুপস্থিত বা অসম্পূর্ণ হতে পারে।",
    errorAiFailedDetail: "এআই পরিষেবা থেকে আরও নির্দিষ্ট ত্রুটির বিবরণের জন্য অনুগ্রহ করে আপনার সার্ভার লগগুলি পরীক্ষা করুন। এটি নেটওয়ার্ক সমস্যা বা অন্যান্য API সমস্যার কারণে হতে পারে।",
    errorAiEnhancementSkipped: "এআই অনুসন্ধান বৃদ্ধি এড়িয়ে যাওয়া হয়েছে (সম্ভবত এআই অনুপলব্ধতার কারণে)। আপনার আসল ক্যোয়ারী ব্যবহার করা হচ্ছে।",
    errorAiModelNotFound: (modelName: string) => `"${modelName}" এআই মডেলটি খুঁজে পাওয়া যায়নি বা অ্যাক্সেসযোগ্য নয়। অনুগ্রহ করে মডেলের নাম এবং আপনার API কী অনুমতিগুলি পরীক্ষা করুন।`,
    aiCouldNotEnhance: (itemName: string) => `ডাটাবেসে যা পাওয়া গেছে তার বাইরে এআই "${itemName}" এর জন্য আর কোনো বিবরণ দিতে পারেনি।`,
    errorAiNotConfiguredOrModelForDetails: (itemName: string) => `API কী বা মডেল কনফিগারেশন সমস্যার কারণে "${itemName}" এর জন্য বিবরণ তৈরি করার এআই বৈশিষ্ট্যগুলি অনুপলব্ধ।`,
    errorAiFailedForDetails: (itemName: string) => `এআই "${itemName}" এর জন্য বিবরণ তৈরি করতে ব্যর্থ হয়েছে।`,
    errorAiDetailsCritical: (itemName: string) => `"${itemName}" এর জন্য এআই বিবরণ তৈরি করার চেষ্টা করার সময় একটি গুরুতর ত্রুটি ঘটেছে। অনুগ্রহ করে সার্ভার লগ পরীক্ষা করুন।`,
    copiedToClipboardTitle: "ক্লিপবোর্ডে কপি করা হয়েছে",
    copiedToClipboardDescription: (fieldName: string, value: string) => `${fieldName}: "${value}" কপি করা হয়েছে।`,
    copyFailedTitle: "কপি ব্যর্থ হয়েছে",
    copyFailedDescription: "ক্লিপবোর্ডে টেক্সট কপি করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।",
  },
};

export const getTranslations = (lang: Language): TranslationKeys => translations[lang];

    