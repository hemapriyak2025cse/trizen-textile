import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Shield, Building2, UserCheck, LogOut, ChevronDown, Sparkles, CheckCircle2, Clock, Globe } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView }) => {
  const { user, tenant, logout, quickSwitchPersona } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handlePersonaSwitch = async (username: string) => {
    setSwitching(true);
    setDropdownOpen(false);
    try {
      const res = await quickSwitchPersona(username);
      if (res.success) {
        setCurrentView('dashboard');
      } else {
        alert(res.message);
      }
    } finally {
      setSwitching(false);
    }
  };

  const getRoleBadge = () => {
    if (!user) return null;
    if (user.role === 'ADMIN') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#64152F]/20 text-[#64152F] border border-[#64152F]/40">
          <Shield className="w-3.5 h-3.5 text-[#64152F]" />
          {t('auth.admin')}
        </span>
      );
    }
    if (user.role === 'OWNER') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#D4AF37]/20 text-[#8C6D1F] border border-[#D4AF37]/40">
          <Building2 className="w-3.5 h-3.5 text-[#D4AF37]" />
          {t('auth.owner')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#008080]/15 text-[#006666] border border-[#008080]/30">
        <UserCheck className="w-3.5 h-3.5 text-[#008080]" />
        {t('auth.worker')}
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0D1224] border-b border-[#D4AF37]/30 shadow-lg text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <button
            onClick={() => setCurrentView(user ? 'dashboard' : 'home')}
            className="flex items-center gap-3 text-left focus:outline-none group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#64152F] via-[#0D1224] to-[#0A0D16] border border-[#D4AF37] flex items-center justify-center shadow-md group-hover:border-[#F7F3EA] transition-all">
              <span className="font-serif font-black text-lg text-[#D4AF37] tracking-wider">T</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-xl tracking-wider text-[#F7F3EA] group-hover:text-[#D4AF37] transition-colors">
                  {t('common.app_name')}
                </span>
                <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 font-mono">
                  SaaS v1.0
                </span>
              </div>
              <p className="text-[11px] text-[#C6A15B]/80 tracking-wide font-sans hidden sm:block">
                {t('common.slogan')}
              </p>
            </div>
          </button>

          {/* Center Tenant Banner when Owner is signed in */}
          {user && user.role === 'OWNER' && tenant && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-[#0A0D16]/80 border border-[#D4AF37]/40">
              <Building2 className="w-4 h-4 text-[#D4AF37]" />
              <div className="text-left text-xs">
                <span className="text-[#C6A15B] font-medium block">{tenant.business_name}</span>
                <span className="text-gray-400 text-[10px] block">{tenant.location} &bull; {tenant.loom_count} Looms</span>
              </div>
            </div>
          )}

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'ta' : 'en')}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#0A0D16] border border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all text-xs text-[#D4AF37] font-medium"
              title={t('common.switch_language')}
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="uppercase">{language === 'en' ? 'தமிழ்' : 'EN'}</span>
            </button>

            {/* Authenticated User Role Badge */}
            {user && (
              <div className="hidden lg:flex items-center gap-2">
                {getRoleBadge()}
              </div>
            )}

            {/* Auth Buttons or Profile Dropdown */}
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentView('profile')}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0A0D16] border border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all text-xs"
                >
                  <div className="w-6 h-6 rounded-full bg-[#64152F] text-[#D4AF37] font-serif font-bold flex items-center justify-center text-xs border border-[#D4AF37]/50">
                    {user.full_name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <span className="text-[#F7F3EA] font-medium block truncate max-w-[120px]">{user.full_name}</span>
                  </div>
                </button>

                <button
                  onClick={async () => {
                    await logout();
                    setCurrentView('login');
                  }}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all"
                  title={t('common.logout')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentView('login')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#D4AF37] border border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 transition-all"
                >
                  {t('common.login')}
                </button>
                <button
                  onClick={() => setCurrentView('register')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#D4AF37] to-[#C6A15B] text-[#0A0D16] hover:brightness-110 shadow transition-all"
                >
                  {t('common.register')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
