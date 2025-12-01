import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/theme';
import { View } from 'react-native';
import { useEffect } from 'react';
import { useFonts, PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand';
import * as SplashScreen from 'expo-splash-screen';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {
    /* reloading the app might trigger some race conditions, ignore them */
});

export default function RootLayout() {
    const [fontsLoaded, error] = useFonts({
        'PatrickHand-Regular': PatrickHand_400Regular,
    });

    useEffect(() => {
        if (error) throw error;
    }, [error]);

    useEffect(() => {
        if (fontsLoaded) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return null;
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
