//firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCZmPUAgJ_kFrwqEPDbBVkdElZDnbPujac",
  authDomain: "bookly-85be9.firebaseapp.com",
  projectId: "bookly-85be9",
  storageBucket: "bookly-85be9.firebasestorage.app",
  messagingSenderId: "1043047021423",
  appId: "1:1043047021423:web:66e1dbec35a4df001fc69a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;