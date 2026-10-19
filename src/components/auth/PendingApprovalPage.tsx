import React from 'react';
import { Wheat, Clock, Phone, Mail, LogOut, RefreshCw, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const PendingApprovalPage: React.FC = () => {
  const { currentUser, profile, logout } = useAuth();

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden text-slate-100">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-8 shadow-2xl backdrop-blur-md text-center">
        {/* Brand Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 mb-6">
          <Wheat className="w-9 h-9" />
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight mb-2">
          Pan Pan Comenzi
        </h1>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20 mb-6">
          <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>Cont în așteptare de aprobare</span>
        </div>

        <div className="bg-slate-900/60 rounded-2xl border border-slate-700/50 p-5 mb-6 text-left space-y-3">
          <p className="text-xs text-slate-400">
            Adresă de conectare:{' '}
            <strong className="text-slate-200 font-mono">{currentUser?.email || profile?.email}</strong>
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            Contul dumneavoastră a fost înregistrat cu succes în platforma brutăriei. Pentru securitatea comenzilor, toate funcționalitățile vor fi active imediat după confirmarea și atribuirea rolului de către un administrator sau manager.
          </p>
        </div>

        {/* Contact bakery info */}
        <div className="border-t border-slate-700/60 pt-5 mb-6 text-xs text-slate-400 space-y-2">
          <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
            Brutărie & Panificație Pan Pan
          </div>
          <div className="flex items-center justify-center gap-2 text-slate-300">
            <Phone className="w-3.5 h-3.5 text-amber-400" />
            <span>Telefon: <strong>061 030 063</strong></span>
          </div>
          <div className="flex items-center justify-center gap-2 text-slate-300">
            <Mail className="w-3.5 h-3.5 text-amber-400" />
            <span>Email: <strong>comenzi@panpan.md</strong></span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Verifică Aprobarea</span>
          </button>

          <button
            type="button"
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs rounded-xl transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Deconectare</span>
          </button>
        </div>
      </div>
    </div>
  );
};
