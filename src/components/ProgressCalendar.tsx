import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, PanResponder } from 'react-native';
import { SPACING, SIZES } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';
import { firestoreService } from '../services/firestoreService';
import { authService } from '../services/authService';
import { getArgentinaDateString } from '../utils/dateUtils';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

interface ProgressCalendarProps {
    onDayPress?: (date: string) => void;
}

export const ProgressCalendar: React.FC<ProgressCalendarProps> = ({ onDayPress }) => {
    const { colors } = useThemeStore();
    const [monthData, setMonthData] = useState<{ [key: string]: number }>({});
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [startMonth, setStartMonth] = useState<Date | null>(null);
    const [endMonth, setEndMonth] = useState<Date | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    // Cache para almacenar datos de meses ya cargados
    const monthDataCache = useRef<{ [key: string]: { [key: string]: number } }>({});
    
    // Load user profile to get start date and precache all relevant months
    useEffect(() => {
        const loadUserStartDate = async () => {
            try {
                const user = authService.getCurrentUser();
                if (!user) return;

                const profile = await firestoreService.getUserProfile(user.uid);
                if (profile && profile.startDate) {
                    const start = new Date(profile.startDate);
                    // Calculate end date (start + 50 days)
                    const end = new Date(start);
                    end.setDate(end.getDate() + 50);
                    
                    // Set start and end months (first day of each month)
                    const startMonthDate = new Date(start.getFullYear(), start.getMonth(), 1);
                    const endMonthDate = new Date(end.getFullYear(), end.getMonth(), 1);
                    
                    setStartMonth(startMonthDate);
                    setEndMonth(endMonthDate);
                    
                    // Set current month to start month if not already set
                    if (!currentMonth || currentMonth < startMonthDate || currentMonth > endMonthDate) {
                        setCurrentMonth(startMonthDate);
                    }

                    // Precargar todos los meses relevantes en background
                    precacheAllMonths(startMonthDate, endMonthDate, user.uid);
                }
            } catch (error) {
                console.log('Error loading user start date:', error);
            }
        };
        
        loadUserStartDate();
    }, []);

    // Precargar todos los meses del reto en background
    const precacheAllMonths = async (startMonth: Date, endMonth: Date, uid: string) => {
        const monthsToLoad: Date[] = [];
        let current = new Date(startMonth);
        
        while (current <= endMonth) {
            const monthKey = getMonthKey(current);
            // Solo cargar si no está en cache
            if (!monthDataCache.current[monthKey]) {
                monthsToLoad.push(new Date(current));
            }
            current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
        }

        // Cargar todos los meses en paralelo (pero sin bloquear la UI)
        monthsToLoad.forEach(async (month) => {
            await loadMonthDataForDate(month, uid);
        });
    };

    // Función auxiliar para cargar datos de un mes específico
    const loadMonthDataForDate = async (monthDate: Date, uid: string) => {
        const monthKey = getMonthKey(monthDate);
        
        // Si ya está en cache, no cargar
        if (monthDataCache.current[monthKey]) {
            return;
        }

        try {
            const year = monthDate.getFullYear();
            const month = monthDate.getMonth();
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);

            const data: { [key: string]: number } = {};
            
            // Load progress for each day in the month
            for (let day = 1; day <= endDate.getDate(); day++) {
                const date = new Date(year, month, day);
                const dateStr = getArgentinaDateString(date);
                
                try {
                    const progress = await firestoreService.getDailyProgress(uid, dateStr);
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

            // Save to cache
            monthDataCache.current[monthKey] = data;
            
            // Si es el mes actual, actualizar el estado
            if (getMonthKey(currentMonth) === monthKey) {
                setMonthData(data);
            }
        } catch (error) {
            console.log('Error precaching month data:', error);
        }
    };

    const canGoPrevious = () => {
        if (!startMonth) return false;
        const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
        return prevMonth >= startMonth;
    };

    const canGoNext = () => {
        if (!endMonth) return false;
        const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
        return nextMonth <= endMonth;
    };

    const goToPreviousMonth = () => {
        if (!startMonth || !canGoPrevious()) return;
        
        setCurrentMonth((prev) => {
            const newDate = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
            // Don't go before start month
            if (newDate < startMonth) {
                return prev;
            }
            return newDate;
        });
    };

    const goToNextMonth = () => {
        if (!endMonth || !canGoNext()) return;
        
        setCurrentMonth((prev) => {
            const newDate = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
            // Don't go after end month
            if (newDate > endMonth) {
                return prev;
            }
            return newDate;
        });
    };

    const panResponder = useMemo(
        () => PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
            },
            onPanResponderRelease: (_, gestureState) => {
                if (Math.abs(gestureState.dx) > 50) {
                    if (gestureState.dx > 0 && canGoPrevious()) {
                        goToPreviousMonth();
                    } else if (gestureState.dx < 0 && canGoNext()) {
                        goToNextMonth();
                    }
                }
            },
        }),
        [currentMonth, startMonth, endMonth]
    );

    useEffect(() => {
        loadMonthData();
    }, [currentMonth]);

    const getMonthKey = (date: Date) => {
        return `${date.getFullYear()}-${date.getMonth()}`;
    };

    const loadMonthData = async () => {
        try {
            const user = authService.getCurrentUser();
            if (!user) return;

            const monthKey = getMonthKey(currentMonth);
            
            // Check cache first - si está en cache, usar directamente
            if (monthDataCache.current[monthKey]) {
                setMonthData(monthDataCache.current[monthKey]);
                return;
            }

            // Si no está en cache, cargar
            await loadMonthDataForDate(currentMonth, user.uid);
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
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]} {...panResponder.panHandlers}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={goToPreviousMonth}
                    style={styles.navButton}
                    activeOpacity={canGoPrevious() ? 0.7 : 1}
                    disabled={!canGoPrevious()}
                >
                    <ChevronLeft 
                        size={20} 
                        color={canGoPrevious() ? colors.text : colors.textSecondary} 
                    />
                </TouchableOpacity>
                <Text style={[styles.monthTitle, { color: colors.text }]}>
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </Text>
                <TouchableOpacity
                    onPress={goToNextMonth}
                    style={styles.navButton}
                    activeOpacity={canGoNext() ? 0.7 : 1}
                    disabled={!canGoNext()}
                >
                    <ChevronRight 
                        size={20} 
                        color={canGoNext() ? colors.text : colors.textSecondary} 
                    />
                </TouchableOpacity>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.s,
    },
    navButton: {
        padding: SPACING.xs,
        minWidth: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthTitle: {
        fontSize: 18,
        fontFamily: 'PatrickHand-Regular',
        flex: 1,
        textAlign: 'center',
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

