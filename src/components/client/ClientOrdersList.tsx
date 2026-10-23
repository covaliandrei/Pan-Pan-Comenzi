import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  PackageCheck,
  Edit,
  Trash2,
  Printer,
  Calendar,
  Search,
  Filter,
  Eye,
  Send,
  AlertCircle,
  FileCheck,
  Store,
} from 'lucide-react';
import { Order } from '../../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { formatDateRomanian, getTodayString, getTomorrowString } from '../../lib/initialData';
import { ConfirmModal } from '../modals/ConfirmModal';
import { EditOrderModal } from '../modals/EditOrderModal';
import { PrintOrderModal } from '../modals/PrintOrderModal';
import { getLocalOrders, updateOrder, deleteOrder } from '../../lib/ordersService';

export const ClientOrdersList: React.FC<{ onNewOrderClick: () => void }> = ({ onNewOrderClick }) => {
  const { currentUser, profile, role, isDemoUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('toate');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

  const todayStr = getTodayString();
  const tomorrowStr = getTomorrowString();

  // Modal states
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);
  const [orderToConfirm, setOrderToConfirm] = useState<Order | null>(null);

  const loadLocalFallback = () => {
    const local = getLocalOrders();
    const filtered = role === 'admin'
      ? local
      : local.filter((o) => o.clientId === (currentUser?.uid || profile?.id || 'demo-client-botanica'));
    filtered.sort((a, b) => (b.deliveryDate || '').localeCompare(a.deliveryDate || ''));
    setOrders(filtered);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    const ordersRef = collection(db, 'orders');
    const clientId = currentUser?.uid || profile?.id;

    const q = role === 'admin'
      ? query(ordersRef)
      : (clientId ? query(ordersRef, where('clientId', '==', clientId)) : query(ordersRef));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as Order);
        });
        list.sort((a, b) => (b.deliveryDate || '').localeCompare(a.deliveryDate || ''));
        const realOrders = list.filter((o) => !o.id.startsWith('demo-'));
        setOrders(realOrders);
        setLoading(false);
      },
      (error) => {
        console.warn('Fallback to local orders on listener error:', error);
        loadLocalFallback();
      }
    );

    return () => unsubscribe();
  }, [currentUser, role, isDemoUser, profile?.id]);

  const handleConfirmOrder = async (order: Order) => {
    try {
      await updateOrder(order.id, { state: 'confirmat' }, isDemoUser || !currentUser);
      // Update local state if needed
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, state: 'confirmat' } : o))
      );
      setOrderToConfirm(null);
    } catch (err) {
      console.error('Eroare la confirmarea comenzii:', err);
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    try {
      await deleteOrder(order.id, isDemoUser || !currentUser);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      setOrderToDelete(null);
    } catch (err) {
      console.error('Eroare la ștergerea comenzii:', err);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      o.items.some((it) => it.productName.toLowerCase().includes(search.toLowerCase()));

    const matchState = stateFilter === 'toate' || o.state === stateFilter;
    const matchDate = selectedDate === 'toate' || o.deliveryDate === selectedDate;
    return matchSearch && matchState && matchDate;
  });

  const getStatusBadge = (state: string) => {
    switch (state) {
      case 'creat':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Creată (Ciornă)
          </span>
        );
      case 'confirmat':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            Confirmată Producție
          </span>
        );
      case 'inchis':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
            Închisă (Livrată)
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {state}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Comenzi</h1>
          <p className="text-sm text-slate-500 mt-1">
            Urmăriți stadiul comenzilor plasate de punctul dvs. de livrare, confirmați-le pentru producție sau editați-le înainte de confirmare.
          </p>
        </div>

        <button
          type="button"
          onClick={onNewOrderClick}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Send className="w-4 h-4" />
          <span>Comandă Nouă</span>
        </button>
      </div>

      {/* Date Filter Controls - Default Today */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs font-bold text-slate-700">Filtrare după data livrării:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-700">
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                selectedDate === todayStr ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Azi ({formatDateRomanian(todayStr)})
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(tomorrowStr)}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                selectedDate === tomorrowStr ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Mâine ({formatDateRomanian(tomorrowStr)})
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate('toate')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                selectedDate === 'toate' ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Toate Datele
            </button>
          </div>

          <input
            type="date"
            value={selectedDate === 'toate' ? '' : selectedDate}
            onChange={(e) => setSelectedDate(e.target.value || 'toate')}
            className="text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-amber-400 outline-hidden"
          />
        </div>
      </div>

      {/* State & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Căutare după număr comandă (ex: CMD-20261018), magazin, produs sau notă..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-400 outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              onClick={() => setStateFilter('toate')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                stateFilter === 'toate' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Toate ({orders.length})
            </button>
            <button
              onClick={() => setStateFilter('creat')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                stateFilter === 'creat' ? 'bg-white text-amber-800 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Create ({orders.filter((o) => o.state === 'creat').length})
            </button>
            <button
              onClick={() => setStateFilter('confirmat')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                stateFilter === 'confirmat' ? 'bg-white text-blue-800 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Confirmate ({orders.filter((o) => o.state === 'confirmat').length})
            </button>
            <button
              onClick={() => setStateFilter('inchis')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                stateFilter === 'inchis' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Închise ({orders.filter((o) => o.state === 'inchis').length})
            </button>
          </div>
        </div>
      </div>

      {/* Orders List Table / Cards */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          Se încarcă comenzile...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <FileCheck className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">Nu a fost găsită nicio comandă</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search || stateFilter !== 'toate'
              ? 'Nu există comenzi care să corespundă criteriilor de filtrare.'
              : 'Punctul dvs. de lucru nu are comenzi plasate încă. Plasați o primă comandă pentru brutărie.'}
          </p>
          <button
            onClick={onNewOrderClick}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Plasează o comandă acum</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const canEditOrDelete = order.state === 'creat' || role === 'admin';
            const canConfirm = order.state === 'creat';

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all p-5"
              >
                {/* Header row: Order #, Status, Dates, Total */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      {order.orderNumber}
                    </span>
                    {getStatusBadge(order.state)}
                  </div>

                  <div className="flex items-center space-x-4 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>Plasată: {formatDateRomanian(order.orderDate)}</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-bold text-slate-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      <span>Livrare: {formatDateRomanian(order.deliveryDate)}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-slate-950">
                        {order.totalAmount.toFixed(2)} lei
                      </span>
                    </div>
                  </div>
                </div>

                {/* Client / Destinatar Info */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700 bg-slate-50/80 px-3.5 py-2 rounded-xl border border-slate-200/60 my-3">
                  <Store className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-slate-500 font-semibold">Destinatar (Punct de Livrare):</span>
                  <span className="font-bold text-slate-900">{order.clientName}</span>
                  {order.clientEmail && <span className="text-slate-400 font-mono text-[11px]">({order.clientEmail})</span>}
                  {order.pickedByName && (
                    <span className="ml-auto text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      Picker: {order.pickedByName}
                    </span>
                  )}
                </div>

                {/* Items preview */}
                <div className="py-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">
                    <span>Articole comandate ({order.items.length})</span>
                    {order.state === 'inchis' && <span className="text-emerald-700 font-bold">*Cantități finale cântărite la livrare</span>}
                  </div>

                  {/* Desktop / Tablet Table View */}
                  <div className="hidden sm:block overflow-x-auto border border-slate-200/90 rounded-xl my-2">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-2 px-3 text-center w-8">#</th>
                          <th className="py-2 px-3 w-20">Cod</th>
                          <th className="py-2 px-3">Produs</th>
                          <th className="py-2 px-3 text-center w-16">Unitate</th>
                          <th className="py-2 px-3 text-right w-24">Preț Unitar</th>
                          <th className="py-2 px-3 text-right w-28">Comandat</th>
                          {order.state === 'inchis' && (
                            <th className="py-2 px-3 text-right w-28 text-emerald-800">Livrat</th>
                          )}
                          <th className="py-2 px-3 text-right w-28">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {order.items.map((item, idx) => {
                          const finalQty =
                            order.state === 'inchis' && item.pickedQuantity !== undefined
                              ? item.pickedQuantity
                              : item.orderedQuantity;
                          const total = item.itemTotal || Number((finalQty * item.unitPrice).toFixed(2));
                          const isAdjusted =
                            order.state === 'inchis' &&
                            item.pickedQuantity !== undefined &&
                            item.pickedQuantity !== item.orderedQuantity;

                          return (
                            <tr key={idx} className="hover:bg-slate-50/70 transition">
                              <td className="py-2 px-3 text-center text-slate-400">{idx + 1}</td>
                              <td className="py-2 px-3 font-mono text-slate-500 font-semibold">{item.productCode || '-'}</td>
                              <td className="py-2 px-3 font-medium text-slate-900">{item.productName}</td>
                              <td className="py-2 px-3 text-center">
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-semibold">
                                  {item.unit}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right text-slate-600">{item.unitPrice.toFixed(2)} lei</td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900">
                                {item.orderedQuantity} {item.unit}
                              </td>
                              {order.state === 'inchis' && (
                                <td className="py-2 px-3 text-right font-black text-emerald-700">
                                  {finalQty} {item.unit}
                                  {isAdjusted && (
                                    <span className="block text-[10px] font-normal text-amber-700">(ajustat)</span>
                                  )}
                                </td>
                              )}
                              <td className="py-2 px-3 text-right font-bold text-slate-950">
                                {total.toFixed(2)} lei
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile-Friendly List View */}
                  <div className="block sm:hidden space-y-2 my-2">
                    {order.items.map((item, idx) => {
                      const finalQty =
                        order.state === 'inchis' && item.pickedQuantity !== undefined
                          ? item.pickedQuantity
                          : item.orderedQuantity;
                      const total = item.itemTotal || Number((finalQty * item.unitPrice).toFixed(2));
                      const isAdjusted =
                        order.state === 'inchis' &&
                        item.pickedQuantity !== undefined &&
                        item.pickedQuantity !== item.orderedQuantity;

                      return (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              {item.productCode && (
                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 mr-1.5">
                                  {item.productCode}
                                </span>
                              )}
                              <span className="font-bold text-slate-900 text-xs">{item.productName}</span>
                            </div>
                            <span className="font-black text-xs text-slate-950 shrink-0">{total.toFixed(2)} lei</span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-600 pt-1.5 border-t border-slate-200/60">
                            <span className="text-[11px] text-slate-500">
                              {item.unitPrice.toFixed(2)} lei / {item.unit}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-700">
                                Comandat: <strong className="text-slate-900">{item.orderedQuantity} {item.unit}</strong>
                              </span>
                              {order.state === 'inchis' && (
                                <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                                  Livrat: {finalQty} {item.unit}
                                  {isAdjusted && <span className="text-[10px] text-amber-700 ml-0.5">*</span>}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {order.notes && (
                    <div className="mt-2.5 text-xs text-slate-600 bg-amber-50/40 border border-amber-100 rounded-lg p-2 italic">
                      <span className="font-semibold text-amber-900 not-italic">Mențiune: </span>
                      {order.notes}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-slate-500">
                    {order.state === 'creat' ? (
                      <span className="text-amber-700 font-medium">
                        * Comanda este în așteptare. Apăsați &quot;Confirmă comanda&quot; pentru a o transmite echipei de producție.
                      </span>
                    ) : order.state === 'confirmat' ? (
                      <span className="text-blue-700 font-medium">
                        * Preluată de producție. Se va pregăti pentru livrare.
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium">
                        * Comandă pregătită și livrată de producție.
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Confirm Button */}
                    {canConfirm && (
                      <button
                        type="button"
                        onClick={() => setOrderToConfirm(order)}
                        className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                        title="Confirmă comanda pentru brutărie"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirmă Comanda</span>
                      </button>
                    )}

                    {/* Edit Button */}
                    {canEditOrDelete && (
                      <button
                        type="button"
                        onClick={() => setOrderToEdit(order)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                        title="Editează produse sau dată"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Editează</span>
                      </button>
                    )}

                    {/* Print Button */}
                    <button
                      type="button"
                      onClick={() => setOrderToPrint(order)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                      title="Tipărește nota de livrare"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Tipărește</span>
                    </button>

                    {/* Delete Button with confirmation */}
                    {canEditOrDelete && (
                      <button
                        type="button"
                        onClick={() => setOrderToDelete(order)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                        title="Șterge comanda"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Șterge</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!orderToDelete}
        title="Ștergere Comandă"
        message={`Sunteți sigur că doriți să ștergeți definitiv comanda ${orderToDelete?.orderNumber} (pentru data ${formatDateRomanian(orderToDelete?.deliveryDate || '')})? Această acțiune nu poate fi anulată.`}
        confirmLabel="Da, șterge comanda"
        cancelLabel="Anulează"
        isDestructive={true}
        onConfirm={() => orderToDelete && handleDeleteOrder(orderToDelete)}
        onClose={() => setOrderToDelete(null)}
      />

      {/* Confirm Order Modal */}
      <ConfirmModal
        isOpen={!!orderToConfirm}
        title="Confirmare Comandă pentru Brutărie"
        message={`Doriți să confirmați comanda ${orderToConfirm?.orderNumber} pentru livrare în data de ${formatDateRomanian(orderToConfirm?.deliveryDate || '')}? După confirmare, comanda va intra direct în planul de coacere al producției.`}
        confirmLabel="Confirmă Comanda"
        cancelLabel="Mai verific"
        isDestructive={false}
        onConfirm={() => orderToConfirm && handleConfirmOrder(orderToConfirm)}
        onClose={() => setOrderToConfirm(null)}
      />

      {/* Edit Order Modal */}
      <EditOrderModal
        order={orderToEdit}
        isOpen={!!orderToEdit}
        onClose={() => setOrderToEdit(null)}
        onSuccess={() => {}}
      />

      {/* Print Order Modal */}
      <PrintOrderModal
        order={orderToPrint}
        isOpen={!!orderToPrint}
        onClose={() => setOrderToPrint(null)}
      />
    </div>
  );
};
