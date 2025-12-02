import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { SPACING, SIZES } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';
import { firestoreService } from '../services/firestoreService';
import { authService } from '../services/authService';
import { getArgentinaDateString } from '../utils/dateUtils';

interface WeeklyChartProps {
    days?: number; // Number of days to show (default 7 for week)
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ days = 7 }) => {
    const { colors } = useThemeStore();
    const [weekData, setWeekData] = useState<number[]>([]);
    const [maxValue, setMaxValue] = useState(7);

    useEffect(() => {
        loadWeekData();
    }, []);

    const loadWeekData = async () => {
        try {
            const user = authService.getCurrentUser();
            if (!user) return;

            const data: number[] = [];
            const today = new Date();

            for (let i = days - 1; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateStr = getArgentinaDateString(date);

                try {
                    const progress = await firestoreService.getDailyProgress(user.uid, dateStr);
                    if (progress) {
                        // Count only the 7 habits (IDs '1' through '7'), ignoring other fields like waterCount
                        const habitIds = ['1', '2', '3', '4', '5', '6', '7'];
                        const completedCount = habitIds.filter(id => progress[id] === true).length;
                        data.push(completedCount);
                    } else {
                        data.push(0);
                    }
                } catch (error) {
                    data.push(0);
                }
            }

            setWeekData(data);
            setMaxValue(Math.max(...data, 1));
        } catch (error) {
            console.log('Error loading week data:', error);
        }
    };

    const getDayLabel = (index: number) => {
        const today = new Date();
        const date = new Date(today);
        date.setDate(date.getDate() - (days - 1 - index));
        
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        return dayNames[date.getDay()];
    };

    const screenWidth = Dimensions.get('window').width;
    const chartWidth = screenWidth - SPACING.l * 2;
    const barWidth = (chartWidth - SPACING.m * (days - 1)) / days;
    const maxHeight = 120;

    return (
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Progreso Semanal</Text>
            
            <View style={styles.chartContainer}>
                <View style={styles.barsContainer}>
                    {weekData.map((value, index) => {
                        // Calculate height: always use 7 as max for consistent bar heights
                        const height = value > 0 ? (value / 7) * maxHeight : 4;
                        const isToday = index === days - 1;
                        const isComplete = value === 7;

                        return (
                            <View key={index} style={styles.barWrapper}>
                                <View style={styles.barContainer}>
                                    <View
                                        style={[
                                            styles.bar,
                                            {
                                                height: Math.max(height, 4),
                                                backgroundColor: isComplete
                                                    ? colors.success 
                                                    : value > 0 
                                                        ? colors.primary 
                                                        : colors.surfaceHighlight,
                                                borderColor: isToday ? colors.primary : 'transparent',
                                                borderWidth: isToday ? 2 : 0,
                                            },
                                        ]}
                                    />
                                </View>
                                <Text style={[styles.barLabel, { color: colors.textSecondary }]}>
                                    {getDayLabel(index)}
                                </Text>
                                <Text style={[styles.barValue, { color: colors.text }]}>
                                    {value}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>

            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: colors.surfaceHighlight }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>Sin completar</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>Parcial</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: colors.success }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>Completo</Text>
                </View>
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
        fontSize: 20,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: SPACING.m,
    },
    chartContainer: {
        marginBottom: SPACING.m,
    },
    barsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 150,
    },
    barWrapper: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: SPACING.xs / 2,
    },
    barContainer: {
        width: '100%',
        height: 120,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    bar: {
        width: '80%',
        borderRadius: 4,
        minHeight: 4,
    },
    barLabel: {
        fontSize: 10,
        fontFamily: 'PatrickHand-Regular',
        marginTop: SPACING.xs,
    },
    barValue: {
        fontSize: 12,
        fontFamily: 'PatrickHand-Regular',
        marginTop: 2,
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: SPACING.m,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    legendColor: {
        width: 16,
        height: 16,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 12,
        fontFamily: 'PatrickHand-Regular',
    },
});

