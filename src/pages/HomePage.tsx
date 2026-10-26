import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Shield, Building2, UserCheck, Lock, Database, CheckCircle2, ArrowRight, Layers, Sparkles } from 'lucide-react';

interface HomePageProps {
  setCurrentView: (view: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ setCurrentView }) => {
  const { user, quickSwitchPersona } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="space-y-12 py-6">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0D1224] via-[#0A0D16] to-[#1a1128] border border-[#D4AF37]/40 shadow-2xl p-8 md:p-12 text-[#F7F3EA]">
        {/* Decorative subtle gold grid */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, #D4AF37 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }}
        />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Phase 1 &bull; Core Multi-Tenant Architecture &amp; Role Security
          </div>

          <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-tight text-white leading-tight">
            {t('home.hero_title')}
            <span className="block text-2xl sm:text-3xl font-sans font-normal text-[#C6A15B] mt-2">
              {t('home.hero_subtitle')}
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-gray-300 leading-relaxed max-w-2xl">
            {t('home.hero_description')}
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            {user ? (
              <button
                onClick={() => setCurrentView('dashboard')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#D4AF37] to-[#C6A15B] text-[#0A0D16] hover:brightness-110 shadow-lg shadow-[#D4AF37]/20 transition-all"
              >
                <span>{t('home.enter_console')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => setCurrentView('login')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#D4AF37] to-[#C6A15B] text-[#0A0D16] hover:brightness-110 shadow-lg shadow-[#D4AF37]/20 transition-all"
                >
                  <span>{t('home.enter_console')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentView('register')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-white/10 text-white border border-[#D4AF37]/40 hover:bg-white/15 transition-all"
                >
                  <span>{t('home.register_business')}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* The 3 Separate Roles Architecture */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs uppercase font-bold tracking-widest text-[#8C6D1F]">
            Strict Role Segregation &bull; Multi-Tenant Isolation
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#0D1224] mt-1">
            {t('home.roles_title')}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-2">
            {t('home.roles_subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Role 1: Platform Admin */}
          <div className="rounded-2xl bg-white border border-[#64152F]/20 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#64152F]/15 text-[#64152F] flex items-center justify-center mb-4 border border-[#64152F]/30">
                <Shield className="w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#64152F] px-2 py-0.5 rounded bg-[#64152F]/10">
                Role A &bull; SaaS Operations
              </span>
              <h3 className="text-lg font-bold text-[#0D1224] mt-2">{t('home.admin_title')}</h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                {t('home.admin_desc')}
              </p>
            </div>

            <button
              onClick={() => {
                if (user?.role === 'ADMIN') setCurrentView('dashboard');
                else setCurrentView('login');
              }}
              className="mt-6 w-full py-2 px-3 rounded-lg text-xs font-semibold bg-[#64152F] text-white hover:bg-[#64152F]/90 transition-all flex items-center justify-center gap-1.5"
            >
              <span>{user?.role === 'ADMIN' ? t('home.go_admin') : t('home.sign_admin')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Role 2: Saree Textile Owner */}
          <div className="rounded-2xl bg-white border border-[#D4AF37]/40 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/10 rounded-bl-full pointer-events-none" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/20 text-[#8C6D1F] flex items-center justify-center mb-4 border border-[#D4AF37]/40">
                <Building2 className="w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8C6D1F] px-2 py-0.5 rounded bg-[#D4AF37]/15">
                Role B &bull; Small Saree Producer
              </span>
              <h3 className="text-lg font-bold text-[#0D1224] mt-2">{t('home.owner_title')}</h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                {t('home.owner_desc')}
              </p>
            </div>

            <button
              onClick={() => {
                if (user?.role === 'OWNER') setCurrentView('dashboard');
                else setCurrentView('login');
              }}
              className="mt-6 w-full py-2 px-3 rounded-lg text-xs font-semibold bg-[#D4AF37] text-[#0A0D16] hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
            >
              <span>{user?.role === 'OWNER' ? t('home.go_owner') : t('home.sign_owner')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Role 3: Independent Weaver / Worker */}
          <div className="rounded-2xl bg-white border border-[#008080]/30 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#008080]/15 text-[#008080] flex items-center justify-center mb-4 border border-[#008080]/30">
                <UserCheck className="w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#008080] px-2 py-0.5 rounded bg-[#008080]/10">
                Role C &bull; Artisan &amp; Loom Specialist
              </span>
              <h3 className="text-lg font-bold text-[#0D1224] mt-2">{t('home.worker_title')}</h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                {t('home.worker_desc')}
              </p>
            </div>

            <button
              onClick={() => {
                if (user?.role === 'WORKER') setCurrentView('dashboard');
                else setCurrentView('login');
              }}
              className="mt-6 w-full py-2 px-3 rounded-lg text-xs font-semibold bg-[#008080] text-white hover:bg-[#008080]/90 transition-all flex items-center justify-center gap-1.5"
            >
              <span>{user?.role === 'WORKER' ? t('home.go_worker') : t('home.sign_worker')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Phase 1 Deliverables Summary */}
      <section className="rounded-2xl bg-white border border-[#D4AF37]/30 p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <Database className="w-6 h-6 text-[#D4AF37]" />
          <div>
            <h3 className="text-base font-bold text-[#0D1224]">{t('home.tech_title')}</h3>
            <p className="text-xs text-gray-500">{t('home.tech_subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-3.5 rounded-xl bg-[#F7F3EA] border border-[#D4AF37]/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-1.5" />
            <h4 className="font-bold text-xs text-[#0D1224]">Relational SQLite Database</h4>
            <p className="text-[11px] text-gray-600 mt-1">
              Real persistence in <code className="bg-white px-1 py-0.5 rounded text-[10px]">data/trizen.db</code> via Node 22 built-in SQLite with ACID tables.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F7F3EA] border border-[#D4AF37]/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-1.5" />
            <h4 className="font-bold text-xs text-[#0D1224]">PBKDF2 Password Hashing</h4>
            <p className="text-[11px] text-gray-600 mt-1">
              Cryptographically salted SHA-512 hashes. Public registration cannot create Admin role.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F7F3EA] border border-[#D4AF37]/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-1.5" />
            <h4 className="font-bold text-xs text-[#0D1224]">Tenant Data Isolation</h4>
            <p className="text-[11px] text-gray-600 mt-1">
              Enforced at database and API layers. Foreign tenant queries return HTTP 403 Forbidden.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F7F3EA] border border-[#D4AF37]/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-1.5" />
            <h4 className="font-bold text-xs text-[#0D1224]">Registration &amp; Approval Gate</h4>
            <p className="text-[11px] text-gray-600 mt-1">
              New accounts start in <code className="bg-white px-1 py-0.5 rounded text-[10px]">PENDING_APPROVAL</code> and are blocked until Admin approves.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
