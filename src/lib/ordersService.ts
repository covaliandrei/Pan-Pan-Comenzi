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

// Seed some initial demo orders so production and client have data immediately when testing
const DEFAULT_DEMO_ORDERS: Order[] = [
  {
    id: 'demo-ord-101',
    orderNumber: 'CMD-20261018-742',
    clientId: 'demo-client-unirii',
    clientName: 'Magazin Central Unirii',
    clientEmail: 'magazin.centru@panpan.md',
    orderDate: '2026-10-17',
    deliveryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    state: 'confirmat',
    items: [
      {
        productId: 'init-PA-01',
        productName: 'Pâine albă artizanală cu maia',
        productCode: 'PA-01',
        unit: 'buc',
        unitPrice: 9.5,
        orderedQuantity: 25,
        pickedQuantity: 0,
        itemTotal: 237.5,
      },
      {
        productId: 'init-BG-03',
        productName: 'Baghetă franțuzească tradițională',
        productCode: 'BG-03',
        unit: 'buc',
        unitPrice: 5.0,
        orderedQuantity: 15,
        pickedQuantity: 0,
        itemTotal: 75.0,
      },
      {
        productId: 'init-CZ-06',
        productName: 'Cozonac moldovenesc tradițional cu nucă și cacao',
        productCode: 'CZ-06',
        unit: 'kg',
        unitPrice: 65.0,
        orderedQuantity: 4.5,
        pickedQuantity: 0,
        itemTotal: 292.5,
      },
    ],
    totalAmount: 605.0,
    notes: 'Vă rugăm livrare dimineață până la ora 07:00. Pâinea cu maia nefeliată.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-ord-102',
    orderNumber: 'CMD-20261018-815',
    clientId: 'demo-client-unirii',
    clientName: 'Magazin Central Unirii',
    clientEmail: 'magazin.centru@panpan.md',
    orderDate: '2026-10-17',
    deliveryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    state: 'creat',
    items: [
      {
        productId: 'init-CR-09',
        productName: 'Croissant franțuzesc cu unt 82%',
        productCode: 'CR-09',
        unit: 'buc',
        unitPrice: 6.5,
        orderedQuantity: 20,
        pickedQuantity: 0,
        itemTotal: 130.0,
      },
      {
        productId: 'init-PL-07',
        productName: 'Plăcintă dobrogeană cu brânză de vaci și telemea',
        productCode: 'PL-07',
        unit: 'kg',
        unitPrice: 42.0,
        orderedQuantity: 3.0,
        pickedQuantity: 0,
        itemTotal: 126.0,
      },
    ],
    totalAmount: 256.0,
    notes: 'Comandă adițională de patiserie proaspătă.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function getLocalOrders(): Order[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(DEFAULT_DEMO_ORDERS));
      return DEFAULT_DEMO_ORDERS;
    }
    const parsed: Order[] = JSON.parse(raw);
    return parsed.map((o) => ({
      ...o,
      clientEmail: o.clientEmail ? o.clientEmail.replace(/panpan\.ro/g, 'panpan.md') : o.clientEmail,
    }));
  } catch {
    return DEFAULT_DEMO_ORDERS;
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
