import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '../store/themeStore';

interface ProgressBarProps {
    progress: number; // 0 to 1
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
    const { colors } = useThemeStore();
    // Clamp progress between 0 and 1
    const clampedProgress = Math.min(Math.max(progress, 0), 1);

    return (
        <View style={[styles.container, { backgroundColor: colors.surfaceHighlight }]}>
            <View style={[styles.fill, { width: `${clampedProgress * 100}%`, backgroundColor: colors.primary }]} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        width: '100%',
    },
    fill: {
        height: '100%',
        borderRadius: 4,
    },
});
