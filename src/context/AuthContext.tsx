import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { cleanFirestorePayload } from '../lib/sanitizer';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  profile: UserProfile | null;
  role: UserRole;
  isDemoUser: boolean;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (
    email: string,
    pass: string,
    displayName: string,
    role: UserRole,
    tradingPointName?: string,
    phone?: string
  ) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  quickDemoLogin: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  setSimulatedRole?: (role: UserRole | null) => void;
  activeRole: UserRole;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_BOOTSTRAP_EMAIL = 'covali.andrei.box@gmail.com';
const LOCAL_STORAGE_DEMO_KEY = 'panpan_demo_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(null);

  // Restore demo session from localStorage if present
  useEffect(() => {
    const savedDemo = localStorage.getItem(LOCAL_STORAGE_DEMO_KEY);
    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo) as UserProfile;
        setProfile(parsed);
        setIsDemoUser(true);
      } catch (e) {
        localStorage.removeItem(LOCAL_STORAGE_DEMO_KEY);
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setIsDemoUser(false);
        localStorage.removeItem(LOCAL_STORAGE_DEMO_KEY);

        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);

          const isBootstrapAdmin = user.email?.toLowerCase() === ADMIN_BOOTSTRAP_EMAIL.toLowerCase();
          const userRole: UserRole = isBootstrapAdmin ? 'admin' : 'pending';

          if (isBootstrapAdmin) {
            try {
              await setDoc(doc(db, 'admins', user.uid), {
                email: user.email,
                role: 'admin',
              }, { merge: true });
            } catch (e) {
              console.warn('Could not ensure admin doc:', e);
            }
          }

          if (userSnap.exists()) {
            const data = userSnap.data() as UserProfile;
            const finalRole: UserRole = isBootstrapAdmin ? 'admin' : (data.role || 'pending');
            setProfile({
              id: user.uid,
              email: user.email || data.email || '',
              displayName: data.displayName || user.displayName || 'Utilizator',
              role: finalRole,
              tradingPointName: data.tradingPointName || (finalRole === 'client' ? 'Punct Vânzare' : ''),
              phone: data.phone || '',
            });
          } else {
            // New user without Firestore doc yet (e.g. Google Sign-In) -> create profile with 'pending' role
            const newProfile: Record<string, any> = {
              id: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'Utilizator Nou',
              role: userRole,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };



            await setDoc(userRef, cleanFirestorePayload(newProfile));
            setProfile({
              id: user.uid,
              email: user.email || '',
              displayName: newProfile.displayName,
              role: userRole,
              tradingPointName: newProfile.tradingPointName || '',
              phone: '',
            });
          }
        } catch (error) {
          console.error('Error fetching/creating user profile:', error);
          setProfile({
            id: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Utilizator',
            role: user.email?.toLowerCase() === ADMIN_BOOTSTRAP_EMAIL.toLowerCase() ? 'admin' : 'pending',
          });
        }
      } else {
        setCurrentUser(null);
        // If not in demo session, clear profile
        const savedDemo = localStorage.getItem(LOCAL_STORAGE_DEMO_KEY);
        if (!savedDemo) {
          setProfile(null);
          setIsDemoUser(false);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: any) {
      // Check if user has an admin-assigned password in Firestore
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email.trim()));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const userDoc = snap.docs[0];
          const userData = userDoc.data() as UserProfile;
          if (userData.tempPassword && userData.tempPassword === pass) {
            const resolvedProfile: UserProfile = {
              ...userData,
              id: userDoc.id,
            };
            setProfile(resolvedProfile);
            setIsDemoUser(true);
            localStorage.setItem(LOCAL_STORAGE_DEMO_KEY, JSON.stringify(resolvedProfile));
            return;
          }
        }
      } catch (dbErr) {
        console.warn('Fallback login check failed:', dbErr);
      }

      if (err?.code === 'auth/operation-not-allowed') {
        throw new Error(
          'Autentificarea cu Email/Parolă nu este încă activată în consola Firebase (Authentication > Sign-in method > Email/Password). Vă rugăm să folosiți butonul "Conectare cu Google".'
        );
      }
      throw err;
    }
  };

  const registerWithEmail = async (
    email: string,
    pass: string,
    displayName: string,
    role: UserRole,
    tradingPointName?: string,
    phone?: string
  ) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const uid = cred.user.uid;
      const isBootstrapAdmin = email.trim().toLowerCase() === ADMIN_BOOTSTRAP_EMAIL.toLowerCase();
      const finalRole: UserRole = isBootstrapAdmin ? 'admin' : role;

      const profilePayload: Record<string, any> = {
        id: uid,
        email: email.trim(),
        displayName: displayName.trim(),
        role: finalRole,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (finalRole === 'client') {
        profilePayload.tradingPointName = tradingPointName?.trim() || displayName.trim();
      }
      if (phone?.trim()) {
        profilePayload.phone = phone.trim();
      }

      await setDoc(doc(db, 'users', uid), cleanFirestorePayload(profilePayload));

      if (finalRole === 'admin') {
        try {
          await setDoc(doc(db, 'admins', uid), { email: email.trim(), role: 'admin' });
        } catch (err) {
          console.warn('Could not register in admins collection:', err);
        }
      }

      setProfile({
        id: uid,
        email: email.trim(),
        displayName: displayName.trim(),
        role: finalRole,
        tradingPointName: profilePayload.tradingPointName || '',
        phone: profilePayload.phone || '',
      });
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed') {
        throw new Error(
          'Înregistrarea cu Email/Parolă nu este încă activată în consola Firebase (Authentication > Sign-in method > Email/Password). Vă rugăm să folosiți butonul "Conectare cu Google".'
        );
      }
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  // Quick demo login that works reliably even if email/password provider is not enabled in Firebase
  const quickDemoLogin = async (targetRole: UserRole) => {
    const demoProfiles: Record<string, UserProfile> = {
      client: {
        id: 'demo-client-botanica',
        email: 'magazin.centru@panpan.md',
        displayName: 'Elena - Magazin Botanica',
        role: 'client',
        tradingPointName: 'Magazin Botanica',
        phone: '061 030 063',
      },
      production: {
        id: 'demo-prod-seftura',
        email: 'productie.brutarie@panpan.md',
        displayName: 'Mihai - Șef Tură Producție',
        role: 'production',
        phone: '061 030 063',
      },
      admin: {
        id: 'demo-admin-covali',
        email: ADMIN_BOOTSTRAP_EMAIL,
        displayName: 'Andrei Covali (Manager Brutărie)',
        role: 'admin',
        phone: '061 030 063',
      },
    };

    const targetProfile = demoProfiles[targetRole];
    if (!targetProfile) return;

    // Try real Firebase auth first in case user enabled it
    try {
      await signInWithEmailAndPassword(auth, targetProfile.email, 'PanPanDemo2026!');
    } catch (firebaseErr: any) {
      // If disabled in console or not found, activate seamless local demo mode!
      console.info('Activare mod demonstrativ instant:', targetProfile.displayName);
      setProfile(targetProfile);
      setIsDemoUser(true);
      localStorage.setItem(LOCAL_STORAGE_DEMO_KEY, JSON.stringify(targetProfile));
    }
  };

  const logout = async () => {
    setSimulatedRole(null);
    setIsDemoUser(false);
    localStorage.removeItem(LOCAL_STORAGE_DEMO_KEY);
    await signOut(auth);
    setProfile(null);
    setCurrentUser(null);
  };

  // Effective role: if manager/admin wants to view interface as Client or Production
  const effectiveRole: UserRole = (profile?.role === 'admin' && simulatedRole) ? simulatedRole : (profile?.role || 'client');

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        role: profile?.role || 'client',
        activeRole: effectiveRole,
        isDemoUser,
        loading,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        quickDemoLogin,
        logout,
        setSimulatedRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
