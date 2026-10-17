import React, { useState, useEffect } from 'react';
import { X, CheckCircle, PackageCheck, Scale, AlertCircle } from 'lucide-react';
import { Order, OrderItem } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/errors';
import { useAuth } from '../../context/AuthContext';
import { formatDateRomanian } from '../../lib/initialData';
import { updateOrder } from '../../lib/ordersService';

interface PickOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PickOrderModal: React.FC<PickOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, profile } = useAuth();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [productionNotes, setProductionNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (order) {
      // Default pickedQuantity to existing pickedQuantity if set, else orderedQuantity
      setItems(
        order.items.map((it) => ({
          ...it,
          pickedQuantity: it.pickedQuantity !== undefined ? it.pickedQuantity : it.orderedQuantity,
        }))
      );
      setProductionNotes(order.notes || '');
      setErrorMsg('');
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleQuantityChange = (index: number, newQty: number) => {
    const updated = [...items];
    const item = { ...updated[index] };
    const validQty = Math.max(0, isNaN(newQty) ? 0 : newQty);
    item.pickedQuantity = validQty;
    item.itemTotal = Number((validQty * item.unitPrice).toFixed(2));
    updated[index] = item;
    setItems(updated);
  };

  const copyOrderedToPicked = () => {
    const updated = items.map((it) => ({
      ...it,
      pickedQuantity: it.orderedQuantity,
      itemTotal: Number((it.orderedQuantity * it.unitPrice).toFixed(2)),
    }));
    setItems(updated);
  };

  const calculatedTotal = items.reduce(
    (sum, it) => sum + (it.pickedQuantity !== undefined ? it.pickedQuantity : it.orderedQuantity) * it.unitPrice,
    0
  );

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const hasZeroOrNegative = items.some((it) => (it.pickedQuantity ?? 0) < 0);
      if (hasZeroOrNegative) {
        setErrorMsg('Cantitatea pregătită nu poate fi negativă.');
        setIsSubmitting(false);
        return;
      }

      const updatePayload = {
        state: 'inchis' as const,
        items: items.map((it) => ({
          ...it,
          pickedQuantity: Number(it.pickedQuantity),
          itemTotal: Number(((it.pickedQuantity ?? it.orderedQuantity) * it.unitPrice).toFixed(2)),
        })),
        totalAmount: Number(calculatedTotal.toFixed(2)),
        notes: productionNotes.trim(),
        pickedBy: currentUser?.uid || 'production',
        pickedByName: profile?.displayName || 'Personal Producție',
        pickedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await updateOrder(order.id, updatePayload, !currentUser);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Eroare la finalizarea pregătirii comenzii:', err);
      setErrorMsg('Nu s-a putut actualiza comanda: ' + (err?.message || 'Eroare necunoscută'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Pregătire & Cântărire (Picking): {order.orderNumber}
              </h3>
              <p className="text-xs text-slate-300">
                Punct: <span className="font-semibold text-white">{order.clientName}</span> | Livrare:{' '}
                {formatDateRomanian(order.deliveryDate)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-amber-50/70 border-b border-amber-200/50 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              La cântărire sau porționare, <strong>cantitatea pregătită poate diferi de cea comandată</strong> (specific brutăriei).
            </span>
          </div>
          <button
            type="button"
            onClick={copyOrderedToPicked}
            className="shrink-0 text-amber-800 hover:text-amber-950 font-semibold underline underline-offset-2 ml-2 cursor-pointer"
          >
            Potrivește cu comanda
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/60 transition"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {item.productCode}
                    </span>
                    <h4 className="font-semibold text-slate-900 text-sm">{item.productName}</h4>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                    <span>
                      Comandat: <strong className="text-slate-800">{item.orderedQuantity} {item.unit}</strong>
                    </span>
                    <span>
                      Preț: {item.unitPrice.toFixed(2)} lei / {item.unit}
                    </span>
                  </div>
                </div>

                {/* Input for picked quantity */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <label className="text-[11px] font-medium text-slate-600 mb-1">
                      Cantitate Pregătită ({item.unit})
                    </label>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        min="0"
                        step={item.unit === 'kg' ? '0.05' : '1'}
                        value={item.pickedQuantity}
                        onChange={(e) => handleQuantityChange(idx, parseFloat(e.target.value))}
                        className={`w-28 text-center px-3 py-1.5 text-sm font-bold rounded-lg border focus:ring-2 focus:outline-hidden transition bg-white ${
                          item.pickedQuantity !== item.orderedQuantity
                            ? 'border-amber-400 text-amber-900 bg-amber-50/30 ring-amber-400'
                            : 'border-slate-300 text-slate-900 focus:border-amber-500 focus:ring-amber-200'
                        }`}
                      />
                      <span className="text-xs font-semibold text-slate-600 w-8">{item.unit}</span>
                    </div>
                  </div>

                  <div className="w-24 text-right">
                    <span className="text-[11px] text-slate-400 block">Subtotal</span>
                    <span className="text-xs font-bold text-slate-800">
                      {((item.pickedQuantity ?? item.orderedQuantity) * item.unitPrice).toFixed(2)} lei
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Notes textarea */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Observații producție & ambalare (opțional):
            </label>
            <textarea
              rows={2}
              value={productionNotes}
              onChange={(e) => setProductionNotes(e.target.value)}
              placeholder="Ex: Pâinea la kg a fost feliată conform solicitării, cozonacii ambalați individual..."
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
          <div>
            <span className="text-xs text-slate-500 block">Total comandă recalculat:</span>
            <span className="text-lg font-black text-slate-900">{calculatedTotal.toFixed(2)} lei</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition"
            >
              Închide
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Se procesează...' : 'Finalizează & Închide Comanda'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
