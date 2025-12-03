import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SPACING, SIZES } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';
import { useHabitStore } from '../store/habitStore';
import { Droplet, Plus, Minus } from 'lucide-react-native';
import { firestoreService } from '../services/firestoreService';
import { authService } from '../services/authService';
import { getArgentinaDateString } from '../utils/dateUtils';

interface WaterTrackerProps {
    habitId: string;
    onUpdate?: (glasses: number, isComplete: boolean) => void;
}

const GLASSES_GOAL = 8; // 8 vasos de agua por día (aprox 2 litros)

export const WaterTracker: React.FC<WaterTrackerProps> = ({ habitId, onUpdate }) => {
    const { colors } = useThemeStore();
    const { habits, setHabitCompleted } = useHabitStore();
    const [glasses, setGlasses] = useState(0);
    
    // Get current habit state
    const currentHabit = habits.find(h => h.id === habitId);

    useEffect(() => {
        loadTodayWater();
    }, []);

    // Sync with store state when habit changes
    useEffect(() => {
        if (currentHabit) {
            // If habit is completed in store but we don't have enough glasses, update glasses
            if (currentHabit.isCompleted && glasses < GLASSES_GOAL) {
                setGlasses(GLASSES_GOAL);
            }
            // If habit is not completed but we have enough glasses, update store
            else if (!currentHabit.isCompleted && glasses >= GLASSES_GOAL) {
                setHabitCompleted(habitId, true);
            }
        }
    }, [currentHabit?.isCompleted]);

    const loadTodayWater = async () => {
        try {
            const user = authService.getCurrentUser();
            if (!user) return;

            const today = getArgentinaDateString();
            const progress = await firestoreService.getDailyProgress(user.uid, today);
            
            if (progress) {
                // Load glasses count
                const waterData = progress[`${habitId}_water`];
                if (typeof waterData === 'number') {
                    setGlasses(waterData);
                }
                
                // Sync store state if habit is marked as completed in Firestore
                // BUT don't save to Firestore (skipFirestore=true) to avoid overwriting
                // The store will be updated from initializeDailyHabits which loads all habits
                const isCompleteInFirestore = !!progress[habitId];
                if (currentHabit && isCompleteInFirestore !== currentHabit.isCompleted) {
                    await setHabitCompleted(habitId, isCompleteInFirestore, true); // skipFirestore=true
                }
            }
        } catch (error) {
            console.log('Error loading water data:', error);
        }
    };

    const saveWater = async (newGlasses: number) => {
        try {
            const user = authService.getCurrentUser();
            if (!user) return;

            const today = getArgentinaDateString();
            const isComplete = newGlasses >= GLASSES_GOAL;
            
            // Update store state FIRST (optimistic update) - skip Firestore save
            // This will trigger a re-render and update the progress calculation
            await setHabitCompleted(habitId, isComplete, true);
            
            // Get ALL current habits from store to preserve them
            // Use the habits from the hook that's already imported
            const currentHabits = habits;
            
            // Build complete progress map with ALL habits
            const progress: Record<string, boolean | number | string> = currentHabits.reduce((acc, habit) => ({
                ...acc,
                [habit.id]: habit.isCompleted
            }), {});
            
            // Get existing progress to preserve additional data (like notes, bedtime, etc.)
            try {
                const existingProgress = await firestoreService.getDailyProgress(user.uid, today);
                if (existingProgress) {
                    // Merge existing data (notes, bedtime, etc.) with current habits
                    Object.keys(existingProgress).forEach(key => {
                        // Preserve non-habit keys (like notes, bedtime, etc.)
                        if (!key.match(/^\d+$/)) {
                            progress[key] = existingProgress[key];
                        }
                    });
                }
            } catch (error) {
                // If can't get existing progress, continue with just habits
            }
            
            // Add water-specific data (override the habit completion status and add water count)
            progress[habitId] = isComplete;
            progress[`${habitId}_water`] = newGlasses;
            
            try {
                await firestoreService.saveDailyProgress(user.uid, today, progress);
            } catch (error) {
                // If offline, save locally
                const { offlineService } = require('../services/offlineService');
                await offlineService.saveOfflineProgress(today, progress);
            }
            
            onUpdate?.(newGlasses, isComplete);
        } catch (error) {
            console.log('Error saving water:', error);
        }
    };

    const addGlass = () => {
        const newGlasses = Math.min(glasses + 1, GLASSES_GOAL * 2); // Max 2x goal
        setGlasses(newGlasses);
        saveWater(newGlasses);
    };

    const removeGlass = () => {
        const newGlasses = Math.max(glasses - 1, 0);
        setGlasses(newGlasses);
        saveWater(newGlasses);
    };

    const progress = glasses / GLASSES_GOAL;
    const isComplete = glasses >= GLASSES_GOAL;

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: colors.surface,
                borderColor: isComplete ? colors.success : colors.border,
                borderBottomWidth: 3,
                borderRightWidth: 3,
            }
        ]}>
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                    <Droplet size={24} color={colors.primary} fill={isComplete ? colors.primary : 'transparent'} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>Beber suficiente agua</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {glasses} de {GLASSES_GOAL} vasos
                    </Text>
                </View>
            </View>

            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: colors.surfaceHighlight }]}>
                    <View style={[
                        styles.progressFill,
                        {
                            width: `${Math.min(progress * 100, 100)}%`,
                            backgroundColor: isComplete ? colors.success : colors.primary,
                        }
                    ]} />
                </View>
            </View>

            <View style={styles.controls}>
                <TouchableOpacity
                    style={[
                        styles.button,
                        {
                            backgroundColor: colors.surfaceHighlight,
                            borderColor: colors.border,
                        },
                        glasses === 0 && { opacity: 0.5 }
                    ]}
                    onPress={removeGlass}
                    disabled={glasses === 0}
                >
                    <Minus size={20} color={colors.text} />
                </TouchableOpacity>

                <View style={styles.glassesDisplay}>
                    <Text style={[styles.glassesText, { color: colors.text }]}>{glasses}</Text>
                    <Text style={[styles.glassesLabel, { color: colors.textSecondary }]}>vasos</Text>
                </View>

                <TouchableOpacity
                    style={[
                        styles.button,
                        {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary,
                        },
                        glasses >= GLASSES_GOAL * 2 && { opacity: 0.5 }
                    ]}
                    onPress={addGlass}
                    disabled={glasses >= GLASSES_GOAL * 2}
                >
                    <Plus size={20} color={colors.background} />
                </TouchableOpacity>
            </View>

            {isComplete && (
                <View style={[styles.completeBadge, { backgroundColor: colors.success + '20' }]}>
                    <Text style={[styles.completeText, { color: colors.success }]}>
                        ¡Meta alcanzada! 💧
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: SPACING.l,
        borderRadius: SIZES.borderRadius,
        borderWidth: 2,
        marginBottom: SPACING.m,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.m,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'PatrickHand-Regular',
    },
    progressContainer: {
        marginBottom: SPACING.m,
    },
    progressBar: {
        height: 12,
        borderRadius: 6,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 6,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.s,
    },
    button: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    glassesDisplay: {
        alignItems: 'center',
    },
    glassesText: {
        fontSize: 32,
        fontFamily: 'PatrickHand-Regular',
    },
    glassesLabel: {
        fontSize: 12,
        fontFamily: 'PatrickHand-Regular',
    },
    completeBadge: {
        padding: SPACING.s,
        borderRadius: SIZES.borderRadius,
        alignItems: 'center',
        marginTop: SPACING.xs,
    },
    completeText: {
        fontSize: 14,
        fontFamily: 'PatrickHand-Regular',
    },
});

