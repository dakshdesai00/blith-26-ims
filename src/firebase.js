
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDOruy8VRPiHv2q9jlT8AngLicPy991gvw",
  authDomain: "blith-26-ims.firebaseapp.com",
  projectId: "blith-26-ims",
  storageBucket: "blith-26-ims.firebasestorage.app",
  messagingSenderId: "416331704681",
  appId: "1:416331704681:web:afde0fde5df7a98313b5f8",
  measurementId: "G-0TT1125GZ6"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);