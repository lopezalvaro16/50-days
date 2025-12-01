import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING, SIZES } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';
import { firestoreService } from '../services/firestoreService';
import { authService } from '../services/authService';
import { TrendingUp, Calendar, Target, Award } from 'lucide-react-native';

export const InsightsCard: React.FC = () => {
    const { colors } = useThemeStore();
    const [insights, setInsights] = useState<{
        bestDay?: { date: string; score: number };
        weeklyImprovement?: number;
        averageCompletion?: number;
        currentWeekAverage?: number;
    }>({});

    useEffect(() => {
        loadInsights();
    }, []);

    const loadInsights = async () => {
        try {
            const user = authService.getCurrentUser();
            if (!user) return;

            const today = new Date();
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);

            let bestDay: { date: string; score: number } | undefined;
            let totalScore = 0;
            let dayCount = 0;
            let currentWeekTotal = 0;
            let currentWeekDays = 0;

            // Load last 7 days
            for (let i = 0; i < 7; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                try {
                    const progress = await firestoreService.getDailyProgress(user.uid, dateStr);
                    if (progress) {
                        const completedCount = Object.values(progress).filter(
                            (v): v is boolean => typeof v === 'boolean' && v === true
                        ).length;
                        const score = (completedCount / 7) * 100;

                        if (!bestDay || score > bestDay.score) {
                            bestDay = { date: dateStr, score };
                        }

                        totalScore += score;
                        dayCount++;

                        if (i < 7) {
                            currentWeekTotal += score;
                            currentWeekDays++;
                        }
                    }
                } catch (error) {
                    // Skip days without data
                }
            }

            const averageCompletion = dayCount > 0 ? totalScore / dayCount : 0;
            const currentWeekAverage = currentWeekDays > 0 ? currentWeekTotal / currentWeekDays : 0;
            const previousWeekAverage = dayCount > 7 ? (totalScore - currentWeekTotal) / (dayCount - currentWeekDays) : 0;
            const weeklyImprovement = previousWeekAverage > 0 
                ? ((currentWeekAverage - previousWeekAverage) / previousWeekAverage) * 100 
                : 0;

            setInsights({
                bestDay,
                weeklyImprovement: Math.round(weeklyImprovement),
                averageCompletion: Math.round(averageCompletion),
                currentWeekAverage: Math.round(currentWeekAverage),
            });
        } catch (error) {
            console.log('Error loading insights:', error);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const day = date.getDate();
        const month = date.toLocaleDateString('es-AR', { month: 'short' });
        return `${day} ${month}`;
    };

    const getInsightMessage = () => {
        if (insights.weeklyImprovement && insights.weeklyImprovement > 0) {
            return `¡Mejoraste ${insights.weeklyImprovement}% esta semana! 🚀`;
        } else if (insights.weeklyImprovement && insights.weeklyImprovement < 0) {
            return `Bajaste ${Math.abs(insights.weeklyImprovement)}% esta semana. ¡Seguí adelante! 💪`;
        } else if (insights.currentWeekAverage && insights.currentWeekAverage >= 80) {
            return `¡Excelente semana! ${insights.currentWeekAverage}% de completitud promedio. 🔥`;
        } else {
            return 'Seguí así, cada día cuenta. 💪';
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Insights</Text>

            {insights.bestDay && (
                <View style={styles.insightItem}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                        <Award size={20} color={colors.primary} />
                    </View>
                    <View style={styles.insightContent}>
                        <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Mejor día</Text>
                        <Text style={[styles.insightValue, { color: colors.text }]}>
                            {formatDate(insights.bestDay.date)} - {Math.round(insights.bestDay.score)}%
                        </Text>
                    </View>
                </View>
            )}

            {insights.averageCompletion !== undefined && (
                <View style={styles.insightItem}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                        <Target size={20} color={colors.primary} />
                    </View>
                    <View style={styles.insightContent}>
                        <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Promedio general</Text>
                        <Text style={[styles.insightValue, { color: colors.text }]}>
                            {insights.averageCompletion}%
                        </Text>
                    </View>
                </View>
            )}

            {insights.weeklyImprovement !== undefined && (
                <View style={styles.insightItem}>
                    <View style={[
                        styles.iconContainer,
                        {
                            backgroundColor: insights.weeklyImprovement > 0
                                ? colors.success + '20'
                                : colors.primary + '20'
                        }
                    ]}>
                        <TrendingUp
                            size={20}
                            color={insights.weeklyImprovement > 0 ? colors.success : colors.primary}
                        />
                    </View>
                    <View style={styles.insightContent}>
                        <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Tendencia semanal</Text>
                        <Text style={[
                            styles.insightValue,
                            {
                                color: insights.weeklyImprovement > 0 ? colors.success : colors.text
                            }
                        ]}>
                            {insights.weeklyImprovement > 0 ? '+' : ''}{insights.weeklyImprovement}%
                        </Text>
                    </View>
                </View>
            )}

            <View style={[styles.messageCard, { backgroundColor: colors.primary + '10' }]}>
                <Text style={[styles.messageText, { color: colors.text }]}>
                    {getInsightMessage()}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: SPACING.l,
        borderRadius: SIZES.borderRadius,
        borderWidth: 2,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        marginBottom: SPACING.l,
    },
    title: {
        fontSize: 24,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: SPACING.m,
    },
    insightItem: {
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
    insightContent: {
        flex: 1,
    },
    insightLabel: {
        fontSize: 14,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: 2,
    },
    insightValue: {
        fontSize: 18,
        fontFamily: 'PatrickHand-Regular',
    },
    messageCard: {
        padding: SPACING.m,
        borderRadius: SIZES.borderRadius,
        marginTop: SPACING.s,
    },
    messageText: {
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
        textAlign: 'center',
    },
});

