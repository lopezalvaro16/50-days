import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, SIZES } from '../constants/theme';
import { Button } from '../components/Button';
import { Flame } from 'lucide-react-native';
import { authService } from '../services/authService';

export default function WelcomeScreen() {
    const router = useRouter();

    // CRITICAL: Check auth IMMEDIATELY and NEVER render if user is authenticated
    // This prevents ANY flash of this screen for logged-in users
    // Do this check synchronously on every render
    const user = authService.getCurrentUser();
    
    // If user exists, redirect immediately and render nothing
    useEffect(() => {
        if (user && user.uid) {
            // User is authenticated - redirect immediately
            router.replace('/(tabs)');
        }
    }, [user, router]);
    
    // Don't render anything if user is authenticated
    // This prevents ANY flash, even during initial mount
    if (user && user.uid) {
        return null; // Don't render anything at all
    }

    // Only render welcome screen if user is definitely not authenticated

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Flame size={64} color={COLORS.primary} fill={COLORS.primary} />
                </View>

                <Text style={styles.title}>PROYECTO 50</Text>
                <Text style={styles.subtitle}>
                    50 días. 7 hábitos. Sin excusas.{'\n'}
                    Transformá tu vida.
                </Text>

                <View style={styles.divider} />

                <View style={styles.featureList}>
                    <FeatureItem text="Construí disciplina" />
                    <FeatureItem text="Seguí tu progreso" />
                    <FeatureItem text="Unite a la élite" />
                </View>
            </View>

            <View style={styles.footer}>
                <Button
                    title="ACEPTAR EL RETO"
                    onPress={() => router.push('/login')}
                />
                <Text style={styles.disclaimer}>
                    Al continuar, te comprometés con las reglas del reto.
                </Text>
            </View>
        </View>
    );
}

const FeatureItem = ({ text }: { text: string }) => (
    <View style={styles.featureItem}>
        <View style={styles.dot} />
        <Text style={styles.featureText}>{text}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        padding: SPACING.l,
        justifyContent: 'space-between',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: SPACING.xl,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    title: {
        fontSize: 40,
        fontFamily: 'PatrickHand-Regular',
        color: COLORS.text,
        letterSpacing: 2,
        textAlign: 'center',
        marginBottom: SPACING.s,
    },
    subtitle: {
        fontSize: 18,
        fontFamily: 'PatrickHand-Regular',
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 26,
        marginBottom: SPACING.xxl,
    },
    divider: {
        width: 40,
        height: 4,
        backgroundColor: COLORS.surfaceHighlight,
        borderRadius: 2,
        marginBottom: SPACING.xxl,
    },
    featureList: {
        alignItems: 'flex-start',
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
        marginRight: SPACING.m,
    },
    featureText: {
        color: COLORS.text,
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
    },
    footer: {
        paddingBottom: SPACING.xl,
    },
    disclaimer: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontFamily: 'PatrickHand-Regular',
        textAlign: 'center',
        marginTop: SPACING.m,
    },
});
