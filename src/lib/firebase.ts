import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// Ensure these environment variables are set in your .env.local file
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Check for missing environment variables
const requiredEnvVarKeys: (keyof typeof firebaseConfig)[] = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

const missingVars = requiredEnvVarKeys.filter(key => !firebaseConfig[key]);

if (missingVars.length > 0) {
  console.error(
    '🔴 Firebase Initialization Error: The following required environment variables are missing or undefined:\n' +
    missingVars.map(key => {
        const envVarName = `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
        return `- ${envVarName}`;
    }).join('\n') +
    '\n👉 Please ensure these are set in your .env.local file and the development server is restarted.' +
    '\nFirebase functionality will be impaired, and Firestore operations (like uploads and data fetching) will likely fail.'
  );
}

let app: FirebaseApp | undefined = undefined;
let db: Firestore | undefined = undefined;

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
    db = getFirestore(app);
    console.log("✅ Firestore instance (db) obtained successfully.");
  } else {
    console.error("🔴 Firebase App object is undefined after initialization attempt. Firestore (db) cannot be initialized.");
  }

} catch (error: any) {
    console.error("🔴 Firebase SDK Initialization Failed critically during app/db setup:", error.message || error);
    app = undefined;
    db = undefined;
}

if (!db) {
    console.error(
      "🔴 CRITICAL: Firestore database instance (db) is UNDEFINED after initialization attempts. \n" +
      "   Firestore operations (reading/writing data) WILL FAIL. \n" +
      "   If you see 'transport errored' or 'permission denied' messages in the console, please check the following:\n" +
      "   1. Environment Variables: Ensure all NEXT_PUBLIC_FIREBASE_... variables in '.env.local' are correct and the server was restarted.\n" +
      "   2. Firestore Database: Verify that Firestore is enabled in your Firebase project (console -> Firestore Database -> Create database).\n" +
      "   3. Database Mode: Ensure Firestore is in 'Native Mode', NOT 'Datastore Mode'.\n" +
      "   4. Security Rules: Your Firestore security rules (console -> Firestore Database -> Rules) might be blocking access. \n" +
      "      For initial development, you might use permissive rules like:\n" +
      "      rules_version = '2';\n" +
      "      service cloud.firestore {\n" +
      "        match /databases/{database}/documents {\n" +
      "          match /{document=**} {\n" +
      "            allow read, write: if true; // CAUTION: Open for development, secure before production!\n" +
      "          }\n" +
      "        }\n" +
      "      }\n" +
      "      IMPORTANT: Secure these rules properly before deploying to production!\n" +
      "   5. API Key Restrictions: In Google Cloud Console (APIs & Services -> Credentials):\n" +
      "      - Select your API key.\n" +
      "      - Under 'Application restrictions', if 'HTTP referrers' is set, ensure your development URL (e.g., http://localhost:9002) is allowed.\n" +
      "      - Under 'API restrictions', if 'Restrict key' is selected, ensure 'Cloud Firestore API' is in the list of allowed APIs.\n" +
      "   6. Billing: Ensure your Firebase project has billing enabled if it's on a plan that requires it (though Firestore's free tier is generous)."
    );
} else {
    console.log("ℹ️ Firestore (db) is available. If you still encounter Firestore connection/permission errors (like 'transport errored' or 'Missing or insufficient permissions'), please RE-CHECK your Firestore Security Rules and API key restrictions in the Firebase/Google Cloud console.");
}


export { app, db };