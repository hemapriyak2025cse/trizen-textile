import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { OwnerDashboard } from './pages/OwnerDashboard';
import { WorkerDashboard } from './pages/WorkerDashboard';
import { ProfilePage } from './pages/ProfilePage';

import { Lock } from 'lucide-react';

function MainAppContent() {
  const { user, loading } = useAuth();
  const { t } = useLanguage(); 
  const [currentView, setCurrentView] = React.useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      return window.location.hash.replace('#', '') || 'home';
    }
    return 'home';
  });


  const changeView = (view: string) => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      window.location.hash = view;
    }
  };

  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setCurrentView(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F3EA] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#64152F] via-[#0D1224] to-[#0A0D16] border border-[#D4AF37] flex items-center justify-center mx-auto shadow-lg animate-pulse">
            <span className="font-serif font-black text-xl text-[#D4AF37]">T</span>
          </div>
          <div className="font-serif font-bold text-lg text-[#0D1224]">{t('common.app_name')}</div>
          <p className="text-xs text-gray-500 font-sans">{t('common.connecting')}</p>
        </div>
      </div>
    );
  }

  const renderView = () => {
    // 1. Unauthenticated Public Views
    if (currentView === 'home') {
      return <HomePage setCurrentView={changeView} />;
    }
    if (currentView === 'login') {
      return <LoginPage setCurrentView={changeView} />;
    }
    if (currentView === 'register') {
      return <RegisterPage setCurrentView={changeView} />;
    }

    // 2. Unauthenticated Guard: If user is not logged in, force Login view
    if (!user) {
      return (
        <LoginPage
          setCurrentView={changeView}
          redirectReason="Authentication required. Please sign in with your authorized credentials to access the console."
        />
      );
    }

    // 3. Authenticated Common View
    if (currentView === 'profile') {
      return <ProfilePage setCurrentView={changeView} />;
    }

    // 4. Role Authorization & Views
    const adminViews = ['admin-approvals', 'admin-owners', 'admin-workers', 'admin-logs'];
    const isAdminRequested = currentView.startsWith('admin-');

    // Admin Access Guard: Non-Admin users blocked from Admin views
    if (isAdminRequested) {
      if (user.role !== 'ADMIN') {
        return (
          <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
            <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-8 shadow-xl space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-serif font-bold text-gray-900">{t('common.access_restricted')}</h2>
              <p className="text-xs text-gray-600 leading-relaxed">
                You do not have Platform Administrator privileges. Your authenticated role is <strong className="uppercase font-mono text-[#64152F]">{user.role}</strong>.
              </p>
              <button
                onClick={() => changeView('dashboard')}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-[#0D1224] text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-black transition-all"
              >
                {t('common.return_dashboard')}
              </button>
            </div>
          </div>
        );
      }

      let tab: 'overview' | 'owner-approvals' | 'worker-approvals' | 'all-owners' | 'all-workers' | 'logs' = 'overview';
      if (currentView === 'admin-approvals') tab = 'owner-approvals';
      else if (currentView === 'admin-owners') tab = 'all-owners';
      else if (currentView === 'admin-workers') tab = 'all-workers';
      else if (currentView === 'admin-logs') tab = 'logs';

      return <AdminDashboard setCurrentView={changeView} initialTab={tab} />;
    }

    // If user is Admin and requested 'dashboard', show Admin Dashboard
    if (user.role === 'ADMIN') {
      return <AdminDashboard setCurrentView={changeView} initialTab="overview" />;
    }

    // If user is Worker
    if (user.role === 'WORKER') {
      // Prevent Worker from accessing Owner-specific views
      if (currentView.startsWith('owner-') || currentView.startsWith('tenant-')) {
        return (
          <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
            <div className="max-w-md w-full bg-white rounded-2xl border border-cyan-200 p-8 shadow-xl space-y-4">
              <div className="w-12 h-12 rounded-full bg-cyan-100 text-cyan-800 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-serif font-bold text-gray-900">{t('common.owner_space_restricted')}</h2>
              <p className="text-xs text-gray-600 leading-relaxed">
                This section is reserved for Saree Business Owners. Your authenticated role is <strong className="uppercase font-mono text-[#008080]">{user.role}</strong>.
              </p>
              <button
                onClick={() => changeView('dashboard')}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-[#0D1224] text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-black transition-all"
              >
                {t('common.return_dashboard')}
              </button>
            </div>
          </div>
        );
      }
      return <WorkerDashboard currentView={currentView} setCurrentView={changeView} />;
    }

    // If user is Owner
    if (user.role === 'OWNER') {
      // Prevent Owner from accessing Worker-specific views
      if (currentView.startsWith('worker-')) {
        return (
          <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
            <div className="max-w-md w-full bg-white rounded-2xl border border-amber-200 p-8 shadow-xl space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-serif font-bold text-gray-900">{t('common.weaver_workbench_restricted')}</h2>
              <p className="text-xs text-gray-600 leading-relaxed">
                This section is reserved for Independent Weavers/Artisans. Your authenticated role is <strong className="uppercase font-mono text-[#8C6D1F]">{user.role}</strong>.
              </p>
              <button
                onClick={() => changeView('dashboard')}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-[#0D1224] text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-black transition-all"
              >
                {t('common.return_dashboard')}
              </button>
            </div>
          </div>
        );
      }
      return <OwnerDashboard currentView={currentView} setCurrentView={changeView} />;
    }

    return <HomePage setCurrentView={changeView} />;
  };

  const showSidebar = user && currentView !== 'home' && currentView !== 'login' && currentView !== 'register';

  return (
    <div className="min-h-screen bg-[#F7F3EA] text-[#0A0D16] flex flex-col font-sans selection:bg-[#D4AF37]/30 selection:text-[#0D1224]">
      <Navbar currentView={currentView} setCurrentView={changeView} />

      <div className="flex-1 flex">
        {showSidebar && (
          <Sidebar currentView={currentView} setCurrentView={changeView} />
        )}

        <main className={`flex-1 ${showSidebar ? 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-20 md:pb-8' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full'}`}>
          {renderView()}
        </main>
      </div>

      {/* Mobile Sticky Navigation for Authorized Users */}
      {showSidebar && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D1224] border-t border-[#D4AF37]/40 px-4 py-2 flex items-center justify-around text-xs text-gray-300 shadow-xl">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg ${currentView === 'dashboard' ? 'text-[#D4AF37] font-bold' : 'text-gray-400'}`}
          >
            <span className="text-[10px] uppercase">{t('common.dashboard')}</span>
          </button>

          {user.role === 'ADMIN' && (
            <button
              onClick={() => setCurrentView('admin-approvals')}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg ${currentView === 'admin-approvals' ? 'text-[#D4AF37] font-bold' : 'text-gray-400'}`}
            >
              <span className="text-[10px] uppercase">{t('common.approvals')}</span>
            </button>
          )}

          {user.role === 'WORKER' && (
            <button
              onClick={() => setCurrentView('worker-search-owners')}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg ${currentView === 'worker-search-owners' ? 'text-cyan-400 font-bold' : 'text-gray-400'}`}
            >
              <span className="text-[10px] uppercase">{t('common.search_owners')}</span>
            </button>
          )}

          <button
            onClick={() => setCurrentView('profile')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg ${currentView === 'profile' ? 'text-[#D4AF37] font-bold' : 'text-gray-400'}`}
          >
            <span className="text-[10px] uppercase">{t('common.profile')}</span>
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#0A0D16] text-[#C6A15B]/70 border-t border-[#D4AF37]/20 py-6 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-sm text-[#F7F3EA]">{t('common.app_name')}</span>
            <span>&bull;</span>
            <span className="text-[11px] text-gray-400">{t('common.slogan')}</span>
          </div>

          <div className="text-[11px] text-gray-400">
            {t('common.phase_1_completed')}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
