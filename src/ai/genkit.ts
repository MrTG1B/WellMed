
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { config } from 'dotenv';

config(); // Ensures .env variables are loaded

const plugins = [];
let apiKeyFound = false;
let apiKeyEnvVarName = '';

// Prioritize GEMINI_API_KEY, then GOOGLE_API_KEY
const geminiApiKey = process.env.GEMINI_API_KEY;
const googleApiKey = process.env.GOOGLE_API_KEY; // Kept for backward compatibility or alternative naming

let apiKeyToUse: string | undefined = undefined;

if (geminiApiKey && geminiApiKey.trim() !== "") {
  apiKeyToUse = geminiApiKey;
  apiKeyEnvVarName = 'GEMINI_API_KEY';
  apiKeyFound = true;
  console.log(`Genkit: Found GEMINI_API_KEY.`);
} else if (googleApiKey && googleApiKey.trim() !== "") {
  apiKeyToUse = googleApiKey;
  apiKeyEnvVarName = 'GOOGLE_API_KEY';
  apiKeyFound = true;
  console.log(`Genkit: GEMINI_API_KEY not found or empty, using GOOGLE_API_KEY.`);
}

if (apiKeyFound && apiKeyToUse) {
  plugins.push(googleAI({ apiKey: apiKeyToUse }));
  console.log(`Genkit: Initializing Google AI plugin using ${apiKeyEnvVarName}.`);
} else {
  console.warn(
    '⚠️ Genkit Initialization Warning: Neither GEMINI_API_KEY nor GOOGLE_API_KEY is set or is empty in the environment variables.\n' +
    '   AI-powered features will use fallbacks or may not be fully functional.\n' +
    '   If you intend to use Google AI, please ensure GEMINI_API_KEY (or GOOGLE_API_KEY) is set in your .env file.\n' +
    '   You can obtain an API key from Google AI Studio (https://aistudio.google.com/app/apikey).'
  );
}

export const ai = genkit({
  plugins: plugins,
  // Removed logLevel: 'debug' as it's not a valid option for genkit() in v1.x
  // For verbose logging, Genkit CLI might have flags, or you can use console.log within flows.
});

const googleAiPluginAdded = plugins.some(p => p.name === 'google-ai');

if (googleAiPluginAdded) {
  console.log("Genkit: Google AI plugin initialized successfully. Prompts are configured to use 'googleai/gemini-pro' by default in flows unless overridden.");
} else {
    console.warn(
        '⚠️ Genkit initialized without the Google AI plugin (likely due to missing GEMINI_API_KEY or GOOGLE_API_KEY). ' +
        'AI-dependent flows will use fallbacks or may not function as expected.'
    );
}
