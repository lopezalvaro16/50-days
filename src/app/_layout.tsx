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
import { useHabitStore } from '../store/habitStore';
import { firestoreService } from '../services/firestoreService';
import { authService } from '../services/authService';
import { offlineService } from '../services/offlineService';

// Prevent splash screen from auto-hiding - we'll hide it manually after our loading screen
SplashScreen.preventAutoHideAsync().catch(() => {
    /* reloading the app might trigger some race conditions, ignore them */
});

export default function RootLayout() {
    // Initialize all states - loading screen should show immediately
    const [fontsLoaded, error] = useFonts({
        'PatrickHand-Regular': PatrickHand_400Regular,
    });
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [initialDataLoaded, setInitialDataLoaded] = useState(false);
    const [showLoading, setShowLoading] = useState(true); // CRITICAL: Always show loading first
    const [minLoadingTimeElapsed, setMinLoadingTimeElapsed] = useState(false);
    const startTimeRef = useRef<number>(Date.now());
    const router = useRouter();
    const segments = useSegments();
    const { initializeTheme } = useThemeStore();
    const { initializeDailyHabits } = useHabitStore();

    // CRITICAL: Show loading screen FIRST, before anything else renders
    // This must be checked BEFORE any other logic
    const shouldShowLoading = showLoading || !fontsLoaded || isLoading || !isReady || !initialDataLoaded || !minLoadingTimeElapsed || loadingProgress < 99.9;

    useEffect(() => {
        if (error) throw error;
    }, [error]);

    // Initialize theme on app start (but don't block loading screen)
    useEffect(() => {
        initializeTheme();
    }, []);

    // Ensure minimum loading time (1 second minimum for smooth transition)
    useEffect(() => {
        const minTime = 1000; // 1 second minimum - just for smooth transition
        const timer = setTimeout(() => {
            setMinLoadingTimeElapsed(true);
        }, minTime);

        return () => clearTimeout(timer);
    }, []);

    // Auth state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setIsLoading(false);
        });

        return unsubscribe;
    }, []);

    // Load initial data when user is authenticated
    useEffect(() => {
        if (!fontsLoaded || isLoading || !user) return;

        let isMounted = true;

        const loadInitialData = async () => {
            try {
                // Start progress
                if (isMounted) setLoadingProgress(20); // Fonts loaded: 20%

                // Load user profile
                const profile = await firestoreService.getUserProfile(user.uid);
                if (isMounted) setLoadingProgress(50); // Profile loaded: 50%

                // Sync offline data
                try {
                    await offlineService.syncPendingProgress();
                } catch (syncError) {
                    // Silently fail
                }
                if (isMounted) setLoadingProgress(70); // Offline sync: 70%

                // Load daily habits
                await initializeDailyHabits();
                if (isMounted) setLoadingProgress(90); // Habits loaded: 90%

                // Complete loading
                if (isMounted) {
                    setLoadingProgress(100);
                    // Mark as ready when all data is loaded
                    setTimeout(() => {
                        if (isMounted) {
                            setInitialDataLoaded(true);
                        }
                    }, 200);
                }
            } catch (error) {
                // If error, still mark as loaded
                if (isMounted) {
                    setLoadingProgress(100);
                    setInitialDataLoaded(true); 
                }
            }
        };

        loadInitialData();

        return () => {
            isMounted = false;
        };
    }, [fontsLoaded, isLoading, user, initializeDailyHabits]);

    // If user is not authenticated, just wait for fonts and auth
    useEffect(() => {
        if (!fontsLoaded || isLoading) return;
        if (user) return; // If user exists, wait for initial data

        // No user - complete loading quickly
        setLoadingProgress(100);
        setTimeout(() => {
            setInitialDataLoaded(true);
        }, 200);
    }, [fontsLoaded, isLoading, user]);

    // Wait for everything to be ready before showing app
    // Only show app when ALL data from server is loaded
    useEffect(() => {
        if (fontsLoaded && !isLoading && loadingProgress >= 99.9 && initialDataLoaded && minLoadingTimeElapsed) {
            setIsReady(true);
            // Hide Expo splash screen first, then our loading screen
            SplashScreen.hideAsync().then(() => {
                // Small delay before hiding our loading screen for smooth transition
                setTimeout(() => {
                    setShowLoading(false);
                }, 200);
            });
        }
    }, [fontsLoaded, isLoading, loadingProgress, initialDataLoaded, minLoadingTimeElapsed]);

    // Redirect based on auth state - ONLY after loading screen is done
    useEffect(() => {
        // Don't redirect until loading is completely done
        if (!isReady || showLoading || !minLoadingTimeElapsed) return;

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
    }, [user, segments, isReady, showLoading, minLoadingTimeElapsed, router]);

    // ALWAYS show loading screen first, before ANYTHING else
    // This is the FIRST thing that should render, like Clash Royale
    // Don't render Stack or anything else until loading is complete
    if (shouldShowLoading) {
        return <LoadingScreen progress={loadingProgress} />;
    }

    // Only render the app content AFTER loading is completely done
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
interface LoadingScreenProps {
    progress: number;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress }) => {
    const { colors } = useThemeStore();
    const insets = useSafeAreaInsets();
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

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

    // Animate progress bar
    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false, // width animation doesn't support native driver
        }).start();
    }, [progress]);

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

            {/* Progress Bar */}
            <View style={[styles.progressBarContainer, { 
                backgroundColor: colors.surfaceHighlight,
                borderColor: colors.border,
            }]}>
                <Animated.View
                    style={[
                        styles.progressBarFill,
                        {
                            width: progressAnim.interpolate({
                                inputRange: [0, 100],
                                outputRange: ['0%', '100%'],
                            }),
                            backgroundColor: colors.primary,
                        },
                    ]}
                />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                {Math.round(progress)}%
            </Text>

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
    progressBarContainer: {
        width: '70%',
        height: 8,
        borderRadius: 4,
        marginTop: SPACING.xl,
        borderWidth: 2,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        fontFamily: 'PatrickHand-Regular',
        marginTop: SPACING.s,
    },
    bottomSeparator: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        borderTopWidth: 1,
    },
});
