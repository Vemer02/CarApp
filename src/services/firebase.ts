import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import crashlytics from '@react-native-firebase/crashlytics';
import messaging from '@react-native-firebase/messaging';

// @react-native-firebase инициализируется автоматически из android/app/google-services.json —
// отдельный вызов initializeApp() не нужен.

export const authService = auth();
export const db = firestore();
export const crashlyticsService = crashlytics();
export const messagingService = messaging();

export async function requestNotificationPermission(): Promise<boolean> {
  const authStatus = await messagingService.requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

export async function signUp(email: string, password: string) {
  const cred = await authService.createUserWithEmailAndPassword(email, password);
  await db.collection('users').doc(cred.user.uid).set({
    email,
    createdAt: firestore.FieldValue.serverTimestamp(),
    biometricEnabled: false,
  });
  return cred.user;
}

export async function signIn(email: string, password: string) {
  const cred = await authService.signInWithEmailAndPassword(email, password);
  return cred.user;
}

export async function signOut() {
  await authService.signOut();
}

// Пока нет полноценной модели гаражей с участниками — используем uid владельца
// как garageId (см. обсуждение архитектуры). Централизуем это здесь, чтобы
// при появлении реальных гаражей поменять в одном месте.
export function getGarageId(): string | null {
  return authService.currentUser?.uid ?? null;
}
