import React, { useState } from 'react';
import { X, User, Mail, Lock, Store, Phone, ShieldCheck, Wheat, AlertCircle } from 'lucide-react';
import { UserProfile, UserRole } from '../../types';
import { createNewUserByAdmin, updateUserProfile } from '../../lib/userService';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialUser?: UserProfile | null;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialUser,
}) => {
  const isEditing = Boolean(initialUser);

  const [displayName, setDisplayName] = useState(initialUser?.displayName || '');
  const [email, setEmail] = useState(initialUser?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(initialUser?.role || 'client');
  const [tradingPointName, setTradingPointName] = useState(initialUser?.tradingPointName || '');
  const [phone, setPhone] = useState(initialUser?.phone || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!displayName.trim()) {
      setErrorMsg('Vă rugăm să introduceți numele persoanei de contact.');
      return;
    }

    if (!isEditing) {
      if (!email.trim()) {
        setErrorMsg('Vă rugăm să introduceți adresa de email.');
        return;
      }
      if (!password || password.length < 6) {
        setErrorMsg('Parola trebuie să aibă cel puțin 6 caractere.');
        return;
      }
    }

    if (role === 'client' && !tradingPointName.trim()) {
      setErrorMsg('Vă rugăm să specificați denumirea punctului de desfacere / magazinului.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && initialUser) {
        await updateUserProfile(initialUser.id, {
          displayName: displayName.trim(),
          role,
          tradingPointName: role === 'client' ? tradingPointName.trim() : '',
          phone: phone.trim(),
        });
      } else {
        await createNewUserByAdmin({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
          role,
          tradingPointName: role === 'client' ? tradingPointName.trim() : '',
          phone: phone.trim(),
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving user:', err);
      setErrorMsg(err?.message || 'A apărut o eroare la salvarea utilizatorului.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {isEditing ? 'Modificare Utilizator' : 'Adăugare Utilizator Nou'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? `Editare detalii pentru ${initialUser?.email}`
                  : 'Configurați un cont de acces pentru magazin, brutar sau manager'}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Role selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Rol Utilizator *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setRole('client')}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  role === 'client'
                    ? 'border-amber-500 bg-amber-50/60 text-amber-950 font-bold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Store className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                <span className="text-[11px] block leading-tight">Punct Livrare</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('production')}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  role === 'production'
                    ? 'border-amber-500 bg-amber-50/60 text-amber-950 font-bold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Wheat className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                <span className="text-[11px] block leading-tight">Producție</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  role === 'admin'
                    ? 'border-amber-500 bg-amber-50/60 text-amber-950 font-bold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                <span className="text-[11px] block leading-tight">Manager</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('pending')}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  role === 'pending'
                    ? 'border-rose-500 bg-rose-50 text-rose-950 font-bold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <AlertCircle className="w-4 h-4 mx-auto mb-1 text-rose-600" />
                <span className="text-[11px] block leading-tight">Fără Drepturi</span>
              </button>
            </div>
          </div>

          {/* Trading point name (for clients) */}
          {role === 'client' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Denumire Punct de Livrare / Magazin *
              </label>
              <div className="relative">
                <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Magazin bd. Moscovei / Magazin Botanica"
                  value={tradingPointName}
                  onChange={(e) => setTradingPointName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-500 outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Display Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Nume Persoană Contact / Reprezentant *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                placeholder="Ex: Ion Popescu / Elena Rusu"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-500 outline-hidden"
              />
            </div>
          </div>

          {/* Email and Password (only for new user) */}
          {!isEditing ? (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Adresă de Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="magazin@panpan.md"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Parolă Inițială *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Minim 6 caractere"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-500 outline-hidden"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Adresă de Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 bg-slate-100 text-slate-500 rounded-xl cursor-not-allowed outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Număr Telefon (opțional)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="tel"
                placeholder="Ex: 069 123 456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-500 outline-hidden"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting
                ? 'Se salvează...'
                : isEditing
                ? 'Salvează Modificările'
                : 'Creează Utilizator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
