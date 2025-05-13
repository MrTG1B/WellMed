
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database'; // Changed from getFirestore

// Your web app's Firebase configuration
// Ensure these environment variables are set in your .env.local file
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL, // Added for Realtime Database
};

// Check for missing environment variables
const requiredEnvVarKeys: (keyof typeof firebaseConfig)[] = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
  'databaseURL', // Added for Realtime Database
];

const missingVars = requiredEnvVarKeys.filter(key => !firebaseConfig[key]);

if (missingVars.length > 0) {
  console.error(
    '🔴 Firebase Initialization Error: The following required environment variables are missing or undefined:\n' +
    missingVars.map(key => {
        const envVarName = `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
        return `- ${envVarName}`;
    }).join('\n') +
    '\n👉 Please ensure these are set in your .env.local file (especially NEXT_PUBLIC_FIREBASE_DATABASE_URL for Realtime Database) and the development server is restarted.' +
    '\nFirebase functionality will be impaired, and Realtime Database operations will likely fail.'
  );
}

let app: FirebaseApp | undefined = undefined;
let db: Database | undefined = undefined; // Changed type from Firestore to Database

try {
  if (missingVars.length > 0) {
    console.warn("⚠️ Firebase initialization is being attempted with incomplete configuration. Errors are highly likely.");
  }

  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log("✅ Firebase App initialized successfully.");
  } else {
    app = getApps()[0];
    console.log("ℹ️ Firebase App already exists. Using existing instance.");
  }

  if (app) {
    db = getDatabase(app); // Changed from getFirestore(app)
    console.log("✅ Firebase Realtime Database instance (db) obtained successfully.");
  } else {
    console.error("🔴 Firebase App object is undefined after initialization attempt. Realtime Database (db) cannot be initialized.");
  }

} catch (error: any) {
    console.error("🔴 Firebase SDK Initialization Failed critically during app/db setup:", error.message || error);
    app = undefined;
    db = undefined;
}

if (!db) {
    console.error(
      "🔴 CRITICAL: Firebase Realtime Database instance (db) is UNDEFINED after initialization attempts. \n" +
      "   Realtime Database operations (reading/writing data) WILL FAIL. \n" +
      "   If you see connection/permission errors, please check the following:\n" +
      "   1. Environment Variables: Ensure all NEXT_PUBLIC_FIREBASE_... variables in '.env.local' are correct, especially NEXT_PUBLIC_FIREBASE_DATABASE_URL, and the server was restarted.\n" +
      "   2. Realtime Database Setup: Verify that Realtime Database is created in your Firebase project (console -> Realtime Database -> Create database).\n" +
      "   3. Security Rules: Your Realtime Database security rules (console -> Realtime Database -> Rules) might be blocking access. \n" +
      "      For initial development, you might use permissive rules like:\n" +
      "      {\n" +
      "        \"rules\": {\n" +
      "          \".read\": true, // CAUTION: Open for development\n" +
      "          \".write\": true // CAUTION: Open for development\n" +
      "        }\n" +
      "      }\n" +
      "      IMPORTANT: Secure these rules properly before deploying to production!\n" +
      "   4. API Key Restrictions: In Google Cloud Console (APIs & Services -> Credentials):\n" +
      "      - Select your API key.\n" +
      "      - Under 'Application restrictions', if 'HTTP referrers' is set, ensure your development URL (e.g., http://localhost:9002) is allowed.\n" +
      "      - Under 'API restrictions', if 'Restrict key' is selected, ensure 'Firebase Realtime Database API' is in the list of allowed APIs.\n" +
      "   5. Billing: Ensure your Firebase project has billing enabled if it's on a plan that requires it (though Realtime Database free tier is generous)."
    );
} else {
    console.log("ℹ️ Firebase Realtime Database (db) is available. If you still encounter connection/permission errors, please RE-CHECK your Realtime Database Security Rules and API key restrictions in the Firebase/Google Cloud console.");
}


export { app, db };
