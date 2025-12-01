import { create } from 'zustand';
import { firestoreService } from '../services/firestoreService';
import { authService } from '../services/authService';
import { offlineService } from '../services/offlineService';

export interface Habit {
    id: string;
    title: string;
    description?: string;
    isCompleted: boolean;
    icon?: string; // Icon name from lucide-react-native
}

interface HabitState {
    habits: Habit[];
    isLoading: boolean;
    toggleHabit: (id: string) => Promise<void>;
    setHabitCompleted: (id: string, completed: boolean, skipFirestore?: boolean) => Promise<void>;
    initializeDailyHabits: () => Promise<void>;
    getProgress: () => number;
}

const INITIAL_HABITS: Habit[] = [
    {
        id: '1',
        title: 'Levantarse antes de las 8am',
        description: 'Despertar temprano para empezar el día con energía',
        icon: 'Sunrise',
        isCompleted: false
    },
    {
        id: '2',
        title: 'Ejercicio diario',
        description: '1 hora de actividad física',
        icon: 'Dumbbell',
        isCompleted: false
    },
    {
        id: '3',
        title: 'Beber suficiente agua',
        description: 'Mantenerte hidratado durante el día',
        icon: 'Droplet',
        isCompleted: false
    },
    {
        id: '4',
        title: 'Leer 10 páginas',
        description: 'Lectura diaria para crecimiento personal',
        icon: 'Book',
        isCompleted: false
    },
    {
        id: '5',
        title: 'Nueva habilidad',
        description: '1 hora dedicada a aprender algo nuevo',
        icon: 'GraduationCap',
        isCompleted: false
    },
    {
        id: '6',
        title: 'Dieta saludable',
        description: 'Sin alcohol ni comida chatarra',
        icon: 'Apple',
        isCompleted: false
    },
    {
        id: '7',
        title: 'Rutina de cama',
        description: 'Mantener horario consistente para dormir',
        icon: 'Moon',
        isCompleted: false
    },
];

export const useHabitStore = create<HabitState>((set, get) => ({
    habits: INITIAL_HABITS,
    isLoading: false,

    toggleHabit: async (id) => {
        const user = authService.getCurrentUser();
        if (!user) return;

        // Optimistic Update (UI updates immediately)
        set((state) => ({
            habits: state.habits.map((habit) =>
                habit.id === id ? { ...habit, isCompleted: !habit.isCompleted } : habit
            ),
        }));

        // Sync with Firestore
        const { habits } = get();
        const today = new Date().toISOString().split('T')[0];
        const habitsMap = habits.reduce((acc, habit) => ({
            ...acc,
            [habit.id]: habit.isCompleted
        }), {});

        try {
            try {
                try {
                    await firestoreService.saveDailyProgress(user.uid, today, habitsMap);
                } catch (error) {
                    // If offline, save locally
                    console.log('Offline - saving locally');
                    await offlineService.saveOfflineProgress(today, habitsMap);
                }
            } catch (error) {
                // If offline, save locally
                console.log('Offline - saving locally');
                await offlineService.saveOfflineProgress(today, habitsMap);
            }

            // Check if all habits are completed → Update streak
            const allCompleted = habits.every(h => h.isCompleted);
            if (allCompleted) {
                const userProfile = await firestoreService.getUserProfile(user.uid);
                if (userProfile) {
                    const lastCompleted = userProfile.lastCompletedDate;
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];

                    // Calculate new streak
                    let newStreak = 1;
                    if (lastCompleted) {
                        const lastCompletedStr = lastCompleted.toISOString().split('T')[0];
                        if (lastCompletedStr === yesterdayStr) {
                            // Consecutive day
                            newStreak = userProfile.currentStreak + 1;
                        }
                    }

                    await firestoreService.updateStreak(user.uid, newStreak, new Date());
                }
            }
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    },

    setHabitCompleted: async (id: string, completed: boolean, skipFirestore: boolean = false) => {
        const user = authService.getCurrentUser();
        if (!user) return;

        // Update state directly without toggling
        set((state) => ({
            habits: state.habits.map((habit) =>
                habit.id === id ? { ...habit, isCompleted: completed } : habit
            ),
        }));

        // Skip Firestore save if requested (useful when saving is handled elsewhere)
        if (skipFirestore) {
            return;
        }

        // Sync with Firestore - preserve existing data (like water count)
        const { habits } = get();
        const today = new Date().toISOString().split('T')[0];

        try {
            // Get existing progress to preserve additional data (like water count)
            const existingProgress = await firestoreService.getDailyProgress(user.uid, today) || {};

            // Update habits map while preserving additional data
            const habitsMap: Record<string, boolean | number | string> = { ...existingProgress };
            habits.forEach(habit => {
                habitsMap[habit.id] = habit.isCompleted;
            });

            try {
                await firestoreService.saveDailyProgress(user.uid, today, habitsMap);
            } catch (error) {
                // If offline, save locally
                console.log('Offline - saving locally');
                await offlineService.saveOfflineProgress(today, habitsMap);
            }

            // Check if all habits are completed → Update streak
            const allCompleted = habits.every(h => h.isCompleted);
            if (allCompleted) {
                const userProfile = await firestoreService.getUserProfile(user.uid);
                if (userProfile) {
                    const lastCompleted = userProfile.lastCompletedDate;
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];

                    // Calculate new streak
                    let newStreak = 1;
                    if (lastCompleted) {
                        const lastCompletedStr = lastCompleted.toISOString().split('T')[0];
                        if (lastCompletedStr === yesterdayStr) {
                            // Consecutive day
                            newStreak = userProfile.currentStreak + 1;
                        }
                    }

                    await firestoreService.updateStreak(user.uid, newStreak, new Date());
                }
            }
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    },

    initializeDailyHabits: async () => {
        set({ isLoading: true });
        const user = authService.getCurrentUser();
        if (!user) {
            set({ isLoading: false });
            return;
        }

        const today = new Date().toISOString().split('T')[0];

        try {
            // 1. Try to load from Firestore first
            let savedHabits: Record<string, boolean | number | string> | null = null;
            try {
                savedHabits = await firestoreService.getDailyProgress(user.uid, today);
            } catch (error) {
                // If offline, try to load from local storage
                console.log('Offline - loading from local storage');
                savedHabits = await offlineService.getOfflineProgress(today);
            }

            if (savedHabits) {
                // Apply saved state to initial habits
                set({
                    habits: INITIAL_HABITS.map(h => ({
                        ...h,
                        isCompleted: !!savedHabits[h.id]
                    }))
                });
            } else {
                // New day → Reset habits and check if streak should continue
                set({ habits: INITIAL_HABITS });

                const userProfile = await firestoreService.getUserProfile(user.uid);
                if (userProfile && userProfile.lastCompletedDate) {
                    const lastCompleted = userProfile.lastCompletedDate;
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];
                    const lastCompletedStr = lastCompleted.toISOString().split('T')[0];

                    // If they didn't complete yesterday, reset streak
                    if (lastCompletedStr !== yesterdayStr && lastCompletedStr !== today) {
                        await firestoreService.updateStreak(user.uid, 0, lastCompleted);
                    }
                }
            }
        } catch (error: any) {
            // If offline, try to load from local storage
            console.log('Working offline - trying local storage');
            try {
                const localProgress = await offlineService.getOfflineProgress(today);
                if (localProgress) {
                    set({
                        habits: INITIAL_HABITS.map(h => ({
                            ...h,
                            isCompleted: !!localProgress[h.id]
                        }))
                    });
                } else {
                    set({ habits: INITIAL_HABITS });
                }
            } catch (localError) {
                set({ habits: INITIAL_HABITS });
            }
        } finally {
            set({ isLoading: false });
        }
    },

    getProgress: () => {
        const { habits } = get();
        const completedCount = habits.filter((h) => h.isCompleted).length;
        return completedCount / habits.length;
    },
}));
