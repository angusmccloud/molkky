import { initializeApp } from 'firebase/app';
import { getFirestore } from "firebase/firestore";
import { initializeAuth } from 'firebase/auth';
// @ts-ignore - getReactNativePersistence exists but may have incomplete TypeScript definitions
import { getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import firebaseConfig from '@/constants/firebaseConfig';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

// Initialize Firestore
export const db = getFirestore(app);
