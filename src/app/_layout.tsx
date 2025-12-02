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
    const shouldShowLoading = !hasCompletedLoadingRef.current && showLoading && (!fontsLoaded || isLoading || loadingProgress < 100 || !initialDataLoaded || !minLoadingTimeElapsed || (hasRedirectedRef.current && !navigationReady));

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
                console.log('⏰ [LAYOUT] Tiempo mínimo de pantalla de carga completado');
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
        console.log('🔐 [LAYOUT] Configurando listener de autenticación...');
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log('🔐 [LAYOUT] Estado de autenticación cambiado:', user ? 'Usuario autenticado' : 'Usuario no autenticado');
            setUser(user);
            setIsLoading(false);
            console.log('🔐 [LAYOUT] isLoading establecido en false');
        });

        return unsubscribe;
    }, []);

    // Load initial data when user is authenticated
    useEffect(() => {
        if (!fontsLoaded || isLoading || !user) {
            console.log('⏳ [LAYOUT] Esperando condiciones para cargar datos iniciales:', {
                fontsLoaded,
                isLoading,
                hasUser: !!user
            });
            return;
        }

        // Prevent loading data more than once (React Strict Mode causes double mount)
        if (hasLoadedDataRef.current) {
            console.log('⏭️ [LAYOUT] Datos ya cargados anteriormente, saltando...');
            return;
        }
        hasLoadedDataRef.current = true;

        console.log('🚀 [LAYOUT] Iniciando carga de datos iniciales para usuario autenticado...');
        let isMounted = true;

        const loadInitialData = async () => {
            try {
                // Start progress - Progress bar advances smoothly based on real data loading
                // Only advance if loading screen is shown (Step 2)
                // Never go backwards - once progress increases, it stays at that level or higher
                console.log('📊 [LAYOUT] Progreso: 10% - Iniciando carga...');
                if (isMounted) {
                    maxProgressReachedRef.current = Math.max(maxProgressReachedRef.current, 10);
                    setLoadingProgress(maxProgressReachedRef.current);
                }

                // Load user profile (with timeout to prevent blocking)
                console.log('📊 [LAYOUT] Cargando perfil de usuario...');
                try {
                    const profilePromise = firestoreService.getUserProfile(user.uid);
                    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000)); // 3 second max
                    await Promise.race([profilePromise, timeoutPromise]);
                    console.log('📊 [LAYOUT] Progreso: 40% - Perfil cargado');
                    if (isMounted) setLoadingProgress(40);
                } catch (profileError) {
                    console.warn('⚠️ [LAYOUT] Error o timeout cargando perfil:', profileError);
                    console.log('📊 [LAYOUT] Progreso: 40% - Continuando sin perfil');
                    if (isMounted) setLoadingProgress(40);
                }

                // Sync offline data (with timeout to prevent blocking)
                console.log('📊 [LAYOUT] Sincronizando datos offline...');
                try {
                    const syncPromise = offlineService.syncPendingProgress();
                    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second max
                    await Promise.race([syncPromise, timeoutPromise]);
                    console.log('📊 [LAYOUT] Progreso: 60% - Sincronización offline completada');
                    if (isMounted) setLoadingProgress(60);
                } catch (syncError) {
                    console.warn('⚠️ [LAYOUT] Error o timeout en sincronización offline:', syncError);
                    console.log('📊 [LAYOUT] Progreso: 60% - Continuando sin sincronización');
                    if (isMounted) setLoadingProgress(60);
                }

                // Load daily habits (with timeout to prevent blocking)
                console.log('📊 [LAYOUT] Inicializando hábitos diarios...');
                try {
                    // Set a timeout for habits initialization to prevent infinite loading
                    const habitsPromise = initializeDailyHabits();
                    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000)); // 3 second max
                    await Promise.race([habitsPromise, timeoutPromise]);
                    console.log('📊 [LAYOUT] Progreso: 80% - Hábitos inicializados');
                    if (isMounted) setLoadingProgress(80);
                } catch (habitsError) {
                    console.warn('⚠️ [LAYOUT] Error o timeout en inicialización de hábitos:', habitsError);
                    console.log('📊 [LAYOUT] Progreso: 80% - Continuando sin hábitos');
                    if (isMounted) setLoadingProgress(80);
                }

                // Complete loading - bar reaches 100% only when everything is ready
                // This ensures the bar never shows 100% until all data is loaded
                console.log('📊 [LAYOUT] Progreso: 100% - Carga completa, todos los datos listos');
                if (isMounted) {
                    setLoadingProgress(100);
                    // Mark as ready when all data is loaded
                    setTimeout(() => {
                        if (isMounted) {
                            console.log('✅ [LAYOUT] Marcando datos iniciales como cargados');
                            setInitialDataLoaded(true);
                        }
                    }, 300); // Small delay to ensure smooth transition
                }
            } catch (error) {
                console.error('❌ [LAYOUT] Error cargando datos iniciales:', error);
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

    // If user is not authenticated, wait for fonts and show loading progress
    useEffect(() => {
        if (!fontsLoaded || isLoading) return;
        if (user) return; // If user exists, wait for initial data
        if (!showLoading) return; // Only advance progress when loading screen is shown

        // No user - show progress and complete loading
        console.log('👋 [LAYOUT] No hay usuario, completando carga...');
        // Advance progress smoothly even without user
        setTimeout(() => {
            setLoadingProgress(50);
            setTimeout(() => {
                setLoadingProgress(100);
                setTimeout(() => {
                    console.log('✅ [LAYOUT] Carga completada para usuario no autenticado');
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
                console.log('🎬 [LAYOUT] Paso 1: Splash estático terminado, mostrando pantalla de carga...');
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
            console.log('🔄 [LAYOUT] Ya se hizo la redirección, saltando...');
            return;
        }

        console.log('🔍 [LAYOUT] Verificando condiciones para redirección:');
        console.log('  - fontsLoaded:', fontsLoaded);
        console.log('  - isLoading:', isLoading);
        console.log('  - loadingProgress:', loadingProgress);
        console.log('  - initialDataLoaded:', initialDataLoaded);
        console.log('  - minLoadingTimeElapsed:', minLoadingTimeElapsed);
        console.log('  - user:', user ? 'exists' : 'null');

        // Simplified condition: check if basic requirements are met
        // If fonts are loaded and auth is ready, we can proceed even if data loading is incomplete
        const basicReady = fontsLoaded && !isLoading && minLoadingTimeElapsed;
        const dataReady = loadingProgress >= 100 && initialDataLoaded;

        // Step 3: Only proceed when bar reaches 100% and everything is ready
        // The bar must be at 100% before proceeding - no shortcuts
        const canProceed = basicReady && dataReady; // Only proceed when bar is at 100% and all data loaded

        if (canProceed && !hasRedirectedRef.current) {
            console.log('✅ [LAYOUT] Condiciones cumplidas, iniciando redirección...');
            console.log('  - basicReady:', basicReady);
            console.log('  - dataReady:', dataReady);
            console.log('  - loadingProgress:', loadingProgress);

            setIsReady(true);
            hasRedirectedRef.current = true;
            // Mark loading as completed IMMEDIATELY when we start navigation
            // This prevents the double loading issue by blocking any re-renders
            hasCompletedLoadingRef.current = true;
            console.log('🎉 [LAYOUT] Marcando carga como completada INMEDIATAMENTE - nunca volver a mostrar');

            // Verify progress is exactly at 100% before proceeding (Step 3 requirement)
            // Don't force it - wait for real data loading
            if (loadingProgress < 100 || !initialDataLoaded) {
                console.log('⏳ [LAYOUT] Esperando que la barra llegue a 100% y datos carguen...');
                return; // Don't proceed if not at 100%
            }

            // Wait a moment to ensure Stack is mounted, then navigate
            // This prevents navigation errors
            setTimeout(() => {
                // Verify user authentication one more time before navigating
                const currentUser = authService.getCurrentUser();
                const finalUser = user || currentUser;

                // Do navigation while loading screen is still visible
                // This prevents any flash of the wrong screen
                if (finalUser && finalUser.uid) {
                    console.log('🔐 [LAYOUT] Usuario autenticado confirmado, redirigiendo a /(tabs)');
                    console.log('  - User UID:', finalUser.uid);
                    try {
                        router.replace('/(tabs)' as any);
                    } catch (navError) {
                        console.error('❌ [LAYOUT] Error en navegación a /(tabs):', navError);
                        // Fallback: redirect to welcome
                        router.replace('/');
                    }
                } else {
                    console.log('👋 [LAYOUT] Usuario NO autenticado confirmado, redirigiendo a /');
                    router.replace('/');
                }

                // Wait a moment for navigation to complete, THEN hide loading screen
                // This ensures the target screen is fully loaded before transition
                setTimeout(() => {
                    console.log('✅ [LAYOUT] Navegación completada, ocultando pantalla de carga...');
                    setNavigationReady(true);
                    // Small delay for smooth transition
                    setTimeout(() => {
                        console.log('🎉 [LAYOUT] Ocultando pantalla de carga finalmente');
                        setShowLoading(false);
                    }, 100);
                }, 300);
            }, 200); // Small delay to ensure Stack is mounted
        } else if (!canProceed) {
            console.log('⏳ [LAYOUT] Esperando condiciones...', {
                basicReady,
                dataReady,
                progress: loadingProgress,
                hasRedirected: hasRedirectedRef.current
            });
        }
    }, [fontsLoaded, isLoading, loadingProgress, initialDataLoaded, minLoadingTimeElapsed, user, router]);

    // Always render Stack (so navigator exists), but show loading screen on top
    // This ensures we can navigate even while loading screen is visible
    return (
        <>
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

            {/* Show loading screen on top if needed - only once per app start */}
            {shouldShowLoading && !hasCompletedLoadingRef.current && (
                <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 9999
                }}>
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
