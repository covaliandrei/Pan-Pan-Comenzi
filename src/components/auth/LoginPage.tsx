import React, { useState } from 'react';
import {
  Wheat,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const { loginWithEmail, loginWithGoogle, quickDemoLogin } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      console.error('Eroare autentificare:', err);
      let userReadable = err.message || 'A apărut o problemă la conectare. Verificați datele introduse.';
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        userReadable = 'Email-ul sau parola sunt incorecte. Contactați administratorul brutăriei dacă aveți nevoie de resetare.';
      } else if (err.code === 'auth/weak-password') {
        userReadable = 'Parola trebuie să conțină cel puțin 6 caractere.';
      }
      setErrorMsg(userReadable);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Eroare Google login:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMsg('Conectarea cu Google a eșuat. Puteți folosi autentificarea cu email sau accesul demonstrativ de mai jos.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = async (demoRole: UserRole) => {
    setErrorMsg('');
    setLoading(true);
    try {
      await quickDemoLogin(demoRole);
    } catch (err: any) {
      setErrorMsg('Nu s-a putut realiza conectarea demo: ' + (err.message || 'Eroare necunoscută'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 text-amber-400 shadow-lg mb-3">
            <Wheat className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Pan Pan Comenzi</h2>
          <p className="mt-1 text-sm text-slate-600 font-medium">
            Sistem Gestiune Comenzi Brutărie & Producție (OMS)
          </p>
        </div>

        {/* Card */}
        <div className="mt-6 bg-white py-8 px-6 shadow-xl border border-slate-200/80 rounded-3xl sm:px-10">
          <div className="mb-5 text-center">
            <h3 className="text-lg font-black text-slate-900">Autentificare în Sistem</h3>
            <p className="text-xs text-slate-500 mt-1">
              Introduceți datele de acces furnizate de conducerea brutăriei.
            </p>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer mb-5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Conectare rapidă cu Google</span>
          </button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400 font-medium">sau cu email și parolă</span>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Adresă de Email *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="nume@panpan.md"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-500 outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Parolă *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="Introduceți parola de acces"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-500 outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl shadow-md transition cursor-pointer mt-2"
            >
              <span>{loading ? 'Se verifică datele...' : 'Intră în cont'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Notice about accounts managed by Admin */}
          <div className="mt-5 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-2.5 text-slate-500 text-[11px] leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Conturile pentru punctele de vânzare și personal sunt create și administrate exclusiv de conducerea brutăriei. Pentru crearea sau modificarea unui cont, contactați administratorul.
            </span>
          </div>

          {/* Quick Demo Accounts Helper */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Acces Rapid Demonstrativ (Fără parolă)</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleDemoClick('client')}
                disabled={loading}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50/50 hover:border-amber-300 transition text-xs flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="font-bold text-slate-900 block">Punct de Lucru / Client</span>
                  <span className="text-[11px] text-slate-500">Magazin Central Unirii (plasează și confirmă comenzi)</span>
                </div>
                <span className="text-amber-700 font-bold text-[11px]">Intră &rarr;</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoClick('production')}
                disabled={loading}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50/50 hover:border-amber-300 transition text-xs flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="font-bold text-slate-900 block">Personal Producție Brutărie</span>
                  <span className="text-[11px] text-slate-500">Șef Tură (cântărire, picking, foaie coacere)</span>
                </div>
                <span className="text-amber-700 font-bold text-[11px]">Intră &rarr;</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoClick('admin')}
                disabled={loading}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50/50 hover:border-amber-300 transition text-xs flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="font-bold text-slate-900 block">Manager / Administrator</span>
                  <span className="text-[11px] text-slate-500">Gestiune utilizatori, catalog, import CSV, toate comenzile</span>
                </div>
                <span className="text-amber-700 font-bold text-[11px]">Intră &rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
