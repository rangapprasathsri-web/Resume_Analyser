import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * Firebase Client Configuration for project: resume-parser-a82c1
 * Configured exclusively via Vite / Vercel environment variables.
 */
const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
export const isFirebaseConfigValid = Boolean(rawApiKey && rawApiKey.trim().length > 0);

// Use actual API key if provided, or safe placeholder to prevent Firebase SDK crash during module load
const apiKey = isFirebaseConfigValid ? rawApiKey.trim() : 'AIzaSyConfigMissing_Configure_VITE_FIREBASE_API_KEY';
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'resume-parser-a82c1.firebaseapp.com';
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'resume-parser-a82c1';
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'resume-parser-a82c1.firebasestorage.app';
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '691840703558';
const appId = import.meta.env.VITE_FIREBASE_APP_ID || '1:691840703558:web:28556dac831874354fbe47';
const customDatabaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID;

export const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
};

/**
 * Checks if all required Firebase environment variables are configured.
 */
export function validateFirebaseConfig(): { isValid: boolean; error: string | null } {
  if (!isFirebaseConfigValid) {
    return {
      isValid: false,
      error:
        'Missing required environment variable VITE_FIREBASE_API_KEY for Firebase project "resume-parser-a82c1". Please configure VITE_FIREBASE_API_KEY in your Vercel or environment settings and redeploy.',
    };
  }
  return { isValid: true, error: null };
}

if (!isFirebaseConfigValid) {
  console.warn(
    '[Firebase Configuration Notice] VITE_FIREBASE_API_KEY is not defined in environment variables. Please add VITE_FIREBASE_API_KEY in Vercel settings for project "resume-parser-a82c1".'
  );
}

// Singleton App Initialization - strictly for resume-parser-a82c1
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(app);

// Initialize Firestore (use default database or custom ID if explicitly specified)
export const db: Firestore =
  customDatabaseId && customDatabaseId !== '(default)'
    ? getFirestore(app, customDatabaseId)
    : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;

