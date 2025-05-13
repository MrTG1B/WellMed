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
    '\nFirebase functionality will be impaired, and Firestore operations (like uploads) will likely fail.'
  );
}

let app: FirebaseApp | undefined = undefined;
let db: Firestore | undefined = undefined;

try {
  if (missingVars.length > 0) {
    // Error already logged above about missing vars.
    // Initialization might proceed but app/db could be non-functional.
    console.warn("⚠️ Firebase initialization is being attempted with incomplete configuration. Errors are highly likely.");
  }

  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log("Firebase App initialized.");
  } else {
    app = getApps()[0];
    console.log("Firebase App already exists.");
  }

  // Only attempt to get Firestore if app is validly initialized or retrieved
  if (app) {
    db = getFirestore(app);
  } else {
    // This case suggests initializeApp might have failed silently if critical config was missing,
    // or getApps() was unexpectedly empty.
    console.error("🔴 Firebase App object is undefined. Firestore (db) cannot be initialized.");
  }

} catch (error) {
    console.error("🔴 Firebase SDK Initialization Failed during app/db setup:", error);
    // Ensure app and db are marked as undefined on error
    app = undefined;
    db = undefined;
    console.error("🔴 Firestore database (db) is not available due to an SDK initialization error. Check Firebase config and ensure Firestore is enabled in your project console.");
}

// Final check for db instance
if (!db) {
    console.warn("⚠️ Firestore database instance (db) is undefined after initialization attempts. Operations requiring Firestore will fail. Please check your Firebase configuration, ensure Firestore is enabled in your Firebase project console, and review security rules.");
}

export { app, db };