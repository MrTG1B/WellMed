
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
        // Construct the full env var name as it would appear in .env files
        const envVarName = `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
        return `- ${envVarName}`;
    }).join('\n') +
    '\n👉 Please ensure these are set in your .env.local file and the development server is restarted.' +
    '\nFirebase functionality will be impaired, and Firestore operations (like uploads) will likely fail.'
  );
}

let app: FirebaseApp | undefined = undefined;
let db: Firestore | undefined = undefined;

// Initialize Firebase only if it hasn't been initialized yet
try {
  if (!getApps().length) {
    if (missingVars.length > 0) {
        console.warn("⚠️ Firebase initialization is being attempted with incomplete configuration. Errors are highly likely.");
    }
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  db = getFirestore(app);
} catch (error) {
    console.error("🔴 Firebase SDK Initialization Failed:", error);
    // If initialization fails, app and db will remain undefined.
    app = undefined; 
    db = undefined; 
    console.error("🔴 Firestore database (db) is not available due to an initialization error. All Firestore operations will fail.");
}

// Export potentially undefined app and db. Code using them should be resilient or this should be a fatal error.
// For this application's structure, components will attempt to use `db` directly.
// If `db` is undefined here, those operations will fail, hopefully with clear errors
// pointing back to the initialization problem highlighted by the console messages above.

export { app, db };
