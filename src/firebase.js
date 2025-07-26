import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAEsuwv5d80ahGBhG7bZJcUsbSM2MCBRXk",
  authDomain: "zero2agent-ffe2e.firebaseapp.com",
  projectId: "zero2agent-ffe2e",
  storageBucket: "zero2agent-ffe2e.firebasestorage.app",
  messagingSenderId: "984214687483",
  appId: "1:984214687483:web:a11ce408f3d82c11916a5e",
  measurementId: "G-SB6MT18TPE"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
