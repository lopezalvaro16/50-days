import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING, SIZES } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';
import { CheckCircle } from 'lucide-react-native';

interface OnboardingStepProps {
    title: string;
    description: string;
    icon?: string;
    rules?: string[];
}

export const OnboardingStep: React.FC<OnboardingStepProps> = ({ title, description, icon, rules }) => {
    const { colors } = useThemeStore();

    return (
        <View style={styles.container}>
            {icon && (
                <Text style={styles.icon}>{icon}</Text>
            )}

            <Text style={[styles.title, { color: colors.text }]}>
                {title}
            </Text>

            <Text style={[styles.description, { color: colors.textSecondary }]}>
                {description}
            </Text>

            {rules && (
                <View style={[styles.rulesContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {rules.map((rule, index) => (
                        <View key={index} style={styles.ruleItem}>
                            <View style={[styles.ruleIcon, { backgroundColor: colors.primary + '20' }]}>
                                <CheckCircle size={18} color={colors.primary} />
                            </View>
                            <Text style={[styles.ruleText, { color: colors.text }]}>
                                {rule}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
    },
    icon: {
        fontSize: 80,
        marginBottom: SPACING.xl,
    },
    title: {
        fontSize: 32,
        fontFamily: 'PatrickHand-Regular',
        textAlign: 'center',
        marginBottom: SPACING.m,
    },
    description: {
        fontSize: 18,
        fontFamily: 'PatrickHand-Regular',
        textAlign: 'center',
        lineHeight: 26,
        marginBottom: SPACING.xl,
    },
    rulesContainer: {
        width: '100%',
        maxWidth: 400,
        borderRadius: SIZES.borderRadius,
        padding: SPACING.l,
        borderWidth: 2,
        borderBottomWidth: 3,
        borderRightWidth: 3,
    },
    ruleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    ruleIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.m,
    },
    ruleText: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
    },
});
