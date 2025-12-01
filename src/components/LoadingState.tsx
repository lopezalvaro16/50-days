import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SPACING } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';

export const LoadingState: React.FC = () => {
    const { colors } = useThemeStore();

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.text, { color: colors.textSecondary }]}>
                Cargando...
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    text: {
        marginTop: SPACING.m,
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
    },
});

