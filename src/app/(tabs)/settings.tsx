import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, SafeAreaView, Platform, StatusBar, Alert } from 'react-native';
import { SPACING, SIZES } from '../../constants/theme';
import { useThemeStore } from '../../store/themeStore';
import { authService } from '../../services/authService';
import { notificationService } from '../../services/notificationService';
import { firestoreService } from '../../services/firestoreService';
import { offlineService } from '../../services/offlineService';
import { useHabitStore } from '../../store/habitStore';
import { router } from 'expo-router';
import { Bell, LogOut, Moon, User, ChevronRight, RotateCcw, Trash2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
    const { colors, isDarkMode, toggleTheme } = useThemeStore();
    const { initializeDailyHabits } = useHabitStore();
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        const user = authService.getCurrentUser();
        if (user) {
            setUserEmail(user.email || '');
        }
        loadNotificationStatus();
    }, []);

    const loadNotificationStatus = async () => {
        try {
            const saved = await AsyncStorage.getItem('notifications_enabled');
            const isEnabled = saved === 'true';
            setNotificationsEnabled(isEnabled);
            
            // Check actual permission status
            const hasPermission = await notificationService.getNotificationPermissions();
            if (isEnabled && !hasPermission) {
                // User had it enabled but lost permission
                setNotificationsEnabled(false);
                await AsyncStorage.setItem('notifications_enabled', 'false');
            }
        } catch (error) {
            console.log('Error loading notification status:', error);
        }
    };

    const toggleNotifications = async (value: boolean) => {
        try {
            if (value) {
                // Check if running in Expo Go
                const Constants = require('expo-constants').default;
                const isExpoGo = Constants.executionEnvironment === 'storeClient';
                
                if (isExpoGo) {
                    Alert.alert(
                        'Notificaciones no disponibles',
                        'Las notificaciones requieren un "Development Build" o build de producción. No están disponibles en Expo Go. Esta función funcionará cuando hagas un build nativo con EAS.'
                    );
                    setNotificationsEnabled(false);
                    return;
                }

                // Request permissions
                const hasPermission = await notificationService.getNotificationPermissions();
                if (!hasPermission) {
                    const token = await notificationService.registerForPushNotificationsAsync();
                    if (!token) {
                        Alert.alert(
                            'Permisos requeridos',
                            'Necesitamos permisos para enviarte recordatorios. Por favor, activá las notificaciones en la configuración de tu dispositivo.'
                        );
                        setNotificationsEnabled(false);
                        return;
                    }
                }
                
                // Schedule daily reminder (default 9:00 AM)
                await notificationService.scheduleDailyReminder(9, 0);
                await AsyncStorage.setItem('notifications_enabled', 'true');
                setNotificationsEnabled(true);
            } else {
                // Cancel notifications
                await notificationService.cancelAllNotifications();
                await AsyncStorage.setItem('notifications_enabled', 'false');
                setNotificationsEnabled(false);
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo cambiar el estado de las notificaciones.');
            setNotificationsEnabled(!value); // Revert the change
        }
    };

    const handleSignOut = async () => {
        try {
            await authService.signOut();
            router.replace('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const handleResetOnboarding = async () => {
        Alert.alert(
            'Resetear Onboarding',
            '¿Querés ver el onboarding de nuevo?',
            [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
                {
                    text: 'Resetear',
                    onPress: async () => {
                        try {
                            await AsyncStorage.removeItem('has_seen_onboarding');
                            Alert.alert('Listo', 'El onboarding se mostrará la próxima vez que entres a la app.');
                        } catch (error) {
                            console.error('Error resetting onboarding:', error);
                            Alert.alert('Error', 'No se pudo resetear el onboarding.');
                        }
                    },
                },
            ]
        );
    };

    const handleResetAccount = async () => {
        // Primera confirmación
        Alert.alert(
            '⚠️ Resetear Cuenta',
            'Esto borrará TODOS tus datos:\n\n• Todos los días completados\n• Todas las rachas\n• Todos los logros\n• Todas las notas\n• Todo el progreso\n\n¿Estás seguro?',
            [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
                {
                    text: 'Sí, resetear',
                    style: 'destructive',
                    onPress: () => {
                        // Segunda confirmación
                        Alert.alert(
                            '⚠️ Última Confirmación',
                            'Esta acción NO se puede deshacer. ¿Realmente querés borrar todo y empezar de cero?',
                            [
                                {
                                    text: 'Cancelar',
                                    style: 'cancel',
                                },
                                {
                                    text: 'SÍ, BORRAR TODO',
                                    style: 'destructive',
                                    onPress: async () => {
                                        setIsResetting(true);
                                        try {
                                            const user = authService.getCurrentUser();
                                            if (!user || !user.email) {
                                                Alert.alert('Error', 'No se pudo obtener la información del usuario.');
                                                setIsResetting(false);
                                                return;
                                            }

                                            // 1. Resetear datos en Firestore
                                            await firestoreService.resetUserAccount(user.uid, user.email);

                                            // 2. Limpiar AsyncStorage (excepto notificaciones y tema)
                                            const notificationsEnabled = await AsyncStorage.getItem('notifications_enabled');
                                            const themeMode = await AsyncStorage.getItem('theme_mode');
                                            
                                            // Limpiar todo AsyncStorage
                                            await AsyncStorage.clear();
                                            
                                            // Restaurar preferencias del usuario
                                            if (notificationsEnabled) {
                                                await AsyncStorage.setItem('notifications_enabled', notificationsEnabled);
                                            }
                                            if (themeMode) {
                                                await AsyncStorage.setItem('theme_mode', themeMode);
                                            }

                                            // 3. Limpiar datos offline
                                            try {
                                                const allKeys = await AsyncStorage.getAllKeys();
                                                const offlineKeys = allKeys.filter(key => 
                                                    key.startsWith('offline_progress_') || 
                                                    key === 'pending_sync_dates'
                                                );
                                                await Promise.all(offlineKeys.map(key => AsyncStorage.removeItem(key)));
                                            } catch (offlineError) {
                                                // Silently fail
                                            }

                                            // 4. Resetear habitStore
                                            await initializeDailyHabits();

                                            // 5. Recargar la app
                                            Alert.alert(
                                                '✅ Cuenta Reseteada',
                                                'Todos tus datos han sido borrados. La app se recargará ahora.',
                                                [
                                                    {
                                                        text: 'OK',
                                                        onPress: () => {
                                                            router.replace('/(tabs)');
                                                            // Forzar recarga
                                                            setTimeout(() => {
                                                                router.replace('/(tabs)');
                                                            }, 500);
                                                        },
                                                    },
                                                ]
                                            );
                                        } catch (error) {
                                            console.error('Error reseteando cuenta:', error);
                                            Alert.alert(
                                                'Error',
                                                'Hubo un error al resetear la cuenta. Por favor, intentá de nuevo.'
                                            );
                                        } finally {
                                            setIsResetting(false);
                                        }
                                    },
                                },
                            ]
                        );
                    },
                },
            ]
        );
    };

    const SettingItem = ({ icon: Icon, title, value, type, onPress, color, disabled }: any) => (
        <TouchableOpacity
            style={[styles.settingItem, disabled && styles.settingItemDisabled]}
            onPress={onPress}
            disabled={type === 'switch' || disabled}
        >
            <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: (color || colors.text) + '15' }]}>
                    <Icon size={20} color={color || colors.text} />
                </View>
                <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
            </View>

            {type === 'switch' ? (
                <Switch
                    value={value}
                    onValueChange={onPress}
                    trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
                    thumbColor={colors.surface}
                />
            ) : (
                <ChevronRight size={20} color={colors.textSecondary} />
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <View style={styles.container}>
                <Text style={[styles.header, { color: colors.text }]}>Ajustes</Text>

                {/* Profile Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>CUENTA</Text>
                    <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
                            <Text style={styles.avatarText}>
                                {userEmail.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View>
                            <Text style={[styles.profileName, { color: colors.text }]}>Usuario</Text>
                            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{userEmail}</Text>
                        </View>
                    </View>
                </View>

                {/* Preferences Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>PREFERENCIAS</Text>
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <SettingItem
                            icon={Bell}
                            title="Recordatorios Diarios"
                            value={notificationsEnabled}
                            type="switch"
                            onPress={toggleNotifications}
                            color={colors.primary}
                        />
                        <View style={[styles.separator, { backgroundColor: colors.surfaceHighlight }]} />
                        <SettingItem
                            icon={Moon}
                            title="Modo Oscuro"
                            value={isDarkMode}
                            type="switch"
                            onPress={toggleTheme}
                            color="#A855F7"
                        />
                    </View>
                </View>

                {/* Actions Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>ACCIONES</Text>
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <SettingItem
                            icon={RotateCcw}
                            title="Ver Onboarding de Nuevo"
                            type="button"
                            onPress={handleResetOnboarding}
                            color={colors.primary}
                        />
                        <View style={[styles.separator, { backgroundColor: colors.surfaceHighlight }]} />
                        <SettingItem
                            icon={Trash2}
                            title="Resetear Cuenta"
                            type="button"
                            onPress={handleResetAccount}
                            color={colors.error}
                            disabled={isResetting}
                        />
                        <View style={[styles.separator, { backgroundColor: colors.surfaceHighlight }]} />
                        <SettingItem
                            icon={LogOut}
                            title="Cerrar Sesión"
                            type="button"
                            onPress={handleSignOut}
                            color={colors.error}
                        />
                    </View>
                </View>

                <Text style={[styles.version, { color: colors.textSecondary }]}>Versión 1.0.0</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    container: {
        flex: 1,
        padding: SPACING.l,
    },
    header: {
        fontSize: 36,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: SPACING.xl,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionHeader: {
        fontSize: 12,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: SPACING.s,
        marginLeft: SPACING.xs,
    },
    card: {
        borderRadius: SIZES.borderRadius,
        overflow: 'hidden',
        borderWidth: 2,
        borderBottomWidth: 3,
        borderRightWidth: 3,
    },
    profileCard: {
        borderRadius: SIZES.borderRadius,
        padding: SPACING.m,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderBottomWidth: 3,
        borderRightWidth: 3,
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.m,
    },
    avatarText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '700',
    },
    profileName: {
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
    },
    profileEmail: {
        fontSize: 14,
        fontFamily: 'PatrickHand-Regular',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.m,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.m,
    },
    settingTitle: {
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
    },
    separator: {
        height: 1,
        marginLeft: 56, // Align with text
    },
    version: {
        textAlign: 'center',
        fontSize: 12,
        fontFamily: 'PatrickHand-Regular',
        marginTop: 'auto',
    },
    settingItemDisabled: {
        opacity: 0.5,
    },
});
