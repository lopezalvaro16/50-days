import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SPACING, SIZES } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';
import { Moon, Clock, CheckCircle } from 'lucide-react-native';
import { firestoreService } from '../services/firestoreService';
import { authService } from '../services/authService';
import { getArgentinaDateString } from '../utils/dateUtils';

interface BedtimeTrackerProps {
    habitId: string;
    onUpdate?: (completed: boolean) => void;
}

const TARGET_BEDTIME = 22; // 10 PM (22:00)
const BEDTIME_WINDOW = 1; // 1 hour window (21:00 - 23:00)

export const BedtimeTracker: React.FC<BedtimeTrackerProps> = ({ habitId, onUpdate }) => {
    const { colors } = useThemeStore();
    const [bedtime, setBedtime] = useState<Date | null>(null);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        loadTodayBedtime();
    }, []);

    const loadTodayBedtime = async () => {
        try {
            const user = authService.getCurrentUser();
            if (!user) return;

            const today = getArgentinaDateString();
            const progress = await firestoreService.getDailyProgress(user.uid, today);
            
            if (progress) {
                setIsComplete(!!progress[habitId]);
                const bedtimeStr = progress[`${habitId}_bedtime`] as string;
                if (bedtimeStr) {
                    setBedtime(new Date(bedtimeStr));
                }
            }
        } catch (error) {
            console.log('Error loading bedtime data:', error);
        }
    };

    const saveBedtime = async (bedtimeDate: Date) => {
        try {
            const user = authService.getCurrentUser();
            if (!user) return;

            const today = getArgentinaDateString();
            
            // Get ALL current habits from store to preserve them
            const { useHabitStore } = require('../store/habitStore');
            const currentHabits = useHabitStore.getState().habits;
            
            // Build complete progress map with ALL habits
            const progress: Record<string, boolean | number | string> = currentHabits.reduce((acc: Record<string, boolean | number | string>, habit: any) => ({
                ...acc,
                [habit.id]: habit.isCompleted
            }), {} as Record<string, boolean | number | string>);
            
            // Get existing progress to preserve additional data (like water count, notes, etc.)
            try {
                const existingProgress = await firestoreService.getDailyProgress(user.uid, today);
                if (existingProgress) {
                    // Merge existing data (water count, notes, etc.) with current habits
                    Object.keys(existingProgress).forEach(key => {
                        // Preserve non-habit keys (like water count, notes, etc.)
                        if (!key.match(/^\d+$/)) {
                            progress[key] = existingProgress[key];
                        }
                    });
                }
            } catch (error) {
                // If can't get existing progress, continue with just habits
            }
            
            const bedtimeHour = bedtimeDate.getHours();
            const isOnTime = bedtimeHour >= TARGET_BEDTIME - BEDTIME_WINDOW && 
                           bedtimeHour <= TARGET_BEDTIME + BEDTIME_WINDOW;
            
            progress[habitId] = isOnTime;
            progress[`${habitId}_bedtime`] = bedtimeDate.toISOString();

            await firestoreService.saveDailyProgress(user.uid, today, progress);
            setIsComplete(isOnTime);
            onUpdate?.(isOnTime);
        } catch (error) {
            console.log('Error saving bedtime:', error);
        }
    };

    const markBedtime = () => {
        const now = new Date();
        setBedtime(now);
        saveBedtime(now);
    };

    const formatTime = (date: Date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const getBedtimeStatus = () => {
        if (!bedtime) return null;
        
        const bedtimeHour = bedtime.getHours();
        const isOnTime = bedtimeHour >= TARGET_BEDTIME - BEDTIME_WINDOW && 
                        bedtimeHour <= TARGET_BEDTIME + BEDTIME_WINDOW;
        
        if (isOnTime) {
            return { text: '¡Hora perfecta!', color: colors.success };
        } else if (bedtimeHour < TARGET_BEDTIME - BEDTIME_WINDOW) {
            return { text: 'Muy temprano', color: colors.textSecondary };
        } else {
            return { text: 'Muy tarde', color: colors.primary };
        }
    };

    const status = getBedtimeStatus();

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
                    <Moon size={24} color={colors.primary} fill={isComplete ? colors.primary : 'transparent'} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>Rutina de cama</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Objetivo: antes de las {TARGET_BEDTIME}:00
                    </Text>
                </View>
            </View>

            {bedtime ? (
                <View style={styles.bedtimeInfo}>
                    <View style={styles.timeContainer}>
                        <Clock size={20} color={colors.textSecondary} />
                        <Text style={[styles.timeText, { color: colors.text }]}>
                            {formatTime(bedtime)}
                        </Text>
                    </View>
                    {status && (
                        <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                            <Text style={[styles.statusText, { color: status.color }]}>
                                {status.text}
                            </Text>
                        </View>
                    )}
                </View>
            ) : (
                <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        Aún no registraste tu hora de dormir
                    </Text>
                </View>
            )}

            <TouchableOpacity
                style={[
                    styles.button,
                    {
                        backgroundColor: isComplete ? colors.success : colors.primary,
                        borderColor: isComplete ? colors.success : colors.primary,
                    }
                ]}
                onPress={markBedtime}
            >
                {bedtime ? (
                    <>
                        <CheckCircle size={20} color={colors.background} />
                        <Text style={[styles.buttonText, { color: colors.background }]}>
                            Actualizar hora
                        </Text>
                    </>
                ) : (
                    <>
                        <Moon size={20} color={colors.background} />
                        <Text style={[styles.buttonText, { color: colors.background }]}>
                            Marcar hora de dormir
                        </Text>
                    </>
                )}
            </TouchableOpacity>

            {isComplete && (
                <View style={[styles.completeBadge, { backgroundColor: colors.success + '20' }]}>
                    <Text style={[styles.completeText, { color: colors.success }]}>
                        ¡Rutina de cama completada! 🌙
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
    bedtimeInfo: {
        marginBottom: SPACING.m,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
        marginBottom: SPACING.s,
    },
    timeText: {
        fontSize: 24,
        fontFamily: 'PatrickHand-Regular',
    },
    statusBadge: {
        padding: SPACING.s,
        borderRadius: SIZES.borderRadius,
        alignSelf: 'flex-start',
    },
    statusText: {
        fontSize: 14,
        fontFamily: 'PatrickHand-Regular',
    },
    emptyState: {
        marginBottom: SPACING.m,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: 'PatrickHand-Regular',
        fontStyle: 'italic',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.m,
        borderRadius: SIZES.borderRadius,
        borderWidth: 2,
        gap: SPACING.s,
    },
    buttonText: {
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
    },
    completeBadge: {
        padding: SPACING.s,
        borderRadius: SIZES.borderRadius,
        alignItems: 'center',
        marginTop: SPACING.s,
    },
    completeText: {
        fontSize: 14,
        fontFamily: 'PatrickHand-Regular',
    },
});

