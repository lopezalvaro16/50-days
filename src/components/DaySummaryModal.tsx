import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SPACING, SIZES } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';
import { X, Check, Droplet, BookOpen, Moon, Calendar } from 'lucide-react-native';
import { firestoreService } from '../services/firestoreService';
import { authService } from '../services/authService';
import { iconMap } from './HabitItem';

interface DaySummaryModalProps {
    visible: boolean;
    date: string | null;
    onClose: () => void;
}

// Map habit IDs to their titles (matching INITIAL_HABITS from habitStore)
const HABIT_TITLES: Record<string, string> = {
    '1': 'Levantarse antes de las 8am',
    '2': 'Ejercicio diario',
    '3': 'Beber suficiente agua',
    '4': 'Leer 10 páginas',
    '5': 'Nueva habilidad',
    '6': 'Dieta saludable',
    '7': 'Rutina de cama',
};

const HABIT_ICONS: Record<string, string> = {
    '1': 'Sunrise',
    '2': 'Dumbbell',
    '3': 'Droplet',
    '4': 'Book',
    '5': 'GraduationCap',
    '6': 'Apple',
    '7': 'Moon',
};

export const DaySummaryModal: React.FC<DaySummaryModalProps> = ({ visible, date, onClose }) => {
    const { colors } = useThemeStore();
    const [dayData, setDayData] = useState<Record<string, boolean | number | string> | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && date) {
            loadDayData();
        } else {
            setDayData(null);
        }
    }, [visible, date]);

    const loadDayData = async () => {
        if (!date) return;
        
        setLoading(true);
        try {
            const user = authService.getCurrentUser();
            if (!user) return;

            const progress = await firestoreService.getDailyProgress(user.uid, date);
            setDayData(progress);
        } catch (error) {
            console.log('Error loading day data:', error);
            setDayData(null);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        
        const weekDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        return `${weekDays[date.getDay()]}, ${day} de ${monthNames[month - 1]} de ${year}`;
    };

    const getCompletedHabits = () => {
        if (!dayData) return [];
        
        const completed: Array<{ id: string; title: string; icon: string }> = [];
        const habitIds = ['1', '2', '3', '4', '5', '6', '7'];
        
        habitIds.forEach(id => {
            if (dayData[id] === true) {
                completed.push({
                    id,
                    title: HABIT_TITLES[id] || `Hábito ${id}`,
                    icon: HABIT_ICONS[id] || 'Circle',
                });
            }
        });
        
        return completed;
    };

    const getWaterCount = () => {
        if (!dayData) return null;
        const waterCount = dayData['3_water'];
        return typeof waterCount === 'number' ? waterCount : null;
    };

    const getBedtime = () => {
        if (!dayData) return null;
        const bedtimeStr = dayData['7_bedtime'] as string;
        if (!bedtimeStr) return null;
        
        try {
            const bedtime = new Date(bedtimeStr);
            const hours = bedtime.getHours().toString().padStart(2, '0');
            const minutes = bedtime.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        } catch {
            return null;
        }
    };

    const getNote = () => {
        if (!dayData) return null;
        const note = dayData['daily_note'] as string;
        return note || null;
    };

    const completedHabits = getCompletedHabits();
    const waterCount = getWaterCount();
    const bedtime = getBedtime();
    const note = getNote();
    const progress = completedHabits.length;
    const progressPercent = (progress / 7) * 100;

    if (!date) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {/* Header */}
                    <View style={[styles.header, { flexShrink: 0 }]}>
                        <View style={styles.headerContent}>
                            <Calendar size={24} color={colors.primary} />
                            <View style={styles.headerText}>
                                <Text style={[styles.title, { color: colors.text }]}>Resumen del Día</Text>
                                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                                    {formatDate(date)}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.closeButton, { backgroundColor: colors.surfaceHighlight }]}
                            onPress={onClose}
                        >
                            <X size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                                Cargando...
                            </Text>
                        </View>
                    ) : dayData ? (
                        <ScrollView 
                            style={styles.content} 
                            contentContainerStyle={styles.contentContainer}
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                        >
                            {/* Progress Summary */}
                            <View style={[styles.progressCard, { backgroundColor: colors.surfaceHighlight }]}>
                                <Text style={[styles.progressTitle, { color: colors.text }]}>
                                    Progreso del Día
                                </Text>
                                <View style={styles.progressBarContainer}>
                                    <View style={[styles.progressBar, { width: `${progressPercent}%`, backgroundColor: colors.primary }]} />
                                </View>
                                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                                    {progress} de 7 hábitos completados ({Math.round(progressPercent)}%)
                                </Text>
                            </View>

                            {/* Completed Habits */}
                            {completedHabits.length > 0 ? (
                                <View style={styles.section}>
                                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                        Hábitos Completados
                                    </Text>
                                    {completedHabits.map((habit) => {
                                        const IconComponent = iconMap[habit.icon as keyof typeof iconMap];
                                        return (
                                            <View
                                                key={habit.id}
                                                style={[styles.habitItem, { backgroundColor: colors.surfaceHighlight }]}
                                            >
                                                <View style={[styles.habitIconContainer, { backgroundColor: colors.primary + '20' }]}>
                                                    {IconComponent && (
                                                        <IconComponent size={20} color={colors.primary} />
                                                    )}
                                                </View>
                                                <Text style={[styles.habitTitle, { color: colors.text }]}>
                                                    {habit.title}
                                                </Text>
                                                <Check size={20} color={colors.success} />
                                            </View>
                                        );
                                    })}
                                </View>
                            ) : (
                                <View style={styles.emptySection}>
                                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                        No se completaron hábitos este día
                                    </Text>
                                </View>
                            )}

                            {/* Water Count */}
                            {waterCount !== null && (
                                <View style={[styles.infoCard, { backgroundColor: colors.surfaceHighlight }]}>
                                    <View style={styles.infoRow}>
                                        <Droplet size={20} color={colors.primary} />
                                        <Text style={[styles.infoLabel, { color: colors.text }]}>
                                            Vasos de agua
                                        </Text>
                                    </View>
                                    <Text style={[styles.infoValue, { color: colors.primary }]}>
                                        {waterCount} vasos
                                    </Text>
                                </View>
                            )}

                            {/* Bedtime */}
                            {bedtime && (
                                <View style={[styles.infoCard, { backgroundColor: colors.surfaceHighlight }]}>
                                    <View style={styles.infoRow}>
                                        <Moon size={20} color={colors.primary} />
                                        <Text style={[styles.infoLabel, { color: colors.text }]}>
                                            Hora de dormir
                                        </Text>
                                    </View>
                                    <Text style={[styles.infoValue, { color: colors.primary }]}>
                                        {bedtime}
                                    </Text>
                                </View>
                            )}

                            {/* Daily Note */}
                            {note && (
                                <View style={[styles.noteCard, { backgroundColor: colors.surfaceHighlight }]}>
                                    <View style={styles.infoRow}>
                                        <BookOpen size={20} color={colors.primary} />
                                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                            Notas del Día
                                        </Text>
                                    </View>
                                    <Text 
                                        style={[styles.noteText, { color: colors.text }]}
                                        numberOfLines={undefined}
                                    >
                                        {note}
                                    </Text>
                                </View>
                            )}
                        </ScrollView>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                No hay datos registrados para este día
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: Dimensions.get('window').width * 0.9,
        maxWidth: 400,
        maxHeight: Dimensions.get('window').height * 0.85,
        borderRadius: SIZES.borderRadiusLarge,
        borderWidth: 2,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        overflow: 'hidden',
        flexDirection: 'column',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.l,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: SPACING.m,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontFamily: 'PatrickHand-Regular',
        fontWeight: 'bold',
    },
    dateText: {
        fontSize: 14,
        fontFamily: 'PatrickHand-Regular',
        marginTop: SPACING.xs / 2,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flexGrow: 1,
        flexShrink: 1,
    },
    contentContainer: {
        padding: SPACING.l,
        paddingBottom: SPACING.xxl * 2,
    },
    loadingContainer: {
        padding: SPACING.xxl,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
    },
    progressCard: {
        padding: SPACING.m,
        borderRadius: SIZES.borderRadius,
        marginBottom: SPACING.l,
    },
    progressTitle: {
        fontSize: 18,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: SPACING.s,
    },
    progressBarContainer: {
        height: 12,
        backgroundColor: '#E5E5E5',
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: SPACING.s,
    },
    progressBar: {
        height: '100%',
        borderRadius: 6,
    },
    progressText: {
        fontSize: 14,
        fontFamily: 'PatrickHand-Regular',
        textAlign: 'center',
    },
    section: {
        marginBottom: SPACING.l,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: SPACING.m,
    },
    habitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.m,
        borderRadius: SIZES.borderRadius,
        marginBottom: SPACING.s,
        gap: SPACING.m,
    },
    habitIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    habitTitle: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
    },
    infoCard: {
        padding: SPACING.m,
        borderRadius: SIZES.borderRadius,
        marginBottom: SPACING.m,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
        marginBottom: SPACING.xs,
    },
    infoLabel: {
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
    },
    infoValue: {
        fontSize: 18,
        fontFamily: 'PatrickHand-Regular',
        fontWeight: 'bold',
        marginLeft: SPACING.m + SPACING.s,
    },
    noteCard: {
        padding: SPACING.m,
        borderRadius: SIZES.borderRadius,
        marginBottom: SPACING.m,
    },
    noteText: {
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
        lineHeight: 24,
        marginTop: SPACING.s,
        flexShrink: 1,
    },
    emptySection: {
        padding: SPACING.xl,
        alignItems: 'center',
    },
    emptyContainer: {
        padding: SPACING.xxl,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
        textAlign: 'center',
    },
});

