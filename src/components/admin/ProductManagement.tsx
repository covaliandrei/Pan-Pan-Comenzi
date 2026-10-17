import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Sparkles,
  FileSpreadsheet,
  Coins,
} from 'lucide-react';
import { Product } from '../../types';
import { collection, onSnapshot, doc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ProductModal } from '../modals/ProductModal';
import { ConfirmModal } from '../modals/ConfirmModal';
import { INITIAL_PRODUCTS } from '../../lib/initialData';
import { cleanFirestorePayload } from '../../lib/sanitizer';

export const ProductManagement: React.FC<{ onOpenCsvImport: () => void }> = ({ onOpenCsvImport }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Toate');

  // Modals
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const prods: Product[] = [];
        snapshot.forEach((d) => {
          prods.push({ ...d.data(), id: d.id } as Product);
        });
        prods.sort((a, b) => a.name.localeCompare(b.name));
        setProducts(prods.length > 0 ? prods : INITIAL_PRODUCTS.map((p, idx) => ({ ...p, id: `init-${p.code || idx}` })));
        setLoading(false);
      },
      (error) => {
        console.warn('Fallback to initial products on error:', error);
        setProducts(INITIAL_PRODUCTS.map((p, idx) => ({ ...p, id: `init-${p.code || idx}` })));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleToggleActive = async (prod: Product) => {
    try {
      if (prod.id.startsWith('init-')) {
        setProducts((prev) =>
          prev.map((p) => (p.id === prod.id ? { ...p, active: !p.active } : p))
        );
        return;
      }
      await updateDoc(doc(db, 'products', prod.id), {
        active: !prod.active,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error updating product status:', err);
    }
  };

  const handleDeleteProduct = async (prod: Product) => {
    try {
      if (prod.id.startsWith('init-')) {
        setProducts((prev) => prev.filter((p) => p.id !== prod.id));
        setProductToDelete(null);
        return;
      }
      await deleteDoc(doc(db, 'products', prod.id));
      setProductToDelete(null);
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  const seedDefaultCatalog = async () => {
    try {
      setIsSeeding(true);
      for (const p of INITIAL_PRODUCTS) {
        const already = products.some((existing) => existing.code === p.code && !existing.id.startsWith('init-'));
        if (!already) {
          await addDoc(collection(db, 'products'), cleanFirestorePayload({
            ...p,
            createdAt: new Date().toISOString(),
          }));
        }
      }
    } catch (err) {
      console.error('Error seeding catalog:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  const [isResettingPrices, setIsResettingPrices] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleResetAllPricesToZero = async () => {
    try {
      setIsResettingPrices(true);
      setResetMessage(null);
      let count = 0;
      for (const prod of products) {
        if (!prod.id.startsWith('init-')) {
          await updateDoc(doc(db, 'products', prod.id), {
            price: 0,
            updatedAt: new Date().toISOString(),
          });
          count++;
        }
      }
      setResetMessage(`Prețurile pentru ${count} produse au fost setate la 0 lei în baza de date.`);
      setTimeout(() => setResetMessage(null), 5000);
    } catch (err) {
      console.error('Error resetting prices:', err);
      setResetMessage('A apărut o eroare la actualizarea prețurilor.');
    } finally {
      setIsResettingPrices(false);
    }
  };

  const categories = ['Toate', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));

    const matchCat = categoryFilter === 'Toate' || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      {resetMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center justify-between">
          <span>{resetMessage}</span>
          <button
            type="button"
            onClick={() => setResetMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 font-normal underline ml-4 cursor-pointer"
          >
            Închide
          </button>
        </div>
      )}

      {/* Action Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-500" />
            Catalog Produse Brutărie ({products.length})
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gestionați produsele, unitățile de măsură (buc sau kg) și starea de activare. Prețurile pot fi 0 (funcționalul cu preț rămâne pentru viitor).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {products.length === 0 && (
            <button
              type="button"
              onClick={seedDefaultCatalog}
              disabled={isSeeding}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>{isSeeding ? 'Se adaugă...' : 'Inițializează Produse Brutărie'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleResetAllPricesToZero}
            disabled={isResettingPrices}
            title="Setează toate prețurile produselor la 0 lei în baza de date"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Coins className="w-4 h-4 text-amber-600" />
            <span>{isResettingPrices ? 'Se actualizează...' : 'Setează prețuri = 0'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenCsvImport}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-500" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adaugă Produs Nou</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Căutare după nume produs sau cod SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-400 outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          Se încarcă catalogul...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <Package className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">Nu a fost găsit niciun produs</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Nu există produse care să corespundă criteriilor de căutare. Puteți adăuga un produs nou sau importa din fișier CSV.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Cod</th>
                  <th className="py-3 px-4">Denumire Produs</th>
                  <th className="py-3 px-4">Categorie</th>
                  <th className="py-3 px-4 text-center">Unitate</th>
                  <th className="py-3 px-4 text-right">Preț Unitar (lei)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {p.code}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                      {p.description && (
                        <p className="text-slate-500 text-[11px] truncate max-w-xs">{p.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{p.category}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                          p.unit === 'kg'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {p.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                      {p.price.toFixed(2)} lei
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(p)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition ${
                          p.active !== false
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {p.active !== false ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>Activ</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-slate-400" />
                            <span>Inactiv</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          type="button"
                          onClick={() => setEditingProduct(p)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          title="Editează produs"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductToDelete(p)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Șterge produs"
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

      {/* Add / Edit Product Modal */}
      <ProductModal
        product={editingProduct}
        isOpen={isAddModalOpen || !!editingProduct}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingProduct(null);
        }}
        onSuccess={() => {}}
      />

      {/* Delete Product Confirmation */}
      <ConfirmModal
        isOpen={!!productToDelete}
        title="Ștergere Produs"
        message={`Sigur doriți să ștergeți produsul "${productToDelete?.name}" (${productToDelete?.code})?`}
        confirmLabel="Șterge Produsul"
        cancelLabel="Anulează"
        isDestructive={true}
        onConfirm={() => productToDelete && handleDeleteProduct(productToDelete)}
        onClose={() => setProductToDelete(null)}
      />
    </div>
  );
};
