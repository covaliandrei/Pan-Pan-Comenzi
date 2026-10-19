import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, UserRole } from '../types';
import { cleanFirestorePayload } from './sanitizer';

/**
 * Creates a new user in Firebase Auth and Firestore using a secondary app instance
 * so that the currently authenticated admin/manager session is NEVER signed out or interrupted.
 */
export async function createNewUserByAdmin(data: {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  tradingPointName?: string;
  phone?: string;
}): Promise<string> {
  const secondaryAppName = 'PanPanSecondaryAdminApp';
  const secondaryApp = getApps().find((a) => a.name === secondaryAppName) || initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  let newUid = '';

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, data.email.trim(), data.password);
    newUid = cred.user.uid;
  } catch (authErr: any) {
    if (authErr?.code === 'auth/email-already-in-use') {
      throw new Error('Această adresă de email este deja înregistrată în sistem.');
    } else if (authErr?.code === 'auth/weak-password') {
      throw new Error('Parola trebuie să conțină minim 6 caractere.');
    } else if (authErr?.code === 'auth/invalid-email') {
      throw new Error('Adresa de email introdusă este invalidă.');
    } else if (authErr?.code === 'auth/operation-not-allowed') {
      throw new Error(
        'Metoda Email/Parolă nu este activată în Firebase Authentication. Vă rugăm să o activați din consola Firebase.'
      );
    }
    throw authErr;
  } finally {
    try {
      await signOut(secondaryAuth);
    } catch {
      // ignore
    }
  }

  const profileData: Record<string, any> = {
    id: newUid,
    email: data.email.trim(),
    displayName: data.displayName.trim(),
    role: data.role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (data.role === 'client') {
    profileData.tradingPointName = data.tradingPointName?.trim() || data.displayName.trim();
  }
  if (data.phone?.trim()) {
    profileData.phone = data.phone.trim();
  }

  await setDoc(doc(db, 'users', newUid), cleanFirestorePayload(profileData));

  if (data.role === 'admin') {
    try {
      await setDoc(doc(db, 'admins', newUid), { email: data.email.trim(), role: 'admin' }, { merge: true });
    } catch (e) {
      console.warn('Could not write admin doc:', e);
    }
  }

  return newUid;
}

export async function updateUserProfile(
  userId: string,
  data: Partial<UserProfile>
): Promise<void> {
  const cleanData = cleanFirestorePayload({
    ...data,
    updatedAt: new Date().toISOString(),
  });

  await updateDoc(doc(db, 'users', userId), cleanData);

  if (data.role) {
    if (data.role === 'admin') {
      try {
        await setDoc(doc(db, 'admins', userId), { email: data.email || '', role: 'admin' }, { merge: true });
      } catch (e) {
        console.warn('Could not ensure admin role in admins collection:', e);
      }
    } else {
      try {
        await deleteDoc(doc(db, 'admins', userId));
      } catch {
        // ignore if wasn't admin
      }
    }
  }
}

export async function deleteUserAccount(userId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId));
  try {
    await deleteDoc(doc(db, 'admins', userId));
  } catch {
    // ignore
  }
}
