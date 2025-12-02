import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { COLORS, SPACING } from '../constants/theme';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { useFonts, PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand';
import * as SplashScreen from 'expo-splash-screen';
import { onAuthStateChanged, Auth } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useThemeStore } from '../store/themeStore';
import { Flame } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {
    /* reloading the app might trigger some race conditions, ignore them */
});

export default function RootLayout() {
    const [fontsLoaded, error] = useFonts({
        'PatrickHand-Regular': PatrickHand_400Regular,
    });
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const router = useRouter();
    const segments = useSegments();
    const { initializeTheme } = useThemeStore();

    useEffect(() => {
        if (error) throw error;
    }, [error]);

    // Initialize theme on app start
    useEffect(() => {
        initializeTheme();
    }, []);

    // Auth state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setIsLoading(false);
        });

        return unsubscribe;
    }, []);

    // Wait for fonts and auth state before showing anything
    useEffect(() => {
        if (fontsLoaded && !isLoading) {
            // Delay to show loading screen (like Clash Royale)
            const timer = setTimeout(() => {
                setIsReady(true);
                SplashScreen.hideAsync();
            }, 1500); // 1.5 seconds to enjoy the loading animation
            return () => clearTimeout(timer);
        }
    }, [fontsLoaded, isLoading]);

    // Redirect based on auth state - do this BEFORE rendering
    useEffect(() => {
        if (!isReady) return;

        const currentSegment = segments[0];
        const inAuthGroup = currentSegment === '(tabs)';
        const inLogin = currentSegment === 'login';
        const inIndex = !currentSegment || currentSegment === 'index';

        if (user) {
            // User is signed in - redirect to app if not already there
            if (!inAuthGroup) {
                router.replace('/(tabs)');
            }
        } else {
            // User is not signed in - redirect to welcome if not already there
            if (!inIndex && !inLogin) {
                router.replace('/');
            }
        }
    }, [user, segments, isReady, router]);

    // Show loading screen while checking auth state
    if (!fontsLoaded || isLoading || !isReady) {
        return <LoadingScreen />;
    }

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: COLORS.background },
                    animation: 'fade',
                }}
            >
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="(tabs)" />
            </Stack>
        </View>
    );
}

// Loading Screen Component (Clash Royale style)
const LoadingScreen = () => {
    const { colors } = useThemeStore();
    const insets = useSafeAreaInsets();
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Logo entrance animation
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();

        // Continuous pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.15,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Subtle rotation animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(rotateAnim, {
                    toValue: 0,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['-5deg', '5deg'],
    });

    return (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <StatusBar style="light" />
            <Animated.View
                style={[
                    styles.logoContainer,
                    {
                        opacity: opacityAnim,
                        transform: [
                            { scale: scaleAnim },
                            { scale: pulseAnim },
                            { rotate },
                        ],
                    },
                ]}
            >
                <View style={[styles.logoCircle, { backgroundColor: colors.primary + '20' }]}>
                    <Flame size={80} color={colors.primary} fill={colors.primary} />
                </View>
            </Animated.View>
            <Animated.View style={{ opacity: opacityAnim }}>
                <Text style={[styles.loadingTitle, { color: colors.text }]}>PROYECTO 50</Text>
                <Text style={[styles.loadingSubtitle, { color: colors.textSecondary }]}>
                    Cargando...
                </Text>
            </Animated.View>
            {/* Delgada línea de separación en la parte inferior */}
            <View
                style={[
                    styles.bottomSeparator,
                    {
                        bottom: insets.bottom,
                        borderTopColor: colors.border,
                    },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        marginBottom: SPACING.xl,
    },
    logoCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
        elevation: 15,
    },
    loadingTitle: {
        fontSize: 32,
        fontFamily: 'PatrickHand-Regular',
        letterSpacing: 3,
        marginBottom: SPACING.s,
    },
    loadingSubtitle: {
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
    },
    bottomSeparator: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        borderTopWidth: 1,
    },
});
