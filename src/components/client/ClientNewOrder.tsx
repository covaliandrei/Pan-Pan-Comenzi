import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Calendar,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  AlertCircle,
  FileText,
  Wheat,
  Scale,
  Store,
} from 'lucide-react';
import { Product, OrderItem, Order, UserProfile } from '../../types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  getTodayString,
  getTomorrowString,
  INITIAL_PRODUCTS,
  formatDateRomanian,
  DEFAULT_USERS,
  DEFAULT_CATEGORIES,
} from '../../lib/initialData';
import { createOrder } from '../../lib/ordersService';

interface ClientNewOrderProps {
  onOrderCreated: () => void;
}

export const ClientNewOrder: React.FC<ClientNewOrderProps> = ({ onOrderCreated }) => {
  const { currentUser, profile, role } = useAuth();
  const isAdmin = role === 'admin';

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Toate');
  const [deliveryDate, setDeliveryDate] = useState<string>(getTomorrowString());
  const [cartItems, setCartItems] = useState<Record<string, number>>({});
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Client selection for admin
  const [clients, setClients] = useState<UserProfile[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const minDate = getTodayString();

  useEffect(() => {
    if (isAdmin) {
      const fetchClients = async () => {
        try {
          const snap = await getDocs(collection(db, 'users'));
          const list: UserProfile[] = [];
          snap.forEach((d) => {
            const u = { ...d.data(), id: d.id } as UserProfile;
            if (u.role === 'client' || (!u.role && u.tradingPointName)) {
              list.push(u);
            }
          });

          const defaultClients = DEFAULT_USERS.filter((u) => u.role === 'client');
          const mergedMap = new Map<string, UserProfile>();
          defaultClients.forEach((c) => mergedMap.set(c.email, c));
          list.forEach((c) => mergedMap.set(c.email, c));
          const merged = Array.from(mergedMap.values());
          merged.sort((a, b) =>
            (a.tradingPointName || a.displayName).localeCompare(b.tradingPointName || b.displayName)
          );
          setClients(merged);
          if (merged.length > 0) {
            setSelectedClientId((prev) => prev || merged[0].id);
          }
        } catch (e) {
          console.warn('Eroare la încărcarea clienților:', e);
          const fallback = DEFAULT_USERS.filter((u) => u.role === 'client');
          setClients(fallback);
          if (fallback.length > 0) {
            setSelectedClientId((prev) => prev || fallback[0].id);
          }
        }
      };
      fetchClients();
    }
  }, [isAdmin]);

  const selectedClient = clients.find((c) => c.id === selectedClientId) || clients[0] || null;

  // Load products from Firestore safely without trying to write from client
  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const snap = await getDocs(collection(db, 'products'));
      if (snap.empty) {
        // If Firestore catalog is empty, use initial bakery products directly in UI
        setProducts(INITIAL_PRODUCTS.map((p, idx) => ({ ...p, id: `init-${p.code || idx}` })));
      } else {
        const prods: Product[] = [];
        snap.forEach((d) => {
          const data = d.data() as Product;
          if (data.active !== false) {
            prods.push({ ...data, id: d.id });
          }
        });
        setProducts(prods.length > 0 ? prods : INITIAL_PRODUCTS.map((p, idx) => ({ ...p, id: `init-${p.code || idx}` })));
      }
    } catch (err) {
      console.warn('Utilizăm catalogul inițial de produse:', err);
      // Fallback to initial products without crashing
      setProducts(INITIAL_PRODUCTS.map((p, idx) => ({ ...p, id: `init-${p.code || idx}` })));
    } finally {
      setLoadingProducts(false);
    }
  };

  const [dbCategories, setDbCategories] = useState<string[]>([]);

  useEffect(() => {
    loadProducts();
    const fetchCategories = async () => {
      try {
        const snap = await getDocs(collection(db, 'categories'));
        const cats: string[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data?.name) cats.push(data.name);
        });
        setDbCategories(cats);
      } catch (err) {
        console.warn('Eroare încărcare categorii din Firestore:', err);
      }
    };
    fetchCategories();
  }, []);

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    DEFAULT_CATEGORIES.forEach((c) => set.add(c));
    dbCategories.forEach((c) => set.add(c));
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['Toate', ...Array.from(set)];
  }, [dbCategories, products]);

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategory === 'Toate' || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const updateCartQuantity = (productId: string, qty: number) => {
    const validQty = Math.max(0, isNaN(qty) ? 0 : qty);
    setCartItems((prev) => {
      const next = { ...prev };
      if (validQty === 0) {
        delete next[productId];
      } else {
        next[productId] = validQty;
      }
      return next;
    });
  };

  const incrementQty = (product: Product) => {
    const current = cartItems[product.id] || 0;
    const step = product.unit === 'kg' ? 0.5 : 1;
    updateCartQuantity(product.id, Number((current + step).toFixed(2)));
  };

  const decrementQty = (product: Product) => {
    const current = cartItems[product.id] || 0;
    const step = product.unit === 'kg' ? 0.5 : 1;
    const nextVal = Math.max(0, Number((current - step).toFixed(2)));
    updateCartQuantity(product.id, nextVal);
  };

  // Build items array for cart summary
  const orderItemsList: OrderItem[] = Object.entries(cartItems)
    .map(([prodId, qty]) => {
      const prod = products.find((p) => p.id === prodId);
      if (!prod || qty <= 0) return null;
      return {
        productId: prod.id,
        productName: prod.name,
        productCode: prod.code,
        unit: prod.unit,
        unitPrice: prod.price,
        orderedQuantity: qty,
        pickedQuantity: 0,
        itemTotal: Number((qty * prod.price).toFixed(2)),
      };
    })
    .filter(Boolean) as OrderItem[];

  const orderTotal = orderItemsList.reduce((sum, item) => sum + item.itemTotal, 0);

  const handleSubmitOrder = async (autoConfirm: boolean = false) => {
    if (orderItemsList.length === 0) {
      setStatusMessage({
        type: 'error',
        text: 'Vă rugăm să adăugați cel puțin un produs în comandă.',
      });
      return;
    }

    if (!deliveryDate) {
      setStatusMessage({
        type: 'error',
        text: 'Vă rugăm să selectați data de livrare dorită.',
      });
      return;
    }

    if (deliveryDate < minDate) {
      setStatusMessage({
        type: 'error',
        text: 'Data de livrare nu poate fi mai devreme de ziua curentă.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusMessage(null);

      // Generate order number: CMD-YYYYMMDD-Random
      const dateToken = deliveryDate.replace(/-/g, '');
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const orderNumber = `CMD-${dateToken}-${randomSuffix}`;

      const clientPayload = isAdmin && selectedClient
        ? {
            clientId: selectedClient.id,
            clientName: selectedClient.tradingPointName || selectedClient.displayName || 'Punct Vânzare',
            clientEmail: selectedClient.email || '',
          }
        : {
            clientId: currentUser?.uid || profile?.id || 'client-demo',
            clientName: profile?.tradingPointName || profile?.displayName || 'Punct Vânzare',
            clientEmail: currentUser?.email || profile?.email || '',
          };

      const orderPayload: Omit<Order, 'id'> = {
        orderNumber,
        ...clientPayload,
        orderDate: getTodayString(),
        deliveryDate,
        state: autoConfirm ? 'confirmat' : 'creat',
        items: orderItemsList,
        totalAmount: Number(orderTotal.toFixed(2)),
        notes: orderNotes.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await createOrder(orderPayload, !currentUser);

      setStatusMessage({
        type: 'success',
        text: `Comanda ${orderNumber} a fost înregistrată cu succes în starea "${autoConfirm ? 'confirmat' : 'creat'}"!`,
      });

      // Clear cart
      setCartItems({});
      setOrderNotes('');

      setTimeout(() => {
        onOrderCreated();
      }, 1000);
    } catch (err: any) {
      console.error('Eroare creare comandă:', err);
      setStatusMessage({
        type: 'error',
        text: 'Nu s-a putut transmite comanda: ' + (err?.message || 'Eroare necunoscută'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <Wheat className="w-4 h-4" />
            <span>Punct de Lucru / Client</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Comandă Nouă Produse</h1>
          <p className="text-sm text-slate-500 mt-1">
            Selectați data de livrare și cantitățile dorite (la bucată sau la kilogram). Comenzile se plasează de regulă pentru a doua zi.
          </p>
        </div>

        {/* Delivery Date Picker */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
              Data Livrare (minim azi)
            </label>
            <input
              type="date"
              min={minDate}
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-amber-400 outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Admin Client Selector */}
      {isAdmin && (
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-amber-500 text-slate-950 rounded-xl font-bold shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                    Comandă în Numele Clientului (Mod Administrator)
                  </span>
                  <span className="bg-amber-200/80 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Selectare Punct Vânzare
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-0.5">
                  Alegeți magazinul sau punctul de lucru căruia îi aparține această comandă:
                </p>
              </div>
            </div>

            <div className="w-full md:w-84">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-1">
                Punct de Lucru / Magazin Destinatar *
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full text-xs font-bold bg-white border border-amber-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.tradingPointName ? `${c.tradingPointName} — ${c.email}` : `${c.displayName} — ${c.email}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedClient && (
            <div className="mt-3 pt-3 border-t border-amber-200/60 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-amber-950">
              <div>
                <span className="text-amber-700 font-semibold">Magazin: </span>
                <span className="font-bold">{selectedClient.tradingPointName || selectedClient.displayName}</span>
              </div>
              <div>
                <span className="text-amber-700 font-semibold">Reprezentant: </span>
                <span>{selectedClient.displayName}</span>
              </div>
              <div>
                <span className="text-amber-700 font-semibold">Email: </span>
                <span className="font-mono text-slate-800">{selectedClient.email}</span>
              </div>
              {selectedClient.phone && (
                <div>
                  <span className="text-amber-700 font-semibold">Telefon: </span>
                  <span>{selectedClient.phone}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Main Grid: Products Catalog on Left, Order Summary / Cart on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Catalog (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Search & Category Filter */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Căutați după denumire produs sau cod (ex: Pâine cu maia, BG-03)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-500 outline-hidden transition"
              />
            </div>

            {/* Category pills - wrapped so all tags are fully visible on both mobile and wide screens */}
            <div className="pt-1 w-full">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs w-full">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 text-xs ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-900 border border-slate-200/80'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Product Cards Grid */}
          {loadingProducts ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              Se încarcă catalogul brutăriei...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              Nu a fost găsit niciun produs conform filtrelor aplicate.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredProducts.map((prod) => {
                const currentQty = cartItems[prod.id] || 0;
                const isSelected = currentQty > 0;

                return (
                  <div
                    key={prod.id}
                    className={`bg-white rounded-2xl border transition-all p-4.5 flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-400 shadow-md ring-1 ring-amber-400/40 bg-amber-50/10'
                        : 'border-slate-200/80 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {prod.code}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            prod.unit === 'kg'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {prod.unit === 'kg' ? 'La Greutate (kg)' : 'La Bucată (buc)'}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm leading-snug">{prod.name}</h3>
                      {prod.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                          {prod.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-base font-black text-slate-900">
                          {prod.price.toFixed(2)}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 ml-1">
                          lei/{prod.unit}
                        </span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => decrementQty(prod)}
                          disabled={currentQty === 0}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-700 transition cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <input
                          type="number"
                          min="0"
                          step={prod.unit === 'kg' ? '0.1' : '1'}
                          value={currentQty === 0 ? '' : currentQty}
                          placeholder="0"
                          onChange={(e) => updateCartQuantity(prod.id, parseFloat(e.target.value))}
                          className={`w-16 h-8 text-center text-xs font-bold rounded-lg border focus:outline-hidden transition ${
                            isSelected
                              ? 'border-amber-500 bg-white text-amber-900 ring-1 ring-amber-400'
                              : 'border-slate-200 bg-slate-50 text-slate-800'
                          }`}
                        />

                        <button
                          type="button"
                          onClick={() => incrementQty(prod)}
                          className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold flex items-center justify-center transition shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Order Summary / Cart (4 cols) */}
        <div className="lg:col-span-4 sticky top-6 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">Coș Comandă Nouă</h3>
              </div>
              <span className="text-xs bg-slate-800 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                {orderItemsList.length} produse
              </span>
            </div>

            {/* Target Delivery Date Card */}
            <div className="p-4 bg-amber-50/60 border-b border-amber-200/50 flex items-center justify-between text-xs">
              <div>
                <span className="text-amber-800 font-semibold block">Livrare programată:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {formatDateRomanian(deliveryDate)}
                </span>
              </div>
              <span className="text-[11px] bg-white border border-amber-300 text-amber-800 px-2 py-1 rounded-md font-semibold">
                {deliveryDate === getTodayString() ? 'Azi' : deliveryDate === getTomorrowString() ? 'Mâine' : 'Viitor'}
              </span>
            </div>

            {/* Admin Destination Client Info */}
            {isAdmin && selectedClient && (
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Client Destinatar:
                </span>
                <div className="font-bold text-slate-900 mt-0.5">
                  {selectedClient.tradingPointName || selectedClient.displayName}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {selectedClient.email}
                </div>
              </div>
            )}

            {/* Items in Cart */}
            <div className="p-4 max-h-72 overflow-y-auto divide-y divide-slate-100">
              {orderItemsList.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  Nu ați selectat încă niciun produs. Folosiți butoanele + din catalog pentru a adăuga.
                </div>
              ) : (
                orderItemsList.map((item) => (
                  <div key={item.productId} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{item.productName}</div>
                      <div className="text-slate-500 text-[11px]">
                        {item.orderedQuantity} {item.unit} × {item.unitPrice.toFixed(2)} lei
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{item.itemTotal.toFixed(2)} lei</span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.productId, 0)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                        title="Elimină"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Notes Input */}
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Instrucțiuni / Mențiuni livrare
              </label>
              <textarea
                rows={2}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Ex: Livrare dimineață la 06:30, pâinea feliată..."
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-hidden"
              />
            </div>

            {/* Total and Submit Actions */}
            <div className="p-5 bg-white border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Valoare Totală:</span>
                <span className="text-xl font-black text-slate-950">{orderTotal.toFixed(2)} lei</span>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSubmitOrder(false)}
                  disabled={isSubmitting || orderItemsList.length === 0}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  {isSubmitting ? 'Se trimite...' : 'Salvează Comanda (Stare: Creată)'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmitOrder(true)}
                  disabled={isSubmitting || orderItemsList.length === 0}
                  className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Trimite & Confirmă Direct pentru Producție
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center leading-tight">
                * Comenzile cu starea &quot;Creată&quot; pot fi editate sau șterse ulterior înainte de confirmare.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
