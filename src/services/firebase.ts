import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
  Firestore
} from 'firebase/firestore';
import { ChecklistItem, HomeLocation, DepartureEvent } from '../types';

const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
  oAuthClientId: import.meta.env.VITE_FIREBASE_OAUTH_CLIENT_ID || '',
  recaptchaSiteKey: import.meta.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY || '',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '',
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: Must use firebaseConfig.firestoreDatabaseId
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Operation types for standardized error logging
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears offline:', error.message);
    }
    return false;
  }
}

// Authentication Helpers
export async function ensureUserDoc(user: FirebaseUser): Promise<void> {
  if (!user || !auth.currentUser || auth.currentUser.uid !== user.uid) {
    return;
  }
  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const existingUser = await getDoc(userRef);
    if (!existingUser.exists()) {
      await setDoc(userRef, {
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'User',
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (e) {
    console.warn('ensureUserDoc notice:', e);
  }
}

export async function loginWithGoogle(): Promise<FirebaseUser> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    await user.getIdToken();

    // Sync user profile to Firestore
    await ensureUserDoc(user);

    return user;
  } catch (error: any) {
    console.error('Google Sign In failed:', error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  await fbSignOut(auth);
}

// Subscribe to auth state changes
export function subscribeToAuth(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

// Firestore Sync Helpers
export async function syncChecklistItemsToCloud(userId: string, items: ChecklistItem[]): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    console.warn(`syncChecklistItemsToCloud skipped: not authenticated as ${userId}`);
    return;
  }

  try {
    await auth.currentUser.getIdToken();
  } catch {
    return;
  }

  for (const item of items) {
    const path = `users/${userId}/items/${item.id}`;
    try {
      const itemRef = doc(db, 'users', userId, 'items', item.id);
      
      let docExists = false;
      try {
        const snap = await getDoc(itemRef);
        docExists = snap.exists();
      } catch {
        docExists = false;
      }

      const payload: Record<string, any> = {
        id: item.id,
        userId,
        object: item.object,
        category: item.category,
        room: item.room,
        recommended_state: item.recommended_state,
        reason: item.reason || '',
        confidence: item.confidence ?? 0.9,
        importance: item.importance || 'HIGH',
        verification_method: item.verification_method || 'CAMERA_AI',
        enabled: item.enabled !== false,
        isManuallyChecked: Boolean(item.isManuallyChecked),
        updatedAt: serverTimestamp(),
      };

      if (!docExists) {
        payload.createdAt = serverTimestamp();
      }

      if (item.lastVerified) {
        payload.lastVerified = {
          object: item.lastVerified.object,
          detected_state: item.lastVerified.detected_state,
          expected_state: item.lastVerified.expected_state,
          verified: item.lastVerified.verified,
          confidence: item.lastVerified.confidence,
          message: item.lastVerified.message,
          timestamp: item.lastVerified.timestamp || Date.now(),
        };
      }

      await setDoc(itemRef, payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

export async function fetchChecklistItemsFromCloud(userId: string): Promise<ChecklistItem[]> {
  const path = `users/${userId}/items`;
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    console.warn(`fetchChecklistItemsFromCloud skipped: not authenticated as ${userId}`);
    return [];
  }

  try {
    await auth.currentUser.getIdToken();
    const itemsCollection = collection(db, 'users', userId, 'items');
    const snapshot = await getDocs(itemsCollection);
    const items: ChecklistItem[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      items.push({
        id: data.id,
        object: data.object,
        category: data.category,
        room: data.room,
        recommended_state: data.recommended_state,
        reason: data.reason || '',
        confidence: data.confidence || 0.9,
        importance: data.importance,
        verification_method: data.verification_method,
        enabled: data.enabled,
        isManuallyChecked: data.isManuallyChecked,
        lastVerified: data.lastVerified,
        beforeState: data.beforeState,
        afterState: data.afterState,
        history: data.history,
        officeKitSynced: data.officeKitSynced,
      });
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveHomeLocationToCloud(userId: string, location: HomeLocation): Promise<void> {
  const path = `users/${userId}`;
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    console.warn(`saveHomeLocationToCloud skipped: not authenticated as ${userId}`);
    return;
  }

  try {
    await auth.currentUser.getIdToken();
    const userRef = doc(db, 'users', userId);
    let docExists = false;
    try {
      const snap = await getDoc(userRef);
      docExists = snap.exists();
    } catch {
      docExists = false;
    }

    const payload: Record<string, any> = {
      homeLocation: {
        latitude: location.latitude,
        longitude: location.longitude,
        radiusMeters: location.radiusMeters,
        label: location.label || 'Home',
        address: location.address || '',
        updatedAt: location.updatedAt || Date.now(),
      },
      updatedAt: serverTimestamp(),
    };

    if (!docExists) {
      payload.id = userId;
      payload.email = auth.currentUser?.email || '';
      payload.displayName = auth.currentUser?.displayName || 'User';
      payload.photoURL = auth.currentUser?.photoURL || '';
      payload.createdAt = serverTimestamp();
    }

    await setDoc(userRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fetchHomeLocationFromCloud(userId: string): Promise<HomeLocation | null> {
  const path = `users/${userId}`;
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    console.warn(`fetchHomeLocationFromCloud skipped: not authenticated as ${userId}`);
    return null;
  }

  try {
    await auth.currentUser.getIdToken();
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists() && snap.data().homeLocation) {
      return snap.data().homeLocation as HomeLocation;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveDepartureEventToCloud(userId: string, event: DepartureEvent): Promise<void> {
  const path = `users/${userId}/departureEvents/${event.id}`;
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    console.warn(`saveDepartureEventToCloud skipped: not authenticated as ${userId}`);
    return;
  }

  try {
    await auth.currentUser.getIdToken();
    const eventRef = doc(db, 'users', userId, 'departureEvents', event.id);
    await setDoc(eventRef, {
      id: event.id,
      userId,
      timestamp: event.timestamp,
      distanceMeters: event.distanceMeters,
      unverifiedItemsCount: event.unverifiedItemsCount,
      totalItemsCount: event.totalItemsCount,
      isSimulated: Boolean(event.isSimulated),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
