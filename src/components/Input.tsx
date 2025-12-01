import React from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps } from 'react-native';
import { COLORS, SPACING, SIZES } from '../constants/theme';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, ...props }) => {
    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                style={[
                    styles.input,
                    error ? styles.inputError : null,
                    style,
                ]}
                placeholderTextColor={COLORS.textSecondary}
                {...props}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.m,
    },
    label: {
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
        fontSize: 14,
        fontFamily: 'PatrickHand-Regular',
    },
    input: {
        backgroundColor: COLORS.surface,
        color: COLORS.text,
        padding: SPACING.m,
        borderRadius: SIZES.borderRadius,
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
        borderWidth: 2,
        borderColor: COLORS.border,
        borderBottomWidth: 3,
        borderRightWidth: 3,
    },
    inputError: {
        borderColor: COLORS.error,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 12,
        fontFamily: 'PatrickHand-Regular',
        marginTop: SPACING.xs,
    },
});
