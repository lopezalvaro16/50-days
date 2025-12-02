import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import getReactNativePersistence - Firebase v9+ exports it differently
// Using dynamic import as fallback since TypeScript types might not include it
let getReactNativePersistence: any;
try {
    // Try to import from firebase/auth
    const authModule = require('firebase/auth');
    getReactNativePersistence = authModule.getReactNativePersistence;
} catch {
    // If not available, we'll handle it in the auth initialization
}

const firebaseConfig = {
    apiKey: "AIzaSyDXSAXTbqN4ixgvlW3x_3_-4rFPwGODhfs",
    authDomain: "project-50-tracker.firebaseapp.com",
    projectId: "project-50-tracker",
    storageBucket: "project-50-tracker.firebasestorage.app",
    messagingSenderId: "654829066552",
    appId: "1:654829066552:web:ddfb5f388d1af9554509cd",
    measurementId: "G-KPFWEGG3ZP"
};

// Initialize Firebase App (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with AsyncStorage persistence
// IMPORTANT: For React Native, we MUST use initializeAuth with persistence
// getAuth() doesn't support persistence in React Native
let auth: Auth;
if (getReactNativePersistence) {
    try {
        // Always try to initialize with persistence first
        // This is the correct way for React Native
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
        });
    } catch (error: any) {
        // If auth is already initialized, we can't change it
        // This happens if getAuth() was called before initializeAuth()
        if (error?.code === 'auth/already-initialized') {
            // Auth was already initialized (probably without persistence)
            // We can't change it now, but we'll use it anyway
            auth = getAuth(app);
            console.warn('Firebase Auth was already initialized. Persistence may not be enabled. Please restart the app.');
        } else {
            // Some other error, try to get existing auth
            console.error('Error initializing Auth:', error);
            auth = getAuth(app);
        }
    }
} else {
    // getReactNativePersistence not available, use getAuth as fallback
    console.warn('getReactNativePersistence not available. Auth persistence may not work.');
    auth = getAuth(app);
}

// Initialize Firestore
let db;
try {
    db = getFirestore(app);
} catch {
    db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
    });
}

export { auth, db };

// Google Sign-In Web Client ID
export const GOOGLE_WEB_CLIENT_ID = "project-654829066552";
