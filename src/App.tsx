import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { Sidebar } from './components/layout/Sidebar';
import { ClientOrdersList } from './components/client/ClientOrdersList';
import { ClientNewOrder } from './components/client/ClientNewOrder';
import { ProductionDashboard } from './components/production/ProductionDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Menu, Wheat, Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser, isDemoUser, loading, activeRole } = useAuth();
  const [currentView, setCurrentView] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Set default view based on active role
  useEffect(() => {
    if (activeRole === 'client') {
      setCurrentView('client-orders');
    } else if (activeRole === 'production') {
      setCurrentView('production-dashboard');
    } else if (activeRole === 'admin') {
      setCurrentView('admin-dashboard');
    }
  }, [activeRole]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold mb-4 shadow-lg shadow-amber-500/20">
          <Wheat className="w-7 h-7" />
        </div>
        <div className="flex items-center space-x-2 text-slate-300 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          <span>Se inițializează Pan Pan Comenzi...</span>
        </div>
      </div>
    );
  }

  if (!currentUser && !isDemoUser) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Dark Navy Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen">
        {/* Mobile Top Header */}
        <header className="lg:hidden no-print sticky top-0 z-30 bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 shadow-sm">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Wheat className="w-5 h-5" />
            </div>
            <span className="font-black text-base tracking-tight">Pan Pan Comenzi</span>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            aria-label="Deschide meniu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Dynamic Main View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentView === 'client-orders' && (
            <ClientOrdersList onNewOrderClick={() => setCurrentView('client-new-order')} />
          )}

          {currentView === 'client-new-order' && (
            <ClientNewOrder onOrderCreated={() => setCurrentView('client-orders')} />
          )}

          {currentView === 'production-dashboard' && <ProductionDashboard />}

          {currentView === 'admin-dashboard' && (
            <AdminDashboard
              onSwitchToClient={() => setCurrentView('client-new-order')}
              onSwitchToProduction={() => setCurrentView('production-dashboard')}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
