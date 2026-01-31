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
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
    await createUserDocument(result.user, 'password', fullName);
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
    await createUserDocument(result.user, 'google', result.user.displayName);
    return result;
  };

  const facebookSignIn = async () => {
    const provider = new FacebookAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await createUserDocument(result.user, 'facebook', result.user.displayName);
    return result;
  };

  const createUserDocument = async (user, provider, fullName) => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      const userObj = {
        provider: provider,
        role: 'customer',
        email: user.email,
        firstShop: true,
        fullName: fullName || user.displayName || '',
        photoURL: user.photoURL || '',
        uid: user.uid,
        createdAt: serverTimestamp(),
      };

      try {
        await setDoc(userRef, userObj);
      } catch (error) {
        console.error('Error creating user document', error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, signup, login, logout, googleSignIn, facebookSignIn, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
