// import * as Notifications from 'expo-notifications';
// import * as Device from 'expo-device';
// import { Platform } from 'react-native';

// Notifications.setNotificationHandler({
//     handleNotification: async () => ({
//         shouldShowAlert: true,
//         shouldPlaySound: true,
//         shouldSetBadge: false,
//     }),
// });

export const notificationService = {
    registerForPushNotificationsAsync: async () => {
        console.log('Notifications disabled in Expo Go');
        return null;
        // let token;

        // if (Platform.OS === 'android') {
        //     await Notifications.setNotificationChannelAsync('default', {
        //         name: 'default',
        //         importance: Notifications.AndroidImportance.MAX,
        //         vibrationPattern: [0, 250, 250, 250],
        //         lightColor: '#FF231F7C',
        //     });
        // }

        // if (Device.isDevice) {
        //     const { status: existingStatus } = await Notifications.getPermissionsAsync();
        //     let finalStatus = existingStatus;
        //     if (existingStatus !== 'granted') {
        //         const { status } = await Notifications.requestPermissionsAsync();
        //         finalStatus = status;
        //     }
        //     if (finalStatus !== 'granted') {
        //         // alert('Failed to get push token for push notification!');
        //         return;
        //     }
        //     // token = (await Notifications.getExpoPushTokenAsync()).data;
        // } else {
        //     // alert('Must use physical device for Push Notifications');
        // }

        // return token;
    },

    scheduleDailyReminder: async (hour: number = 9, minute: number = 0) => {
        console.log('Notifications disabled in Expo Go');
        // await Notifications.cancelAllScheduledNotificationsAsync();

        // const trigger: Notifications.NotificationTriggerInput = {
        //     type: Notifications.SchedulableTriggerInputTypes.DAILY,
        //     hour: hour,
        //     minute: minute,
        // };

        // await Notifications.scheduleNotificationAsync({
        //     content: {
        //         title: "¡No rompas la racha! 🔥",
        //         body: "Recordá completar tus hábitos de hoy para mantener tu progreso.",
        //         sound: true,
        //     },
        //     trigger,
        // });
    },

    cancelAllNotifications: async () => {
        console.log('Notifications disabled in Expo Go');
        // await Notifications.cancelAllScheduledNotificationsAsync();
    },
};
