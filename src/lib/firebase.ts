import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Self-contained Firebase configuration for Pan Pan Comenzi (Firestore & Auth)
// Guarantees zero-failure production builds even if external JSON config is omitted in git
export const firebaseConfig = {
  projectId: "gen-lang-client-0405620372",
  appId: "1:858792457111:web:1bd72bce49739e90548ad2",
  apiKey: "AIzaSyBVLSab5qIzpMSuCUQIJJocNSMuUPidpkk",
  authDomain: "gen-lang-client-0405620372.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-panpancomenzi-c77d0f45-9751-4233-adea-b159378d6d5e",
  storageBucket: "gen-lang-client-0405620372.firebasestorage.app",
  messagingSenderId: "858792457111",
  measurementId: "",
  oAuthClientId: "858792457111-kr2lg5m34qmbgqrpndkcvd127nmojfds.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

/* CRITICAL: The app will break without this line */
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Test Firestore connection on boot as mandated by skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Verificați conexiunea Firebase:', error.message);
    }
  }
}
testConnection();
