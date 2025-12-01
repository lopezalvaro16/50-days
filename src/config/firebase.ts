import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getReactNativePersistence } from '@firebase/auth/dist/rn';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
let auth;
try {
    auth = getAuth(app);
} catch {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
    });
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
