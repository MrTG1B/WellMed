
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { config } from 'dotenv';

config(); // Ensures .env variables are loaded

const genkitPlugins = []; // Renamed to avoid conflict with 'plugins' from genkit
let apiKeyFound = false;
let apiKeyEnvVarName = '';
let apiKeyToUse: string | undefined = undefined;

const geminiApiKey = process.env.GEMINI_API_KEY;
const googleApiKey = process.env.GOOGLE_API_KEY;

if (geminiApiKey && geminiApiKey.trim() !== "") {
  apiKeyToUse = geminiApiKey;
  apiKeyEnvVarName = 'GEMINI_API_KEY';
  apiKeyFound = true;
  console.log(`Genkit: Found ${apiKeyEnvVarName}.`);
} else if (googleApiKey && googleApiKey.trim() !== "") {
  apiKeyToUse = googleApiKey;
  apiKeyEnvVarName = 'GOOGLE_API_KEY';
  apiKeyFound = true;
  console.log(`Genkit: ${apiKeyEnvVarName} found (GEMINI_API_KEY was not).`);
}

if (apiKeyFound && apiKeyToUse) {
  try {
    genkitPlugins.push(googleAI({ apiKey: apiKeyToUse }));
    console.log(`Genkit: Google AI plugin added to plugins list using ${apiKeyEnvVarName}. Will be initialized by genkit().`);
  } catch (e: any) {
    console.error(`Genkit: CRITICAL ERROR preparing Google AI plugin with ${apiKeyEnvVarName}: ${e.message}`, e);
  }
} else {
  console.warn('Genkit: Neither GEMINI_API_KEY nor GOOGLE_API_KEY was found. Google AI plugin will not be configured.');
}

export const ai = genkit({
  plugins: genkitPlugins,
});

// The previous check using ai.registry.findPlugin has been removed as it was causing a TypeError.
// If the Google AI plugin was successfully added to genkitPlugins and an API key is valid,
// Genkit will attempt to use it. Errors during AI operations will indicate any issues.
if (genkitPlugins.length > 0 && apiKeyFound) {
    console.log("Genkit: Attempting to initialize with Google AI plugin. Subsequent AI call errors will indicate if this failed (e.g., invalid API key, model access issues).");
} else if (!apiKeyFound) {
    console.warn("Genkit: Google AI plugin not configured due to missing API key. AI-powered features will use fallbacks or may not be fully functional.");
}
