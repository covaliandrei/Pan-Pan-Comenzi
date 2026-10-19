import React, { useState, useEffect } from 'react';
import { X, Tag, Plus, Edit2, Trash2, AlertCircle, CheckCircle, Package } from 'lucide-react';
import { ProductCategory, Product } from '../../types';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DEFAULT_CATEGORIES } from '../../lib/initialData';
import { cleanFirestorePayload } from '../../lib/sanitizer';

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  isOpen,
  onClose,
  products,
}) => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        const list: ProductCategory[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as ProductCategory);
        });

        if (list.length === 0) {
          // Initialize from DEFAULT_CATEGORIES
          const defaults: ProductCategory[] = DEFAULT_CATEGORIES.map((cat, idx) => ({
            id: `cat-default-${idx}`,
            name: cat,
          }));
          setCategories(defaults);
        } else {
          list.sort((a, b) => a.name.localeCompare(b.name));
          setCategories(list);
        }
      },
      (err) => {
        console.warn('Fallback categorii:', err);
        setCategories(DEFAULT_CATEGORIES.map((cat, idx) => ({ id: `cat-default-${idx}`, name: cat })));
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setMessage({ type: 'error', text: 'O categorie cu această denumire există deja.' });
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage(null);
      await addDoc(
        collection(db, 'categories'),
        cleanFirestorePayload({
          name: trimmed,
          createdAt: new Date().toISOString(),
        })
      );
      setNewCatName('');
      setMessage({ type: 'success', text: `Categoria "${trimmed}" a fost adăugată.` });
    } catch (err: any) {
      console.error('Eroare la adăugarea categoriei:', err);
      setMessage({ type: 'error', text: 'Nu s-a putut adăuga categoria.' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage(null), 3500);
    }
  };

  const handleStartEdit = (cat: ProductCategory) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
    setMessage(null);
  };

  const handleSaveEdit = async (cat: ProductCategory) => {
    const trimmed = editingCatName.trim();
    if (!trimmed || trimmed === cat.name) {
      setEditingCatId(null);
      return;
    }

    if (categories.some((c) => c.id !== cat.id && c.name.toLowerCase() === trimmed.toLowerCase())) {
      setMessage({ type: 'error', text: 'O altă categorie cu această denumire există deja.' });
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage(null);

      // Update category doc in Firestore if not local init
      if (!cat.id.startsWith('cat-default-')) {
        await updateDoc(doc(db, 'categories', cat.id), {
          name: trimmed,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Save new to Firestore
        await addDoc(
          collection(db, 'categories'),
          cleanFirestorePayload({
            name: trimmed,
            createdAt: new Date().toISOString(),
          })
        );
      }

      // Update products that use this category name
      const oldName = cat.name;
      const prodsToUpdate = products.filter((p) => p.category === oldName && !p.id.startsWith('init-'));
      for (const prod of prodsToUpdate) {
        try {
          await updateDoc(doc(db, 'products', prod.id), {
            category: trimmed,
            updatedAt: new Date().toISOString(),
          });
        } catch {
          // ignore individual update error
        }
      }

      setEditingCatId(null);
      setMessage({
        type: 'success',
        text: `Categoria a fost redenumită în "${trimmed}". (${prodsToUpdate.length} produse actualizate)`,
      });
    } catch (err: any) {
      console.error('Eroare redenumire categorie:', err);
      setMessage({ type: 'error', text: 'Eroare la actualizarea categoriei.' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage(null), 3500);
    }
  };

  const handleDeleteCategory = async (cat: ProductCategory) => {
    const count = products.filter((p) => p.category === cat.name).length;
    if (count > 0) {
      setMessage({
        type: 'error',
        text: `Categoria "${cat.name}" conține ${count} produse asociate. Nu poate fi ștearsă până nu reatribuiți sau ștergeți produsele respective.`,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage(null);
      if (!cat.id.startsWith('cat-default-')) {
        await deleteDoc(doc(db, 'categories', cat.id));
      } else {
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      }
      setMessage({ type: 'success', text: `Categoria "${cat.name}" a fost ștearsă.` });
    } catch (err: any) {
      console.error('Eroare la ștergerea categoriei:', err);
      setMessage({ type: 'error', text: 'Eroare la ștergerea categoriei.' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage(null), 3500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Gestiune Categorii Produse
              </h2>
              <p className="text-xs text-slate-500">
                Adăugați, redenumiți sau ștergeți categorii din catalogul brutăriei
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {message && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 border ${
                message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              placeholder="Nume categorie nouă (ex: Pâine cu Semințe)..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-400 outline-hidden font-medium"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newCatName.trim()}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Adaugă</span>
            </button>
          </form>

          {/* Categories List */}
          <div className="border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-100">
            {categories.map((cat) => {
              const productCount = products.filter((p) => p.category === cat.name).length;
              const isEditing = editingCatId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition bg-white"
                >
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          className="flex-1 text-xs px-2.5 py-1.5 border border-amber-400 rounded-lg focus:ring-2 focus:ring-amber-400 outline-hidden bg-amber-50/20"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(cat)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Salvează
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCatId(null)}
                          className="px-2 py-1.5 text-slate-500 hover:text-slate-800 text-xs transition cursor-pointer"
                        >
                          Anulează
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs truncate">{cat.name}</span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            productCount > 0
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {productCount} {productCount === 1 ? 'produs' : 'produse'}
                        </span>
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        title="Redenumește categoria"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        disabled={productCount > 0}
                        className={`p-1.5 rounded-lg transition ${
                          productCount > 0
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer'
                        }`}
                        title={
                          productCount > 0
                            ? `Nu poate fi ștearsă (conține ${productCount} produse)`
                            : 'Șterge categoria'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
};
