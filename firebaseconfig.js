// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDdB5vk84nBHVbaiF2Ngvs1527tP8gpI40",
  authDomain: "lasertag-fb97e.firebaseapp.com",
  projectId: "lasertag-fb97e",
  storageBucket: "lasertag-fb97e.firebasestorage.app",
  messagingSenderId: "739801970136",
  appId: "1:739801970136:web:50a21b98168bdb44feeead",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
export const db = getFirestore(app);
export const database = getDatabase(app);
