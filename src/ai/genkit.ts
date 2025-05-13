
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { config } from 'dotenv';

config(); // Ensures .env variables are loaded

const plugins = [];

if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== "") {
  plugins.push(googleAI());
} else {
  console.error(
    '🔴 Genkit Initialization Error: GOOGLE_API_KEY is not set or is empty in the environment variables.\n' +
    '   AI-powered features (like medicine search enhancement and details generation) will likely fail.\n' +
    '   Please add your GOOGLE_API_KEY to the .env file.\n' +
    '   You can obtain an API key from Google AI Studio (https://aistudio.google.com/app/apikey).\n' +
    '   Attempting to initialize Genkit without the Google AI plugin if the key is missing.'
  );
  // If the key is missing, we initialize Genkit without the googleAI plugin.
  // Flows attempting to use it will fail, but Genkit itself might initialize.
  // Alternatively, one could add a mock plugin here for development without a key.
}

export const ai = genkit({
  plugins: plugins,
  model: 'googleai/gemini-2.0-flash', // Default model
});

if (plugins.length === 0) {
    console.warn(
        '⚠️ Genkit initialized without any AI plugins (likely due to missing GOOGLE_API_KEY). ' +
        'AI-dependent flows will not function.'
    );
}
