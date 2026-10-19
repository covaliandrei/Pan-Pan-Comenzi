import React, { useState, useEffect } from 'react';
import { X, CheckCircle, PackageCheck, Scale, AlertCircle, Save, UserCheck, Lock } from 'lucide-react';
import { Order, OrderItem, UserProfile } from '../../types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
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
  const { currentUser, profile, role } = useAuth();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [productionNotes, setProductionNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Picker selection (editable by Admin)
  const [productionStaff, setProductionStaff] = useState<UserProfile[]>([]);
  const [selectedPickerId, setSelectedPickerId] = useState<string>('');
  const [selectedPickerName, setSelectedPickerName] = useState<string>('');

  const isAdmin = role === 'admin';

  useEffect(() => {
    if (isAdmin && isOpen) {
      const fetchStaff = async () => {
        try {
          const snap = await getDocs(collection(db, 'users'));
          const staff: UserProfile[] = [];
          snap.forEach((d) => {
            const u = { ...d.data(), id: d.id } as UserProfile;
            if (u.role === 'production' || u.role === 'admin') {
              staff.push(u);
            }
          });
          setProductionStaff(staff);
        } catch {
          // ignore
        }
      };
      fetchStaff();
    }
  }, [isAdmin, isOpen]);

  useEffect(() => {
    if (order) {
      // Orders in state "confirmat" initially have "Cantitate Pregătită" = 0 unless already set/saved
      setItems(
        order.items.map((it) => ({
          ...it,
          pickedQuantity: typeof it.pickedQuantity === 'number' ? it.pickedQuantity : 0,
        }))
      );
      setProductionNotes(order.notes || '');
      setSelectedPickerId(order.pickedBy || currentUser?.uid || profile?.id || '');
      setSelectedPickerName(order.pickedByName || profile?.displayName || profile?.email || 'Personal Producție');
      setErrorMsg('');
    }
  }, [order, currentUser, profile]);

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
    (sum, it) => sum + (it.pickedQuantity !== undefined ? it.pickedQuantity : 0) * it.unitPrice,
    0
  );

  // Save partial progress without closing order (remains "confirmat", locked to this user)
  const handleSaveProgress = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const updatePayload = {
        state: 'confirmat' as const,
        items: items.map((it) => ({
          ...it,
          pickedQuantity: Number(it.pickedQuantity || 0),
          itemTotal: Number(((it.pickedQuantity || 0) * it.unitPrice).toFixed(2)),
        })),
        notes: productionNotes.trim(),
        pickedBy: selectedPickerId || currentUser?.uid || profile?.id || 'production-user',
        pickedByName: selectedPickerName || profile?.displayName || profile?.email || 'Personal Producție',
        pickedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await updateOrder(order.id, updatePayload, !currentUser);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Eroare la salvarea progresului:', err);
      setErrorMsg('Nu s-a putut salva comanda: ' + (err?.message || 'Eroare necunoscută'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Finalize and close order (state becomes "inchis")
  const handleSubmitFinalize = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const hasNegative = items.some((it) => (it.pickedQuantity ?? 0) < 0);
      if (hasNegative) {
        setErrorMsg('Cantitatea pregătită nu poate fi negativă.');
        setIsSubmitting(false);
        return;
      }

      const updatePayload = {
        state: 'inchis' as const,
        items: items.map((it) => ({
          ...it,
          pickedQuantity: Number(it.pickedQuantity || 0),
          itemTotal: Number(((it.pickedQuantity || 0) * it.unitPrice).toFixed(2)),
        })),
        totalAmount: Number(calculatedTotal.toFixed(2)),
        notes: productionNotes.trim(),
        pickedBy: selectedPickerId || currentUser?.uid || profile?.id || 'production-user',
        pickedByName: selectedPickerName || profile?.displayName || profile?.email || 'Personal Producție',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white border-b border-slate-800">
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
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner & Match Button */}
        <div className="bg-amber-50/80 border-b border-amber-200/60 px-5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-amber-950 gap-2">
          <div className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              Inițial, cantitatea pregătită este 0. La cântărire, introduceți cantitățile reale pregătite.
            </span>
          </div>
          <button
            type="button"
            onClick={copyOrderedToPicked}
            className="shrink-0 text-amber-900 hover:text-amber-950 font-bold underline underline-offset-2 cursor-pointer self-start sm:self-auto"
          >
            Potrivește cu comanda
          </button>
        </div>

        {/* Admin Picker Assignment / Picker Status */}
        {isAdmin ? (
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Operator Alocat (Picker):</span>
            </div>
            <select
              value={selectedPickerId}
              onChange={(e) => {
                const pId = e.target.value;
                setSelectedPickerId(pId);
                const found = productionStaff.find((s) => s.id === pId);
                setSelectedPickerName(found ? found.displayName || found.email : 'Personal Producție');
              }}
              className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:ring-2 focus:ring-amber-400 outline-hidden"
            >
              <option value={currentUser?.uid || profile?.id || 'prod'}>
                {profile?.displayName || 'Personalul Curent'} (Eu)
              </option>
              {productionStaff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.displayName} ({staff.email})
                </option>
              ))}
            </select>
          </div>
        ) : (
          order.pickedByName && (
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-2 flex items-center justify-between text-xs text-slate-600">
              <span>
                Comandă preluată de:{' '}
                <strong className="text-slate-900">{order.pickedByName}</strong>
              </span>
              <span className="text-[11px] text-slate-400">
                Doar acest operator sau administratorul poate finaliza
              </span>
            </div>
          )
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-2.5">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/60 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                      {item.productCode}
                    </span>
                    <h4 className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
                      {item.productName}
                    </h4>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span>
                      Comandat: <strong className="text-slate-800">{item.orderedQuantity} {item.unit}</strong>
                    </span>
                    <span>
                      Preț: {item.unitPrice.toFixed(2)} lei / {item.unit}
                    </span>
                  </div>
                </div>

                {/* Input for picked quantity */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                  <div className="flex flex-col items-start sm:items-end">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                      Cantitate Pregătită
                    </label>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        min="0"
                        step={item.unit === 'kg' ? '0.05' : '1'}
                        value={item.pickedQuantity}
                        onChange={(e) => handleQuantityChange(idx, parseFloat(e.target.value))}
                        className={`w-24 sm:w-28 text-center px-2.5 py-1.5 text-sm font-bold rounded-lg border focus:ring-2 focus:outline-hidden transition bg-white ${
                          item.pickedQuantity !== item.orderedQuantity
                            ? 'border-amber-400 text-amber-900 bg-amber-50/30 ring-1 ring-amber-400'
                            : 'border-slate-300 text-slate-900 focus:border-amber-500 focus:ring-amber-200'
                        }`}
                      />
                      <span className="text-xs font-semibold text-slate-600 w-8">{item.unit}</span>
                    </div>
                  </div>

                  <div className="w-20 text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Subtotal</span>
                    <span className="text-xs font-bold text-slate-800">
                      {((item.pickedQuantity ?? 0) * item.unitPrice).toFixed(2)} lei
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Notes textarea */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observații secția ambalare & livrare (opțional):
            </label>
            <textarea
              rows={2}
              value={productionNotes}
              onChange={(e) => setProductionNotes(e.target.value)}
              placeholder="Ex: Cântărit, pregătit și etichetat pentru livrare..."
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden bg-slate-50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3.5 bg-slate-50 border-t border-slate-200 gap-3">
          <div>
            <span className="text-xs text-slate-500 block">Total recalculat:</span>
            <span className="text-base font-black text-slate-900">{calculatedTotal.toFixed(2)} lei</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleSaveProgress}
              disabled={isSubmitting}
              className="flex items-center justify-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Salvează cantitățile parțiale fără a închide comanda"
            >
              <Save className="w-4 h-4 text-slate-600" />
              <span>Salvează în Lucru</span>
            </button>

            <button
              type="button"
              onClick={handleSubmitFinalize}
              disabled={isSubmitting}
              className="flex items-center justify-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Se salvează...' : 'Finalizează & Închide'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
