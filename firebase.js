// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';

import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyD6hYp1DKDufV4YwMF0HVyOubfTe2u5ERw',
  authDomain: 'glowy-shop.firebaseapp.com',
  projectId: 'glowy-shop',
  storageBucket: 'glowy-shop.firebasestorage.app',
  messagingSenderId: '491488023389',
  appId: '1:491488023389:web:41aecbe56484632d5b0eb4',
  measurementId: 'G-R6WL1H0T28',
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
