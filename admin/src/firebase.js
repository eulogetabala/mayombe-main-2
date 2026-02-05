import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

// Configuration Firebase (même que dans l'app mobile)
const firebaseConfig = {
  apiKey: "AIzaSyB6Foh29YS-VQLMhw-gO83L_OSVullVvI8",
  authDomain: "mayombe-ba11b.firebaseapp.com",
  databaseURL: "https://mayombe-ba11b-default-rtdb.firebaseio.com",
  projectId: "mayombe-ba11b",
  storageBucket: "mayombe-ba11b.firebasestorage.app",
  messagingSenderId: "784517096614",
  appId: "1:784517096614:android:41b02898b40426e23fc067"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

export default app;
