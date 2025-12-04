import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

/**
 * Custom Splash Screen Component
 * 
 * Displays a full-screen splash image immediately when the app starts.
 * This replaces the native splash screen which may appear too small.
 */
export const CustomSplashScreen: React.FC = () => {
    return (
        <View style={styles.container}>
            <Image
                source={require('../../assets/splash.png')}
                style={styles.image}
                resizeMode="cover"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#F9F7F2',
    },
    image: {
        width: '100%',
        height: '100%',
    },
});


