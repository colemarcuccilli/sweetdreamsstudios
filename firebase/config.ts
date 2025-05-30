// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAGUnz9rIwkV0HthatTHcBiig_Cpy2-oBA",
  authDomain: "sweetdreamsstudios-78e71.firebaseapp.com",
  databaseURL: "https://sweetdreamsstudios-78e71-default-rtdb.firebaseio.com",
  projectId: "sweetdreamsstudios-78e71",
  storageBucket: "sweetdreamsstudios-78e71.firebasestorage.app", // Corrected storageBucket name
  messagingSenderId: "127545845390",
  appId: "1:127545845390:web:91692af878b28155970bdf",
  measurementId: "G-G8QD7BQY3L"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);
let analytics;

if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { app, auth, firestore, storage, analytics, firebaseConfig }; 