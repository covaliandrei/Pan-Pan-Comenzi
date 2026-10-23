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
  Lock,
} from 'lucide-react';
import { Order } from '../../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getTodayString, getTomorrowString, formatDateRomanian, formatMoldovaTime } from '../../lib/initialData';
import { PickOrderModal } from '../modals/PickOrderModal';
import { PrintOrderModal } from '../modals/PrintOrderModal';
import { getLocalOrders } from '../../lib/ordersService';
import { useAuth } from '../../context/AuthContext';

export const ProductionDashboard: React.FC = () => {
  const { currentUser, isDemoUser, profile, role } = useAuth();
  
  const todayStr = getTodayString();
  const tomorrowStr = getTomorrowString();
  const minDate = todayStr;

  const [dateMode, setDateMode] = useState<'single' | 'range' | 'toate'>('single');
  const [selectedDate, setSelectedDate] = useState<string>(tomorrowStr);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(tomorrowStr);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'confirmat' | 'toate' | 'inchis'>('confirmat');
  const [search, setSearch] = useState<string>('');

  // Modals
  const [orderToPick, setOrderToPick] = useState<Order | null>(null);
  const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);
  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState<boolean>(false);

  const loadLocalOrders = () => {
    const allLocal = getLocalOrders();
    allLocal.sort((a, b) => {
      if (a.state === 'confirmat' && b.state !== 'confirmat') return -1;
      if (a.state !== 'confirmat' && b.state === 'confirmat') return 1;
      return (b.deliveryDate || '').localeCompare(a.deliveryDate || '') || a.orderNumber.localeCompare(b.orderNumber);
    });
    setOrders(allLocal);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    const ordersRef = collection(db, 'orders');

    const unsubscribe = onSnapshot(
      ordersRef,
      (snapshot) => {
        const firestoreList: Order[] = [];
        snapshot.forEach((docSnap) => {
          firestoreList.push({ ...docSnap.data(), id: docSnap.id } as Order);
        });

        const realOrders = firestoreList.filter((o) => !o.id.startsWith('demo-'));
        const local = getLocalOrders().filter((o) => !o.id.startsWith('demo-'));
        const fsOrderNumbers = new Set(realOrders.map((o) => o.orderNumber));
        const offlinePending = local.filter((o) => !fsOrderNumbers.has(o.orderNumber));
        const finalList = [...realOrders, ...offlinePending];

        finalList.sort((a, b) => {
          if (a.state === 'confirmat' && b.state !== 'confirmat') return -1;
          if (a.state !== 'confirmat' && b.state === 'confirmat') return 1;
          return (b.deliveryDate || '').localeCompare(a.deliveryDate || '') || a.orderNumber.localeCompare(b.orderNumber);
        });

        setOrders(finalList);
        setLoading(false);
      },
      (error) => {
        console.warn('Fallback to local orders for production on error:', error);
        loadLocalOrders();
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter orders for the selected delivery date or range
  const ordersForSelection = orders.filter((ord) => {
    if (dateMode === 'toate') return true;
    if (!ord.deliveryDate) return false;
    if (dateMode === 'range') {
      return ord.deliveryDate >= startDate && ord.deliveryDate <= endDate;
    }
    return ord.deliveryDate === selectedDate;
  });

  const dateLabel =
    dateMode === 'toate'
      ? 'Toate datele'
      : dateMode === 'range'
      ? `${formatDateRomanian(startDate)} – ${formatDateRomanian(endDate)}`
      : formatDateRomanian(selectedDate);

  // Aggregate daily requirements - consider ALL active orders for selected delivery date or range
  const dailyAggregates: Record<
    string,
    { name: string; code: string; unit: string; totalOrdered: number; totalPicked: number }
  > = {};

  ordersForSelection.forEach((ord) => {
    ord.items.forEach((item) => {
      const codeKey = (item.productCode || '').trim();
      const nameKey = (item.productName || '').trim().toLowerCase();

      const existingKey = Object.keys(dailyAggregates).find((k) => {
        const existing = dailyAggregates[k];
        if (codeKey && existing.code && existing.code.toLowerCase() === codeKey.toLowerCase()) return true;
        if (nameKey && existing.name.trim().toLowerCase() === nameKey) return true;
        return false;
      });

      const key = existingKey || (codeKey ? `code:${codeKey}` : `name:${nameKey}`);

      if (!dailyAggregates[key]) {
        dailyAggregates[key] = {
          name: item.productName,
          code: item.productCode || '',
          unit: item.unit || 'buc',
          totalOrdered: 0,
          totalPicked: 0,
        };
      }
      if (!dailyAggregates[key].code && item.productCode) {
        dailyAggregates[key].code = item.productCode;
      }

      const ordQty = Number(item.orderedQuantity || 0);
      dailyAggregates[key].totalOrdered = Number((dailyAggregates[key].totalOrdered + ordQty).toFixed(2));

      const picked =
        typeof item.pickedQuantity === 'number'
          ? item.pickedQuantity
          : ord.state === 'inchis'
          ? item.orderedQuantity
          : 0;
      dailyAggregates[key].totalPicked = Number((dailyAggregates[key].totalPicked + Number(picked || 0)).toFixed(2));
    });
  });

  const filteredOrders = ordersForSelection.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      o.items.some((it) => it.productName.toLowerCase().includes(search.toLowerCase()));

    const matchStatus = statusFilter === 'toate' || o.state === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeOrdersCount = ordersForSelection.length;
  const confirmedCount = ordersForSelection.filter((o) => o.state === 'confirmat').length;
  const closedCount = ordersForSelection.filter((o) => o.state === 'inchis').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Selector */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <Wheat className="w-4 h-4" />
            <span>Secția Ambalare</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Panou Producție Livrări</h1>
          <p className="text-sm text-slate-500 mt-1">
            Vizualizați comenzile pentru data sau intervalul selectat, efectuați cântărirea și pregătirea produselor (picking), și tipăriți foaia de livrări.
          </p>
        </div>

        {/* Date Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Quick Date Buttons */}
          <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-700 gap-1">
            <button
              type="button"
              onClick={() => {
                setDateMode('single');
                setSelectedDate(todayStr);
              }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                dateMode === 'single' && selectedDate === todayStr ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Azi ({formatDateRomanian(todayStr)})
            </button>
            <button
              type="button"
              onClick={() => {
                setDateMode('single');
                setSelectedDate(tomorrowStr);
              }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                dateMode === 'single' && selectedDate === tomorrowStr ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Mâine ({formatDateRomanian(tomorrowStr)})
            </button>
            <button
              type="button"
              onClick={() => setDateMode('range')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                dateMode === 'range' ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Interval (Range)
            </button>
            <button
              type="button"
              onClick={() => setDateMode('toate')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                dateMode === 'toate' ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Toate Datele
            </button>
          </div>

          {/* Date Inputs based on mode */}
          {dateMode === 'single' ? (
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
              <input
                type="date"
                min={minDate}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-amber-400 outline-hidden cursor-pointer"
                title="Selectează data de livrare"
              />
            </div>
          ) : dateMode === 'range' ? (
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2 text-xs">
              <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500">De la:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-amber-400 outline-hidden cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500">Până la:</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-amber-400 outline-hidden cursor-pointer"
                />
              </div>
            </div>
          ) : null}
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
                Necesar Producție & Livrări ({dateLabel})
              </h3>
              <p className="text-xs text-slate-500">
                Totaluri centralizate din cele {activeOrdersCount} comenzi {dateMode === 'toate' ? 'înregistrate în sistem' : 'pentru această dată sau interval de livrare'}.
              </p>
            </div>
          </div>

          {activeOrdersCount > 0 && (
            <button
              type="button"
              onClick={() => setIsBatchPrintOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Tipărește Foaie Zilnică Livrări</span>
            </button>
          )}
        </div>

        {Object.keys(dailyAggregates).length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            Nu există produse comandate pentru {dateLabel}.
          </div>
        ) : (
          <div className="pt-4 space-y-3">
            {/* Desktop / Tablet Table View */}
            <div className="hidden sm:block overflow-x-auto border border-slate-200/90 rounded-2xl shadow-xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">#</th>
                    <th className="py-2.5 px-3 w-20">Cod</th>
                    <th className="py-2.5 px-3">Denumire Produs</th>
                    <th className="py-2.5 px-3 text-center w-20">Unitate</th>
                    <th className="py-2.5 px-3 text-right w-36">Necesar Comandat</th>
                    <th className="py-2.5 px-3 text-right w-36">Cântărit / Pregătit</th>
                    <th className="py-2.5 px-3 text-center w-36">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {Object.entries(dailyAggregates).map(([id, item], idx) => {
                    const isDone = item.totalPicked >= item.totalOrdered && item.totalOrdered > 0;
                    const isPartial = item.totalPicked > 0 && item.totalPicked < item.totalOrdered;

                    return (
                      <tr key={id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 font-semibold">{item.code || '-'}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{item.name}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[11px]">
                            {item.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-sm font-black text-slate-950">
                          {item.totalOrdered} <span className="text-xs font-semibold text-slate-500">{item.unit}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-sm font-black">
                          <span className={isDone ? 'text-emerald-700' : isPartial ? 'text-amber-700' : 'text-slate-400'}>
                            {item.totalPicked} <span className="text-xs font-semibold text-slate-500">{item.unit}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isDone ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Pregătit 100%
                            </span>
                          ) : isPartial ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              În lucru ({item.totalPicked}/{item.totalOrdered})
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                              În așteptare
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile-Friendly List View */}
            <div className="block sm:hidden space-y-2.5">
              {Object.entries(dailyAggregates).map(([id, item]) => {
                const isDone = item.totalPicked >= item.totalOrdered && item.totalOrdered > 0;
                const isPartial = item.totalPicked > 0 && item.totalPicked < item.totalOrdered;
                const percent =
                  item.totalOrdered > 0
                    ? Math.min(100, Math.round((item.totalPicked / item.totalOrdered) * 100))
                    : 0;

                return (
                  <div key={id} className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {item.code && (
                          <span className="font-mono text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 mr-1.5">
                            {item.code}
                          </span>
                        )}
                        <span className="font-bold text-slate-900 text-xs">{item.name}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 font-bold rounded text-[11px] shrink-0">
                        {item.unit}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200/60 text-xs">
                      <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Necesar Comandat</span>
                        <span className="text-sm font-black text-slate-900 mt-0.5 block">
                          {item.totalOrdered} {item.unit}
                        </span>
                      </div>

                      <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Cântărit / Pregătit</span>
                        <span
                          className={`text-sm font-black mt-0.5 block ${
                            isDone ? 'text-emerald-700' : isPartial ? 'text-amber-700' : 'text-slate-400'
                          }`}
                        >
                          {item.totalPicked} {item.unit}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          isDone ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
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
            const currentUserId = currentUser?.uid || profile?.id;
            const isAssignedToOther = Boolean(order.pickedBy && order.pickedBy !== currentUserId && role !== 'admin');
            const isAssignedToMe = Boolean(order.pickedBy && order.pickedBy === currentUserId);

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
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="font-mono text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      {order.orderNumber}
                    </span>

                    <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm">
                      <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Destinatar (Punct de Livrare): <strong className="text-slate-900">{order.clientName}</strong></span>
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

                    {order.pickedByName && isConfirmed && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                        <Lock className="w-3 h-3 text-amber-600" />
                        <span>În lucru: {order.pickedByName}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-500">
                      Plasată: {formatDateRomanian(order.orderDate)}
                    </span>
                    <span className="font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Livrare: {formatDateRomanian(order.deliveryDate)}
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
                        <span> la {formatMoldovaTime(order.pickedAt)}</span>
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
                    isAssignedToOther ? (
                      <div
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-semibold border border-slate-200"
                        title={`Preluată de operatorul ${order.pickedByName}. Doar acest operator sau administratorul o poate finaliza.`}
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Preluată de {order.pickedByName}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOrderToPick(order)}
                        className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                      >
                        <Scale className="w-4 h-4" />
                        <span>{isAssignedToMe ? 'Continuă Cântărirea (Picking)' : 'Preluare & Cântărire (Picking)'}</span>
                      </button>
                    )
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
        batchOrders={ordersForSelection}
        batchDate={dateLabel}
        isOpen={isBatchPrintOpen}
        onClose={() => setIsBatchPrintOpen(false)}
      />
    </div>
  );
};
