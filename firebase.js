// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC8M-QyrKSDFMGcnNvuXhldYwk2nXI30XI",
  authDomain: "pantry-tracker-9e38f.firebaseapp.com",
  projectId: "pantry-tracker-9e38f",
  storageBucket: "pantry-tracker-9e38f.appspot.com",
  messagingSenderId: "538775621007",
  appId: "1:538775621007:web:00a40e81d915a6ab2b8ffa",
  measurementId: "G-8PB800KDCQ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

export { firestore };
