import { doc, setDoc, getDoc, updateDoc, collection, Timestamp, getDocs, query, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getArgentinaDateString, parseArgentinaDate } from '../utils/dateUtils';

export interface UserProfile {
    uid: string;
    email: string;
    displayName?: string;
    startDate: Date;
    currentStreak: number;
    longestStreak: number;
    totalDaysCompleted: number;
    lastCompletedDate?: Date;
    badges: string[];
}

export const firestoreService = {
    createUserProfile: async (uid: string, email: string, displayName?: string, customStartDate?: Date) => {
        console.log('🆕 [FIRESTORE] createUserProfile - Iniciando creación para uid:', uid);
        console.log('  - email:', email);
        console.log('  - displayName:', displayName);
        console.log('  - customStartDate:', customStartDate || '(no especificada, usará hoy)');
        
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            console.log('✨ [FIRESTORE] Creando nuevo perfil de usuario...');
            
            // Usar customStartDate si se proporciona, sino usar hoy
            let normalizedStartDate: Date;
            if (customStartDate) {
                const startDateStr = getArgentinaDateString(customStartDate);
                console.log('  - Usando fecha personalizada (string):', startDateStr);
                normalizedStartDate = parseArgentinaDate(startDateStr);
                console.log('  - startDate personalizado normalizado:', normalizedStartDate);
                console.log('  - startDate ISO string:', normalizedStartDate.toISOString());
            } else {
                // Normalize startDate to Argentina date (midnight of today in Argentina timezone)
                const todayStr = getArgentinaDateString();
                console.log('  - Fecha Argentina de hoy (string):', todayStr);
                normalizedStartDate = parseArgentinaDate(todayStr);
                console.log('  - startDate normalizado (hoy):', normalizedStartDate);
                console.log('  - startDate ISO string:', normalizedStartDate.toISOString());
            }
            
            const newProfile: UserProfile = {
                uid,
                email,
                displayName: displayName || email.split('@')[0],
                startDate: normalizedStartDate,
                currentStreak: 0,
                longestStreak: 0,
                totalDaysCompleted: 0,
                badges: [],
            };
            
            console.log('📝 [FIRESTORE] Perfil a guardar:');
            console.log('  - uid:', newProfile.uid);
            console.log('  - email:', newProfile.email);
            console.log('  - displayName:', newProfile.displayName);
            console.log('  - startDate:', newProfile.startDate);
            console.log('  - currentStreak:', newProfile.currentStreak);
            console.log('  - longestStreak:', newProfile.longestStreak);
            console.log('  - totalDaysCompleted:', newProfile.totalDaysCompleted);
            
            await setDoc(userRef, newProfile);
            console.log('✅ [FIRESTORE] Perfil creado exitosamente en Firebase');
        } else {
            console.log('ℹ️ [FIRESTORE] El perfil ya existe, verificando startDate...');
            // Ensure existing profile has a valid startDate
            const data = userSnap.data();
            console.log('  - startDate actual en Firebase:', data.startDate);
            
            if (!data.startDate) {
                console.log('⚠️ [FIRESTORE] startDate faltante en perfil existente, agregando...');
                const todayStr = getArgentinaDateString();
                const normalizedStartDate = parseArgentinaDate(todayStr);
                console.log('  - Nuevo startDate normalizado:', normalizedStartDate);
                
                await updateDoc(userRef, {
                    startDate: Timestamp.fromDate(normalizedStartDate),
                });
                console.log('✅ [FIRESTORE] startDate agregado al perfil existente');
            } else {
                console.log('✅ [FIRESTORE] El perfil ya tiene startDate válido');
            }
        }
    },

    updateDisplayName: async (uid: string, displayName: string) => {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, { displayName });
    },

    updateStartDate: async (uid: string, startDate: Date) => {
        console.log('🔄 [FIRESTORE] updateStartDate - Actualizando startDate para uid:', uid);
        console.log('  - Nuevo startDate:', startDate);
        console.log('  - Nuevo startDate ISO:', startDate.toISOString());
        
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
            startDate: Timestamp.fromDate(startDate),
        });
        
        console.log('✅ [FIRESTORE] startDate actualizado exitosamente');
    },

    getUserProfile: async (uid: string): Promise<UserProfile | null> => {
        console.log('🔍 [FIRESTORE] getUserProfile - Iniciando búsqueda para uid:', uid);
        const userRef = doc(db, 'users', uid);
        const snap = await getDoc(userRef);
        
        if (snap.exists()) {
            const data = snap.data();
            console.log('✅ [FIRESTORE] Perfil encontrado. Datos crudos de Firebase:');
            console.log('  - startDate (Timestamp):', data.startDate);
            console.log('  - currentStreak:', data.currentStreak);
            console.log('  - longestStreak:', data.longestStreak);
            console.log('  - totalDaysCompleted:', data.totalDaysCompleted);
            console.log('  - lastCompletedDate (Timestamp):', data.lastCompletedDate);
            console.log('  - displayName:', data.displayName);
            
            // Ensure startDate exists and is valid, if not, set it to today
            let startDate = data.startDate?.toDate();
            console.log('  - startDate convertido a Date:', startDate);
            
            if (!startDate || isNaN(startDate.getTime())) {
                console.log('⚠️ [FIRESTORE] startDate inválido o faltante, creando nuevo...');
                const todayStr = getArgentinaDateString();
                console.log('  - Fecha Argentina de hoy (string):', todayStr);
                startDate = parseArgentinaDate(todayStr);
                console.log('  - startDate normalizado creado:', startDate);
                
                // Update the profile with valid startDate
                await updateDoc(userRef, {
                    startDate: Timestamp.fromDate(startDate),
                });
                console.log('✅ [FIRESTORE] startDate actualizado en Firebase');
            }
            
            const lastCompletedDate = data.lastCompletedDate?.toDate();
            console.log('  - lastCompletedDate convertido a Date:', lastCompletedDate);
            
            const profile: UserProfile = {
                ...data,
                startDate,
                lastCompletedDate,
            } as UserProfile;
            
            console.log('📦 [FIRESTORE] Perfil final retornado:');
            console.log('  - startDate:', profile.startDate);
            console.log('  - currentStreak:', profile.currentStreak);
            console.log('  - longestStreak:', profile.longestStreak);
            console.log('  - totalDaysCompleted:', profile.totalDaysCompleted);
            console.log('  - lastCompletedDate:', profile.lastCompletedDate);
            
            return profile;
        } else {
            console.log('❌ [FIRESTORE] No se encontró perfil para uid:', uid);
            console.log('⚠️ [FIRESTORE] El perfil no existe. Se debería crear automáticamente.');
        }
        return null;
    },

    saveDailyProgress: async (uid: string, date: string, habits: Record<string, boolean | number | string>) => {
        // Correct path for subcollection: users/{uid}/dailyProgress/{date}
        const progressRef = doc(db, 'users', uid, 'dailyProgress', date);
        await setDoc(progressRef, {
            date,
            habits,
            updatedAt: Timestamp.now(),
        }, { merge: true });
    },

    getDailyProgress: async (uid: string, date: string): Promise<Record<string, boolean | number | string> | null> => {
        // Correct path for subcollection: users/{uid}/dailyProgress/{date}
        const progressRef = doc(db, 'users', uid, 'dailyProgress', date);
        const snap = await getDoc(progressRef);
        if (snap.exists()) {
            const data = snap.data();
            console.log('📅 [FIRESTORE] getDailyProgress - Progreso encontrado para fecha:', date);
            console.log('  - Documento completo:', data);
            console.log('  - Hábitos:', data.habits);
            return data.habits || null;
        } else {
            console.log('📅 [FIRESTORE] getDailyProgress - No hay progreso para fecha:', date);
        }
        return null;
    },

    updateStreak: async (uid: string, newStreak: number, lastCompletedDate: Date, incrementDaysCompleted: boolean = true) => {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const currentData = userSnap.data();
            const longestStreak = Math.max(currentData.longestStreak || 0, newStreak);

            const updateData: any = {
                currentStreak: newStreak,
                longestStreak,
                lastCompletedDate,
            };

            // Only increment totalDaysCompleted if this is a new completion
            if (incrementDaysCompleted) {
                updateData.totalDaysCompleted = (currentData.totalDaysCompleted || 0) + 1;
            }

            await updateDoc(userRef, updateData);
        }
    },

    unlockBadge: async (uid: string, badgeId: string) => {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const currentBadges = userSnap.data().badges || [];
            if (!currentBadges.includes(badgeId)) {
                await updateDoc(userRef, {
                    badges: [...currentBadges, badgeId],
                });
            }
        }
    },

    // Función completa para obtener TODOS los datos del usuario
    getAllUserData: async (uid: string) => {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 [FIRESTORE] getAllUserData - Obteniendo TODOS los datos del usuario');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('👤 User UID:', uid);
        console.log('');

        const allData: any = {
            profile: null,
            dailyProgress: [],
            totalDailyProgressDocs: 0,
            firstProgressDate: null, // Primera fecha de progreso para usar como startDate si no existe perfil
        };

        // 1. Obtener perfil completo del usuario
        console.log('📋 [FIRESTORE] 1. Obteniendo perfil del usuario...');
        console.log('───────────────────────────────────────────────────────────');
        try {
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const profileData = userSnap.data();
                console.log('✅ Perfil encontrado en: users/' + uid);
                console.log('');
                console.log('📄 Datos completos del perfil (raw de Firebase):');
                console.log('  ┌─────────────────────────────────────────────────────┐');
                console.log('  │ PERFIL DEL USUARIO                                 │');
                console.log('  └─────────────────────────────────────────────────────┘');
                console.log('  - uid:', profileData.uid);
                console.log('  - email:', profileData.email);
                console.log('  - displayName:', profileData.displayName || '(no definido)');
                console.log('  - startDate (Timestamp):', profileData.startDate);
                console.log('  - startDate tipo:', typeof profileData.startDate);
                if (profileData.startDate) {
                    console.log('  - startDate.toDate():', profileData.startDate.toDate());
                    console.log('  - startDate ISO:', profileData.startDate.toDate().toISOString());
                }
                console.log('  - currentStreak:', profileData.currentStreak);
                console.log('  - longestStreak:', profileData.longestStreak);
                console.log('  - totalDaysCompleted:', profileData.totalDaysCompleted);
                console.log('  - lastCompletedDate (Timestamp):', profileData.lastCompletedDate);
                if (profileData.lastCompletedDate) {
                    console.log('  - lastCompletedDate.toDate():', profileData.lastCompletedDate.toDate());
                    console.log('  - lastCompletedDate ISO:', profileData.lastCompletedDate.toDate().toISOString());
                }
                console.log('  - badges:', profileData.badges || []);
                console.log('  - badges cantidad:', (profileData.badges || []).length);
                
                // Mostrar TODOS los campos, incluso los que no están en la interfaz
                console.log('');
                console.log('  🔍 Todos los campos presentes en el documento:');
                Object.keys(profileData).forEach(key => {
                    console.log(`    • ${key}:`, profileData[key], `(${typeof profileData[key]})`);
                });
                
                allData.profile = profileData;
            } else {
                console.log('❌ No se encontró perfil para el usuario');
                console.log('⚠️ ACCIÓN REQUERIDA: El perfil del usuario no existe en Firebase');
                console.log('   Esto puede causar problemas con el cálculo de días y estadísticas');
                console.log('   Se debería crear el perfil automáticamente si el usuario está autenticado');
            }
        } catch (error) {
            console.log('❌ Error obteniendo perfil:', error);
        }
        console.log('');

        // 2. Obtener TODOS los documentos de dailyProgress
        console.log('📋 [FIRESTORE] 2. Obteniendo TODOS los documentos de progreso diario...');
        console.log('───────────────────────────────────────────────────────────');
        try {
            const dailyProgressRef = collection(db, 'users', uid, 'dailyProgress');
            const dailyProgressSnapshot = await getDocs(query(dailyProgressRef));
            
            console.log('✅ Subcolección dailyProgress encontrada');
            console.log('  - Ruta completa: users/' + uid + '/dailyProgress');
            console.log('  - Total de documentos encontrados:', dailyProgressSnapshot.size);
            console.log('');
            
            if (dailyProgressSnapshot.size > 0) {
                console.log('  ┌─────────────────────────────────────────────────────┐');
                console.log('  │ PROGRESO DIARIO (todos los días)                   │');
                console.log('  └─────────────────────────────────────────────────────┘');
                const progressDocs: any[] = [];
                const validDates: string[] = []; // Para encontrar la primera fecha válida
                
                // Usamos un bucle for...of para poder usar await correctamente
                for (const docSnap of dailyProgressSnapshot.docs) {
                    const docData = docSnap.data();
                    const docId = docSnap.id;
                    
                    console.log('');
                    console.log(`  📅 Documento ID: ${docId}`);
                    console.log('    - Fecha (ID del documento):', docId);
                    console.log('    - updatedAt:', docData.updatedAt ? docData.updatedAt.toDate() : '(no definido)');
                    console.log('    - date:', docData.date || '(no definido)');
                    console.log('    - habits:', docData.habits || {});
                    
                    // Validar que la fecha sea válida
                    const isValidDate = docId.match(/^\d{4}-\d{2}-\d{2}$/);
                    if (!isValidDate || docId === 'NaN-NaN-NaN') {
                        console.log('    ⚠️⚠️⚠️ FECHA INVÁLIDA DETECTADA ⚠️⚠️⚠️');
                        console.log('    - Este documento tiene una fecha inválida y debería eliminarse');
                        console.log('    - Intentando eliminar documento corrupto...');
                        try {
                            const invalidDocRef = doc(db, 'users', uid, 'dailyProgress', docId);
                            await deleteDoc(invalidDocRef);
                            console.log('    ✅ Documento con fecha inválida eliminado exitosamente');
                            // No agregar a progressDocs ni seguir procesando este documento
                            continue;
                        } catch (deleteError) {
                            console.log('    ❌ Error al eliminar documento inválido:', deleteError);
                            // Aún así no agregamos este documento corrupto
                            continue;
                        }
                    }
                
                    // Mostrar detalles de cada hábito
                    if (docData.habits) {
                        console.log('    - Detalles de hábitos:');
                        Object.keys(docData.habits).forEach(habitId => {
                            const habitValue = docData.habits[habitId];
                            console.log(`      • Hábito ${habitId}:`, habitValue, `(${typeof habitValue})`);
                        });
                        
                        // Contar completados
                        const completedCount = Object.values(docData.habits).filter((v: any) => v === true).length;
                        const totalHabits = Object.keys(docData.habits).filter(k => ['1', '2', '3', '4', '5', '6', '7'].includes(k)).length;
                        console.log(`    - Hábitos completados: ${completedCount}/${totalHabits}`);
                    }
                    
                    // Mostrar todos los campos del documento
                    console.log('    - Todos los campos del documento:');
                    Object.keys(docData).forEach(key => {
                        if (key !== 'habits') {
                            console.log(`      • ${key}:`, docData[key]);
                        }
                    });
                    
                    progressDocs.push({
                        id: docId,
                        data: docData,
                    });
                    validDates.push(docId);
                }
                
                allData.dailyProgress = progressDocs;
                allData.totalDailyProgressDocs = progressDocs.length; // Usar el count después de eliminar corruptos
                
                // Encontrar la primera fecha válida (la más antigua)
                if (validDates.length > 0) {
                    const sortedDates = validDates.sort();
                    allData.firstProgressDate = sortedDates[0];
                    console.log('');
                    console.log('  📊 Resumen del progreso diario:');
                    console.log('    - Total de días con progreso:', progressDocs.length);
                    console.log('    - Primer día registrado:', sortedDates[0]);
                    console.log('    - Último día registrado:', sortedDates[sortedDates.length - 1]);
                    console.log('    - ⭐ Primera fecha de progreso (para usar como startDate):', allData.firstProgressDate);
                } else {
                    console.log('');
                    console.log('  📊 Resumen del progreso diario:');
                    console.log('    - Total de días con progreso:', 0);
                }
            } else {
                console.log('  ℹ️ No hay documentos de progreso diario aún');
            }
        } catch (error) {
            console.log('❌ Error obteniendo progreso diario:', error);
        }
        console.log('');

        // 3. Resumen final
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 RESUMEN COMPLETO DE DATOS DEL USUARIO');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  ✅ Perfil:', allData.profile ? 'ENCONTRADO' : 'NO ENCONTRADO');
        console.log('  ✅ Documentos de progreso diario:', allData.totalDailyProgressDocs);
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');

        return allData;
    },
};
