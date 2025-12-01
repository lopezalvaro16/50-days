import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    User
} from 'firebase/auth';
import { auth } from '../config/firebase';

export const authService = {
    signUp: async (email: string, pass: string): Promise<User> => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        return userCredential.user;
    },

    signIn: async (email: string, pass: string): Promise<User> => {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        return userCredential.user;
    },

    signInWithGoogle: async (): Promise<User> => {
        // Google Sign-In requires native configuration (SHA-1 certificates, etc.)
        // For now, this is a placeholder
        throw new Error('Google Sign-In requiere configuración nativa adicional. Por ahora usá email/password.');
    },

    signOut: async () => {
        await firebaseSignOut(auth);
    },

    getCurrentUser: () => {
        return auth.currentUser;
    }
};
