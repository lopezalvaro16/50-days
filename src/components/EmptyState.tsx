import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING, SIZES } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';
import { Target } from 'lucide-react-native';

interface EmptyStateProps {
    title: string;
    message: string;
    icon?: React.ComponentType<any>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, message, icon: Icon }) => {
    const { colors } = useThemeStore();
    const IconComponent = Icon || Target;

    return (
        <View style={styles.container}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                <IconComponent size={48} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
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
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.l,
    },
    title: {
        fontSize: 24,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: SPACING.s,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
        textAlign: 'center',
        lineHeight: 22,
    },
});

