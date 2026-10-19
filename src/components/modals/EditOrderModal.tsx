import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Calendar, AlertCircle, ShoppingBag, ShieldCheck } from 'lucide-react';
import { Order, OrderItem, OrderState, Product } from '../../types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getTodayString } from '../../lib/initialData';
import { updateOrder } from '../../lib/ordersService';
import { useAuth } from '../../context/AuthContext';

interface EditOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, role } = useAuth();
  const isAdmin = role === 'admin';

  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [orderState, setOrderState] = useState<OrderState>('creat');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (order) {
      setDeliveryDate(order.deliveryDate);
      setOrderState(order.state || 'creat');
      setItems([...order.items]);
      setNotes(order.notes || '');
      setErrorMsg('');
    }
  }, [order]);

  useEffect(() => {
    if (isOpen) {
      const fetchProducts = async () => {
        try {
          const snap = await getDocs(collection(db, 'products'));
          const prods: Product[] = [];
          snap.forEach((d) => {
            const data = d.data() as Product;
            if (data.active !== false) {
              prods.push({ ...data, id: d.id });
            }
          });
          setAvailableProducts(prods);
        } catch (e) {
          console.error('Eroare la încărcarea produselor:', e);
        }
      };
      fetchProducts();
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const minDate = getTodayString();

  const handleQuantityChange = (index: number, newQty: number) => {
    const updated = [...items];
    const item = { ...updated[index] };
    const validQty = Math.max(0, isNaN(newQty) ? 0 : newQty);
    item.orderedQuantity = validQty;
    item.pickedQuantity = validQty;
    item.itemTotal = Number((validQty * item.unitPrice).toFixed(2));
    updated[index] = item;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleAddProduct = () => {
    if (!selectedProductToAdd) return;
    const prod = availableProducts.find((p) => p.id === selectedProductToAdd);
    if (!prod) return;

    // Check if already in order
    const existingIndex = items.findIndex((it) => it.productId === prod.id);
    if (existingIndex >= 0) {
      handleQuantityChange(existingIndex, items[existingIndex].orderedQuantity + 1);
    } else {
      const defaultQty = prod.unit === 'kg' ? 1.0 : 1;
      const newItem: OrderItem = {
        productId: prod.id,
        productName: prod.name,
        productCode: prod.code,
        unit: prod.unit,
        unitPrice: prod.price,
        orderedQuantity: defaultQty,
        pickedQuantity: defaultQty,
        itemTotal: Number((defaultQty * prod.price).toFixed(2)),
      };
      setItems([...items, newItem]);
    }
    setSelectedProductToAdd('');
  };

  const totalAmount = items.reduce((sum, it) => sum + it.itemTotal, 0);

  const handleSave = async (forcedState?: OrderState) => {
    try {
      setIsSubmitting(true);
      setErrorMsg('');

      if (!deliveryDate) {
        setErrorMsg('Vă rugăm să selectați data de livrare.');
        setIsSubmitting(false);
        return;
      }

      // Only check past date for non-admin clients
      if (!isAdmin && deliveryDate < minDate) {
        setErrorMsg('Data de livrare nu poate fi în trecut (minim astăzi).');
        setIsSubmitting(false);
        return;
      }

      const validItems = items.filter((it) => it.orderedQuantity > 0);
      if (validItems.length === 0) {
        setErrorMsg('Comanda trebuie să conțină cel puțin un produs cu cantitate mai mare de 0.');
        setIsSubmitting(false);
        return;
      }

      const finalState = forcedState || orderState;

      const updatePayload: Record<string, any> = {
        deliveryDate,
        state: finalState,
        items: validItems,
        totalAmount: Number(totalAmount.toFixed(2)),
        notes: notes.trim(),
        updatedAt: new Date().toISOString(),
      };

      await updateOrder(order.id, updatePayload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Eroare la editarea comenzii:', err);
      setErrorMsg('Nu s-a putut salva comanda: ' + (err?.message || 'Eroare necunoscută'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base leading-tight">Editare Comandă: {order.orderNumber}</h3>
                {isAdmin && (
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                    Mod Administrator
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Client: <span className="text-white font-medium">{order.clientName}</span> ({order.clientEmail})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Delivery Date & Order State Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Delivery Date */}
            <div className="bg-slate-50 border border-slate-200/90 p-4 rounded-2xl">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                Data de Livrare
              </label>
              <input
                type="date"
                min={isAdmin ? undefined : minDate}
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                {isAdmin ? 'Administratorul poate modifica data pentru orice zi.' : 'Minim astăzi.'}
              </span>
            </div>

            {/* State Picker */}
            <div className="bg-slate-50 border border-slate-200/90 p-4 rounded-2xl">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                Stare Comandă
              </label>
              <select
                value={orderState}
                onChange={(e) => setOrderState(e.target.value as OrderState)}
                disabled={!isAdmin && order.state !== 'creat'}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-400 cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="creat">Creată (Ciornă - poate fi editată)</option>
                <option value="confirmat">Confirmată (Transmisă la producție)</option>
                <option value="inchis">Închisă (Livrată și recepționată)</option>
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {isAdmin ? 'Administratorul poate salva comanda în orice stare.' : 'Starea comenzii.'}
              </span>
            </div>
          </div>

          {/* Items List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Produse Comandate ({items.length})
              </h4>
            </div>

            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {item.productCode}
                      </span>
                      <span className="font-semibold text-sm text-slate-900 truncate">{item.productName}</span>
                    </div>
                    <span className="text-xs text-slate-500 mt-0.5 block">
                      {item.unitPrice.toFixed(2)} lei / {item.unit}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="0.1"
                      step={item.unit === 'kg' ? '0.1' : '1'}
                      value={item.orderedQuantity}
                      onChange={(e) => handleQuantityChange(idx, parseFloat(e.target.value))}
                      className="w-20 text-center px-2 py-1 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                    />
                    <span className="text-xs font-semibold text-slate-600 w-8">{item.unit}</span>
                    <span className="text-xs font-bold text-slate-800 w-20 text-right">
                      {item.itemTotal.toFixed(2)} lei
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                      title="Șterge produs"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add product select */}
            {availableProducts.length > 0 && (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                <select
                  value={selectedProductToAdd}
                  onChange={(e) => setSelectedProductToAdd(e.target.value)}
                  className="flex-1 text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">-- Adaugă un alt produs din catalog --</option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code}) - {p.price.toFixed(2)} lei/{p.unit}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddProduct}
                  disabled={!selectedProductToAdd}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adaugă</span>
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Observații / Mențiuni de livrare
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrucțiuni speciale pentru brutărie sau livrare..."
              className="w-full text-xs p-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-400 outline-hidden"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
          <div>
            <span className="text-xs text-slate-500 block">Total comandă:</span>
            <span className="text-lg font-black text-slate-900">{totalAmount.toFixed(2)} lei</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              Anulează
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-xs transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Se salvează...' : 'Salvează Modificările'}</span>
            </button>
            {orderState === 'creat' && (
              <button
                type="button"
                onClick={() => handleSave('confirmat')}
                disabled={isSubmitting}
                className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition cursor-pointer"
              >
                <span>Salvează & Confirmă</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
