'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useRouter } from '../i18n/navigation';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch user role from Firestore
        const userRef = doc(db, 'users', user.uid);
        const snapshot = await getDoc(userRef);
        const userData = snapshot.exists() ? snapshot.data() : {};
        setUser({ ...user, ...userData });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signup = async (email, password, fullName) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: fullName });

    // Securely sync user to Firestore via API
    const firestoreData = await createUserDocument(result.user, 'password', fullName);

    // Update local state immediately with the full profile
    if (firestoreData) {
      setUser((prev) => ({ ...prev, ...result.user, ...firestoreData }));
    }

    return result;
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    setUser(null);
    await signOut(auth);
    router.push('/');
  };

  const googleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    // Securely sync user to Firestore via API
    const firestoreData = await createUserDocument(result.user, 'google', result.user.displayName);

    // Update local state immediately
    if (firestoreData) {
      setUser((prev) => ({ ...prev, ...result.user, ...firestoreData }));
    }

    // We no longer need the manual getDoc here as the API returns fresh data
    return result;
  };

  const facebookSignIn = async () => {
    const provider = new FacebookAuthProvider();
    const result = await signInWithPopup(auth, provider);

    // Securely sync user to Firestore via API
    const firestoreData = await createUserDocument(result.user, 'facebook', result.user.displayName);

    // Update local state immediately
    if (firestoreData) {
      setUser((prev) => ({ ...prev, ...result.user, ...firestoreData }));
    }

    return result;
  };

  // Modified to use secure API instead of direct client-side write
  const createUserDocument = async (user, provider, fullName) => {
    if (!user) return null;

    try {
      const response = await fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: fullName || user.displayName,
          photoURL: user.photoURL,
          provider: provider,
        }),
      });

      const data = await response.json();
      if (data.success) {
        return data.user;
      }
    } catch (error) {
      console.error('Error syncing user document:', error);
    }
    return null;
  };

  const updateUserData = async (newData) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userRef, newData);
      setUser((prev) => ({ ...prev, ...newData }));
    } catch (error) {
      console.error('Error updating user data', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, signup, login, logout, googleSignIn, facebookSignIn, loading, updateUserData }}
    >
      {children}
    </AuthContext.Provider>
  );
};
