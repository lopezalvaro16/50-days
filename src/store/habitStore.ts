import { create } from 'zustand';
import { firestoreService } from '../services/firestoreService';
import { authService } from '../services/authService';
import { offlineService } from '../services/offlineService';
import { getArgentinaDateString, getYesterdayArgentinaDateString } from '../utils/dateUtils';

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
        if (!user) {
            return;
        }

        // Get current state BEFORE updating
        const currentState = get();
        const habitToToggle = currentState.habits.find(h => h.id === id);
        if (!habitToToggle) {
            return;
        }

        const newCompletedState = !habitToToggle.isCompleted;

        // Optimistic Update (UI updates immediately)
        set((state) => ({
            habits: state.habits.map((habit) =>
                habit.id === id ? { ...habit, isCompleted: newCompletedState } : habit
            ),
        }));

        // Get updated state after setting
        const { habits } = get();
        const today = getArgentinaDateString();
        const habitsMap = habits.reduce((acc, habit) => ({
            ...acc,
            [habit.id]: habit.isCompleted
        }), {});

        try {
            // Try to save to Firestore
            await firestoreService.saveDailyProgress(user.uid, today, habitsMap);
        } catch (error: any) {
            // If offline or error, save locally
            try {
                await offlineService.saveOfflineProgress(today, habitsMap);
            } catch (localError) {
                console.error('Error saving progress:', localError);
            }
        }

        // Check if all habits are completed → Update streak
        try {
            const allCompleted = habits.every(h => h.isCompleted);
            if (allCompleted) {
                const userProfile = await firestoreService.getUserProfile(user.uid);
                if (userProfile) {
                    const lastCompleted = userProfile.lastCompletedDate;
                    const yesterdayStr = getYesterdayArgentinaDateString();

                    // Calculate new streak
                    let newStreak = 1;
                    if (lastCompleted) {
                        const lastCompletedStr = getArgentinaDateString(lastCompleted);
                        if (lastCompletedStr === yesterdayStr) {
                            // Consecutive day
                            newStreak = userProfile.currentStreak + 1;
                        }
                    }

                    await firestoreService.updateStreak(user.uid, newStreak, new Date());
                }
            }
        } catch (streakError) {
            console.error('Error updating streak:', streakError);
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
        const today = getArgentinaDateString();

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
                await offlineService.saveOfflineProgress(today, habitsMap);
            }

            // Check if all habits are completed → Update streak
            const allCompleted = habits.every(h => h.isCompleted);
            if (allCompleted) {
                const userProfile = await firestoreService.getUserProfile(user.uid);
                if (userProfile) {
                    const lastCompleted = userProfile.lastCompletedDate;
                    const yesterdayStr = getYesterdayArgentinaDateString();

                    // Calculate new streak
                    let newStreak = 1;
                    if (lastCompleted) {
                        const lastCompletedStr = getArgentinaDateString(lastCompleted);
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

        const today = getArgentinaDateString();

        try {
            // 1. Try to load from Firestore first
            let savedHabits: Record<string, boolean | number | string> | null = null;
            try {
                savedHabits = await firestoreService.getDailyProgress(user.uid, today);
            } catch (error: any) {
                // If offline, try to load from local storage
                try {
                    savedHabits = await offlineService.getOfflineProgress(today);
                } catch (localError) {
                    // Ignore local storage errors
                }
            }

            if (savedHabits && Object.keys(savedHabits).length > 0) {
                // Apply saved state to initial habits
                const updatedHabits = INITIAL_HABITS.map(h => ({
                    ...h,
                    isCompleted: !!savedHabits![h.id]
                }));
                set({ habits: updatedHabits });
            } else {
                // New day → Reset habits and check if streak should continue
                set({ habits: INITIAL_HABITS });

                try {
                    const userProfile = await firestoreService.getUserProfile(user.uid);
                    if (userProfile && userProfile.lastCompletedDate) {
                        const lastCompleted = userProfile.lastCompletedDate;
                        const yesterdayStr = getYesterdayArgentinaDateString();
                        const lastCompletedStr = getArgentinaDateString(lastCompleted);

                        // If they didn't complete yesterday, reset streak
                        if (lastCompletedStr !== yesterdayStr && lastCompletedStr !== today) {
                            await firestoreService.updateStreak(user.uid, 0, lastCompleted);
                        }
                    }
                } catch (profileError) {
                    console.error('Error checking user profile:', profileError);
                }
            }
        } catch (error: any) {
            // If offline, try to load from local storage
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
                console.error('Error loading habits:', localError);
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
