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
    clientEmail: 'magazin.centru@panpan.ro',
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
        pickedQuantity: 25,
        itemTotal: 237.5,
      },
      {
        productId: 'init-BG-03',
        productName: 'Baghetă franțuzească tradițională',
        productCode: 'BG-03',
        unit: 'buc',
        unitPrice: 5.0,
        orderedQuantity: 15,
        pickedQuantity: 15,
        itemTotal: 75.0,
      },
      {
        productId: 'init-CZ-06',
        productName: 'Cozonac moldovenesc tradițional cu nucă și cacao',
        productCode: 'CZ-06',
        unit: 'kg',
        unitPrice: 65.0,
        orderedQuantity: 4.5,
        pickedQuantity: 4.5,
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
    clientEmail: 'magazin.centru@panpan.ro',
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
        pickedQuantity: 20,
        itemTotal: 130.0,
      },
      {
        productId: 'init-PL-07',
        productName: 'Plăcintă dobrogeană cu brânză de vaci și telemea',
        productCode: 'PL-07',
        unit: 'kg',
        unitPrice: 42.0,
        orderedQuantity: 3.0,
        pickedQuantity: 3.0,
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
    return JSON.parse(raw);
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

/**
 * Automatically syncs any offline/locally-created orders to Firestore
 * so Admin and Production will see them immediately.
 */
export async function syncLocalOrdersToFirestore(): Promise<number> {
  const currentUid = auth.currentUser?.uid;
  const currentEmail = auth.currentUser?.email || '';
  const localOrders = getLocalOrders();

  // Find local orders created with temporary 'ord-' IDs
  const pendingOrders = localOrders.filter(
    (o) => o.id && o.id.startsWith('ord-')
  );

  if (pendingOrders.length === 0) return 0;

  let syncedCount = 0;
  const remainingOrders = [...localOrders];

  for (const ord of pendingOrders) {
    try {
      const { id, ...dataToSync } = ord;
      const cleanData = cleanFirestorePayload({
        ...dataToSync,
        clientId: currentUid || ord.clientId || 'client-local',
        clientEmail: currentEmail || ord.clientEmail || '',
      });

      const docRef = await addDoc(collection(db, 'orders'), cleanData);
      const idx = remainingOrders.findIndex((o) => o.id === ord.id);
      if (idx >= 0) {
        remainingOrders[idx] = { ...remainingOrders[idx], id: docRef.id };
      }
      syncedCount++;
    } catch (e) {
      console.warn('Could not sync pending order to Firestore:', ord.orderNumber, e);
    }
  }

  if (syncedCount > 0) {
    saveLocalOrders(remainingOrders);
    console.info(`S-au sincronizat cu succes ${syncedCount} comenzi în baza de date Firestore.`);
  }

  return syncedCount;
}

export async function createOrder(
  orderPayload: Omit<Order, 'id'>,
  isDemoMode: boolean
): Promise<string> {
  const cleanPayload = cleanFirestorePayload(orderPayload);

  // If real user is authenticated, create directly in Firestore
  if (auth.currentUser && !isDemoMode) {
    try {
      const docRef = await addDoc(collection(db, 'orders'), cleanPayload);
      const localOrders = getLocalOrders();
      saveLocalOrders([
        { ...(cleanPayload as Omit<Order, 'id'>), id: docRef.id },
        ...localOrders.filter((o) => o.orderNumber !== orderPayload.orderNumber),
      ]);
      return docRef.id;
    } catch (err) {
      console.error('Firestore addDoc error, saving locally as backup:', err);
    }
  }

  // Also try Firestore even if in demo mode if possible
  try {
    const docRef = await addDoc(collection(db, 'orders'), cleanPayload);
    const localOrders = getLocalOrders();
    saveLocalOrders([
      { ...(cleanPayload as Omit<Order, 'id'>), id: docRef.id },
      ...localOrders.filter((o) => o.orderNumber !== orderPayload.orderNumber),
    ]);
    return docRef.id;
  } catch {
    // Fallback to local storage if totally offline or permission denied
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
  isDemoMode: boolean
): Promise<void> {
  const cleanUpdates = cleanFirestorePayload(updates);

  if (!orderId.startsWith('ord-') && !orderId.startsWith('demo-')) {
    try {
      await updateDoc(doc(db, 'orders', orderId), cleanUpdates);
    } catch (err) {
      console.warn('Firestore updateDoc failed, updating locally:', err);
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
  isDemoMode: boolean
): Promise<void> {
  if (!orderId.startsWith('ord-') && !orderId.startsWith('demo-')) {
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (err) {
      console.warn('Firestore deleteDoc failed, deleting locally:', err);
    }
  }

  const localOrders = getLocalOrders();
  saveLocalOrders(localOrders.filter((o) => o.id !== orderId));
}
