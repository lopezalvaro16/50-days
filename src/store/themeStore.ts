import { create } from 'zustand';
import { PALETTE } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeState {
    isDarkMode: boolean;
    colors: typeof PALETTE.doodle;
    toggleTheme: () => void;
    setTheme: (isDark: boolean) => void;
    initializeTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
    isDarkMode: false, // Default to doodle (light)
    colors: PALETTE.doodle,

    toggleTheme: async () => {
        const newMode = !get().isDarkMode;
        // Toggle between Doodle (Light) and Dark Premium
        set({
            isDarkMode: newMode,
            colors: newMode ? PALETTE.dark : PALETTE.doodle
        });
        await AsyncStorage.setItem('theme_preference', newMode ? 'dark' : 'light');
    },

    setTheme: async (isDark: boolean) => {
        set({
            isDarkMode: isDark,
            colors: isDark ? PALETTE.dark : PALETTE.doodle
        });
        await AsyncStorage.setItem('theme_preference', isDark ? 'dark' : 'light');
    },

    initializeTheme: async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('theme_preference');
            if (savedTheme) {
                const isDark = savedTheme === 'dark';
                set({
                    isDarkMode: isDark,
                    colors: isDark ? PALETTE.dark : PALETTE.doodle
                });
            }
        } catch (error) {
            console.log('Error loading theme preference:', error);
        }
    }
}));
