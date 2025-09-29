import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  onAuthStateChanged,
  onIdTokenChanged,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updateProfile,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  setDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs,
  addDoc,
  where,
  Query,
  onSnapshot,
  Timestamp,
  documentId,
  arrayUnion,
  arrayRemove,
  increment,
  runTransaction,
  initializeFirestore,
  persistentLocalCache,
  limit,
  startAfter,
} from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";

// Firebase config (supports multiple env key names)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
  measurementId:process.env.NEXT_PUBLIC_MEASUREMENT_ID,
  databaseURL: process.env.NEXT_PUBLIC_DATABASE_URL,
} as const;



// Initialize Firebase
const app = initializeApp(firebaseConfig as any);

// Firebase services
const auth = getAuth(app);
// Use long polling / local cache to avoid webchannel 400 issues on some networks
const db = getFirestore(app);
try {
  initializeFirestore(app, {
    localCache: persistentLocalCache(),
  });
} catch {}
const storage = getStorage(app);
const functions = getFunctions(app);

// Export everything
export {
  app,
  auth,
  db,
  storage,
  functions,
  updateProfile,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  onAuthStateChanged,
  onIdTokenChanged,
  sendPasswordResetEmail,
  confirmPasswordReset,
  collection,
  setDoc,
  doc,
  increment,
  runTransaction,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs,
  addDoc,
  where,
  Query,
  onSnapshot,
  Timestamp,
  documentId,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  getAuth,
  arrayUnion,
  arrayRemove,
  httpsCallable,
  limit,
  startAfter,
};
