import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, limit, Timestamp, onSnapshot } from 'firebase/firestore';

// Configuration Firebase (même que dans firebase.js)
const firebaseConfig = {
  apiKey: "AIzaSyB6Foh29YS-VQLMhw-gO83L_OSVullVvI8",
  authDomain: "mayombe-ba11b.firebaseapp.com",
  databaseURL: "https://mayombe-ba11b-default-rtdb.firebaseio.com",
  projectId: "mayombe-ba11b",
  storageBucket: "mayombe-ba11b.firebasestorage.app",
  messagingSenderId: "784517096614",
  appId: "1:784517096614:android:41b02898b40426e23fc067"
};

// Initialiser Firebase App (réutiliser si déjà initialisé)
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialiser Firestore
export const db = getFirestore(app);

// Exporter les fonctions Firestore nécessaires
export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot
};
