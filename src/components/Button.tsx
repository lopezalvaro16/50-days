import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { COLORS, SPACING, SIZES } from '../constants/theme';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
    isLoading?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    isLoading = false,
    style,
    textStyle
}) => {
    const getBackgroundColor = () => {
        if (variant === 'primary') return COLORS.primary;
        if (variant === 'secondary') return COLORS.surfaceHighlight;
        return 'transparent';
    };

    const getTextColor = () => {
        if (variant === 'primary') return COLORS.background; // Black text on Gold
        return COLORS.text;
    };

    const getBorder = () => {
        if (variant === 'outline') return { borderColor: COLORS.primary };
        return { borderColor: COLORS.border };
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                { backgroundColor: getBackgroundColor() },
                getBorder(),
                style,
            ]}
            onPress={onPress}
            disabled={isLoading}
            activeOpacity={0.8}
        >
            {isLoading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <Text style={[styles.text, { color: getTextColor() }, textStyle]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: SPACING.m,
        paddingHorizontal: SPACING.l,
        borderRadius: SIZES.borderRadius,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 56,
        borderWidth: 2,
        borderBottomWidth: 3,
        borderRightWidth: 3,
    },
    text: {
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
        letterSpacing: 0.5,
    },
});
