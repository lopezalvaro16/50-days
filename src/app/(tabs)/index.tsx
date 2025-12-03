import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Platform, StatusBar, RefreshControl, AppState, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SPACING, SIZES } from '../../constants/theme';
import { useThemeStore } from '../../store/themeStore';
import { useHabitStore } from '../../store/habitStore';
import { HabitItem } from '../../components/HabitItem';
import { ProgressBar } from '../../components/ProgressBar';
import { FlameAnimation } from '../../components/FlameAnimation';
import { CelebrationModal } from '../../components/CelebrationModal';
import { CompletionModal } from '../../components/CompletionModal';
import { WaterTracker } from '../../components/WaterTracker';
import { OnboardingModal } from '../../components/OnboardingModal';
import { DailyNotes } from '../../components/DailyNotes';
import { OfflineIndicator } from '../../components/OfflineIndicator';
import { firestoreService } from '../../services/firestoreService';
import { authService } from '../../services/authService';
import { offlineService } from '../../services/offlineService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCalendarDaysSince, getArgentinaDateString, parseArgentinaDate } from '../../utils/dateUtils';

export default function DashboardScreen() {
    const { colors, isDarkMode } = useThemeStore();
    const { habits, toggleHabit, getProgress, initializeDailyHabits } = useHabitStore();
    const [currentStreak, setCurrentStreak] = useState(0);
    const [dayNumber, setDayNumber] = useState(1);
    const [showCelebration, setShowCelebration] = useState(false);
    const [showCompletion, setShowCompletion] = useState(false);
    const [userStats, setUserStats] = useState({
        longestStreak: 0,
        totalDaysCompleted: 0,
        currentStreak: 0,
    });
    const [refreshing, setRefreshing] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const previousProgressRef = useRef(0);
    const lastCheckedDateRef = useRef<string>(getArgentinaDateString());
    const appState = useRef(AppState.currentState);

    const progress = getProgress();

    // Function to reload stats when day changes
    const reloadStats = async () => {
        try {
            const user = authService.getCurrentUser();
            if (!user) return;

            const profile = await firestoreService.getUserProfile(user.uid);
            if (profile) {
                setCurrentStreak(profile.currentStreak || 0);
                setUserStats({
                    longestStreak: profile.longestStreak || 0,
                    totalDaysCompleted: profile.totalDaysCompleted || 0,
                    currentStreak: profile.currentStreak || 0,
                });
                const start = new Date(profile.startDate);
                const dayCount = getCalendarDaysSince(start);
                setDayNumber(dayCount);
                
                // Re-initialize habits for new day
                await initializeDailyHabits();
            }
        } catch (error) {
            // Silently fail
        }
    };

    // Check if day has changed and reload if needed
    useEffect(() => {
        const checkDayChange = async () => {
            const currentDate = getArgentinaDateString();
            if (currentDate !== lastCheckedDateRef.current) {
                lastCheckedDateRef.current = currentDate;
                
                // Clear celebration date if day changed (to allow celebration for new day)
                try {
                    const lastCelebrationDate = await AsyncStorage.getItem('last_celebration_date');
                    if (lastCelebrationDate && lastCelebrationDate !== currentDate) {
                        // Day changed, we can show celebration for the new day
                        // The date will be different, so we don't need to clear it
                        // but we ensure the modal won't show if already shown today
                    }
                } catch (error) {
                    // Silently fail
                }
                
                reloadStats();
            }
        };

        // Check immediately
        checkDayChange().catch(() => {
            // Silently fail
        });

        // Check every minute for day changes
        const interval = setInterval(() => {
            checkDayChange().catch(() => {
                // Silently fail
            });
        }, 60000); // Check every minute

        // Listen to app state changes (when app comes to foreground)
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                // App has come to the foreground, check if day changed
                checkDayChange().catch(() => {
                    // Silently fail
                });
            }
            appState.current = nextAppState;
        });

        return () => {
            clearInterval(interval);
            subscription.remove();
        };
    }, []);

    // Also reload when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            const currentDate = getArgentinaDateString();
            if (currentDate !== lastCheckedDateRef.current) {
                lastCheckedDateRef.current = currentDate;
                reloadStats();
            }
        }, [])
    );

    // Cargar datos desde Firestore
    useEffect(() => {
        console.log('🚀 [DASHBOARD] ========================================');
        console.log('🚀 [DASHBOARD] INICIANDO CARGA DE DATOS DEL DASHBOARD');
        console.log('🚀 [DASHBOARD] ========================================');
        
        async function loadStats() {
            try {
                const user = authService.getCurrentUser();
                if (!user) {
                    console.log('❌ [DASHBOARD] No hay usuario autenticado');
                    return;
                }

                // Sync any pending offline progress first
                try {
                    await offlineService.syncPendingProgress();
                } catch (syncError) {
                    // Silently fail - offline sync will retry later
                }

                console.log('📱 [DASHBOARD] Cargando datos iniciales del usuario...');
                console.log('  - User UID:', user.uid);
                console.log('  - User Email:', user.email);
                
                // Cargar TODOS los datos del usuario para logs completos
                const allUserData = await firestoreService.getAllUserData(user.uid);
                
                // Cargar también todos los datos offline
                await offlineService.getAllOfflineData();
                
                // Verificar si el perfil existe, si no, crearlo automáticamente
                let profile = await firestoreService.getUserProfile(user.uid);
                
                if (!profile && user.email) {
                    console.log('⚠️ [DASHBOARD] El perfil no existe, creándolo automáticamente...');
                    
                    // Si ya existe progreso, usar la primera fecha como startDate
                    let startDate: Date | null = null;
                    
                    if (allUserData.firstProgressDate) {
                        console.log('📅 [DASHBOARD] Se encontró progreso previo, usando primera fecha como startDate:', allUserData.firstProgressDate);
                        startDate = parseArgentinaDate(allUserData.firstProgressDate);
                        console.log('  - startDate calculado desde primera fecha:', startDate);
                        console.log('  - startDate ISO:', startDate.toISOString());
                    }
                    
                    // Crear perfil con el startDate correcto
                    if (startDate) {
                        await firestoreService.createUserProfile(user.uid, user.email, undefined, startDate);
                    } else {
                        await firestoreService.createUserProfile(user.uid, user.email);
                    }
                    
                    profile = await firestoreService.getUserProfile(user.uid);
                } else if (profile && allUserData.firstProgressDate) {
                    // Verificar si el startDate del perfil es más reciente que el primer progreso
                    const profileStartDateStr = getArgentinaDateString(profile.startDate);
                    const firstProgressDateStr = allUserData.firstProgressDate;
                    
                    if (firstProgressDateStr < profileStartDateStr) {
                        console.log('⚠️ [DASHBOARD] El startDate del perfil es más reciente que el primer progreso');
                        console.log('  - startDate del perfil:', profileStartDateStr);
                        console.log('  - Primera fecha de progreso:', firstProgressDateStr);
                        console.log('  - Corrigiendo startDate del perfil...');
                        
                        const correctedStartDate = parseArgentinaDate(firstProgressDateStr);
                        await firestoreService.updateStartDate(user.uid, correctedStartDate);
                        profile = await firestoreService.getUserProfile(user.uid);
                    }
                }

                if (profile) {
                    console.log('📊 [DASHBOARD] Perfil recibido:');
                    console.log('  - startDate:', profile.startDate);
                    console.log('  - startDate tipo:', typeof profile.startDate);
                    console.log('  - startDate es Date?', profile.startDate instanceof Date);
                    console.log('  - startDate ISO:', profile.startDate?.toISOString?.());
                    console.log('  - currentStreak:', profile.currentStreak);
                    console.log('  - longestStreak:', profile.longestStreak);
                    console.log('  - totalDaysCompleted:', profile.totalDaysCompleted);
                    console.log('  - lastCompletedDate:', profile.lastCompletedDate);
                    
                    setCurrentStreak(profile.currentStreak || 0);

                    // Save user stats for completion modal
                    setUserStats({
                        longestStreak: profile.longestStreak || 0,
                        totalDaysCompleted: profile.totalDaysCompleted || 0,
                        currentStreak: profile.currentStreak || 0,
                    });

                    // Calculate calendar days since start (inclusive, day 1 is start date)
                    const start = new Date(profile.startDate);
                    console.log('📅 [DASHBOARD] Calculando días desde inicio...');
                    console.log('  - start (Date object):', start);
                    console.log('  - start ISO:', start.toISOString());
                    console.log('  - start timestamp:', start.getTime());
                    
                    const dayCount = getCalendarDaysSince(start);
                    console.log('  - Días calculados:', dayCount);
                    console.log('  - Día del reto establecido:', dayCount);
                    
                    setDayNumber(dayCount);
                    console.log('✅ [DASHBOARD] Datos cargados exitosamente');
                } else {
                    console.log('❌ [DASHBOARD] No se pudo cargar el perfil');
                }
            } catch (error) {
                console.error('❌ [DASHBOARD] Error al cargar datos:', error);
            }
            console.log('🏁 [DASHBOARD] ========================================');
            console.log('🏁 [DASHBOARD] FIN DE CARGA DE DATOS DEL DASHBOARD');
            console.log('🏁 [DASHBOARD] ========================================');
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
            // Silently fail - onboarding will show on next app start
        }
    };

    const handleOnboardingComplete = async () => {
        try {
            await AsyncStorage.setItem('has_seen_onboarding', 'true');
            setShowOnboarding(false);
        } catch (error) {
            // Silently fail - onboarding preference will be lost
        }
    };

    // Detect when all habits are completed
    useEffect(() => {
        const allCompleted = habits.every(h => h.isCompleted);
        const wasCompleted = previousProgressRef.current === 1;
        const today = getArgentinaDateString();
        
        // Show celebration if just completed (not if already was completed)
        if (allCompleted && progress === 1 && !wasCompleted) {
            // Check if we already showed the celebration for today
            const checkAndShowCelebration = async () => {
                try {
                    const lastCelebrationDate = await AsyncStorage.getItem('last_celebration_date');
                    const lastCompletionDate = await AsyncStorage.getItem('last_completion_50_date');
                    
                    // Only show if we haven't shown it today
                    if (lastCelebrationDate !== today) {
                        // Check if it's day 50 - show special completion modal
                        if (dayNumber === 50 && lastCompletionDate !== today) {
                            // Strong haptic feedback for epic moment
                            try {
                                const Haptics = require('expo-haptics');
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                setTimeout(() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                }, 300);
                            } catch (error) {
                                // Haptics not available, continue without it
                            }
                            
                            // Save today's date for both modals
                            await AsyncStorage.setItem('last_celebration_date', today);
                            await AsyncStorage.setItem('last_completion_50_date', today);
                            setShowCompletion(true);
                        } else {
                            // Regular day celebration
                            try {
                                const Haptics = require('expo-haptics');
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            } catch (error) {
                                // Haptics not available, continue without it
                            }
                            
                            // Save today's date and show celebration
                            await AsyncStorage.setItem('last_celebration_date', today);
                            setShowCelebration(true);
                        }
                    } else {
                        console.log('✅ [DASHBOARD] Modal de celebración ya mostrado hoy, omitiendo...');
                    }
                } catch (error) {
                    console.error('❌ [DASHBOARD] Error verificando fecha de celebración:', error);
                    // If there's an error, show the celebration anyway (better UX than not showing it)
                    if (dayNumber === 50) {
                        setShowCompletion(true);
                    } else {
                        setShowCelebration(true);
                    }
                }
            };
            
            checkAndShowCelebration();
        }
        
        previousProgressRef.current = progress;
    }, [habits, progress, dayNumber]);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await initializeDailyHabits();
            const user = authService.getCurrentUser();
            if (user) {
                const profile = await firestoreService.getUserProfile(user.uid);
                if (profile) {
                    setCurrentStreak(profile.currentStreak || 0);
                    setUserStats({
                        longestStreak: profile.longestStreak || 0,
                        totalDaysCompleted: profile.totalDaysCompleted || 0,
                        currentStreak: profile.currentStreak || 0,
                    });
                    const start = new Date(profile.startDate);
                    const dayCount = getCalendarDaysSince(start);
                    setDayNumber(dayCount);
                }
            }
        } catch (error) {
            // Silently fail - refresh will retry on next pull
        } finally {
            setRefreshing(false);
        }
    };

    // TEST FUNCTION - Remove before production
    const testCompletionModal = () => {
        setUserStats({
            longestStreak: 45,
            totalDaysCompleted: 50,
            currentStreak: 50,
        });
        setDayNumber(50);
        setShowCompletion(true);
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

                    {/* TEST BUTTON - Remove before production */}
                    <TouchableOpacity
                        style={[styles.testButton, { backgroundColor: colors.primary }]}
                        onPress={testCompletionModal}
                    >
                        <Text style={styles.testButtonText}>🧪 Test Día 50</Text>
                    </TouchableOpacity>

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
                visible={showCelebration && !showCompletion}
                onClose={async () => {
                    setShowCelebration(false);
                    // Ensure the date is saved when modal is closed
                    try {
                        const today = getArgentinaDateString();
                        await AsyncStorage.setItem('last_celebration_date', today);
                    } catch (error) {
                        // Silently fail
                    }
                }}
                streak={currentStreak}
            />
            
            <CompletionModal
                visible={showCompletion}
                onClose={async () => {
                    setShowCompletion(false);
                    // Ensure the date is saved when modal is closed
                    try {
                        const today = getArgentinaDateString();
                        await AsyncStorage.setItem('last_celebration_date', today);
                        await AsyncStorage.setItem('last_completion_50_date', today);
                    } catch (error) {
                        // Silently fail
                    }
                }}
                stats={userStats}
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
    testButton: {
        paddingVertical: SPACING.s,
        paddingHorizontal: SPACING.m,
        borderRadius: SIZES.borderRadius,
        marginTop: SPACING.s,
    },
    testButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'PatrickHand-Regular',
        fontWeight: 'bold',
    },
});
