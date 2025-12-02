import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar, ScrollView, TextInput, TouchableOpacity, Modal, Alert, AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SPACING, SIZES } from '../../constants/theme';
import { useThemeStore } from '../../store/themeStore';
import { authService } from '../../services/authService';
import { firestoreService } from '../../services/firestoreService';
import { User, Calendar, Flame, Trophy, Edit2, Check, X } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { getCalendarDaysSince, getArgentinaDateString } from '../../utils/dateUtils';

export default function ProfileScreen() {
    const { colors, isDarkMode } = useThemeStore();
    const [userEmail, setUserEmail] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');
    const [userStats, setUserStats] = useState({
        currentStreak: 0,
        longestStreak: 0,
        totalDaysCompleted: 0,
        daysSinceStart: 0,
    });
    const lastCheckedDateRef = useRef<string>(getArgentinaDateString());
    const appState = useRef(AppState.currentState);

    const loadProfile = async () => {
            try {
                const user = authService.getCurrentUser();
                if (!user) return;

                setUserEmail(user.email || '');

                const profile = await firestoreService.getUserProfile(user.uid);
                if (profile) {
                    setDisplayName(profile.displayName || user.email?.split('@')[0] || 'Usuario');
                    
                    const start = new Date(profile.startDate);
                    const dayCount = getCalendarDaysSince(start);

                    setUserStats({
                        currentStreak: profile.currentStreak || 0,
                        longestStreak: profile.longestStreak || 0,
                        totalDaysCompleted: profile.totalDaysCompleted || 0,
                        daysSinceStart: dayCount,
                    });
                } else {
                    setDisplayName(user.email?.split('@')[0] || 'Usuario');
                }
            } catch (error) {
                console.log('Error cargando perfil:', error);
            }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    // Check if day has changed and reload if needed
    useEffect(() => {
        const checkDayChange = () => {
            const currentDate = getArgentinaDateString();
            if (currentDate !== lastCheckedDateRef.current) {
                lastCheckedDateRef.current = currentDate;
                loadProfile();
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
            const currentDate = getArgentinaDateString();
            if (currentDate !== lastCheckedDateRef.current) {
                lastCheckedDateRef.current = currentDate;
                loadProfile();
            }
        }, [])
    );

    const handleEditName = () => {
        setTempName(displayName);
        setIsEditingName(true);
    };

    const handleSaveName = async () => {
        if (!tempName.trim()) {
            Alert.alert('Error', 'El nombre no puede estar vacío');
            return;
        }

        try {
            const user = authService.getCurrentUser();
            if (!user) return;

            await firestoreService.updateDisplayName(user.uid, tempName.trim());
            setDisplayName(tempName.trim());
            setIsEditingName(false);
        } catch (error) {
            console.log('Error actualizando nombre:', error);
            Alert.alert('Error', 'No se pudo actualizar el nombre');
        }
    };

    const handleCancelEdit = () => {
        setIsEditingName(false);
        setTempName('');
    };

    const StatItem = ({ icon: Icon, label, value, color }: any) => (
        <View style={[
            styles.statItem,
            {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderBottomWidth: 3,
                borderRightWidth: 3,
            }
        ]}>
            <View style={[styles.statIconContainer, { backgroundColor: (color || colors.primary) + '20' }]}>
                <Icon size={20} color={color || colors.primary} />
            </View>
            <View style={styles.statContent}>
                <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <ScrollView contentContainerStyle={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>Perfil</Text>
                </View>

                {/* Profile Card */}
                <View style={[
                    styles.profileCard,
                    {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderBottomWidth: 3,
                        borderRightWidth: 3,
                    }
                ]}>
                    <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
                        <Text style={styles.avatarText}>
                            {userEmail.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <View style={styles.nameRow}>
                            {isEditingName ? (
                                <TextInput
                                    style={[
                                        styles.nameInput,
                                        {
                                            color: colors.text,
                                            borderColor: colors.border,
                                            backgroundColor: colors.surfaceHighlight,
                                        }
                                    ]}
                                    value={tempName}
                                    onChangeText={setTempName}
                                    autoFocus
                                    maxLength={30}
                                />
                            ) : (
                                <Text style={[styles.profileName, { color: colors.text }]}>
                                    {displayName}
                                </Text>
                            )}
                            {!isEditingName && (
                                <TouchableOpacity
                                    onPress={handleEditName}
                                    style={styles.editButton}
                                >
                                    <Edit2 size={18} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                        {isEditingName ? (
                            <View style={styles.editActions}>
                                <TouchableOpacity
                                    onPress={handleSaveName}
                                    style={[styles.actionButton, { backgroundColor: colors.success }]}
                                >
                                    <Check size={18} color="#FFF" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleCancelEdit}
                                    style={[styles.actionButton, { backgroundColor: colors.error }]}
                                >
                                    <X size={18} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{userEmail}</Text>
                        )}
                    </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <StatItem
                        icon={Flame}
                        label="Racha Actual"
                        value={userStats.currentStreak}
                        color={colors.primary}
                    />
                    <StatItem
                        icon={Trophy}
                        label="Racha Máxima"
                        value={userStats.longestStreak}
                        color="#FFD700"
                    />
                    <StatItem
                        icon={Calendar}
                        label="Días Completados"
                        value={userStats.totalDaysCompleted}
                        color="#4169E1"
                    />
                    <StatItem
                        icon={User}
                        label="Día Actual"
                        value={userStats.daysSinceStart}
                        color="#10B981"
                    />
                </View>

                {/* Progress Section */}
                <View style={[
                    styles.progressCard,
                    {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderBottomWidth: 3,
                        borderRightWidth: 3,
                    }
                ]}>
                    <Text style={[styles.progressTitle, { color: colors.text }]}>Progreso del Reto</Text>
                    <View style={styles.progressBarContainer}>
                        <View style={[
                            styles.progressBar,
                            {
                                backgroundColor: colors.surfaceHighlight,
                                borderColor: colors.border,
                            }
                        ]}>
                            <View style={[
                                styles.progressBarFill,
                                {
                                    width: `${Math.min(100, (userStats.daysSinceStart / 50) * 100)}%`,
                                    backgroundColor: colors.primary,
                                }
                            ]} />
                        </View>
                        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                            Día {userStats.daysSinceStart} de 50
                        </Text>
                    </View>
                </View>
            </ScrollView>
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
        marginBottom: SPACING.xl,
    },
    title: {
        fontSize: 36,
        fontFamily: 'PatrickHand-Regular',
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.l,
        borderRadius: SIZES.borderRadius,
        marginBottom: SPACING.xl,
        borderWidth: 2,
    },
    avatarContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.m,
    },
    avatarText: {
        color: '#FFF',
        fontSize: 28,
        fontFamily: 'PatrickHand-Regular',
        fontWeight: '600',
    },
    profileInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    profileName: {
        fontSize: 24,
        fontFamily: 'PatrickHand-Regular',
        flex: 1,
    },
    editButton: {
        padding: SPACING.xs,
        marginLeft: SPACING.xs,
    },
    nameInput: {
        flex: 1,
        fontSize: 24,
        fontFamily: 'PatrickHand-Regular',
        padding: SPACING.s,
        borderRadius: SIZES.borderRadius,
        borderWidth: 2,
        borderBottomWidth: 3,
        borderRightWidth: 3,
    },
    editActions: {
        flexDirection: 'row',
        gap: SPACING.s,
        marginTop: SPACING.xs,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileEmail: {
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: SPACING.xl,
        gap: SPACING.m,
    },
    statItem: {
        width: '47%',
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.m,
        borderRadius: SIZES.borderRadius,
        borderWidth: 2,
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.s,
    },
    statContent: {
        flex: 1,
    },
    statValue: {
        fontSize: 24,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        fontFamily: 'PatrickHand-Regular',
    },
    progressCard: {
        padding: SPACING.l,
        borderRadius: SIZES.borderRadius,
        borderWidth: 2,
    },
    progressTitle: {
        fontSize: 20,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: SPACING.m,
    },
    progressBarContainer: {
        gap: SPACING.s,
    },
    progressBar: {
        height: 12,
        borderRadius: 6,
        overflow: 'hidden',
        borderWidth: 2,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
        textAlign: 'center',
    },
});
