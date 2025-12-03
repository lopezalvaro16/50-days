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
import { notificationService } from '../services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Prevent splash screen from auto-hiding - we'll hide it manually after our loading screen
// This ensures the splash screen stays visible until our custom loading screen is ready
SplashScreen.preventAutoHideAsync().catch(() => {
    /* reloading the app might trigger some race conditions, ignore them */
});

// Keep splash screen visible initially - our loading screen will replace it smoothly

export default function RootLayout() {
    // Initialize all states - loading screen should show immediately
    const [fontsLoaded, error] = useFonts({
        'PatrickHand-Regular': PatrickHand_400Regular,
    });
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const maxProgressReachedRef = useRef(0); // Track maximum progress reached (prevents going backwards)
    const [initialDataLoaded, setInitialDataLoaded] = useState(false);
    const [showSplash, setShowSplash] = useState(true); // Step 1: Static splash (logo only)
    const [showLoading, setShowLoading] = useState(false); // Step 2: Loading screen with progress bar
    const [minLoadingTimeElapsed, setMinLoadingTimeElapsed] = useState(false);
    const [navigationReady, setNavigationReady] = useState(false); // Track if navigation is complete
    const [initialRoute, setInitialRoute] = useState<string | null>(null); // Store the initial route before mounting Stack
    const hasRedirectedRef = useRef(false); // Prevent multiple redirects
    const hasShownLoadingRef = useRef(false); // Track if loading screen has been shown (only once per app start)
    const hasCompletedLoadingRef = useRef(false); // Track if loading screen has been completed (never show again)
    const hasLoadedDataRef = useRef(false); // Prevent loading data more than once (fixes double mount in React Strict Mode)
    const startTimeRef = useRef<number>(Date.now());
    const router = useRouter();
    const segments = useSegments();
    const { initializeTheme } = useThemeStore();
    const { initializeDailyHabits } = useHabitStore();

    // Three-step loading process:
    // Step 1: Static splash (logo only) - handled by native splash
    // Step 2: Loading screen with progress bar - showLoading state
    // Step 3: Main app - when everything is ready
    // CRITICAL: Once loading screen is completed, never show it again - this prevents the double loading
    // CRITICAL: Keep loading visible until navigation is complete - prevents flash of welcome screen
    const shouldShowLoading = !hasCompletedLoadingRef.current && showLoading && (
        !fontsLoaded || 
        isLoading || 
        loadingProgress < 100 || 
        !initialDataLoaded || 
        !minLoadingTimeElapsed || 
        !initialRoute || 
        !navigationReady // Keep visible until navigation is ready
    );

    useEffect(() => {
        if (error) throw error;
    }, [error]);

    // Initialize theme on app start (but don't block loading screen)
    useEffect(() => {
        initializeTheme();
    }, []);

    // Step 2: Progress bar advances smoothly but only reaches 100% when everything is loaded
    // The bar can simulate smooth movement, but never goes to 100% until all data is ready
    useEffect(() => {
        // Only start minimum time after loading screen is shown
        if (showLoading && !minLoadingTimeElapsed) {
            const minTime = 1000; // 1 second minimum for loading screen
            const timer = setTimeout(() => {
                setMinLoadingTimeElapsed(true);
            }, minTime);

            // Safety timeout: force completion after 8 seconds maximum
            const safetyTimer = setTimeout(() => {
                console.warn('⚠️ [LAYOUT] Timeout de seguridad alcanzado (8s), forzando continuación...');
                setLoadingProgress(100);
                setInitialDataLoaded(true);
                setMinLoadingTimeElapsed(true);
                setIsReady(true);
                if (!hasRedirectedRef.current) {
                    hasRedirectedRef.current = true;
                    if (user) {
                        router.replace('/(tabs)');
                    } else {
                        router.replace('/');
                    }
                    setTimeout(() => {
                        setNavigationReady(true);
                        setTimeout(() => {
                            setShowLoading(false);
                        }, 150);
                    }, 300);
                } else if (!navigationReady) {
                    setNavigationReady(true);
                    setTimeout(() => {
                        setShowLoading(false);
                    }, 150);
                }
            }, 8000); // 8 seconds maximum

            return () => {
                clearTimeout(timer);
                clearTimeout(safetyTimer);
            };
        }
    }, [showLoading, user, router]);

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
        if (!fontsLoaded || isLoading || !user) {
            return;
        }

        // Prevent loading data more than once (React Strict Mode causes double mount)
        if (hasLoadedDataRef.current) {
            return;
        }
        hasLoadedDataRef.current = true;

        let isMounted = true;

        const loadInitialData = async () => {
            try {
                // Start progress - Progress bar advances smoothly based on real data loading
                if (isMounted) {
                    maxProgressReachedRef.current = Math.max(maxProgressReachedRef.current, 10);
                    setLoadingProgress(maxProgressReachedRef.current);
                }

                // Load user profile (with timeout to prevent blocking)
                try {
                    const profilePromise = firestoreService.getUserProfile(user.uid);
                    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000)); // 3 second max
                    await Promise.race([profilePromise, timeoutPromise]);
                    if (isMounted) setLoadingProgress(40);
                } catch (profileError) {
                    if (isMounted) setLoadingProgress(40);
                }

                // Sync offline data (with timeout to prevent blocking)
                try {
                    const syncPromise = offlineService.syncPendingProgress();
                    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second max
                    await Promise.race([syncPromise, timeoutPromise]);
                    if (isMounted) setLoadingProgress(60);
                } catch (syncError) {
                    if (isMounted) setLoadingProgress(60);
                }

                // Load daily habits (with timeout to prevent blocking)
                try {
                    const habitsPromise = initializeDailyHabits();
                    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000)); // 3 second max
                    await Promise.race([habitsPromise, timeoutPromise]);
                    if (isMounted) setLoadingProgress(80);
                } catch (habitsError) {
                    if (isMounted) setLoadingProgress(80);
                }

                // Initialize notifications if enabled
                try {
                    const notificationsEnabled = await AsyncStorage.getItem('notifications_enabled');
                    if (notificationsEnabled === 'true') {
                        const hasPermission = await notificationService.getNotificationPermissions();
                        if (hasPermission) {
                            await notificationService.scheduleDailyReminder(9, 0);
                        } else {
                            // Permission lost, disable notifications
                            await AsyncStorage.setItem('notifications_enabled', 'false');
                        }
                    }
                } catch (notifError) {
                    // Silently fail
                }

                // Complete loading - bar reaches 100% only when everything is ready
                if (isMounted) {
                    setLoadingProgress(100);
                    setTimeout(() => {
                        if (isMounted) {
                            setInitialDataLoaded(true);
                        }
                    }, 300);
                }
            } catch (error) {
                console.error('Error cargando datos iniciales:', error);
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

    // If user is not authenticated, wait for fonts and show loading progress
    useEffect(() => {
        if (!fontsLoaded || isLoading) return;
        if (user) return; // If user exists, wait for initial data
        if (!showLoading) return; // Only advance progress when loading screen is shown

        // No user - show progress and complete loading
        setTimeout(() => {
            setLoadingProgress(50);
            setTimeout(() => {
                setLoadingProgress(100);
                setTimeout(() => {
                    setInitialDataLoaded(true);
                }, 200);
            }, 300);
        }, 300);
    }, [fontsLoaded, isLoading, user, showLoading]);

    // Step 1: Show static splash (logo only) for fixed time, then transition to loading screen
    // Splash should show for 1.5-2 seconds before showing loading screen with progress bar
    useEffect(() => {
        if (!hasShownLoadingRef.current) {
            // Keep splash visible for fixed time (1.5 seconds)
            const splashTimer = setTimeout(() => {
                // Hide native splash
                SplashScreen.hideAsync().catch(() => {
                    // Ignore errors
                });
                // Show loading screen with progress bar (Step 2)
                setShowSplash(false);
                setShowLoading(true);
                hasShownLoadingRef.current = true;
            }, 1500); // 1.5 seconds for static splash

            return () => clearTimeout(splashTimer);
        }
    }, []);

    // Wait for everything to be ready before redirecting
    // Redirect FIRST, then hide loading screen AFTER navigation is complete
    useEffect(() => {
        // Only redirect once
        if (hasRedirectedRef.current) {
            return;
        }

        // Simplified condition: check if basic requirements are met
        const basicReady = fontsLoaded && !isLoading && minLoadingTimeElapsed;
        const dataReady = loadingProgress >= 100 && initialDataLoaded;

        // Step 3: Only proceed when bar reaches 100% and everything is ready
        const canProceed = basicReady && dataReady;

        if (canProceed && !hasRedirectedRef.current) {

            // Verify progress is exactly at 100% before proceeding (Step 3 requirement)
            if (loadingProgress < 100 || !initialDataLoaded) {
                return; // Don't proceed if not at 100%
            }

            // Determine initial route IMMEDIATELY
            const currentUser = authService.getCurrentUser();
            const finalUser = user || currentUser;
            const targetRoute = (finalUser && finalUser.uid) ? '/(tabs)' : '/';

            // Store route and mark as redirected - BUT don't mark as completed yet
            setInitialRoute(targetRoute);
            setIsReady(true);
            hasRedirectedRef.current = true;

            // Navigate IMMEDIATELY - do this synchronously if possible
            // The loading screen will stay visible until navigation is complete
            try {
                router.replace(targetRoute as any);
            } catch (navError) {
                console.error('Error en navegación:', navError);
                setInitialRoute('/');
                router.replace('/');
            }

            // Wait for navigation to settle completely BEFORE marking as ready
            // This ensures the correct screen is fully rendered before loading disappears
            setTimeout(() => {
                // Additional wait to ensure target screen is fully rendered
                setTimeout(() => {
                    setNavigationReady(true);
                    
                    // NOW mark as completed and hide loading - after navigation is fully done
                    setTimeout(() => {
                        hasCompletedLoadingRef.current = true;
                        
                        setTimeout(() => {
                            setShowLoading(false);
                        }, 500);
                    }, 800); // Wait for screen to fully render
                }, 600);
            }, 300);
        }
    }, [fontsLoaded, isLoading, loadingProgress, initialDataLoaded, minLoadingTimeElapsed, user, router]);

    // CRITICAL: Always render Stack (Expo Router requires it), but cover it with loading screen
    // until navigation is complete. This prevents flash of welcome screen.
    // The loading screen covers everything until we've navigated to the correct route.
    
    return (
        <>
            {/* Always render Stack so router exists, but hide it completely until navigation is ready */}
            <View style={{ 
                flex: 1, 
                backgroundColor: COLORS.background,
                opacity: shouldShowLoading ? 0 : 1, // Hide Stack completely while loading
                pointerEvents: shouldShowLoading ? 'none' : 'auto', // Disable interaction while loading
            }}>
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

            {/* Loading screen covers Stack until navigation is complete - prevents flash */}
            {/* CRITICAL: Keep loading visible until navigation is fully ready */}
            {shouldShowLoading && (
                <View 
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 99999, // Very high z-index to ensure it's on top
                        backgroundColor: COLORS.background, // Ensure it covers everything completely
                        elevation: 9999, // For Android
                    }}
                    pointerEvents="auto" // Block all pointer events to prevent interaction with Stack below
                >
                    <LoadingScreen progress={loadingProgress} />
                </View>
            )}
        </>
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
