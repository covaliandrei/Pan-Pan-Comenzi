import React, { useState, useEffect } from 'react';
import {
  Calendar,
  PackageCheck,
  Printer,
  Scale,
  CheckCircle2,
  Clock,
  Wheat,
  Eye,
  Search,
  Filter,
  Check,
  Building2,
} from 'lucide-react';
import { Order } from '../../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getTodayString, getTomorrowString, formatDateRomanian } from '../../lib/initialData';
import { PickOrderModal } from '../modals/PickOrderModal';
import { PrintOrderModal } from '../modals/PrintOrderModal';
import { getLocalOrders, syncLocalOrdersToFirestore } from '../../lib/ordersService';
import { useAuth } from '../../context/AuthContext';

export const ProductionDashboard: React.FC = () => {
  const { currentUser, isDemoUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(getTomorrowString());
  const [allDates, setAllDates] = useState<boolean>(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'confirmat' | 'toate' | 'inchis'>('confirmat');
  const [search, setSearch] = useState<string>('');

  // Modals
  const [orderToPick, setOrderToPick] = useState<Order | null>(null);
  const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);
  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState<boolean>(false);

  const minDate = getTodayString();
  const todayStr = getTodayString();
  const tomorrowStr = getTomorrowString();

  const loadLocalOrdersForDate = (date: string) => {
    const allLocal = getLocalOrders();
    const forDate = allDates ? allLocal : allLocal.filter((o) => o.deliveryDate === date);
    forDate.sort((a, b) => {
      if (a.state === 'confirmat' && b.state !== 'confirmat') return -1;
      if (a.state !== 'confirmat' && b.state === 'confirmat') return 1;
      return a.orderNumber.localeCompare(b.orderNumber);
    });
    setOrders(forDate);
    setLoading(false);
  };

  useEffect(() => {
    // Sync any pending offline orders
    syncLocalOrdersToFirestore().catch(() => {});

    setLoading(true);
    const ordersRef = collection(db, 'orders');
    const q = allDates
      ? query(ordersRef)
      : query(ordersRef, where('deliveryDate', '==', selectedDate));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as Order);
        });
        list.sort((a, b) => {
          if (a.state === 'confirmat' && b.state !== 'confirmat') return -1;
          if (a.state !== 'confirmat' && b.state === 'confirmat') return 1;
          return a.orderNumber.localeCompare(b.orderNumber);
        });
        if (list.length > 0) {
          setOrders(list);
        } else if (isDemoUser) {
          const locals = getLocalOrders();
          setOrders(allDates ? locals : locals.filter((o) => o.deliveryDate === selectedDate));
        } else {
          setOrders([]);
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Fallback to local orders for production on error:', error);
        loadLocalOrdersForDate(selectedDate);
      }
    );

    return () => unsubscribe();
  }, [selectedDate, allDates, isDemoUser]);

  // Aggregate daily requirements for bakers
  const dailyAggregates: Record<string, { name: string; unit: string; totalOrdered: number; totalPicked: number }> = {};
  orders.forEach((ord) => {
    // only count orders that are confirmed or completed
    if (ord.state === 'confirmat' || ord.state === 'inchis') {
      ord.items.forEach((item) => {
        if (!dailyAggregates[item.productId]) {
          dailyAggregates[item.productId] = {
            name: item.productName,
            unit: item.unit,
            totalOrdered: 0,
            totalPicked: 0,
          };
        }
        dailyAggregates[item.productId].totalOrdered += item.orderedQuantity;
        dailyAggregates[item.productId].totalPicked += item.pickedQuantity || item.orderedQuantity;
      });
    }
  });

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      o.items.some((it) => it.productName.toLowerCase().includes(search.toLowerCase()));

    const matchStatus = statusFilter === 'toate' || o.state === statusFilter;
    return matchSearch && matchStatus;
  });

  const confirmedCount = orders.filter((o) => o.state === 'confirmat').length;
  const closedCount = orders.filter((o) => o.state === 'inchis').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Selector */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <Wheat className="w-4 h-4" />
            <span>Secția Coacere & Ambalare</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Panou Producție Brutărie</h1>
          <p className="text-sm text-slate-500 mt-1">
            Vizualizați comenzile confirmate pentru data selectată, efectuați cântărirea și pregătirea produselor (picking), și tipăriți rapoartele de coacere.
          </p>
        </div>

        {/* Date Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Quick Date Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-700">
            <button
              type="button"
              onClick={() => {
                setSelectedDate(todayStr);
                setAllDates(false);
              }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                !allDates && selectedDate === todayStr ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Azi
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(tomorrowStr);
                setAllDates(false);
              }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                !allDates && selectedDate === tomorrowStr ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Mâine (Implicit)
            </button>
            <button
              type="button"
              onClick={() => setAllDates(true)}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                allDates ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Toate Datele
            </button>
          </div>

          {/* Date Input */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
            <input
              type="date"
              min={minDate}
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setAllDates(false);
              }}
              className="text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-amber-400 outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Daily Aggregated Baking Summary */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Wheat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Necesar Producție & Coacere ({formatDateRomanian(selectedDate)})
              </h3>
              <p className="text-xs text-slate-500">
                Totaluri centralizate din cele {confirmedCount + closedCount} comenzi confirmate/închise pentru această dată.
              </p>
            </div>
          </div>

          {orders.length > 0 && (
            <button
              type="button"
              onClick={() => setIsBatchPrintOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Tipărește Foaie Zilnică Coacere</span>
            </button>
          )}
        </div>

        {Object.keys(dailyAggregates).length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            Nu există produse comandate și confirmate pentru data de {formatDateRomanian(selectedDate)}.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-4">
            {Object.entries(dailyAggregates).map(([id, item]) => (
              <div
                key={id}
                className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl hover:bg-slate-100/70 transition"
              >
                <div className="text-[11px] font-medium text-slate-500 truncate" title={item.name}>
                  {item.name}
                </div>
                <div className="text-base font-black text-slate-900 mt-1">
                  {item.totalOrdered} <span className="text-xs font-bold text-amber-700">{item.unit}</span>
                </div>
                {item.totalPicked !== item.totalOrdered && (
                  <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                    Pregătit: {item.totalPicked} {item.unit}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Căutare după magazin, număr comandă sau produs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-400 outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              onClick={() => setStatusFilter('confirmat')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'confirmat'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              De Pregătit ({confirmedCount})
            </button>
            <button
              onClick={() => setStatusFilter('inchis')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'inchis'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Finalizate / Închise ({closedCount})
            </button>
            <button
              onClick={() => setStatusFilter('toate')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'toate' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Toate ({orders.length})
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          Se încarcă comenzile pentru {formatDateRomanian(selectedDate)}...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
          <PackageCheck className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">Nu există comenzi conform filtrului</h3>
          <p className="text-xs text-slate-500">
            {statusFilter === 'confirmat'
              ? `Nu există comenzi în starea "confirmat" pentru livrare pe data de ${formatDateRomanian(selectedDate)}.`
              : `Nicio comandă găsită pentru data de ${formatDateRomanian(selectedDate)}.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOrders.map((order) => {
            const isConfirmed = order.state === 'confirmat';
            const isClosed = order.state === 'inchis';

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border transition-all p-5 shadow-xs ${
                  isConfirmed
                    ? 'border-blue-300 ring-1 ring-blue-200/50 hover:border-blue-400'
                    : 'border-slate-200/90'
                }`}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-3">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      {order.orderNumber}
                    </span>

                    <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm">
                      <Building2 className="w-4 h-4 text-amber-600" />
                      <span>{order.clientName}</span>
                    </div>

                    {isConfirmed && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        Confirmată de client
                      </span>
                    )}

                    {isClosed && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Închisă & Cântărită
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 text-xs">
                    <span className="text-slate-500">
                      Plasată: {formatDateRomanian(order.orderDate)}
                    </span>
                    <span className="text-base font-black text-slate-950">
                      {order.totalAmount.toFixed(2)} lei
                    </span>
                  </div>
                </div>

                {/* Products list with comparison */}
                <div className="py-4">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase">
                        <th className="py-1.5 px-2">Cod</th>
                        <th className="py-1.5 px-2">Produs</th>
                        <th className="py-1.5 px-2 text-center">Unitate</th>
                        <th className="py-1.5 px-2 text-right">Cantitate Comandată</th>
                        <th className="py-1.5 px-2 text-right">Cantitate Pregătită / Cântărită</th>
                        <th className="py-1.5 px-2 text-right">Valoare Linie</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {order.items.map((it, idx) => {
                        const finalQty = it.pickedQuantity !== undefined ? it.pickedQuantity : it.orderedQuantity;
                        const isDiff = isClosed && it.pickedQuantity !== undefined && it.pickedQuantity !== it.orderedQuantity;

                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-2 font-mono text-slate-500">{it.productCode}</td>
                            <td className="py-2 px-2 font-semibold text-slate-900">{it.productName}</td>
                            <td className="py-2 px-2 text-center">
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[11px]">
                                {it.unit}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right text-slate-700 font-bold">
                              {it.orderedQuantity} {it.unit}
                            </td>
                            <td className="py-2 px-2 text-right">
                              {isClosed ? (
                                <span className={`font-black text-xs ${isDiff ? 'text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded' : 'text-slate-900'}`}>
                                  {finalQty} {it.unit}
                                  {isDiff && <span className="text-[10px] font-normal text-amber-700 ml-1">(ajustat)</span>}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">În așteptare cântărire</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-right font-semibold text-slate-900">
                              {(finalQty * it.unitPrice).toFixed(2)} lei
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {order.notes && (
                    <div className="mt-3 p-2.5 bg-amber-50/60 border border-amber-200/50 rounded-xl text-xs text-amber-950 flex items-start gap-2">
                      <span className="font-bold">Notă client / livrare:</span>
                      <span>{order.notes}</span>
                    </div>
                  )}

                  {order.pickedByName && (
                    <div className="mt-2 text-xs text-slate-500">
                      Pregătit & cântărit de: <span className="font-semibold text-slate-800">{order.pickedByName}</span>
                      {order.pickedAt && (
                        <span> la {new Date(order.pickedAt).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2.5">
                  <button
                    type="button"
                    onClick={() => setOrderToPrint(order)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Tipărește Aviz</span>
                  </button>

                  {isConfirmed && (
                    <button
                      type="button"
                      onClick={() => setOrderToPick(order)}
                      className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                    >
                      <Scale className="w-4 h-4" />
                      <span>Preluare & Cântărire (Picking)</span>
                    </button>
                  )}

                  {isClosed && (
                    <button
                      type="button"
                      onClick={() => setOrderToPick(order)}
                      className="flex items-center space-x-1 px-3 py-1.5 text-slate-600 hover:bg-slate-100 font-medium text-xs rounded-xl transition cursor-pointer"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>Re-ajustează Cântărirea</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Picking Modal */}
      <PickOrderModal
        order={orderToPick}
        isOpen={!!orderToPick}
        onClose={() => setOrderToPick(null)}
        onSuccess={() => {}}
      />

      {/* Print Single Order Modal */}
      <PrintOrderModal
        order={orderToPrint}
        isOpen={!!orderToPrint}
        onClose={() => setOrderToPrint(null)}
      />

      {/* Batch Print Daily Picking Sheet Modal */}
      <PrintOrderModal
        order={null}
        batchOrders={orders.filter((o) => o.state === 'confirmat' || o.state === 'inchis')}
        batchDate={selectedDate}
        isOpen={isBatchPrintOpen}
        onClose={() => setIsBatchPrintOpen(false)}
      />
    </div>
  );
};
