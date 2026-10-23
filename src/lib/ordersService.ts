import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Order } from '../types';
import { cleanFirestorePayload } from './sanitizer';

const LOCAL_STORAGE_ORDERS_KEY = 'panpan_local_orders';

// Clean any legacy demo orders or sessions from local storage
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
    if (raw) {
      const parsed: Order[] = JSON.parse(raw);
      const cleaned = parsed.filter((o) => !o.id.startsWith('demo-'));
      localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(cleaned));
    }
    localStorage.removeItem('panpan_demo_user');
  } catch {
    // Ignore storage errors
  }
}

// No demo orders - working strictly with real data
const DEFAULT_DEMO_ORDERS: Order[] = [];

export function getLocalOrders(): Order[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
    if (!raw) {
      return [];
    }
    const parsed: Order[] = JSON.parse(raw);
    return parsed.filter((o) => !o.id.startsWith('demo-')).map((o) => ({
      ...o,
      clientEmail: o.clientEmail ? o.clientEmail.replace(/panpan\.ro/g, 'panpan.md') : o.clientEmail,
    }));
  } catch {
    return [];
  }
}

export function saveLocalOrders(orders: Order[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error('Error saving local orders:', e);
  }
}

export async function createOrder(
  orderPayload: Omit<Order, 'id'>,
  _isDemoMode?: boolean
): Promise<string> {
  const cleanPayload = cleanFirestorePayload(orderPayload);

  // Always attempt to save to Firestore so all users (client, production, admin) see it in real-time
  try {
    const docRef = await addDoc(collection(db, 'orders'), cleanPayload);
    return docRef.id;
  } catch (err) {
    console.warn('Firestore addDoc failed, storing locally:', err);
  }

  // Fallback to local storage
  const localOrders = getLocalOrders();
  const newId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newOrder: Order = {
    ...(cleanPayload as Omit<Order, 'id'>),
    id: newId,
  };
  saveLocalOrders([newOrder, ...localOrders]);
  return newId;
}

export async function updateOrder(
  orderId: string,
  updates: Partial<Order>,
  _isDemoMode?: boolean
): Promise<void> {
  const cleanUpdates = cleanFirestorePayload({
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  if (!orderId.startsWith('ord-') && !orderId.startsWith('demo-')) {
    try {
      await updateDoc(doc(db, 'orders', orderId), cleanUpdates);
      return;
    } catch (err: any) {
      console.error('Firestore updateDoc failed:', err);
      throw new Error('Eroare salvare comandă în baza de date: ' + (err?.message || 'Eroare necunoscută'));
    }
  }

  const localOrders = getLocalOrders();
  const index = localOrders.findIndex((o) => o.id === orderId);
  if (index >= 0) {
    localOrders[index] = {
      ...localOrders[index],
      ...cleanUpdates,
      updatedAt: new Date().toISOString(),
    };
    saveLocalOrders(localOrders);
  }
}

export async function deleteOrder(
  orderId: string,
  _isDemoMode?: boolean
): Promise<void> {
  if (!orderId.startsWith('ord-') && !orderId.startsWith('demo-')) {
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      return;
    } catch (err) {
      console.warn('Firestore deleteDoc failed, deleting locally:', err);
    }
  }

  const localOrders = getLocalOrders();
  saveLocalOrders(localOrders.filter((o) => o.id !== orderId));
}
