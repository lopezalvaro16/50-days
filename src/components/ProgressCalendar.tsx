import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SPACING, SIZES } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';
import { firestoreService } from '../services/firestoreService';
import { authService } from '../services/authService';
import { getArgentinaDateString } from '../utils/dateUtils';

interface ProgressCalendarProps {
    onDayPress?: (date: string) => void;
}

export const ProgressCalendar: React.FC<ProgressCalendarProps> = ({ onDayPress }) => {
    const { colors } = useThemeStore();
    const [monthData, setMonthData] = useState<{ [key: string]: number }>({});
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        loadMonthData();
    }, [currentMonth]);

    const loadMonthData = async () => {
        try {
            const user = authService.getCurrentUser();
            if (!user) return;

            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);

            const data: { [key: string]: number } = {};
            
            // Load progress for each day in the month
            for (let day = 1; day <= endDate.getDate(); day++) {
                const date = new Date(year, month, day);
                const dateStr = getArgentinaDateString(date);
                
                try {
                    const progress = await firestoreService.getDailyProgress(user.uid, dateStr);
                    if (progress) {
                        const completedCount = Object.values(progress).filter(Boolean).length;
                        data[dateStr] = completedCount / 7; // 7 habits total
                    } else {
                        data[dateStr] = 0;
                    }
                } catch (error) {
                    data[dateStr] = 0;
                }
            }

            setMonthData(data);
        } catch (error) {
            console.log('Error loading month data:', error);
        }
    };

    const getDayColor = (progress: number) => {
        if (progress === 0) return colors.surfaceHighlight;
        if (progress < 0.5) return colors.primary + '40';
        if (progress < 1) return colors.primary + '80';
        return colors.success;
    };

    const getDaysInMonth = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = getArgentinaDateString(date);
            days.push({
                day,
                date: dateStr,
                progress: monthData[dateStr] || 0,
            });
        }

        return days;
    };

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const days = getDaysInMonth();
    // Make calendar more compact - smaller cells
    const cellSize = Math.min((Dimensions.get('window').width - SPACING.l * 2 - SPACING.xs * 6) / 7, 32);

    return (
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.header}>
                <Text style={[styles.monthTitle, { color: colors.text }]}>
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </Text>
            </View>

            <View style={styles.weekDaysContainer}>
                {weekDays.map((day, index) => (
                    <View key={index} style={[styles.weekDayCell, { width: cellSize }]}>
                        <Text style={[styles.weekDayText, { color: colors.textSecondary }]}>
                            {day}
                        </Text>
                    </View>
                ))}
            </View>

            <View style={styles.calendarGrid}>
                {days.map((dayData, index) => {
                    if (dayData === null) {
                        return <View key={index} style={[styles.dayCell, { width: cellSize, height: cellSize, minWidth: cellSize, minHeight: cellSize }]} />;
                    }

                    const { day, date, progress } = dayData;
                    const isToday = date === getArgentinaDateString();

                    return (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.dayCell,
                                {
                                    width: cellSize,
                                    height: cellSize,
                                    minWidth: cellSize,
                                    minHeight: cellSize,
                                    backgroundColor: getDayColor(progress),
                                    borderColor: isToday ? colors.primary : 'transparent',
                                    borderWidth: isToday ? 2 : 0,
                                },
                            ]}
                            onPress={() => onDayPress?.(date)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.dayText,
                                    {
                                        color: progress === 0 
                                            ? colors.textSecondary 
                                            : colors.text,
                                        fontWeight: isToday ? 'bold' : 'normal',
                                    },
                                ]}
                            >
                                {day}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: colors.surfaceHighlight }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>Sin</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: colors.primary + '40' }]} />
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
        padding: SPACING.m,
        borderRadius: SIZES.borderRadius,
        borderWidth: 2,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        marginBottom: SPACING.l,
    },
    header: {
        marginBottom: SPACING.s,
    },
    monthTitle: {
        fontSize: 18,
        fontFamily: 'PatrickHand-Regular',
    },
    weekDaysContainer: {
        flexDirection: 'row',
        marginBottom: SPACING.xs,
    },
    weekDayCell: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    weekDayText: {
        fontSize: 10,
        fontFamily: 'PatrickHand-Regular',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.xs / 2,
    },
    dayCell: {
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayText: {
        fontSize: 10,
        fontFamily: 'PatrickHand-Regular',
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: SPACING.s,
        paddingTop: SPACING.s,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs / 2,
    },
    legendColor: {
        width: 12,
        height: 12,
        borderRadius: 3,
    },
    legendText: {
        fontSize: 10,
        fontFamily: 'PatrickHand-Regular',
    },
});

