import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Package } from 'lucide-react';
import { Product, ProductUnit } from '../../types';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/errors';
import { cleanFirestorePayload } from '../../lib/sanitizer';

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  'Pâine Artizanală',
  'Pâine la Kilogram',
  'Specialități',
  'Viennoiserie',
  'Patiserie Dulce',
  'Plăcinte & Patiserie Sărată',
  'Chifle & Panificație',
  'Tradiționale & Sărbători',
  'Altele',
];

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [unit, setUnit] = useState<ProductUnit>('buc');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [price, setPrice] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (product) {
      setName(product.name);
      setCode(product.code);
      setUnit(product.unit);
      setCategory(product.category || CATEGORIES[0]);
      setPrice(product.price);
      setDescription(product.description || '');
      setActive(product.active !== false);
      setErrorMsg('');
    } else {
      setName('');
      setCode('');
      setUnit('buc');
      setCategory(CATEGORIES[0]);
      setPrice(0);
      setDescription('');
      setActive(true);
      setErrorMsg('');
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setErrorMsg('');

      if (!name.trim()) {
        setErrorMsg('Vă rugăm să introduceți denumirea produsului.');
        setIsSubmitting(false);
        return;
      }

      if (!code.trim()) {
        setErrorMsg('Vă rugăm să specificați un cod produs.');
        setIsSubmitting(false);
        return;
      }

      if (price <= 0) {
        setErrorMsg('Prețul produsului trebuie să fie mai mare de 0 lei.');
        setIsSubmitting(false);
        return;
      }

      const productData = cleanFirestorePayload({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        unit,
        category,
        price: Number(price),
        description: description.trim() || '',
        active,
        updatedAt: new Date().toISOString(),
      });

      if (product) {
        // Edit existing product
        await setDoc(doc(db, 'products', product.id), productData, { merge: true });
      } else {
        // Add new product
        await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: new Date().toISOString(),
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Eroare la salvarea produsului:', err);
      try {
        handleFirestoreError(err, product ? OperationType.UPDATE : OperationType.CREATE, 'products');
      } catch (e) {
        setErrorMsg('Nu s-a putut salva produsul. Verificați conexiunea.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base leading-tight">
              {product ? 'Editare Produs Brutărie' : 'Adăugare Produs Nou'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Denumire Produs *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Pâine albă artizanală cu maia"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cod / SKU *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: PA-01"
                className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-500 outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Categorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-500 outline-hidden"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unitate de Măsură *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUnit('buc')}
                  className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                    unit === 'buc'
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  buc (bucăți)
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('kg')}
                  className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                    unit === 'kg'
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  kg (greutate)
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Preț Unitar (lei) *
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full pl-3 pr-12 py-2 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-500 outline-hidden"
              />
              <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">
                lei / {unit}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descriere & Ingrediente (opțional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Făină tip 650, maia naturală hidratare 80%, dospire lentă 24h..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-500 outline-hidden"
            />
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <input
              type="checkbox"
              id="activeProductCheck"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 text-amber-500 border-slate-300 rounded-sm focus:ring-amber-400 cursor-pointer"
            />
            <label htmlFor="activeProductCheck" className="text-xs font-medium text-slate-700 cursor-pointer">
              Produs activ (disponibil pentru comenzi în catalog)
            </label>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-5 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 rounded-xl shadow-xs transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Se salvează...' : 'Salvează Produsul'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
