import React from 'react';
import { View, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { Home, BarChart2, Settings, User, ArrowUp } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
    const { colors } = useThemeStore();
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    height: 65 + insets.bottom,
                    paddingBottom: Math.max(insets.bottom, 10),
                    paddingTop: 10,
                    borderTopWidth: 2,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textSecondary,
                tabBarLabelStyle: {
                    fontSize: 14,
                    fontFamily: 'PatrickHand-Regular',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Hoy',
                    tabBarIcon: ({ color, size }) => (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <Home color={color} size={size} />
                            <View style={{ position: 'absolute', top: -2, right: -2 }}>
                                <ArrowUp color={color} size={10} strokeWidth={3} />
                            </View>
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="stats"
                options={{
                    title: 'Progreso',
                    tabBarIcon: ({ color, size }) => <BarChart2 color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Ajustes',
                    tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'profile',
                    tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
                }}
            />
        </Tabs>
    );
}
