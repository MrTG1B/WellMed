import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { config } from 'dotenv';

config(); // Ensures .env variables are loaded

const plugins = [];

if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== "") {
  plugins.push(googleAI());
} else {
  console.warn( 
    '⚠️ Genkit Initialization Warning: GOOGLE_API_KEY is not set or is empty in the environment variables.\n' +
    '   AI-powered features will use fallbacks or may not be fully functional.\n' +
    '   If you intend to use Google AI, please ensure GOOGLE_API_KEY is set in your .env file.\n' +
    '   You can obtain an API key from Google AI Studio (https://aistudio.google.com/app/apikey).'
  );
}

export const ai = genkit({
  plugins: plugins,
});

const googleAiPluginAdded = plugins.some(p => p.name === 'google-ai');

if (googleAiPluginAdded) {
  console.log("Genkit: Google AI plugin initialized. Prompts are configured to use 'googleai/gemini-pro'.");
} else {
    console.warn(
        '⚠️ Genkit initialized without any AI plugins (likely due to missing GOOGLE_API_KEY). ' +
        'AI-dependent flows will use fallbacks or may not function.'
    );
}

