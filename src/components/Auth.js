// src/components/Auth.js
import { signInWithPopup } from "firebase/auth";
import { auth, provider, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export async function signIn() {
  try {
    const result = await signInWithPopup(auth, provider);
    const email = result.user.email;

    // Check domain restriction
    if (!email.endsWith("@iitgn.ac.in")) {
      alert("Only @iitgn.ac.in emails allowed!");
      await auth.signOut();
      return null;
    }

    // Check if user is in allowlist
    const allowDoc = await getDoc(doc(db, "allow-users", result.user.uid));
    if (!allowDoc.exists()) {
      alert("You are not authorized!");
      await auth.signOut();
      return null;
    }

    return result.user;
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}
