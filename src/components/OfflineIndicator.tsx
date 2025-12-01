import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SPACING, SIZES } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react-native';
import { offlineService } from '../services/offlineService';
// NetInfo will be optional - check if available

export const OfflineIndicator: React.FC = () => {
    const { colors } = useThemeStore();
    const [isOffline, setIsOffline] = useState(false);
    const [hasPendingSync, setHasPendingSync] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        checkPendingSync();
        checkConnection();

        // Try to use NetInfo if available
        try {
            const NetInfo = require('@react-native-community/netinfo');
            const unsubscribe = NetInfo.addEventListener((state: any) => {
                setIsOffline(!state.isConnected);
                if (state.isConnected) {
                    // Auto-sync when connection is restored
                    syncPendingData();
                }
            });

            return () => unsubscribe();
        } catch (error) {
            // NetInfo not available, just check pending sync
            console.log('NetInfo not available');
        }
    }, []);

    const checkConnection = async () => {
        try {
            const NetInfo = require('@react-native-community/netinfo');
            const state = await NetInfo.fetch();
            setIsOffline(!state.isConnected);
        } catch (error) {
            // Assume online if NetInfo not available
            setIsOffline(false);
        }
    };

    const checkPendingSync = async () => {
        const pending = await offlineService.hasPendingSync();
        setHasPendingSync(pending);
    };

    const syncPendingData = async () => {
        setIsSyncing(true);
        try {
            const syncedCount = await offlineService.syncPendingProgress();
            if (syncedCount > 0) {
                setHasPendingSync(false);
            }
        } catch (error) {
            console.log('Error syncing:', error);
        } finally {
            setIsSyncing(false);
            checkPendingSync();
        }
    };

    if (!isOffline && !hasPendingSync) {
        return null;
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.content}>
                {isOffline ? (
                    <>
                        <WifiOff size={20} color={colors.textSecondary} />
                        <Text style={[styles.text, { color: colors.textSecondary }]}>
                            Sin conexión - Los cambios se guardarán localmente
                        </Text>
                    </>
                ) : hasPendingSync ? (
                    <>
                        <RefreshCw size={20} color={colors.primary} />
                        <Text style={[styles.text, { color: colors.text }]}>
                            {isSyncing ? 'Sincronizando...' : 'Hay datos pendientes de sincronizar'}
                        </Text>
                        {!isSyncing && (
                            <TouchableOpacity onPress={syncPendingData} style={styles.syncButton}>
                                <Text style={[styles.syncButtonText, { color: colors.primary }]}>Sincronizar</Text>
                            </TouchableOpacity>
                        )}
                    </>
                ) : null}
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
        marginBottom: SPACING.m,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
    },
    text: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'PatrickHand-Regular',
    },
    syncButton: {
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.xs,
    },
    syncButtonText: {
        fontSize: 14,
        fontFamily: 'PatrickHand-Regular',
    },
});

