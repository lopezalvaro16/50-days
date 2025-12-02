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
            // Silently fail - offline progress may be lost
        }
    },

    // Get offline progress
    getOfflineProgress: async (date: string): Promise<Record<string, boolean | number | string> | null> => {
        try {
            const key = `${OFFLINE_PREFIX}${date}`;
            const data = await AsyncStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
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
                    // Continue with next date
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

    // Obtener TODOS los datos offline del usuario
    getAllOfflineData: async () => {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('💾 [OFFLINE] getAllOfflineData - Obteniendo TODOS los datos offline');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');

        try {
            // Obtener fechas pendientes de sincronización
            console.log('📋 [OFFLINE] 1. Verificando fechas pendientes de sincronización...');
            console.log('───────────────────────────────────────────────────────────');
            const pendingDatesStr = await AsyncStorage.getItem(PENDING_SYNC_KEY);
            const pendingDates = pendingDatesStr ? JSON.parse(pendingDatesStr) : [];
            
            console.log('  - Fechas pendientes de sincronización:', pendingDates);
            console.log('  - Cantidad de fechas pendientes:', pendingDates.length);
            console.log('');

            if (pendingDates.length > 0) {
                console.log('  ┌─────────────────────────────────────────────────────┐');
                console.log('  │ DATOS OFFLINE PENDIENTES DE SINCRONIZAR           │');
                console.log('  └─────────────────────────────────────────────────────┘');
                console.log('');

                for (const date of pendingDates) {
                    console.log(`  📅 Fecha: ${date}`);
                    const offlineProgress = await offlineService.getOfflineProgress(date);
                    if (offlineProgress) {
                        console.log('    - Progreso guardado offline:');
                        console.log('      • Hábitos:', offlineProgress);
                        Object.keys(offlineProgress).forEach(key => {
                            console.log(`        - ${key}:`, offlineProgress[key], `(${typeof offlineProgress[key]})`);
                        });
                    } else {
                        console.log('    - ⚠️ No se encontró progreso offline para esta fecha');
                    }
                    console.log('');
                }
            } else {
                console.log('  ℹ️ No hay datos offline pendientes de sincronización');
                console.log('');
            }

            // Intentar obtener todas las keys de AsyncStorage relacionadas
            console.log('📋 [OFFLINE] 2. Buscando todas las claves relacionadas en AsyncStorage...');
            console.log('───────────────────────────────────────────────────────────');
            try {
                const allKeys = await AsyncStorage.getAllKeys();
                const offlineKeys = allKeys.filter(key => key.startsWith(OFFLINE_PREFIX));
                const otherRelevantKeys = allKeys.filter(key => 
                    key.includes('progress') || 
                    key.includes('habit') || 
                    key.includes('sync') ||
                    key.includes('user')
                );

                console.log('  - Total de claves en AsyncStorage:', allKeys.length);
                console.log('  - Claves de progreso offline encontradas:', offlineKeys.length);
                console.log('  - Otras claves relevantes:', otherRelevantKeys.length);
                console.log('');

                if (offlineKeys.length > 0) {
                    console.log('  📦 Claves de progreso offline:');
                    offlineKeys.forEach(key => {
                        const date = key.replace(OFFLINE_PREFIX, '');
                        console.log(`    • ${key} -> Fecha: ${date}`);
                    });
                    console.log('');
                }

                if (otherRelevantKeys.length > 0) {
                    console.log('  📦 Otras claves relevantes encontradas:');
                    otherRelevantKeys.forEach(key => {
                        console.log(`    • ${key}`);
                    });
                    console.log('');
                }
            } catch (error) {
                console.log('  ⚠️ Error al obtener claves de AsyncStorage:', error);
            }

            console.log('═══════════════════════════════════════════════════════════');
            console.log('💾 RESUMEN DE DATOS OFFLINE');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('  - Fechas pendientes de sincronización:', pendingDates.length);
            console.log('═══════════════════════════════════════════════════════════');
            console.log('');

            return {
                pendingDates,
                count: pendingDates.length,
            };
        } catch (error) {
            console.log('❌ Error obteniendo datos offline:', error);
            console.log('');
            return {
                pendingDates: [],
                count: 0,
            };
        }
    },
};

