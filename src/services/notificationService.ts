import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Check if running in Expo Go (notifications don't work in Expo Go SDK 53+)
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Only set notification handler if not in Expo Go
if (!isExpoGo) {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

export const notificationService = {
    registerForPushNotificationsAsync: async () => {
        // Notifications don't work in Expo Go (SDK 53+)
        if (isExpoGo) {
            return null;
        }

        let token;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                return null;
            }
            try {
                token = (await Notifications.getExpoPushTokenAsync()).data;
            } catch (error) {
                return null;
            }
        } else {
            return null;
        }

        return token;
    },

    scheduleDailyReminder: async (hour: number = 9, minute: number = 0) => {
        // Notifications don't work in Expo Go (SDK 53+)
        if (isExpoGo) {
            return;
        }

        try {
            // Cancel existing notifications first
            await Notifications.cancelAllScheduledNotificationsAsync();

            const trigger: Notifications.NotificationTriggerInput = {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: hour,
                minute: minute,
            };

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "¡No rompas la racha! 🔥",
                    body: "Recordá completar tus hábitos de hoy para mantener tu progreso.",
                    sound: true,
                },
                trigger,
            });
        } catch (error) {
            // Silently fail
        }
    },

    cancelAllNotifications: async () => {
        // Notifications don't work in Expo Go (SDK 53+)
        if (isExpoGo) {
            return;
        }

        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
        } catch (error) {
            // Silently fail
        }
    },

    getNotificationPermissions: async () => {
        // Notifications don't work in Expo Go (SDK 53+)
        if (isExpoGo) {
            return false;
        }

        try {
            const { status } = await Notifications.getPermissionsAsync();
            return status === 'granted';
        } catch (error) {
            return false;
        }
    },
};
