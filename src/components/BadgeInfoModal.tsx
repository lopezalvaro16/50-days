import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { SPACING, SIZES } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';
import { X, Flame, Zap, Gem, Crown, Star, Trophy } from 'lucide-react-native';

interface BadgeInfoModalProps {
    visible: boolean;
    badgeId: string;
    isUnlocked: boolean;
    onClose: () => void;
}

interface BadgeInfo {
    title: string;
    requirement: string;
    description: string;
    icon: React.ComponentType<any>;
}

const BADGE_INFO: Record<string, BadgeInfo> = {
    '3-days': {
        title: '3 Días',
        requirement: 'Completa todos los hábitos durante 3 días consecutivos',
        description: '¡Tu primera racha! Mantené la constancia y seguí adelante.',
        icon: Flame,
    },
    'week': {
        title: 'Semana',
        requirement: 'Alcanza una racha de 7 días consecutivos',
        description: '¡Una semana completa! Estás construyendo un hábito sólido.',
        icon: Zap,
    },
    '2-weeks': {
        title: '2 Semanas',
        requirement: 'Alcanza una racha de 14 días consecutivos',
        description: '¡Increíble! Dos semanas de disciplina constante.',
        icon: Gem,
    },
    'legend': {
        title: 'Leyenda',
        requirement: 'Alcanza una racha de 30 días consecutivos',
        description: '¡Sos una leyenda! 30 días de constancia es un logro extraordinario.',
        icon: Crown,
    },
    '3-weeks': {
        title: 'Maestro',
        requirement: 'Alcanza una racha de 21 días consecutivos',
        description: '¡Tres semanas completas! La disciplina se está convirtiendo en parte de vos.',
        icon: Star,
    },
    'champion': {
        title: 'Campeón',
        requirement: 'Completa el reto de 50 días',
        description: '¡FELICITACIONES! Completaste el Project 50. Sos un verdadero campeón de la disciplina y la constancia.',
        icon: Trophy,
    },
};

export const BadgeInfoModal: React.FC<BadgeInfoModalProps> = ({ visible, badgeId, isUnlocked, onClose }) => {
    const { colors } = useThemeStore();
    const badgeInfo = BADGE_INFO[badgeId];

    if (!badgeInfo) return null;

    const IconComponent = badgeInfo.icon;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                    style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                    <View style={styles.header}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                            <IconComponent size={32} color={colors.primary} />
                        </View>
                        <TouchableOpacity
                            style={[styles.closeButton, { backgroundColor: colors.surfaceHighlight }]}
                            onPress={onClose}
                        >
                            <X size={18} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <Text style={[styles.title, { color: colors.text }]}>
                            {badgeInfo.title}
                        </Text>
                        {isUnlocked ? (
                            <>
                                <Text style={[styles.description, { color: colors.textSecondary }]}>
                                    {badgeInfo.description}
                                </Text>
                                <View style={[styles.requirementCard, { backgroundColor: colors.surfaceHighlight }]}>
                                    <Text style={[styles.requirementLabel, { color: colors.textSecondary }]}>
                                        Requisito completado:
                                    </Text>
                                    <Text style={[styles.requirementText, { color: colors.text }]}>
                                        {badgeInfo.requirement}
                                    </Text>
                                </View>
                            </>
                        ) : (
                            <View style={[styles.requirementCard, { backgroundColor: colors.surfaceHighlight }]}>
                                <Text style={[styles.requirementLabel, { color: colors.textSecondary }]}>
                                    Requisito:
                                </Text>
                                <Text style={[styles.requirementText, { color: colors.text }]}>
                                    {badgeInfo.requirement}
                                </Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.l,
    },
    container: {
        width: '100%',
        maxWidth: 320,
        borderRadius: SIZES.borderRadiusLarge,
        borderWidth: 2,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.l,
        paddingBottom: SPACING.m,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: SPACING.l,
        paddingTop: 0,
    },
    title: {
        fontSize: 24,
        fontFamily: 'PatrickHand-Regular',
        fontWeight: 'bold',
        marginBottom: SPACING.m,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
        lineHeight: 22,
        marginBottom: SPACING.m,
        textAlign: 'center',
    },
    requirementCard: {
        padding: SPACING.m,
        borderRadius: SIZES.borderRadius,
    },
    requirementLabel: {
        fontSize: 12,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: SPACING.xs,
        textAlign: 'center',
    },
    requirementText: {
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
        lineHeight: 22,
        textAlign: 'center',
    },
});

