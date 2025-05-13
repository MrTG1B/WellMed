
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';
import { getAuth, type Auth } from "firebase/auth";

// Your web app's Firebase configuration
// Ensure these environment variables are set in your .env.local file
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

export let app: FirebaseApp | undefined = undefined;
export let db: Database | undefined = undefined;
export let auth: Auth | undefined = undefined;

let initializationErrorDetails = "";

const requiredEnvVarKeys: (keyof typeof firebaseConfig)[] = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
  'databaseURL',
];

const missingVars = requiredEnvVarKeys.filter(key => !firebaseConfig[key]);

if (missingVars.length > 0) {
  initializationErrorDetails =
    '🔴 Firebase Initialization Error: The following required environment variables are missing or undefined:\n' +
    missingVars.map(key => {
        const envVarName = `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
        return `- ${envVarName}`;
    }).join('\n') +
    '\n👉 Please ensure these are set in your .env.local file (especially NEXT_PUBLIC_FIREBASE_DATABASE_URL for Realtime Database) and the development server is restarted.' +
    '\nFirebase functionality will be impaired.';
  console.error(initializationErrorDetails);
}

if (!initializationErrorDetails) {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }

    if (app) {
      db = getDatabase(app);
      auth = getAuth(app);
    } else {
      // This case should ideally not be reached if getApps().length check is robust
      initializationErrorDetails = "🔴 Firebase App object is undefined after initialization attempt. This is unexpected. Realtime Database and Auth cannot be initialized.";
      console.error(initializationErrorDetails);
    }
  } catch (e: any) {
    initializationErrorDetails = `🔴 Firebase SDK Initialization Failed critically during app/db/auth setup: ${e.message || e}`;
    console.error(initializationErrorDetails);
    // Ensure these are undefined if an error occurs
    app = undefined;
    db = undefined;
    auth = undefined;
  }
}

// Post-initialization checks, only if no major error occurred before this stage
if (!initializationErrorDetails) {
  if (!db) {
    console.error(
      "🔴 CRITICAL: Firebase Realtime Database instance (db) is UNDEFINED after Firebase App initialization.\n" +
      "   This usually means `getDatabase(app)` failed or an issue with the `databaseURL`.\n" +
      "   Realtime Database operations (reading/writing data) WILL FAIL. Check the following:\n" +
      "   1. Environment Variables: Ensure NEXT_PUBLIC_FIREBASE_DATABASE_URL in '.env.local' is correct and points to your Realtime Database, then restart the server.\n" +
      "   2. Realtime Database Setup: Verify that Realtime Database is created and enabled in your Firebase project (Firebase console -> Realtime Database).\n" +
      "   3. Security Rules: Your Realtime Database security rules (Firebase console -> Realtime Database -> Rules) might be blocking access. For initial development, you might use permissive rules like:\n" +
      "      {\n" +
      "        \"rules\": {\n" +
      "          \".read\": \"auth != null\", // Or true for public read\n" +
      "          \".write\": \"auth != null\" // Or true for public write\n" +
      "        }\n" +
      "      }\n" +
      "      IMPORTANT: Secure these rules properly before deploying to production!\n" +
      "   4. API Key Restrictions (Google Cloud Console -> APIs & Services -> Credentials):\n" +
      "      - Select your API key.\n" +
      "      - Under 'API restrictions', if 'Restrict key' is selected, ensure 'Firebase Realtime Database API' is in the list of allowed APIs.\n" +
      "      - Under 'Application restrictions', if 'HTTP referrers' is set, ensure your development URL (e.g., http://localhost:XXXX) is allowed."
    );
  }
  if (!auth) {
    console.error(
      "🔴 CRITICAL: Firebase Auth instance (auth) is UNDEFINED after Firebase App initialization.\n" +
      "   This usually means `getAuth(app)` failed.\n" +
      "   Authentication WILL FAIL. Check the following:\n" +
      "   1. Environment Variables: Ensure all NEXT_PUBLIC_FIREBASE_... auth-related variables in '.env.local' are correct and the server was restarted.\n" +
      "   2. Firebase Authentication Setup: Verify that Authentication (especially Email/Password sign-in provider if used) is enabled in the Firebase console (Firebase console -> Authentication -> Sign-in method).\n" +
      "   3. API Key Restrictions (Google Cloud Console -> APIs & Services -> Credentials):\n" +
      "      - Select your API key.\n" +
      "      - Ensure 'Identity Toolkit API' is in the list of allowed APIs if restrictions are applied."
    );
  }
} else {
    // If initializationErrorDetails is set, app/db/auth might be undefined.
    // The primary error has already been logged.
    // Adding a note that services might be unavailable due to the earlier error.
    if (!app) console.warn("⚠️ Firebase App instance is undefined due to earlier initialization errors.");
    if (!db) console.warn("⚠️ Firebase Realtime Database (db) instance is undefined due to earlier initialization errors.");
    if (!auth) console.warn("⚠️ Firebase Auth (auth) instance is undefined due to earlier initialization errors.");
}
