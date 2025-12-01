import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Platform, StatusBar, RefreshControl } from 'react-native';
import { SPACING, SIZES } from '../../constants/theme';
import { useThemeStore } from '../../store/themeStore';
import { useHabitStore } from '../../store/habitStore';
import { HabitItem } from '../../components/HabitItem';
import { ProgressBar } from '../../components/ProgressBar';
import { FlameAnimation } from '../../components/FlameAnimation';
import { CelebrationModal } from '../../components/CelebrationModal';
import { WaterTracker } from '../../components/WaterTracker';
import { OnboardingModal } from '../../components/OnboardingModal';
import { DailyNotes } from '../../components/DailyNotes';
import { OfflineIndicator } from '../../components/OfflineIndicator';
import { firestoreService } from '../../services/firestoreService';
import { authService } from '../../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DashboardScreen() {
    const { colors, isDarkMode } = useThemeStore();
    const { habits, toggleHabit, getProgress, initializeDailyHabits } = useHabitStore();
    const [currentStreak, setCurrentStreak] = useState(0);
    const [dayNumber, setDayNumber] = useState(1);
    const [showCelebration, setShowCelebration] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const previousProgressRef = useRef(0);

    const progress = getProgress();

    // Cargar datos desde Firestore
    useEffect(() => {
        async function loadStats() {
            try {
                const user = authService.getCurrentUser();
                if (!user) return;

                const profile = await firestoreService.getUserProfile(user.uid);

                if (profile) {
                    setCurrentStreak(profile.currentStreak || 0);

                    // Calculate days since start
                    const start = new Date(profile.startDate);
                    const today = new Date();
                    const diffTime = Math.abs(today.getTime() - start.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    setDayNumber(diffDays || 1);
                }
            } catch (error) {
                console.log('Error cargando datos:', error);
            }
        }

        loadStats();
        initializeDailyHabits();
        checkOnboarding();
    }, []);

    const checkOnboarding = async () => {
        try {
            const hasSeenOnboarding = await AsyncStorage.getItem('has_seen_onboarding');
            if (!hasSeenOnboarding) {
                setShowOnboarding(true);
            }
        } catch (error) {
            console.log('Error checking onboarding:', error);
        }
    };

    const handleOnboardingComplete = async () => {
        try {
            await AsyncStorage.setItem('has_seen_onboarding', 'true');
            setShowOnboarding(false);
        } catch (error) {
            console.log('Error saving onboarding:', error);
        }
    };

    // Detect when all habits are completed
    useEffect(() => {
        const allCompleted = habits.every(h => h.isCompleted);
        const wasCompleted = previousProgressRef.current === 1;
        
        // Show celebration if just completed (not if already was completed)
        if (allCompleted && progress === 1 && !wasCompleted) {
            // Strong haptic feedback for completing all habits (optional)
            try {
                const Haptics = require('expo-haptics');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
                // Haptics not available, continue without it
            }
            setShowCelebration(true);
        }
        
        previousProgressRef.current = progress;
    }, [habits, progress]);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await initializeDailyHabits();
            const user = authService.getCurrentUser();
            if (user) {
                const profile = await firestoreService.getUserProfile(user.uid);
                if (profile) {
                    setCurrentStreak(profile.currentStreak || 0);
                    const start = new Date(profile.startDate);
                    const today = new Date();
                    const diffTime = Math.abs(today.getTime() - start.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    setDayNumber(diffDays || 1);
                }
            }
        } catch (error) {
            console.log('Error refreshing:', error);
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <ScrollView 
                contentContainerStyle={styles.container}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            >
                {/* Offline Indicator */}
                <OfflineIndicator />

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.greeting, { color: colors.text }]}>Día {dayNumber}</Text>
                        <Text style={[styles.subGreeting, { color: colors.textSecondary }]}>¡Mantené la racha!</Text>
                    </View>

                    {/* Streak */}
                    <View style={[
                        styles.streakContainer,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            borderBottomWidth: 3,
                            borderRightWidth: 3,
                        }
                    ]}>
                        <FlameAnimation streak={currentStreak} isActive={progress === 1} />
                        <Text
                            style={[
                                styles.streakText,
                                { color: colors.textSecondary },
                                progress === 1 && { color: colors.primary },
                            ]}
                        >
                            {currentStreak}
                        </Text>
                    </View>
                </View>

                {/* Progress Card */}
                <View style={[
                    styles.progressCard,
                    {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderBottomWidth: 3,
                        borderRightWidth: 3,
                    }
                ]}>
                    <View style={styles.progressHeader}>
                        <Text style={[styles.progressTitle, { color: colors.text }]}>Progreso Diario</Text>
                        <Text style={[styles.progressPercent, { color: colors.primary }]}>
                            {Math.round(progress * 100)}%
                        </Text>
                    </View>
                    <ProgressBar progress={progress} />
                </View>

                {/* Habit List */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Tus 7 Hábitos</Text>

                {/* Daily Notes */}
                <DailyNotes />

                <View style={styles.habitList}>
                    {habits.map((habit) => {
                        // Special handling for water tracking
                        if (habit.id === '3' && habit.icon === 'Droplet') {
                            return (
                                <WaterTracker
                                    key={habit.id}
                                    habitId={habit.id}
                                    onUpdate={(glasses, isComplete) => {
                                        // The WaterTracker component handles the state update internally
                                        // This callback is just for any additional logic if needed
                                    }}
                                />
                            );
                        }
                        
                        // All other habits use the standard HabitItem
                        return (
                            <HabitItem
                                key={habit.id}
                                habit={habit}
                                onToggle={() => toggleHabit(habit.id)}
                            />
                        );
                    })}
                </View>

            </ScrollView>
            
            <CelebrationModal
                visible={showCelebration}
                onClose={() => setShowCelebration(false)}
                streak={currentStreak}
            />
            
            <OnboardingModal
                visible={showOnboarding}
                onComplete={handleOnboardingComplete}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    container: {
        padding: SPACING.l,
        paddingBottom: SPACING.xxl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    greeting: {
        fontSize: 36, // Larger for handwritten
        fontFamily: 'PatrickHand-Regular',
    },
    subGreeting: {
        fontSize: 18,
        fontFamily: 'PatrickHand-Regular',
    },
    streakContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        borderRadius: SIZES.borderRadiusLarge,
        borderWidth: 2,
    },
    streakText: {
        fontFamily: 'PatrickHand-Regular',
        marginLeft: SPACING.xs,
        fontSize: 20,
    },
    progressCard: {
        padding: SPACING.l,
        borderRadius: SIZES.borderRadius,
        marginBottom: SPACING.xxl,
        borderWidth: 2,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.m,
    },
    progressTitle: {
        fontFamily: 'PatrickHand-Regular',
        fontSize: 20,
    },
    progressPercent: {
        fontFamily: 'PatrickHand-Regular',
        fontSize: 20,
    },
    sectionTitle: {
        fontSize: 24,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: SPACING.m,
    },
    habitList: {
        gap: SPACING.s,
    },
});
