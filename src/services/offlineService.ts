import AsyncStorage from '@react-native-async-storage/async-storage';
import { firestoreService } from './firestoreService';
import { authService } from './authService';

const OFFLINE_PREFIX = 'offline_progress_';
const PENDING_SYNC_KEY = 'pending_sync_dates';

export const offlineService = {
    // Save progress locally when offline
    saveOfflineProgress: async (date: string, progress: Record<string, boolean | number | string>) => {
        try {
            const key = `${OFFLINE_PREFIX}${date}`;
            await AsyncStorage.setItem(key, JSON.stringify(progress));
            
            // Track dates that need syncing
            const pendingDates = await AsyncStorage.getItem(PENDING_SYNC_KEY);
            const dates = pendingDates ? JSON.parse(pendingDates) : [];
            if (!dates.includes(date)) {
                dates.push(date);
                await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(dates));
            }
        } catch (error) {
            console.log('Error saving offline progress:', error);
        }
    },

    // Get offline progress
    getOfflineProgress: async (date: string): Promise<Record<string, boolean | number | string> | null> => {
        try {
            const key = `${OFFLINE_PREFIX}${date}`;
            const data = await AsyncStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.log('Error getting offline progress:', error);
            return null;
        }
    },

    // Sync all pending progress to Firestore
    syncPendingProgress: async () => {
        try {
            const user = authService.getCurrentUser();
            if (!user) return;

            const pendingDates = await AsyncStorage.getItem(PENDING_SYNC_KEY);
            if (!pendingDates) return;

            const dates = JSON.parse(pendingDates);
            const syncedDates: string[] = [];

            for (const date of dates) {
                try {
                    const progress = await offlineService.getOfflineProgress(date);
                    if (progress) {
                        await firestoreService.saveDailyProgress(user.uid, date, progress);
                        syncedDates.push(date);
                    }
                } catch (error) {
                    console.log(`Error syncing date ${date}:`, error);
                }
            }

            // Remove synced dates from pending list
            const remainingDates = dates.filter((d: string) => !syncedDates.includes(d));
            if (remainingDates.length === 0) {
                await AsyncStorage.removeItem(PENDING_SYNC_KEY);
            } else {
                await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(remainingDates));
            }

            // Clean up synced offline data
            for (const date of syncedDates) {
                const key = `${OFFLINE_PREFIX}${date}`;
                await AsyncStorage.removeItem(key);
            }

            return syncedDates.length;
        } catch (error) {
            console.log('Error syncing pending progress:', error);
            return 0;
        }
    },

    // Check if there's pending sync
    hasPendingSync: async (): Promise<boolean> => {
        try {
            const pendingDates = await AsyncStorage.getItem(PENDING_SYNC_KEY);
            return !!pendingDates && JSON.parse(pendingDates).length > 0;
        } catch (error) {
            return false;
        }
    },
};

