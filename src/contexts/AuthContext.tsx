import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';

const ADMIN_EMAIL = 'chaitanyasatyareddy@gmail.com';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  signingIn: boolean;
  authError: string | null;
  userRole: 'user' | 'admin';
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function sanitizeDisplayName(user: User): string {
  const candidate = user.displayName?.trim() || user.email?.split('@')[0] || 'AgentFlow User';
  return candidate.slice(0, 120);
}

function sanitizePhotoUrl(url: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  return trimmed.startsWith('https://') && trimmed.length <= 500 ? trimmed : '';
}

async function syncUserProfileToFirestore(user: User): Promise<'user' | 'admin'> {
  const isDefaultAdmin = (user.email || '').toLowerCase() === ADMIN_EMAIL && user.emailVerified;
  const userDocPath = `users/${user.uid}`;
  const privateDocPath = `users/${user.uid}/private/info`;
  const userRef = doc(db, 'users', user.uid);
  const privateRef = doc(db, 'users', user.uid, 'private', 'info');

  let existingSnap;
  try {
    existingSnap = await getDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, userDocPath);
  }

  let resolvedRole: 'user' | 'admin' = isDefaultAdmin ? 'admin' : 'user';
  const displayName = sanitizeDisplayName(user);
  const photoURL = sanitizePhotoUrl(user.photoURL);

  if (!existingSnap.exists()) {
    try {
      await setDoc(userRef, {
        uid: user.uid,
        displayName,
        photoURL,
        role: resolvedRole,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, userDocPath);
    }
  } else {
    const existingData = existingSnap.data() as { role?: 'user' | 'admin' };
    if (existingData?.role === 'admin' || isDefaultAdmin) {
      resolvedRole = 'admin';
    } else {
      resolvedRole = 'user';
    }
    try {
      await updateDoc(userRef, {
        displayName,
        photoURL,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, userDocPath);
    }
  }

  const email = (user.email || '').trim().slice(0, 254);
  if (email) {
    let privateSnap;
    try {
      privateSnap = await getDoc(privateRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, privateDocPath);
    }

    if (!privateSnap.exists()) {
      try {
        await setDoc(privateRef, {
          uid: user.uid,
          email,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, privateDocPath);
      }
    } else {
      try {
        await updateDoc(privateRef, {
          email,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, privateDocPath);
      }
    }
  }

  return resolvedRole;
}

function mapFirebaseAuthError(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: string }).code)
      : '';

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Sign-in popup was closed before completing login. Please try again.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Your browser blocked the sign-in popup. Please allow popups for this site and try again.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'This domain is not authorized for Google Sign-In yet. Add it in Firebase Console → Authentication → Settings → Authorized domains.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error while contacting authentication servers. Please check your connection and retry.';
  }
  return err instanceof Error ? err.message : 'Unable to sign in right now. Please try again.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'admin'>('user');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          const role = await syncUserProfileToFirestore(nextUser);
          setUserRole(role);
        } catch (err) {
          console.error('Failed to sync profile:', err);
        }
      } else {
        setUserRole('user');
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    setAuthError(null);
    setSigningIn(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (!result.user.emailVerified) {
        await signOut(auth);
        setAuthError('A verified email account is required to access AgentFlow AI.');
        return false;
      }
      return true;
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
      return false;
    } finally {
      setSigningIn(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        signingIn,
        authError,
        userRole,
        clearAuthError,
        signInWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
