import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING } from '../constants/theme';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ArrowLeft } from 'lucide-react-native';
import { authService } from '../services/authService';
import { firestoreService } from '../services/firestoreService';

export default function LoginScreen() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAuth = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Por favor completá todos los campos');
            return;
        }

        setIsLoading(true);
        try {
            if (isLogin) {
                await authService.signIn(email, password);
            } else {
                const user = await authService.signUp(email, password);
                await firestoreService.createUserProfile(user.uid, user.email || '');
            }

            router.replace('/(tabs)');
        } catch (error: any) {
            console.error(error);
            let msg = 'Ocurrió un error inesperado';
            if (error.code === 'auth/invalid-email') msg = 'Email inválido';
            if (error.code === 'auth/user-not-found') msg = 'Usuario no encontrado';
            if (error.code === 'auth/wrong-password') msg = 'Contraseña incorrecta';
            if (error.code === 'auth/email-already-in-use') msg = 'El email ya está registrado';

            Alert.alert('Error', msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <ArrowLeft
                        color={COLORS.text}
                        size={24}
                        onPress={() => router.back()}
                        style={styles.backIcon}
                    />
                    <Text style={styles.title}>{isLogin ? 'Bienvenido' : 'Unite al Reto'}</Text>
                    <Text style={styles.subtitle}>
                        {isLogin
                            ? 'Continuá tu camino hacia la grandeza.'
                            : 'Tu transformación de 50 días empieza acá.'}
                    </Text>
                </View>

                <View style={styles.form}>
                    <Input
                        label="Email"
                        placeholder="tu@email.com"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <Input
                        label="Contraseña"
                        placeholder="••••••••"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <View style={styles.spacer} />

                    <Button
                        title={isLogin ? "INGRESAR" : "CREAR CUENTA"}
                        onPress={handleAuth}
                        isLoading={isLoading}
                    />

                    <View style={styles.toggleContainer}>
                        <Text style={styles.toggleText}>
                            {isLogin ? "¿No tenés cuenta? " : "¿Ya tenés cuenta? "}
                        </Text>
                        <Text
                            style={styles.toggleAction}
                            onPress={() => setIsLogin(!isLogin)}
                        >
                            {isLogin ? "Registrate" : "Ingresá"}
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        flexGrow: 1,
        padding: SPACING.l,
    },
    header: {
        marginTop: SPACING.xl,
        marginBottom: SPACING.xxl,
    },
    backIcon: {
        marginBottom: SPACING.l,
    },
    title: {
        fontSize: 32,
        fontFamily: 'PatrickHand-Regular',
        color: COLORS.text,
        marginBottom: SPACING.s,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
        color: COLORS.textSecondary,
    },
    form: {
        flex: 1,
    },
    spacer: {
        height: SPACING.xl,
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: SPACING.xl,
    },
    toggleText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        fontFamily: 'PatrickHand-Regular',
    },
    toggleAction: {
        color: COLORS.primary,
        fontSize: 14,
        fontFamily: 'PatrickHand-Regular',
    },
});
