import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShoppingBag,
  Package,
  FileSpreadsheet,
  Trash2,
  Printer,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  PackageCheck,
  TrendingUp,
  Store,
  Coins,
  ArrowUpDown,
  Wheat,
  Users,
  Edit,
} from 'lucide-react';
import { Order, UserProfile } from '../../types';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatDateRomanian } from '../../lib/initialData';
import { ConfirmModal } from '../modals/ConfirmModal';
import { PrintOrderModal } from '../modals/PrintOrderModal';
import { EditOrderModal } from '../modals/EditOrderModal';
import { ProductManagement } from './ProductManagement';
import { CsvProductImport } from './CsvProductImport';
import { UserManagement } from './UserManagement';
import { useAuth } from '../../context/AuthContext';
import { getLocalOrders, updateOrder, deleteOrder } from '../../lib/ordersService';

export const AdminDashboard: React.FC<{
  onSwitchToClient: () => void;
  onSwitchToProduction: () => void;
}> = ({ onSwitchToClient, onSwitchToProduction }) => {
  const { profile, currentUser, isDemoUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'users' | 'csv'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('toate');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Modals
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);

  const loadLocalFallback = () => {
    const list = getLocalOrders();
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    setOrders(list);
    setLoadingOrders(false);
  };

  useEffect(() => {
    setLoadingOrders(true);
    const unsubscribe = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as Order);
        });
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setOrders(list);
        setLoadingOrders(false);
      },
      (error) => {
        console.warn('Fallback to local orders on admin listener error:', error);
        loadLocalFallback();
      }
    );

    return () => unsubscribe();
  }, []);

  const handleDeleteOrder = async (order: Order) => {
    try {
      await deleteOrder(order.id, isDemoUser || !currentUser);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      setOrderToDelete(null);
    } catch (err) {
      console.error('Error deleting order:', err);
    }
  };

  const handleUpdateOrderState = async (order: Order, newState: 'creat' | 'confirmat' | 'inchis') => {
    try {
      await updateOrder(order.id, { state: newState }, isDemoUser || !currentUser);
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, state: newState } : o))
      );
    } catch (err) {
      console.error('Error updating state:', err);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      o.clientEmail?.toLowerCase().includes(search.toLowerCase());
    const matchState = stateFilter === 'toate' || o.state === stateFilter;
    const matchDate = !dateFilter || o.deliveryDate === dateFilter;
    return matchSearch && matchState && matchDate;
  });

  // KPI Calculations
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const countCreated = orders.filter((o) => o.state === 'creat').length;
  const countConfirmed = orders.filter((o) => o.state === 'confirmat').length;
  const countClosed = orders.filter((o) => o.state === 'inchis').length;
  const uniqueClients = Array.from(new Set(orders.map((o) => o.clientName).filter(Boolean))).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI metrics */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Panou Administrator & Manager</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pan Pan Comenzi - Administrare</h1>
          <p className="text-sm text-slate-500 mt-1">
            Control complet asupra catalogului, comenzilor tuturor punctelor de desfacere și proceselor de producție.
          </p>
        </div>

        {/* Action switch buttons allowing Admin to do same things as other users */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSwitchToClient}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
            title="Plasează o comandă ca punct de desfacere"
          >
            <ShoppingBag className="w-4 h-4 text-slate-600" />
            <span>Comandă Client</span>
          </button>

          <button
            type="button"
            onClick={onSwitchToProduction}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
            title="Mergi în secția de coacere și cântărire"
          >
            <Wheat className="w-4 h-4 text-amber-600" />
            <span>Mod Producție</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Comenzi</span>
            <ShoppingBag className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-950">{orders.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            <span className="text-amber-600 font-bold">{countCreated}</span> ciorne,{' '}
            <span className="text-blue-600 font-bold">{countConfirmed}</span> în producție
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Finalizate</span>
            <PackageCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-800">{countClosed}</div>
          <div className="text-[11px] text-slate-400 mt-1">Comenzi livrate cu succes</div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Puncte Active</span>
            <Store className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-950">{uniqueClients || 1}</div>
          <div className="text-[11px] text-slate-400 mt-1">Magazine & clienți parteneri</div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Valoare Rulată</span>
            <Coins className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-950">{totalRevenue.toFixed(2)} lei</div>
          <div className="text-[11px] text-slate-400 mt-1">total rulat în sistem</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'orders'
              ? 'border-amber-500 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Toate Comenzile ({orders.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'products'
              ? 'border-amber-500 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Catalog Produse Brutărie
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'users'
              ? 'border-amber-500 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Utilizatori & Magazine</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('csv')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'csv'
              ? 'border-amber-500 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Import CSV Produse</span>
        </button>
      </div>

      {/* Tab 1: Orders Management */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Căutare după număr comandă, nume magazin sau email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-400 outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
                <button
                  onClick={() => setStateFilter('toate')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    stateFilter === 'toate' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  Toate
                </button>
                <button
                  onClick={() => setStateFilter('creat')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    stateFilter === 'creat' ? 'bg-white text-amber-800 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  Create
                </button>
                <button
                  onClick={() => setStateFilter('confirmat')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    stateFilter === 'confirmat' ? 'bg-white text-blue-800 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  Confirmate
                </button>
                <button
                  onClick={() => setStateFilter('inchis')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    stateFilter === 'inchis' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  Închise
                </button>
              </div>

              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                title="Filtrează după data livrării"
                className="text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-amber-400 outline-hidden"
              />

              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  Șterge data
                </button>
              )}
            </div>
          </div>

          {/* Orders Table */}
          {loadingOrders ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
              Se încarcă comenzile...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">Nu au fost găsite comenzi</h3>
              <p className="text-xs text-slate-500">
                Nicio comandă nu corespunde filtrelor selectate.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Nr. Comandă</th>
                      <th className="py-3 px-4">Punct de Lucru / Client</th>
                      <th className="py-3 px-4">Data Plasării</th>
                      <th className="py-3 px-4">Data Livrării</th>
                      <th className="py-3 px-4 text-center">Stare</th>
                      <th className="py-3 px-4 text-right">Articole</th>
                      <th className="py-3 px-4 text-right">Valoare</th>
                      <th className="py-3 px-4 text-right">Acțiuni Administrator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {ord.orderNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{ord.clientName}</div>
                          <div className="text-[11px] text-slate-400">{ord.clientEmail}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{formatDateRomanian(ord.orderDate)}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {formatDateRomanian(ord.deliveryDate)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <select
                            value={ord.state}
                            onChange={(e) => handleUpdateOrderState(ord, e.target.value as any)}
                            className={`text-[11px] font-bold px-2 py-1 rounded-full border focus:outline-hidden cursor-pointer ${
                              ord.state === 'creat'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : ord.state === 'confirmat'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            <option value="creat">Creată (Ciornă)</option>
                            <option value="confirmat">Confirmată (Producție)</option>
                            <option value="inchis">Închisă (Livrată)</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-600">
                          {ord.items.length} produse
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-950 text-sm">
                          {ord.totalAmount.toFixed(2)} lei
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Manager can edit any order in any state */}
                            <button
                              type="button"
                              onClick={() => setOrderToEdit(ord)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                              title="Editează comanda (dată livrare, produse, cantități, stare)"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setOrderToPrint(ord)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title="Tipărește aviz"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Manager can delete orders with ANY state, with confirmation pop-up */}
                            <button
                              type="button"
                              onClick={() => setOrderToDelete(ord)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                              title="Șterge comanda (Disponibil oricărei stări pentru administrator)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Products Catalog */}
      {activeTab === 'products' && (
        <ProductManagement onOpenCsvImport={() => setActiveTab('csv')} />
      )}

      {/* Tab 3: Users & Stores Management */}
      {activeTab === 'users' && <UserManagement />}

      {/* Tab 4: CSV Import */}
      {activeTab === 'csv' && (
        <CsvProductImport
          onSuccess={() => setActiveTab('products')}
          onCancel={() => setActiveTab('products')}
        />
      )}

      {/* Delete Confirmation Modal for ANY state order */}
      <ConfirmModal
        isOpen={!!orderToDelete}
        title="Ștergere Comandă (Privilegiu Administrator)"
        message={`Sunteți pe cale să ștergeți comanda ${orderToDelete?.orderNumber} aparținând clientului "${orderToDelete?.clientName}" cu starea "${orderToDelete?.state}". Această acțiune va șterge ireversibil înregistrarea din baza de date.`}
        confirmLabel="Da, șterge comanda definitiv"
        cancelLabel="Anulează"
        isDestructive={true}
        onConfirm={() => orderToDelete && handleDeleteOrder(orderToDelete)}
        onClose={() => setOrderToDelete(null)}
      />

      {/* Print Single Order Modal */}
      <PrintOrderModal
        order={orderToPrint}
        isOpen={!!orderToPrint}
        onClose={() => setOrderToPrint(null)}
      />

      {/* Edit Order Modal */}
      <EditOrderModal
        order={orderToEdit}
        isOpen={!!orderToEdit}
        onClose={() => setOrderToEdit(null)}
        onSuccess={() => setOrderToEdit(null)}
      />
    </div>
  );
};
