import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Platform, StatusBar, AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SPACING, SIZES } from '../../constants/theme';
import { useThemeStore } from '../../store/themeStore';
import { firestoreService } from '../../services/firestoreService';
import { authService } from '../../services/authService';
import { Flame, Trophy, Target, Calendar, Zap, Gem, Crown } from 'lucide-react-native';
import { ProgressCalendar } from '../../components/ProgressCalendar';
import { WeeklyChart } from '../../components/WeeklyChart';
import { InsightsCard } from '../../components/InsightsCard';
import { ShareProgress } from '../../components/ShareProgress';
import { DaySummaryModal } from '../../components/DaySummaryModal';
import { getArgentinaDateString, getCalendarDaysSince } from '../../utils/dateUtils';

export default function StatsScreen() {
    const { colors, isDarkMode } = useThemeStore();
    const [stats, setStats] = useState({
        currentStreak: 0,
        longestStreak: 0,
        totalDaysCompleted: 0,
        daysSinceStart: 0,
    });
    const lastCheckedDateRef = useRef<string>(getArgentinaDateString());
    const appState = useRef(AppState.currentState);

    // Cargar estadísticas desde tu servicio (ajusta los nombres de funciones según tu implementación)
    useEffect(() => {
        let mounted = true;

        const loadStats = async () => {
            try {
                const user = authService.getCurrentUser();
                if (!user) return;

                const profile = await firestoreService.getUserProfile(user.uid);

                if (mounted && profile) {
                    // Calculate calendar days since start (inclusive, day 1 is start date)
                    const start = new Date(profile.startDate);
                    const dayCount = getCalendarDaysSince(start);

                    setStats((prev) => ({
                        ...prev,
                        currentStreak: profile.currentStreak ?? prev.currentStreak,
                        longestStreak: profile.longestStreak ?? prev.longestStreak,
                        totalDaysCompleted: profile.totalDaysCompleted ?? prev.totalDaysCompleted,
                        daysSinceStart: dayCount,
                    }));
                }
            } catch (error) {
                console.warn('Error cargando estadísticas:', error);
            }
        };

        loadStats();

        return () => {
            mounted = false;
        };
    }, []);

    // Check if day has changed and reload if needed
    useEffect(() => {
        const loadStats = async () => {
            try {
                const user = authService.getCurrentUser();
                if (!user) return;

                const profile = await firestoreService.getUserProfile(user.uid);

                if (profile) {
                    const start = new Date(profile.startDate);
                    const dayCount = getCalendarDaysSince(start);

                    setStats((prev) => ({
                        ...prev,
                        currentStreak: profile.currentStreak ?? prev.currentStreak,
                        longestStreak: profile.longestStreak ?? prev.longestStreak,
                        totalDaysCompleted: profile.totalDaysCompleted ?? prev.totalDaysCompleted,
                        daysSinceStart: dayCount,
                    }));
                }
            } catch (error) {
                console.warn('Error cargando estadísticas:', error);
            }
        };

        const checkDayChange = () => {
            const currentDate = getArgentinaDateString();
            if (currentDate !== lastCheckedDateRef.current) {
                lastCheckedDateRef.current = currentDate;
                loadStats();
            }
        };

        // Check immediately
        checkDayChange();

        // Check every minute for day changes
        const interval = setInterval(checkDayChange, 60000);

        // Listen to app state changes
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                checkDayChange();
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
            const loadStats = async () => {
                try {
                    const user = authService.getCurrentUser();
                    if (!user) return;

                    const profile = await firestoreService.getUserProfile(user.uid);

                    if (profile) {
                        const start = new Date(profile.startDate);
                        const dayCount = getCalendarDaysSince(start);

                        setStats((prev) => ({
                            ...prev,
                            currentStreak: profile.currentStreak ?? prev.currentStreak,
                            longestStreak: profile.longestStreak ?? prev.longestStreak,
                            totalDaysCompleted: profile.totalDaysCompleted ?? prev.totalDaysCompleted,
                            daysSinceStart: dayCount,
                        }));
                    }
                } catch (error) {
                    console.warn('Error cargando estadísticas:', error);
                }
            };

            const currentDate = getArgentinaDateString();
            if (currentDate !== lastCheckedDateRef.current) {
                lastCheckedDateRef.current = currentDate;
                loadStats();
            }
        }, [])
    );

    // Componente StatCard definido dentro del archivo
    const StatCard = ({ icon: Icon, title, value, color }: any) => (
        <View style={[
            styles.statCard,
            {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderBottomWidth: 3,
                borderRightWidth: 3,
            }
        ]}>
            <View style={[styles.iconContainer, { backgroundColor: (color || colors.primary) + '20' }]}>
                <Icon size={24} color={color || colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
            <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
        </View>
    );

    const completionRate =
        stats.daysSinceStart > 0 ? Math.round((stats.totalDaysCompleted / stats.daysSinceStart) * 100) : 0;

    const daysRemaining = Math.max(0, 50 - stats.daysSinceStart);
    const progressPercent = Math.min(100, (stats.daysSinceStart / 50) * 100);
    
    // Calculate today's progress for sharing
    const [todayProgress, setTodayProgress] = useState(0);
    
    // Day summary modal state
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    
    useEffect(() => {
        loadTodayProgress();
    }, []);

    const loadTodayProgress = async () => {
        try {
            const user = authService.getCurrentUser();
            if (!user) return;

            const today = getArgentinaDateString();
            const progress = await firestoreService.getDailyProgress(user.uid, today);
            
            if (progress) {
                const completedCount = Object.values(progress).filter(
                    (v): v is boolean => typeof v === 'boolean' && v === true
                ).length;
                setTodayProgress(completedCount / 7);
            }
        } catch (error) {
            console.log('Error loading today progress:', error);
        }
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={[styles.header, { color: colors.text }]}>Tu Progreso</Text>
                <Text style={[styles.subheader, { color: colors.textSecondary }]}>Día {stats.daysSinceStart} de 50</Text>

                {/* Insights */}
                <InsightsCard />

                {/* Weekly Chart */}
                <WeeklyChart days={7} />

                {/* Progress Calendar */}
                <ProgressCalendar 
                    onDayPress={(date) => {
                        setSelectedDate(date);
                        setIsModalVisible(true);
                    }}
                />

                {/* Progress Bar */}
                <View style={styles.progressSection}>
                    <View style={[
                        styles.progressBarContainer,
                        {
                            backgroundColor: colors.surfaceHighlight,
                            borderColor: colors.border,
                            borderWidth: 2,
                        }
                    ]}>
                        <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: colors.primary }]} />
                    </View>
                    <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                        {daysRemaining === 0 ? '¡Completaste el reto!' : `${daysRemaining} días restantes`}
                    </Text>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGridRow}>
                    <StatCard icon={Flame} title="Racha Actual" value={stats.currentStreak} color={colors.primary} />
                    <StatCard icon={Trophy} title="Racha Máxima" value={stats.longestStreak} color="#FFD700" />
                </View>

                <View style={styles.statsGridRow}>
                    <StatCard icon={Target} title="Días Completados" value={stats.totalDaysCompleted} color="#4169E1" />
                    <StatCard icon={Calendar} title="Tasa de Éxito" value={`${completionRate}%`} color="#10B981" />
                </View>

                {/* Motivational Section */}
                <View style={[
                    styles.motivationCard,
                    {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderBottomWidth: 3,
                        borderRightWidth: 3,
                    }
                ]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.s }}>
                        <Text style={[styles.motivationTitle, { color: colors.text }]}>
                            {stats.currentStreak >= 7 ? '¡Increíble racha!' : stats.currentStreak >= 3 ? '¡Vas muy bien!' : '¡Seguí así!'}
                        </Text>
                        {stats.currentStreak >= 7 && <Flame size={24} color={colors.primary} fill={colors.primary} />}
                        {stats.currentStreak >= 3 && stats.currentStreak < 7 && <Trophy size={24} color={colors.primary} />}
                        {stats.currentStreak < 3 && <Target size={24} color={colors.primary} />}
                    </View>
                    <Text style={[styles.motivationText, { color: colors.textSecondary }]}>
                        {stats.currentStreak >= 7
                            ? 'Estás en racha de fuego. No pares ahora!'
                            : stats.currentStreak >= 3
                                ? 'Tres días seguidos. La constancia es la clave.'
                                : 'Cada día cuenta. Mantené la disciplina.'}
                    </Text>
                </View>

                {/* Share Progress */}
                <ShareProgress
                    streak={stats.currentStreak}
                    dayNumber={stats.daysSinceStart}
                    progress={todayProgress}
                />

                {/* Achievement Badges */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Logros</Text>
                <View style={styles.badgesContainer}>
                    <View style={[
                        styles.badge,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            borderBottomWidth: 3,
                            borderRightWidth: 3,
                        },
                        stats.currentStreak >= 3 && {
                            backgroundColor: colors.primary + '15',
                            borderColor: colors.primary
                        }
                    ]}>
                        <Flame
                            size={28}
                            color={stats.currentStreak >= 3 ? colors.primary : colors.textSecondary}
                            fill={stats.currentStreak >= 3 ? colors.primary : 'transparent'}
                        />
                        <Text style={[
                            styles.badgeText,
                            {
                                color: stats.currentStreak >= 3 ? colors.primary : colors.textSecondary
                            }
                        ]}>3 Días</Text>
                    </View>
                    <View style={[
                        styles.badge,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            borderBottomWidth: 3,
                            borderRightWidth: 3,
                        },
                        stats.longestStreak >= 7 && {
                            backgroundColor: colors.primary + '15',
                            borderColor: colors.primary
                        }
                    ]}>
                        <Zap
                            size={28}
                            color={stats.longestStreak >= 7 ? colors.primary : colors.textSecondary}
                            fill={stats.longestStreak >= 7 ? colors.primary : 'transparent'}
                        />
                        <Text style={[
                            styles.badgeText,
                            {
                                color: stats.longestStreak >= 7 ? colors.primary : colors.textSecondary
                            }
                        ]}>Semana</Text>
                    </View>
                    <View style={[
                        styles.badge,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            borderBottomWidth: 3,
                            borderRightWidth: 3,
                        },
                        stats.longestStreak >= 14 && {
                            backgroundColor: colors.primary + '15',
                            borderColor: colors.primary
                        }
                    ]}>
                        <Gem
                            size={28}
                            color={stats.longestStreak >= 14 ? colors.primary : colors.textSecondary}
                            fill={stats.longestStreak >= 14 ? colors.primary : 'transparent'}
                        />
                        <Text style={[
                            styles.badgeText,
                            {
                                color: stats.longestStreak >= 14 ? colors.primary : colors.textSecondary
                            }
                        ]}>2 Semanas</Text>
                    </View>
                    <View style={[
                        styles.badge,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            borderBottomWidth: 3,
                            borderRightWidth: 3,
                        },
                        stats.longestStreak >= 30 && {
                            backgroundColor: colors.primary + '15',
                            borderColor: colors.primary
                        }
                    ]}>
                        <Crown
                            size={28}
                            color={stats.longestStreak >= 30 ? colors.primary : colors.textSecondary}
                            fill={stats.longestStreak >= 30 ? colors.primary : 'transparent'}
                        />
                        <Text style={[
                            styles.badgeText,
                            {
                                color: stats.longestStreak >= 30 ? colors.primary : colors.textSecondary
                            }
                        ]}>Leyenda</Text>
                    </View>
                </View>
            </ScrollView>
            
            {/* Day Summary Modal */}
            <DaySummaryModal
                visible={isModalVisible}
                date={selectedDate}
                onClose={() => {
                    setIsModalVisible(false);
                    setSelectedDate(null);
                }}
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
        fontSize: 36,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: SPACING.xs,
    },
    subheader: {
        fontSize: 18,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: SPACING.xl,
    },
    progressSection: {
        marginBottom: SPACING.xxl,
    },
    progressBarContainer: {
        height: 16,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: SPACING.s,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 8,
    },
    progressText: {
        fontSize: 16,
        textAlign: 'center',
        fontFamily: 'PatrickHand-Regular',
    },
    statsGridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.m,
    },
    statCard: {
        flex: 1,
        padding: SPACING.l,
        borderRadius: SIZES.borderRadius,
        alignItems: 'center',
        borderWidth: 2,
        marginHorizontal: SPACING.xs / 2,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    statValue: {
        fontSize: 32,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: SPACING.xs,
    },
    statTitle: {
        fontSize: 14,
        fontFamily: 'PatrickHand-Regular',
        textAlign: 'center',
    },
    motivationCard: {
        padding: SPACING.l,
        borderRadius: SIZES.borderRadius,
        marginVertical: SPACING.xl,
        borderWidth: 2,
    },
    motivationTitle: {
        fontSize: 24,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: SPACING.s,
    },
    motivationText: {
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
        lineHeight: 22,
    },
    sectionTitle: {
        fontSize: 24,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: SPACING.m,
    },
    badgesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: SPACING.xl,
    },
    badge: {
        width: '22%',
        aspectRatio: 1,
        borderRadius: SIZES.borderRadius,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        marginRight: SPACING.m,
        marginBottom: SPACING.m,
        gap: SPACING.xs,
    },
    badgeText: {
        fontSize: 12,
        fontFamily: 'PatrickHand-Regular',
        textAlign: 'center',
    },
});
