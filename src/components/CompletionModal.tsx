import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, Dimensions, TouchableOpacity, Share } from 'react-native';
import { SPACING, SIZES } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';
import { Trophy, Sparkles, Share2, X } from 'lucide-react-native';

interface CompletionModalProps {
    visible: boolean;
    onClose: () => void;
    stats: {
        longestStreak: number;
        totalDaysCompleted: number;
        currentStreak: number;
    };
}

export const CompletionModal: React.FC<CompletionModalProps> = ({ visible, onClose, stats }) => {
    const { colors } = useThemeStore();
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const confettiAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Reset animations
            scaleAnim.setValue(0);
            opacityAnim.setValue(0);
            pulseAnim.setValue(1);
            confettiAnim.setValue(0);

            // Epic celebration animation sequence
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 30,
                    friction: 5,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                // Pulse animation for trophy (subtle breathing effect)
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(pulseAnim, {
                            toValue: 1.1,
                            duration: 1500,
                            useNativeDriver: true,
                        }),
                        Animated.timing(pulseAnim, {
                            toValue: 1,
                            duration: 1500,
                            useNativeDriver: true,
                        }),
                    ])
                ),
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(confettiAnim, {
                            toValue: 1,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(confettiAnim, {
                            toValue: 0,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                    ])
                ),
            ]).start();

            // Haptic feedback for epic moment
            try {
                const Haptics = require('expo-haptics');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setTimeout(() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                }, 500);
            } catch (error) {
                // Haptics not available
            }
        }
    }, [visible]);

    const confettiScale = confettiAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [1, 1.2, 1],
    });

    const handleShare = async () => {
        try {
            const message = `🎉 ¡COMPLETÉ EL PROJECT 50! 🎉\n\n` +
                `✅ 50 días de disciplina\n` +
                `🔥 Racha máxima: ${stats.longestStreak} días\n` +
                `📊 Días completados: ${stats.totalDaysCompleted}\n\n` +
                `#Project50 #Hábitos #Disciplina #Transformación`;
            
            await Share.share({
                message,
                title: '¡Completé el Project 50!',
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

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
                            transform: [{ scale: scaleAnim }],
                            opacity: opacityAnim,
                        },
                    ]}
                >
                    {/* Close button */}
                    <TouchableOpacity
                        style={[styles.closeButton, { backgroundColor: colors.surfaceHighlight }]}
                        onPress={onClose}
                    >
                        <X size={20} color={colors.text} />
                    </TouchableOpacity>

                    {/* Trophy with pulse animation */}
                    <Animated.View
                        style={[
                            styles.iconContainer,
                            { backgroundColor: colors.primary + '20' },
                            { transform: [{ scale: pulseAnim }] }
                        ]}
                    >
                        <Trophy size={80} color={colors.primary} fill={colors.primary} />
                        <Animated.View
                            style={[
                                styles.sparkles,
                                { transform: [{ scale: confettiScale }] }
                            ]}
                        >
                            <Sparkles size={40} color={colors.primary} style={styles.sparkle1} />
                            <Sparkles size={36} color={colors.primary} style={styles.sparkle2} />
                            <Sparkles size={32} color={colors.primary} style={styles.sparkle3} />
                            <Sparkles size={28} color={colors.primary} style={styles.sparkle4} />
                        </Animated.View>
                    </Animated.View>

                    <Text style={[styles.title, { color: colors.text }]}>
                        ¡FELICITACIONES! 🎊
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.primary }]}>
                        ¡Completaste los 50 días!
                    </Text>
                    <Text style={[styles.message, { color: colors.textSecondary }]}>
                        Llegaste al final de este increíble viaje. Transformaste tu vida con disciplina, constancia y dedicación. Esto es solo el comienzo de tu mejor versión.
                    </Text>

                    {/* Stats Section */}
                    <View style={[styles.statsContainer, { backgroundColor: colors.surfaceHighlight }]}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.primary }]}>
                                {stats.longestStreak}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                                Racha Máxima
                            </Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.primary }]}>
                                {stats.totalDaysCompleted}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                                Días Completados
                            </Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.primary }]}>
                                {stats.currentStreak}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                                Racha Actual
                            </Text>
                        </View>
                    </View>

                    {/* Share Button */}
                    <TouchableOpacity
                        style={[styles.shareButton, { backgroundColor: colors.primary }]}
                        onPress={handleShare}
                    >
                        <Share2 size={20} color="#FFFFFF" />
                        <Text style={styles.shareButtonText}>Compartir Logro</Text>
                    </TouchableOpacity>

                    <Text style={[styles.footerMessage, { color: colors.textSecondary }]}>
                        Seguí construyendo tu mejor versión. 🔥
                    </Text>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: Dimensions.get('window').width * 0.9,
        maxWidth: 400,
        padding: SPACING.xl,
        borderRadius: SIZES.borderRadiusLarge,
        alignItems: 'center',
        borderWidth: 4,
        borderBottomWidth: 6,
        borderRightWidth: 6,
        position: 'relative',
    },
    closeButton: {
        position: 'absolute',
        top: SPACING.m,
        right: SPACING.m,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
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
        top: -15,
        right: -15,
    },
    sparkle2: {
        position: 'absolute',
        bottom: -15,
        left: -15,
    },
    sparkle3: {
        position: 'absolute',
        top: '50%',
        right: -20,
    },
    sparkle4: {
        position: 'absolute',
        top: '50%',
        left: -20,
    },
    title: {
        fontSize: 36,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: SPACING.s,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 24,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: SPACING.m,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    message: {
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: SPACING.l,
    },
    statsContainer: {
        flexDirection: 'row',
        width: '100%',
        padding: SPACING.m,
        borderRadius: SIZES.borderRadius,
        marginBottom: SPACING.l,
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 28,
        fontFamily: 'PatrickHand-Regular',
        fontWeight: 'bold',
        marginBottom: SPACING.xs,
    },
    statLabel: {
        fontSize: 12,
        fontFamily: 'PatrickHand-Regular',
        textAlign: 'center',
    },
    statDivider: {
        width: 1,
        height: 40,
        marginHorizontal: SPACING.s,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.m,
        paddingHorizontal: SPACING.xl,
        borderRadius: SIZES.borderRadius,
        marginBottom: SPACING.m,
        gap: SPACING.s,
    },
    shareButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
        fontWeight: 'bold',
    },
    footerMessage: {
        fontSize: 14,
        fontFamily: 'PatrickHand-Regular',
        textAlign: 'center',
        fontStyle: 'italic',
    },
});

