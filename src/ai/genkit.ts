import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { config } from 'dotenv';

config(); // Ensures .env variables are loaded

const plugins = [];

if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== "") {
  plugins.push(googleAI());
} else {
  console.warn( // Changed to warn
    '⚠️ Genkit Initialization Warning: GOOGLE_API_KEY is not set or is empty in the environment variables.\n' +
    '   AI-powered features will use fallbacks or may not be fully functional.\n' +
    '   If you intend to use Google AI, please ensure GOOGLE_API_KEY is set in your .env file.\n' +
    '   You can obtain an API key from Google AI Studio (https://aistudio.google.com/app/apikey).'
  );
}

export const ai = genkit({
  plugins: plugins,
  // Default model will be set below if applicable
});

// Set a default model if the Google AI plugin was added.
// Using gemini-pro as a general-purpose default.
// gemini-1.5-flash is also a good, newer option.
const googleAiPluginAdded = plugins.some(p => p.name === 'google-ai');

if (googleAiPluginAdded) {
  // Prefer gemini-1.5-flash if available, otherwise gemini-pro
  // For simplicity, we'll stick to gemini-pro as it's widely available.
  // The user can override this in specific prompts if needed.
  ai.registry.setDefaultModel('googleai/gemini-pro'); 
  console.log("Genkit: Google AI plugin initialized. Default model set to gemini-pro.");
} else {
    console.warn(
        '⚠️ Genkit initialized without any AI plugins (likely due to missing GOOGLE_API_KEY). ' +
        'AI-dependent flows will use fallbacks or may not function.'
    );
}
