import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';
import { X } from 'lucide-react-native';
import { Button } from './Button';
import { OnboardingStep } from './OnboardingStep';

interface OnboardingModalProps {
    visible: boolean;
    onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ visible, onComplete }) => {
    const { colors } = useThemeStore();
    const [currentStep, setCurrentStep] = useState(0);
    const insets = useSafeAreaInsets();

    const handleNext = () => {
        if (currentStep < 6) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete();
        }
    };

    const handleSkip = () => {
        onComplete();
    };

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 0:
                return (
                    <OnboardingStep
                        icon="🔥"
                        title="¡Bienvenido al Project 50!"
                        description="50 días que transformarán tu vida. Un viaje de autodescubrimiento y crecimiento personal."
                    />
                );
            case 1:
                return (
                    <OnboardingStep
                        icon="💪"
                        title="¿Por qué 50 días?"
                        description="Los estudios muestran que se necesitan entre 21 y 66 días para formar un hábito. Los 50 días te dan tiempo suficiente para anclar estos cambios positivos en tu vida diaria."
                    />
                );
            case 2:
                return (
                    <OnboardingStep
                        title="Las 7 Reglas"
                        description="Completa estos 7 hábitos cada día para mantener tu racha:"
                        rules={[
                            '🌅 Levantarte antes de las 8am',
                            '🏃 Hacer ejercicio (1 hora)',
                            '💧 Beber suficiente agua (8 vasos)',
                            '📚 Leer 10 páginas',
                            '🎯 Aprender nueva habilidad (1 hora)',
                            '😴 Rutina de cama consistente',
                            '� Sin alcohol ni comida chatarra',
                        ]}
                    />
                );
            case 3:
                return (
                    <OnboardingStep
                        icon="✨"
                        title="Beneficios del Reto"
                        description="Al completar el Project 50, desarrollarás hábitos positivos, mejorarás tu gestión del tiempo, y experimentarás un crecimiento personal significativo. Cada día te acercará más a la mejor versión de vos mismo."
                    />
                );
            case 4:
                return (
                    <OnboardingStep
                        icon="📊"
                        title="Seguí tu Progreso"
                        description="Cada día que completes todos tus hábitos sumará a tu racha. Vas a poder ver tu progreso, estadísticas y logros desbloqueados a medida que avances en tu transformación."
                    />
                );
            case 5:
                return (
                    <OnboardingStep
                        icon="⚡"
                        title="No Rompas la Racha"
                        description="La clave del éxito es la constancia. Si perdés un día, tu racha se reinicia. Pero no te preocupes: cada día es una nueva oportunidad para retomar el camino."
                    />
                );
            case 6:
                return (
                    <OnboardingStep
                        icon="🚀"
                        title="¡Estás Listo!"
                        description="Los próximos 50 días van a ser desafiantes, pero cada pequeño paso te acercará a tu meta. Recordá: el éxito no se trata de perfección, sino de progreso constante."
                    />
                );
            default:
                return null;
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
        >
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={styles.header}>
                    {currentStep > 0 && (
                        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Omitir</Text>
                        </TouchableOpacity>
                    )}
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity onPress={handleSkip} style={styles.closeButton}>
                        <X size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {renderCurrentStep()}
                </View>

                {/* Footer */}
                <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, SPACING.l) }]}>
                    <View style={styles.dotsContainer}>
                        {[0, 1, 2, 3, 4, 5, 6].map((index) => (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    {
                                        backgroundColor: index === currentStep ? colors.primary : colors.surfaceHighlight,
                                        width: index === currentStep ? 24 : 8,
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    <Button
                        title={currentStep === 6 ? 'Comenzar' : 'Siguiente'}
                        onPress={handleNext}
                        style={styles.button}
                    />
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.l,
        paddingTop: SPACING.m,
        paddingBottom: SPACING.m,
    },
    skipButton: {
        padding: SPACING.xs,
    },
    skipText: {
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
    },
    closeButton: {
        padding: SPACING.xs,
    },
    content: {
        flex: 1,
    },
    footer: {
        paddingHorizontal: SPACING.l,
        paddingTop: SPACING.l,
        borderTopWidth: 1,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.l,
        gap: SPACING.s,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
    button: {
        marginTop: 0,
    },
});
