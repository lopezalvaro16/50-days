import { doc, setDoc, getDoc, updateDoc, collection, Timestamp, getDocs, query, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getArgentinaDateString, parseArgentinaDate } from '../utils/dateUtils';

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
    createUserProfile: async (uid: string, email: string, displayName?: string, customStartDate?: Date) => {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // Usar customStartDate si se proporciona, sino usar hoy
            let normalizedStartDate: Date;
            if (customStartDate) {
                const startDateStr = getArgentinaDateString(customStartDate);
                normalizedStartDate = parseArgentinaDate(startDateStr);
            } else {
                // Normalize startDate to Argentina date (midnight of today in Argentina timezone)
                const todayStr = getArgentinaDateString();
                normalizedStartDate = parseArgentinaDate(todayStr);
            }
            
            const newProfile: UserProfile = {
                uid,
                email,
                displayName: displayName || email.split('@')[0],
                startDate: normalizedStartDate,
                currentStreak: 0,
                longestStreak: 0,
                totalDaysCompleted: 0,
                badges: [],
            };
            
            await setDoc(userRef, newProfile);
        } else {
            // Ensure existing profile has a valid startDate
            const data = userSnap.data();
            
            if (!data.startDate) {
                const todayStr = getArgentinaDateString();
                const normalizedStartDate = parseArgentinaDate(todayStr);
                
                await updateDoc(userRef, {
                    startDate: Timestamp.fromDate(normalizedStartDate),
                });
            }
        }
    },

    updateDisplayName: async (uid: string, displayName: string) => {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, { displayName });
    },

    updateStartDate: async (uid: string, startDate: Date) => {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
            startDate: Timestamp.fromDate(startDate),
        });
    },

    getUserProfile: async (uid: string): Promise<UserProfile | null> => {
        const userRef = doc(db, 'users', uid);
        const snap = await getDoc(userRef);
        
        if (snap.exists()) {
            const data = snap.data();
            
            // Ensure startDate exists and is valid, if not, set it to today
            let startDate = data.startDate?.toDate();
            
            if (!startDate || isNaN(startDate.getTime())) {
                const todayStr = getArgentinaDateString();
                startDate = parseArgentinaDate(todayStr);
                
                // Update the profile with valid startDate
                await updateDoc(userRef, {
                    startDate: Timestamp.fromDate(startDate),
                });
            }
            
            const lastCompletedDate = data.lastCompletedDate?.toDate();
            
            const profile: UserProfile = {
                ...data,
                startDate,
                lastCompletedDate,
            } as UserProfile;
            
            return profile;
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

    updateStreak: async (uid: string, newStreak: number, lastCompletedDate: Date, incrementDaysCompleted: boolean = true) => {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const currentData = userSnap.data();
            const longestStreak = Math.max(currentData.longestStreak || 0, newStreak);

            const updateData: any = {
                currentStreak: newStreak,
                longestStreak,
                lastCompletedDate,
            };

            // Only increment totalDaysCompleted if this is a new completion
            if (incrementDaysCompleted) {
                updateData.totalDaysCompleted = (currentData.totalDaysCompleted || 0) + 1;
            }

            await updateDoc(userRef, updateData);
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
    },

    // Función completa para obtener TODOS los datos del usuario
    getAllUserData: async (uid: string) => {
        const allData: any = {
            profile: null,
            dailyProgress: [],
            totalDailyProgressDocs: 0,
            firstProgressDate: null, // Primera fecha de progreso para usar como startDate si no existe perfil
        };

        // 1. Obtener perfil completo del usuario
        try {
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const profileData = userSnap.data();
                allData.profile = profileData;
            }
        } catch (error) {
            console.error('Error obteniendo perfil:', error);
        }

        // 2. Obtener TODOS los documentos de dailyProgress
        try {
            const dailyProgressRef = collection(db, 'users', uid, 'dailyProgress');
            const dailyProgressSnapshot = await getDocs(query(dailyProgressRef));
            
            if (dailyProgressSnapshot.size > 0) {
                const progressDocs: any[] = [];
                const validDates: string[] = [];
                
                for (const docSnap of dailyProgressSnapshot.docs) {
                    const docData = docSnap.data();
                    const docId = docSnap.id;
                    
                    // Validar que la fecha sea válida
                    const isValidDate = docId.match(/^\d{4}-\d{2}-\d{2}$/);
                    if (!isValidDate || docId === 'NaN-NaN-NaN') {
                        try {
                            const invalidDocRef = doc(db, 'users', uid, 'dailyProgress', docId);
                            await deleteDoc(invalidDocRef);
                            continue;
                        } catch (deleteError) {
                            console.error('Error al eliminar documento inválido:', deleteError);
                            continue;
                        }
                    }
                    
                    progressDocs.push({
                        id: docId,
                        data: docData,
                    });
                    validDates.push(docId);
                }
                
                allData.dailyProgress = progressDocs;
                allData.totalDailyProgressDocs = progressDocs.length;
                
                // Encontrar la primera fecha válida (la más antigua)
                if (validDates.length > 0) {
                    const sortedDates = validDates.sort();
                    allData.firstProgressDate = sortedDates[0];
                }
            }
        } catch (error) {
            console.error('Error obteniendo progreso diario:', error);
        }

        return allData;
    },

    // Resetear toda la cuenta del usuario
    resetUserAccount: async (uid: string, email: string) => {
        try {
            // 1. Borrar todos los documentos de dailyProgress
            const dailyProgressRef = collection(db, 'users', uid, 'dailyProgress');
            const dailyProgressSnapshot = await getDocs(query(dailyProgressRef));
            
            const deletePromises = dailyProgressSnapshot.docs.map(docSnap => 
                deleteDoc(doc(db, 'users', uid, 'dailyProgress', docSnap.id))
            );
            await Promise.all(deletePromises);

            // 2. Resetear el perfil del usuario a valores iniciales
            const userRef = doc(db, 'users', uid);
            const todayStr = getArgentinaDateString();
            const normalizedStartDate = parseArgentinaDate(todayStr);
            
            const resetProfile: UserProfile = {
                uid,
                email,
                displayName: email.split('@')[0],
                startDate: normalizedStartDate,
                currentStreak: 0,
                longestStreak: 0,
                totalDaysCompleted: 0,
                badges: [],
            };
            
            await setDoc(userRef, resetProfile);
            
            return true;
        } catch (error) {
            console.error('Error reseteando cuenta:', error);
            throw error;
        }
    },
};
