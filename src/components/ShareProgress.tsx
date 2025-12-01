import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Alert, Platform } from 'react-native';
import { SPACING, SIZES } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';
import { Share2, Copy, Check } from 'lucide-react-native';

interface ShareProgressProps {
    streak: number;
    dayNumber: number;
    progress: number;
    onShare?: () => void;
}

export const ShareProgress: React.FC<ShareProgressProps> = ({ streak, dayNumber, progress, onShare }) => {
    const { colors } = useThemeStore();
    const [copied, setCopied] = React.useState(false);

    const generateShareText = () => {
        const emoji = progress === 100 ? '🔥' : streak > 0 ? '💪' : '🚀';
        return `¡Estoy en el Día ${dayNumber} del Project 50 Challenge! ${emoji}\n\n` +
               `Racha actual: ${streak} días\n` +
               `Progreso de hoy: ${Math.round(progress * 100)}%\n\n` +
               `#Project50 #Hábitos #Disciplina`;
    };

    const handleShare = async () => {
        try {
            const result = await Share.share({
                message: generateShareText(),
                title: 'Mi Progreso en Project 50',
            });

            if (result.action === Share.sharedAction) {
                onShare?.();
            }
        } catch (error) {
            console.log('Error sharing:', error);
        }
    };

    const handleCopy = async () => {
        try {
            // For now, we'll use Share API which works on both platforms
            // The user can manually copy from the share dialog
            await Share.share({
                message: generateShareText(),
                title: 'Mi Progreso en Project 50',
            });
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            onShare?.();
        } catch (error) {
            console.log('Error copying:', error);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Compartir Progreso</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
                Compartí tu progreso y motivá a otros a unirse al reto
            </Text>

            <View style={styles.buttonsContainer}>
                <TouchableOpacity
                    style={[
                        styles.shareButton,
                        {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary,
                        }
                    ]}
                    onPress={handleShare}
                >
                    <Share2 size={20} color={colors.background} />
                    <Text style={[styles.buttonText, { color: colors.background }]}>Compartir</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.shareButton,
                        {
                            backgroundColor: copied ? colors.success : colors.surfaceHighlight,
                            borderColor: copied ? colors.success : colors.border,
                        }
                    ]}
                    onPress={handleCopy}
                >
                    {copied ? (
                        <Check size={20} color={colors.background} />
                    ) : (
                        <Copy size={20} color={colors.text} />
                    )}
                    <Text style={[
                        styles.buttonText,
                        { color: copied ? colors.background : colors.text }
                    ]}>
                        {copied ? 'Copiado' : 'Copiar'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: SPACING.l,
        borderRadius: SIZES.borderRadius,
        borderWidth: 2,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        marginBottom: SPACING.l,
    },
    title: {
        fontSize: 20,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: SPACING.xs,
    },
    description: {
        fontSize: 14,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: SPACING.m,
    },
    buttonsContainer: {
        flexDirection: 'row',
        gap: SPACING.m,
    },
    shareButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.m,
        borderRadius: SIZES.borderRadius,
        borderWidth: 2,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        gap: SPACING.xs,
    },
    buttonText: {
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
    },
});

