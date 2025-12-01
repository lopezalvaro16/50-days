import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, Dimensions } from 'react-native';
import { SPACING, SIZES } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';
import { Trophy, Sparkles } from 'lucide-react-native';

interface CelebrationModalProps {
    visible: boolean;
    onClose: () => void;
    streak?: number;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({ visible, onClose, streak = 0 }) => {
    const { colors } = useThemeStore();
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Reset animations
            scaleAnim.setValue(0);
            opacityAnim.setValue(0);
            rotateAnim.setValue(0);

            // Celebration animation sequence
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(rotateAnim, {
                            toValue: 1,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(rotateAnim, {
                            toValue: 0,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                    ])
                ),
            ]).start();

            // Auto close after 3 seconds
            const timer = setTimeout(() => {
                onClose();
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '15deg'],
    });

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.container,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.primary,
                            transform: [{ scale: scaleAnim }, { rotate }],
                            opacity: opacityAnim,
                        },
                    ]}
                >
                    <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                        <Trophy size={64} color={colors.primary} fill={colors.primary} />
                        <View style={styles.sparkles}>
                            <Sparkles size={32} color={colors.primary} style={styles.sparkle1} />
                            <Sparkles size={28} color={colors.primary} style={styles.sparkle2} />
                            <Sparkles size={24} color={colors.primary} style={styles.sparkle3} />
                        </View>
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>
                        ¡Día Completado! 🎉
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {streak > 0 
                            ? `Racha de ${streak} día${streak > 1 ? 's' : ''}! 🔥`
                            : '¡Seguí así!'}
                    </Text>
                    <Text style={[styles.message, { color: colors.textSecondary }]}>
                        Mantené la disciplina y seguí construyendo tu mejor versión.
                    </Text>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: Dimensions.get('window').width * 0.85,
        padding: SPACING.xl,
        borderRadius: SIZES.borderRadiusLarge,
        alignItems: 'center',
        borderWidth: 3,
        borderBottomWidth: 5,
        borderRightWidth: 5,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.l,
        position: 'relative',
    },
    sparkles: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    sparkle1: {
        position: 'absolute',
        top: -10,
        right: -10,
    },
    sparkle2: {
        position: 'absolute',
        bottom: -10,
        left: -10,
    },
    sparkle3: {
        position: 'absolute',
        top: '50%',
        right: -15,
    },
    title: {
        fontSize: 32,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: SPACING.s,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 20,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: SPACING.m,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
        textAlign: 'center',
        lineHeight: 22,
    },
});

