import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { SPACING, SIZES } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';
import {
    Check,
    Circle,
    Sunrise,
    Dumbbell,
    Droplet,
    Book,
    GraduationCap,
    Moon,
    Apple
} from 'lucide-react-native';
import { Habit } from '../store/habitStore';

// Icon mapping
const iconMap: { [key: string]: React.ComponentType<any> } = {
    Sunrise,
    Dumbbell,
    Droplet,
    Book,
    GraduationCap,
    Moon,
    Apple,
};

interface HabitItemProps {
    habit: Habit;
    onToggle: () => void;
}

export const HabitItem: React.FC<HabitItemProps> = ({ habit, onToggle }) => {
    const { colors } = useThemeStore();
    const IconComponent = habit.icon ? iconMap[habit.icon] : null;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const checkScaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (habit.isCompleted) {
            Animated.spring(checkScaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }).start();
        } else {
            checkScaleAnim.setValue(0);
        }
    }, [habit.isCompleted]);

    const handlePress = () => {
        // Haptic feedback (optional, only if available)
        try {
            const Haptics = require('expo-haptics');
            if (Platform.OS === 'ios') {
                if (habit.isCompleted) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } else {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            } else if (Platform.OS === 'android') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
        } catch (error) {
            // Haptics not available, continue without it
        }

        // Pulse animation on press
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 300,
                friction: 10,
                useNativeDriver: true,
            }),
        ]).start();

        onToggle();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={[
                    styles.container,
                    {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderBottomWidth: 3,
                        borderRightWidth: 3,
                    },
                    habit.isCompleted && {
                        backgroundColor: colors.surfaceHighlight,
                        borderColor: colors.success,
                    }
                ]}
                onPress={handlePress}
                activeOpacity={0.7}
            >
                {IconComponent && (
                    <View style={[
                        styles.iconContainer,
                        {
                            backgroundColor: habit.isCompleted
                                ? colors.success + '20'
                                : colors.primary + '15'
                        }
                    ]}>
                        <IconComponent
                            size={24}
                            color={habit.isCompleted ? colors.success : colors.primary}
                        />
                    </View>
                )}

                <View style={styles.textContainer}>
                    <Text style={[
                        styles.title,
                        { color: colors.text },
                        habit.isCompleted && {
                            color: colors.textSecondary,
                            textDecorationLine: 'line-through',
                            textDecorationStyle: 'solid',
                        }
                    ]}>
                        {habit.title}
                    </Text>
                    {habit.description && (
                        <Text style={[
                            styles.description,
                            { color: colors.textSecondary },
                            habit.isCompleted && {
                                color: colors.textSecondary,
                                textDecorationLine: 'line-through'
                            }
                        ]}>
                            {habit.description}
                        </Text>
                    )}
                </View>

                <Animated.View style={[
                    styles.checkbox,
                    { borderColor: colors.textSecondary },
                    habit.isCompleted && { backgroundColor: colors.success, borderColor: colors.success },
                    { transform: [{ scale: checkScaleAnim }] }
                ]}>
                    {habit.isCompleted ? (
                        <Check size={18} color={colors.background} strokeWidth={3} />
                    ) : (
                        <Circle size={22} color={colors.textSecondary} strokeWidth={2.5} />
                    )}
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.m,
        borderRadius: SIZES.borderRadius,
        marginBottom: SPACING.m,
        borderWidth: 2,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.m,
    },
    textContainer: {
        flex: 1,
        marginRight: SPACING.m,
    },
    title: {
        fontSize: 20, // Larger for handwritten font
        fontWeight: '600',
        fontFamily: 'PatrickHand-Regular',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        fontFamily: 'PatrickHand-Regular',
    },
    checkbox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2, // Sketchy checkbox border
        backgroundColor: 'transparent',
    },
});
