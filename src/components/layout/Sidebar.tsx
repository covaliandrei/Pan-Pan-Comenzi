import React from 'react';
import {
  Wheat,
  ShoppingBag,
  Send,
  PackageCheck,
  ShieldAlert,
  LogOut,
  Package,
  FileSpreadsheet,
  Store,
  ChevronRight,
  Layers,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { profile, role, activeRole, logout, setSimulatedRole } = useAuth();

  const handleRoleSimulation = (target: UserRole | null) => {
    if (setSimulatedRole) {
      setSimulatedRole(target);
    }
  };

  const roleLabel =
    activeRole === 'admin'
      ? 'Manager / Admin'
      : activeRole === 'production'
      ? 'Personal Producție'
      : 'Punct de Lucru / Client';

  const navItems = [
    // Client items
    ...(activeRole === 'client' || role === 'admin'
      ? [
          {
            id: 'client-orders',
            label: 'Comenzi',
            icon: ShoppingBag,
            badge: null,
            roleRequired: 'client',
          },
          {
            id: 'client-new-order',
            label: 'Comandă Nouă',
            icon: Send,
            badge: 'Adaugă',
            roleRequired: 'client',
          },
        ]
      : []),

    // Production items
    ...(activeRole === 'production' || role === 'admin'
      ? [
          {
            id: 'production-dashboard',
            label: 'Panou Producție Livrări',
            icon: PackageCheck,
            badge: null,
            roleRequired: 'production',
          },
        ]
      : []),

    // Admin items
    ...(role === 'admin'
      ? [
          {
            id: 'admin-dashboard',
            label: 'Panou Administrare',
            icon: ShieldAlert,
            badge: null,
            roleRequired: 'admin',
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container: Dark navy `#0f172a` */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-slate-900 text-slate-100 flex flex-col justify-between border-r border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Top: Logo & App Branding */}
        <div>
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
                <Wheat className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-black text-lg tracking-tight text-white leading-none">
                  Pan Pan Comenzi
                </h1>
                <p className="text-[11px] text-amber-400 font-semibold tracking-wider uppercase mt-1">
                  Brutărie &bull; OMS
                </p>
              </div>
            </div>

            {/* Close button on mobile */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Card */}
          <div className="p-4 mx-4 my-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                {profile?.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{profile?.displayName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                      activeRole === 'admin'
                        ? 'bg-purple-900/60 text-purple-300 border border-purple-700/60'
                        : activeRole === 'production'
                        ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60'
                        : 'bg-amber-900/60 text-amber-300 border border-amber-700/60'
                    }`}
                  >
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>

            {profile?.tradingPointName && (
              <div className="mt-2.5 pt-2 border-t border-slate-700/60 text-[11px] text-slate-300 flex items-center gap-1.5 truncate">
                <Store className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{profile.tradingPointName}</span>
              </div>
            )}
          </div>

          {/* Manager Role Simulator (Requirement: manager can do everything like any other user) */}
          {role === 'admin' && (
            <div className="mx-4 mb-4 p-3 rounded-xl bg-slate-950/60 border border-amber-500/20">
              <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  Vizualizare Rol
                </span>
                <span className="text-[10px] text-slate-400">Manager Mode</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleRoleSimulation('client')}
                  className={`py-1 px-1.5 rounded-lg font-semibold text-center transition cursor-pointer ${
                    activeRole === 'client'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Client
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSimulation('production')}
                  className={`py-1 px-1.5 rounded-lg font-semibold text-center transition cursor-pointer ${
                    activeRole === 'production'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Producție
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSimulation('admin')}
                  className={`py-1 px-1.5 rounded-lg font-semibold text-center transition cursor-pointer ${
                    activeRole === 'admin'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Admin
                </button>
              </div>
            </div>
          )}

          {/* Nav Items */}
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/10'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-slate-950 text-amber-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Sign Out Button */}
        <div className="p-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 border border-transparent hover:border-rose-900/40 transition cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <LogOut className="w-4 h-4" />
              <span>Deconectare (Sign Out)</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>
        </div>
      </aside>
    </>
  );
};
