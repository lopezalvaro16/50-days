import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SPACING, SIZES } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';
import { BookOpen, Save } from 'lucide-react-native';
import { firestoreService } from '../services/firestoreService';
import { authService } from '../services/authService';

export const DailyNotes: React.FC = () => {
    const { colors } = useThemeStore();
    const [note, setNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        loadTodayNote();
    }, []);

    const loadTodayNote = async () => {
        try {
            const user = authService.getCurrentUser();
            if (!user) return;

            const today = new Date().toISOString().split('T')[0];
            const progress = await firestoreService.getDailyProgress(user.uid, today);
            
            if (progress) {
                const noteData = progress['daily_note'] as string;
                if (noteData) {
                    setNote(noteData);
                }
            }
        } catch (error) {
            console.log('Error loading note:', error);
        }
    };

    const saveNote = async () => {
        try {
            const user = authService.getCurrentUser();
            if (!user) return;

            setIsSaving(true);
            const today = new Date().toISOString().split('T')[0];
            const progress: Record<string, boolean | number | string> = await firestoreService.getDailyProgress(user.uid, today) || {};
            
            progress['daily_note'] = note;

            await firestoreService.saveDailyProgress(user.uid, today, progress);
            
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.log('Error saving note:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                    <BookOpen size={20} color={colors.primary} />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>Notas del Día</Text>
            </View>

            <TextInput
                style={[
                    styles.input,
                    {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.surfaceHighlight,
                    }
                ]}
                placeholder="Escribí tus reflexiones del día..."
                placeholderTextColor={colors.textSecondary}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
            />

            <TouchableOpacity
                style={[
                    styles.saveButton,
                    {
                        backgroundColor: saved ? colors.success : colors.primary,
                        borderColor: saved ? colors.success : colors.primary,
                    }
                ]}
                onPress={saveNote}
                disabled={isSaving}
            >
                <Save size={18} color={colors.background} />
                <Text style={[styles.saveButtonText, { color: colors.background }]}>
                    {saved ? 'Guardado' : 'Guardar Nota'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: SPACING.l,
        borderRadius: SIZES.borderRadius,
        borderWidth: 2,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        marginBottom: SPACING.l,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.s,
    },
    title: {
        fontSize: 20,
        fontFamily: 'PatrickHand-Regular',
    },
    input: {
        minHeight: 100,
        padding: SPACING.m,
        borderRadius: SIZES.borderRadius,
        borderWidth: 2,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
        marginBottom: SPACING.m,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.m,
        borderRadius: SIZES.borderRadius,
        borderWidth: 2,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        gap: SPACING.xs,
    },
    saveButtonText: {
        fontSize: 16,
        fontFamily: 'PatrickHand-Regular',
    },
});

