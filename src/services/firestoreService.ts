import { doc, setDoc, getDoc, updateDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface UserProfile {
    uid: string;
    email: string;
    displayName?: string;
    startDate: Date;
    currentStreak: number;
    longestStreak: number;
    totalDaysCompleted: number;
    lastCompletedDate?: Date;
    badges: string[];
}

export const firestoreService = {
    createUserProfile: async (uid: string, email: string, displayName?: string) => {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            const newProfile: UserProfile = {
                uid,
                email,
                displayName: displayName || email.split('@')[0],
                startDate: new Date(),
                currentStreak: 0,
                longestStreak: 0,
                totalDaysCompleted: 0,
                badges: [],
            };
            await setDoc(userRef, newProfile);
        }
    },

    updateDisplayName: async (uid: string, displayName: string) => {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, { displayName });
    },

    getUserProfile: async (uid: string): Promise<UserProfile | null> => {
        const userRef = doc(db, 'users', uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
            const data = snap.data();
            return {
                ...data,
                startDate: data.startDate.toDate(),
                lastCompletedDate: data.lastCompletedDate?.toDate(),
            } as UserProfile;
        }
        return null;
    },

    saveDailyProgress: async (uid: string, date: string, habits: Record<string, boolean | number | string>) => {
        // Correct path for subcollection: users/{uid}/dailyProgress/{date}
        const progressRef = doc(db, 'users', uid, 'dailyProgress', date);
        await setDoc(progressRef, {
            date,
            habits,
            updatedAt: Timestamp.now(),
        }, { merge: true });
    },

    getDailyProgress: async (uid: string, date: string): Promise<Record<string, boolean | number | string> | null> => {
        // Correct path for subcollection: users/{uid}/dailyProgress/{date}
        const progressRef = doc(db, 'users', uid, 'dailyProgress', date);
        const snap = await getDoc(progressRef);
        if (snap.exists()) {
            const data = snap.data();
            return data.habits || null;
        }
        return null;
    },

    updateStreak: async (uid: string, newStreak: number, lastCompletedDate: Date) => {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const currentData = userSnap.data();
            const longestStreak = Math.max(currentData.longestStreak || 0, newStreak);

            await updateDoc(userRef, {
                currentStreak: newStreak,
                longestStreak,
                lastCompletedDate,
                totalDaysCompleted: (currentData.totalDaysCompleted || 0) + 1,
            });
        }
    },

    unlockBadge: async (uid: string, badgeId: string) => {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const currentBadges = userSnap.data().badges || [];
            if (!currentBadges.includes(badgeId)) {
                await updateDoc(userRef, {
                    badges: [...currentBadges, badgeId],
                });
            }
        }
    }
};
