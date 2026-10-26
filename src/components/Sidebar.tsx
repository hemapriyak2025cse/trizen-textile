import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  LayoutDashboard,
  ShieldCheck,
  Building2,
  Users,
  UserCheck,
  CreditCard,
  History,
  Settings,
  Search,
  Layers,
  Sparkles,
  Scissors,
  Package,
  Wallet,
  FileCheck2,
  ChevronRight,
  LogOut,
  Send
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  const { user, tenant, logout } = useAuth();
  const { t } = useLanguage();
  if (!user) return null;

  const role = user.role;

  return (
    <aside className="hidden md:flex w-72 bg-[#0D1224] text-[#F7F3EA] border-r border-[#D4AF37]/30 flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6">
        {/* User Card */}
        <div className="p-3.5 rounded-xl bg-[#0A0D16] border border-[#D4AF37]/30 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#64152F] to-[#0A0D16] border border-[#D4AF37] flex items-center justify-center font-serif font-bold text-[#D4AF37] text-base shadow">
              {user.full_name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <div className="font-semibold text-sm text-white truncate">{user.full_name}</div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#C6A15B]">
                <span className="capitalize">@{user.username}</span>
                <span>&bull;</span>
                <span className="font-mono uppercase font-bold text-[10px] text-emerald-400">
                  {user.status}
                </span>
              </div>
            </div>
          </div>

          {/* Tenant Badge for Owner */}
          {role === 'OWNER' && tenant && (
            <div className="mt-2.5 pt-2 border-t border-[#D4AF37]/20 flex items-center justify-between text-[11px]">
              <span className="text-gray-400">{t('sidebar.tenant_id')}:</span>
              <span className="font-mono text-[#D4AF37] font-semibold">{tenant.id}</span>
            </div>
          )}

          {/* Weaver Availability status */}
          {role === 'WORKER' && (
            <div className="mt-2.5 pt-2 border-t border-[#D4AF37]/20 flex items-center justify-between text-[11px]">
              <span className="text-gray-400">{t('sidebar.loom_status')}:</span>
              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${user.availability === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                {user.availability === 'AVAILABLE' ? t('auth.available_work') : t('auth.busy_loom')}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-1">
          {/* PLATFORM ADMIN MENU */}
          {role === 'ADMIN' && (
            <>
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] pb-1">
                {t('sidebar.admin_console')}
              </p>
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'dashboard'
                    ? 'bg-[#64152F] text-white shadow border border-[#D4AF37]/50'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-[#D4AF37]" />
                <span>{t('sidebar.admin_dashboard')}</span>
              </button>

              <button
                onClick={() => setCurrentView('admin-approvals')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'admin-approvals'
                    ? 'bg-[#64152F] text-white shadow border border-[#D4AF37]/50'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserCheck className="w-4 h-4 text-[#D4AF37]" />
                  <span>{t('sidebar.pending_regs')}</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#D4AF37] text-[#0A0D16] font-bold">
                  {t('worker.queue')}
                </span>
              </button>

              <button
                onClick={() => setCurrentView('admin-owners')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'admin-owners'
                    ? 'bg-[#64152F] text-white shadow border border-[#D4AF37]/50'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4 text-[#D4AF37]" />
                <span>{t('sidebar.all_owners')}</span>
              </button>

              <button
                onClick={() => setCurrentView('admin-workers')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'admin-workers'
                    ? 'bg-[#64152F] text-white shadow border border-[#D4AF37]/50'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 text-[#D4AF37]" />
                <span>{t('sidebar.all_weavers')}</span>
              </button>

              <button
                onClick={() => setCurrentView('admin-logs')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'admin-logs'
                    ? 'bg-[#64152F] text-white shadow border border-[#D4AF37]/50'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <History className="w-4 h-4 text-[#D4AF37]" />
                <span>{t('sidebar.audit_logs')}</span>
              </button>
            </>
          )}

          {/* TEXTILE OWNER MENU */}
          {role === 'OWNER' && (
            <>
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] pb-1">
                {t('sidebar.business_ops')}
              </p>
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'dashboard'
                    ? 'bg-[#D4AF37] text-[#0A0D16] font-bold shadow'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-[#C6A15B]" />
                <span>{t('sidebar.overview_metrics')}</span>
              </button>

              <button
                onClick={() => setCurrentView('owner-batches')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'owner-batches'
                    ? 'bg-[#D4AF37] text-[#0A0D16] font-bold shadow'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Scissors className="w-4 h-4 text-[#C6A15B]" />
                  <span>{t('sidebar.production_batches')}</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#0A0D16] text-[#D4AF37] font-mono">
                  {t('worker.seven_stage')}
                </span>
              </button>

              <button
                onClick={() => setCurrentView('owner-offers')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'owner-offers'
                    ? 'bg-[#D4AF37] text-[#0A0D16] font-bold shadow'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 text-[#C6A15B]" />
                <span>{t('sidebar.worker_offers')}</span>
              </button>

              <button
                onClick={() => setCurrentView('owner-inventory')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'owner-inventory'
                    ? 'bg-[#D4AF37] text-[#0A0D16] font-bold shadow'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4 text-[#C6A15B]" />
                <span>{t('sidebar.inventory')}</span>
              </button>

              <button
                onClick={() => setCurrentView('owner-stock-sales')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'owner-stock-sales'
                    ? 'bg-[#D4AF37] text-[#0A0D16] font-bold shadow'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Package className="w-4 h-4 text-[#C6A15B]" />
                <span>{t('sidebar.finished_sarees')}</span>
              </button>

              <button
                onClick={() => setCurrentView('owner-payments')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'owner-payments'
                    ? 'bg-[#D4AF37] text-[#0A0D16] font-bold shadow'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Wallet className="w-4 h-4 text-[#C6A15B]" />
                <span>{t('sidebar.wage_ledger')}</span>
              </button>

              <button
                onClick={() => setCurrentView('owner-profile')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'owner-profile'
                    ? 'bg-[#D4AF37] text-[#0A0D16] font-bold shadow'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4 text-[#C6A15B]" />
                <span>{t('sidebar.business_profile')}</span>
              </button>

              <button
                onClick={() => setCurrentView('tenant-audit')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'tenant-audit'
                    ? 'bg-[#D4AF37] text-[#0A0D16] font-bold shadow'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <History className="w-4 h-4 text-[#C6A15B]" />
                <span>{t('sidebar.tenant_audit')}</span>
              </button>
            </>
          )}

          {/* INDEPENDENT WEAVER / WORKER MENU */}
          {role === 'WORKER' && (
            <>
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-cyan-300 pb-1">
                {t('sidebar.weaver_loft')}
              </p>
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'dashboard'
                    ? 'bg-[#008080] text-white font-bold shadow'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-cyan-300" />
                <span>{t('sidebar.artisan_workbench')}</span>
              </button>

              <button
                onClick={() => setCurrentView('worker-offers')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'worker-offers'
                    ? 'bg-[#008080] text-white font-bold shadow'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserCheck className="w-4 h-4 text-cyan-300" />
                  <span>{t('sidebar.work_offers')}</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/30 text-cyan-200 font-bold">
                  {t('worker.new')}
                </span>
              </button>

              <button
                onClick={() => setCurrentView('worker-requests')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'worker-requests'
                    ? 'bg-[#008080] text-white font-bold shadow'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Send className="w-4 h-4 text-cyan-300" />
                  <span>{t('sidebar.my_requests')}</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 font-mono">
                  {t('worker.sent')}
                </span>
              </button>

              <button
                onClick={() => setCurrentView('worker-jobs')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'worker-jobs'
                    ? 'bg-[#008080] text-white font-bold shadow'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Scissors className="w-4 h-4 text-cyan-300" />
                <span>{t('sidebar.assigned_jobs')}</span>
              </button>

              <button
                onClick={() => setCurrentView('worker-payments')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'worker-payments'
                    ? 'bg-[#008080] text-white font-bold shadow'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Wallet className="w-4 h-4 text-cyan-300" />
                <span>{t('sidebar.wage_payouts')}</span>
              </button>

              <button
                onClick={() => setCurrentView('worker-search-owners')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'worker-search-owners'
                    ? 'bg-[#008080] text-white font-bold shadow'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Search className="w-4 h-4 text-cyan-300" />
                <span>{t('sidebar.search_owners')}</span>
              </button>

              <button
                onClick={() => setCurrentView('worker-skills')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'worker-skills'
                    ? 'bg-[#008080] text-white font-bold shadow'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <span>{t('sidebar.skills_availability')}</span>
              </button>
            </>
          )}

          {/* Common Account Profile */}
          <div className="pt-3 border-t border-[#D4AF37]/20">
            <button
              onClick={() => setCurrentView('profile')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                currentView === 'profile'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 text-[#D4AF37]" />
              <span>{t('sidebar.profile_credentials')}</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Footer Info & Sign out */}
      <div className="p-4 border-t border-[#D4AF37]/30 bg-[#0A0D16]/50">
        <button
          onClick={async () => {
            await logout();
            setCurrentView('login');
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('sidebar.sign_out')}</span>
        </button>

        <div className="mt-3 text-[10px] text-center text-gray-500">
          {t('worker.saas_footer')}
        </div>
      </div>
    </aside>
  );
};
