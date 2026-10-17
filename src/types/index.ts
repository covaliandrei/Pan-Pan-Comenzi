export type UserRole = 'client' | 'production' | 'admin';

export type ProductUnit = 'buc' | 'kg';

export type OrderState = 'creat' | 'confirmat' | 'inchis';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  tradingPointName?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  unit: ProductUnit;
  category: string;
  price: number;
  description?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productCode: string;
  unit: ProductUnit;
  unitPrice: number;
  orderedQuantity: number;
  pickedQuantity: number;
  itemTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  orderDate: string; // YYYY-MM-DD
  deliveryDate: string; // YYYY-MM-DD
  state: OrderState;
  items: OrderItem[];
  totalAmount: number;
  notes?: string;
  pickedBy?: string;
  pickedByName?: string;
  pickedAt?: string;
  createdAt: string;
  updatedAt: string;
}
