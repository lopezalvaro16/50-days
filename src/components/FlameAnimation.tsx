import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { Flame } from 'lucide-react-native';
import { COLORS } from '../constants/theme';

interface FlameAnimationProps {
    streak: number;
    isActive: boolean; // true when all habits are completed
}

export const FlameAnimation: React.FC<FlameAnimationProps> = ({ streak, isActive }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isActive) {
            // Celebration animation when all habits completed
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(scaleAnim, {
                        toValue: 1.3,
                        duration: 300,
                        easing: Easing.bounce,
                        useNativeDriver: true,
                    }),
                    Animated.timing(rotateAnim, {
                        toValue: 1,
                        duration: 300,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(rotateAnim, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start();
        } else {
            // Idle breathing animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.1,
                        duration: 1000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 1000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [isActive]);

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '15deg'],
    });

    // Color based on streak level
    const getFlameColor = () => {
        if (streak >= 30) return '#FFD700'; // Gold
        if (streak >= 14) return '#4169E1'; // Royal Blue
        if (streak >= 7) return '#FF6B35'; // Orange-Red
        return isActive ? COLORS.primary : COLORS.textSecondary;
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }, { rotate }] }}>
            <Flame
                size={24}
                color={getFlameColor()}
                fill={isActive || streak > 0 ? getFlameColor() : 'transparent'}
            />
        </Animated.View>
    );
};
