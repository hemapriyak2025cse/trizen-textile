import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { PendingUser, AuditLog } from '../types';
import {
  Shield,
  Building2,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  AlertOctagon,
  RefreshCw,
  Search,
  SlidersHorizontal,
  History,
  Lock,
  Sparkles,
  HelpCircle,
  Check,
  AlertTriangle,
  Send,
  MoreVertical,
  Filter,
  UserCheck
} from 'lucide-react';

interface AdminDashboardProps {
  setCurrentView: (view: string) => void;
  initialTab?: 'overview' | 'owner-approvals' | 'worker-approvals' | 'all-owners' | 'all-workers' | 'logs';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ setCurrentView, initialTab = 'overview' }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'owner-approvals' | 'worker-approvals' | 'all-owners' | 'all-workers' | 'logs'>(initialTab);
  const [metrics, setMetrics] = useState<any>(null);
  const [pendingOwners, setPendingOwners] = useState<any[]>([]);
  const [pendingWorkers, setPendingWorkers] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Rejection modal
  const [rejectingUser, setRejectingUser] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Request Information modal
  const [requestingInfoUser, setRequestingInfoUser] = useState<any | null>(null);
  const [infoRequestText, setInfoRequestText] = useState('');

  // Status Change modal (Suspend / Re-activate)
  const [changingStatusUser, setChangingStatusUser] = useState<any | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('APPROVED');
  const [statusChangeReason, setStatusChangeReason] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, ownersApprovalRes, workersApprovalRes, ownersRes, workersRes, logsRes] = await Promise.all([
        api.getAdminOverview(),
        api.getOwnerApprovals(),
        api.getWorkerApprovals(),
        api.getAllOwners(),
        api.getAllWorkers(),
        api.getAdminAuditLogs()
      ]);

      setMetrics(overviewRes.metrics);
      setPendingOwners(ownersApprovalRes.pendingOwners || []);
      setPendingWorkers(workersApprovalRes.pendingWorkers || []);
      setOwners(ownersRes.owners || []);
      setWorkers(workersRes.workers || []);
      setAuditLogs(logsRes.logs || []);
    } catch (err: any) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleApprove = async (userId: string, name: string) => {
    try {
      await api.approveUser(userId);
      setActionNotice({ type: 'success', text: t('worker.approved_success').replace('{name}', name) });
      await loadData();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingUser) return;
    try {
      await api.rejectUser(rejectingUser.id, rejectionReason || 'Registration did not meet verification standards.');
      setActionNotice({ type: 'info', text: t('worker.rejected_success').replace('{name}', rejectingUser.full_name) });
      setRejectingUser(null);
      setRejectionReason('');
      await loadData();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    }
  };

  const handleRequestInfoConfirm = async () => {
    if (!requestingInfoUser) return;
    try {
      await api.requestInfo(requestingInfoUser.id, infoRequestText || 'Please upload proof of loom facility address and handloom cluster membership.');
      setActionNotice({ type: 'info', text: t('worker.info_requested_success').replace('{name}', requestingInfoUser.full_name) });
      setRequestingInfoUser(null);
      setInfoRequestText('');
      await loadData();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit info request');
    }
  };

  const handleChangeStatusConfirm = async () => {
    if (!changingStatusUser) return;
    try {
      await api.changeUserStatus(changingStatusUser.id, targetStatus, statusChangeReason);
      setActionNotice({ type: 'success', text: t('worker.status_changed_success').replace('{name}', changingStatusUser.full_name).replace('{status}', targetStatus) });
      setChangingStatusUser(null);
      setStatusChangeReason('');
      await loadData();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Status change failed');
    }
  };

  // Filtered lists
  const filteredOwners = owners.filter(o => {
    const matchQuery = o.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       o.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       o.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchQuery && matchStatus;
  });

  const filteredWorkers = workers.filter(w => {
    const matchQuery = w.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       w.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       w.skills?.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchStatus = statusFilter === 'ALL' || w.status === statusFilter;
    return matchQuery && matchStatus;
  });

  const filteredLogs = auditLogs.filter(log => {
    return log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
           log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
           log.actor_username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const { t, tstat } = useLanguage();

  return (
    <div className="space-y-6 py-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#64152F]/15 text-[#64152F] text-xs font-semibold uppercase tracking-wider mb-1">
            <Shield className="w-3.5 h-3.5" />
            {t('admin.dashboard_title')} &bull; TRIZEN Software Operations
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#0D1224]">
            {t('admin.governance_title')}
          </h1>
          <p className="text-xs text-gray-500">
            {t('admin.governance_desc')}
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-300 hover:border-gray-400 text-gray-700 shadow-sm transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#D4AF37]' : ''}`} />
          <span>{t('admin.refresh_data')}</span>
        </button>
      </div>

      {actionNotice && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
          actionNotice.type === 'success' ? 'bg-emerald-50 border border-emerald-300 text-emerald-900' : 'bg-blue-50 border border-blue-300 text-blue-900'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-semibold">{actionNotice.text}</span>
        </div>
      )}

      {/* Strict Role Separation Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0D1224] to-[#1e142b] border border-[#D4AF37]/40 text-[#F7F3EA] shadow-md flex items-start gap-3.5">
        <Lock className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <span className="font-bold text-[#D4AF37] uppercase tracking-wide">
            {t('admin.separation_banner')}:
          </span>
          <p className="text-gray-300 leading-relaxed">
            {t('admin.separation_desc')}
          </p>
        </div>
      </div>

      {/* Navigation Tabs for All Admin Sub-pages */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100 rounded-2xl text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'overview' ? 'bg-white text-[#0D1224] shadow-sm font-bold border border-gray-200' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>{t('dashboard.overview')}</span>
        </button>

        <button
          onClick={() => setActiveTab('owner-approvals')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'owner-approvals' ? 'bg-[#D4AF37] text-[#0A0D16] shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>{t('admin.registrations')}</span>
          {pendingOwners.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-mono font-bold">
              {pendingOwners.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('worker-approvals')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'worker-approvals' ? 'bg-[#008080] text-white shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>{t('admin.all_workers')}</span>
          {pendingWorkers.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-mono font-bold">
              {pendingWorkers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('all-owners')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'all-owners' ? 'bg-white text-[#0D1224] shadow-sm font-bold border border-gray-200' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-gray-500" />
          <span>{t('admin.all_owners')} ({owners.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('all-workers')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'all-workers' ? 'bg-white text-[#0D1224] shadow-sm font-bold border border-gray-200' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-gray-500" />
          <span>{t('admin.all_workers')} ({workers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'logs' ? 'bg-white text-[#0D1224] shadow-sm font-bold border border-gray-200' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <History className="w-3.5 h-3.5 text-gray-500" />
          <span>{t('admin.audit_logs')}</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">{t('admin.total_businesses')}</span>
              <div className="text-2xl font-bold font-serif text-[#0D1224] mt-1">
                {metrics?.tenantsCount ?? 2}
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5 block">{t('status.active')} Tenants</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8C6D1F]">{t('admin.pending_owners')}</span>
              <div className="text-2xl font-bold font-serif text-[#8C6D1F] mt-1">
                {pendingOwners.length}
              </div>
              <span className="text-[10px] text-amber-600 font-semibold mt-0.5 block">{t('admin.registrations')}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#006666]">{t('admin.pending_workers')}</span>
              <div className="text-2xl font-bold font-serif text-[#006666] mt-1">
                {pendingWorkers.length}
              </div>
              <span className="text-[10px] text-amber-600 font-semibold mt-0.5 block">{t('admin.registrations')}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">{t('admin.active_weavers')}</span>
              <div className="text-2xl font-bold font-serif text-gray-800 mt-1">
                {workers.filter(w => w.status === 'APPROVED').length}
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">{t('status.approved')} Artisans</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">{t('admin.audit_logs')}</span>
              <div className="text-2xl font-bold font-serif text-gray-800 mt-1">
                {auditLogs.length}
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5 block">{t('admin.audit_stream')}</span>
            </div>
          </div>

          {/* Quick queues overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Pending Owners Box */}
            <div className="bg-white rounded-2xl border border-[#D4AF37]/30 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="font-bold text-sm text-[#0D1224] flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#D4AF37]" />
                  <span>{t('worker.pending_owner_approvals')} ({pendingOwners.length})</span>
                </h3>
                <button
                  onClick={() => setActiveTab('owner-approvals')}
                  className="text-xs text-[#8C6D1F] font-semibold hover:underline"
                >
                  {t('common.view_details')} &rarr;
                </button>
              </div>

              {pendingOwners.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">{t('worker.no_pending_owners')}</p>
              ) : (
                <div className="space-y-2">
                  {pendingOwners.slice(0, 3).map((item) => (
                    <div key={item.id} className="p-3 rounded-xl bg-amber-50/30 border border-amber-200 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-gray-900">{item.business_name}</div>
                        <div className="text-[11px] text-gray-500">{item.full_name} &bull; {item.location}</div>
                      </div>
                      <button
                        onClick={() => handleApprove(item.id, item.full_name)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                      >
                        {t('admin.approve')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Pending Workers Box */}
            <div className="bg-white rounded-2xl border border-[#008080]/30 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="font-bold text-sm text-[#0D1224] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#008080]" />
                  <span>{t('worker.pending_worker_approvals')} ({pendingWorkers.length})</span>
                </h3>
                <button
                  onClick={() => setActiveTab('worker-approvals')}
                  className="text-xs text-[#006666] font-semibold hover:underline"
                >
                  {t('common.view_details')} &rarr;
                </button>
              </div>

              {pendingWorkers.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">{t('worker.no_pending_workers')}</p>
              ) : (
                <div className="space-y-2">
                  {pendingWorkers.slice(0, 3).map((item) => (
                    <div key={item.id} className="p-3 rounded-xl bg-cyan-50/30 border border-cyan-200 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-gray-900">{item.full_name}</div>
                        <div className="text-[11px] text-gray-500">{item.skills?.[0] || 'Handloom'} &bull; {item.location}</div>
                      </div>
                      <button
                        onClick={() => handleApprove(item.id, item.full_name)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                      >
                        {t('admin.approve')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OWNER APPROVALS */}
      {activeTab === 'owner-approvals' && (
        <section className="bg-white rounded-2xl border border-[#D4AF37]/30 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-[#0D1224] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#D4AF37]" />
                <span>{t('worker.owner_reg_approvals')} ({pendingOwners.length})</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('worker.owner_reg_desc')}
              </p>
            </div>
            <span className="text-xs font-mono text-[#8C6D1F] font-bold">
              {pendingOwners.length} Pending Owner Review
            </span>
          </div>

          {pendingOwners.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
              <p>{t('worker.no_pending_owners')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingOwners.map((owner) => (
                <div
                  key={owner.id}
                  className="p-5 rounded-2xl border border-amber-200 bg-amber-50/20 hover:border-amber-300 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-[#0D1224]">{owner.business_name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#D4AF37]/20 text-[#8C6D1F]">
                          Saree Mill Owner
                         Saree Mill Owner
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-semibold font-mono">
                          STATUS: {tstat(owner.status)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Proprietor: <strong className="text-gray-900">{owner.full_name}</strong> (@{owner.username}) &bull; Location: {owner.location}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(owner.id, owner.full_name)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>{t('admin.approve')}</span>
                      </button>

                      <button
                        onClick={() => {
                          setRequestingInfoUser(owner);
                          setInfoRequestText('Please provide verification of loom facility address and handloom cluster membership.');
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 flex items-center gap-1.5 transition-all"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>{t('owner.request_info')}</span>
                      </button>

                      <button
                        onClick={() => {
                          setRejectingUser(owner);
                          setRejectionReason('Unable to verify handloom production workshop premises.');
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-1.5 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{t('owner.reject')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Business Specifications */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-white border border-amber-200/60 text-xs text-gray-700">
                    <div>
                      <span className="text-gray-400 block text-[11px]">Saree Craft Specialization:</span>
                      <span className="font-semibold text-gray-900">{owner.textile_specialization}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Active Loom Count &amp; Types:</span>
                      <span className="font-semibold text-gray-900">{owner.loom_count} Looms ({owner.loom_types?.join(', ') || 'Pit Looms'})</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Registration Number / GST:</span>
                      <span className="font-mono text-gray-900">{owner.registration_number || 'Small Business Exemption'}</span>
                    </div>
                  </div>

                  {owner.additional_info_requested && (
                    <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                      <span><strong>Requested Clarification:</strong> &quot;{owner.additional_info_requested}&quot;</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                    <span>Contact: {owner.email} &bull; {owner.phone}</span>
                    <span>Applied: {owner.created_at?.slice(0, 19)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: WORKER APPROVALS */}
      {activeTab === 'worker-approvals' && (
        <section className="bg-white rounded-2xl border border-[#008080]/30 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-[#0D1224] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#008080]" />
                <span>{t('worker.worker_reg_approvals')} ({pendingWorkers.length})</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('worker.worker_reg_desc')}
              </p>
            </div>
            <span className="text-xs font-mono text-[#006666] font-bold">
              {pendingWorkers.length} Pending Weaver Review
            </span>
          </div>

          {pendingWorkers.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
              <p>{t('worker.no_pending_workers')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingWorkers.map((worker) => (
                <div
                  key={worker.id}
                  className="p-5 rounded-2xl border border-cyan-200 bg-cyan-50/20 hover:border-cyan-300 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-[#0D1224]">{worker.full_name}</span>
                        <span className="text-xs text-gray-500 font-mono">(@{worker.username})</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#008080]/20 text-[#006666]">
                          Independent Weaver
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-semibold font-mono">
                          STATUS: {tstat(worker.status)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Cluster: <strong className="text-gray-900">{worker.location}</strong> &bull; Experience: {worker.experience_years} Years
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(worker.id, worker.full_name)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>{t('admin.approve')}</span>
                      </button>

                      <button
                        onClick={() => {
                          setRequestingInfoUser(worker);
                          setInfoRequestText('Please provide artisan cooperative card or sample saree photos.');
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 flex items-center gap-1.5 transition-all"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Request Info</span>
                      </button>

                      <button
                        onClick={() => {
                          setRejectingUser(worker);
                          setRejectionReason('Unable to verify textile craft specialization.');
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-1.5 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>

                  {/* Skills badges */}
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-white border border-cyan-200/60">
                    <span className="text-[11px] font-semibold text-gray-500 mr-1 self-center">Skills:</span>
                    {worker.skills?.map((s: string, idx: number) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-[#E6F4F1] text-[#006666] text-xs font-medium border border-[#008080]/20">
                        {s}
                      </span>
                    ))}
                  </div>

                  {worker.additional_info_requested && (
                    <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                      <span><strong>Requested Clarification:</strong> &quot;{worker.additional_info_requested}&quot;</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                    <span>Contact: {worker.email} &bull; {worker.phone}</span>
                    <span>Applied: {worker.created_at?.slice(0, 19)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 4: ALL OWNERS DIRECTORY */}
      {activeTab === 'all-owners' && (
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-[#0D1224] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#D4AF37]" />
                <span>{t('admin.all_owners_dir')} ({filteredOwners.length})</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{t('admin.governance_desc')}</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={t('admin.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs focus:border-[#D4AF37] focus:outline-none w-48 sm:w-60"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs focus:border-[#D4AF37] focus:outline-none"
              >
                <option value="ALL">{t('admin.all_statuses')}</option>
                <option value="APPROVED">{t('status.approved')}</option>
                <option value="PENDING_APPROVAL">{t('status.pending')}</option>
                <option value="REJECTED">{t('status.rejected')}</option>
                <option value="SUSPENDED">{t('status.suspended')}</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F3EA] text-[#0D1224] font-semibold border-y border-[#D4AF37]/20">
                <tr>
                  <th className="py-2.5 px-3">{t('owner.business_name')}</th>
                  <th className="py-2.5 px-3">{t('owner.proprietor')}</th>
                  <th className="py-2.5 px-3">{t('owner.specialty')}</th>
                  <th className="py-2.5 px-3">{t('auth.location')}</th>
                  <th className="py-2.5 px-3">{t('owner.looms')}</th>
                  <th className="py-2.5 px-3">{t('dashboard.status')}</th>
                  <th className="py-2.5 px-3 text-right">{t('dashboard.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOwners.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/80">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-gray-900">{o.business_name}</div>
                      <span className="text-[10px] font-mono text-[#8C6D1F]">{o.tenant_id}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-gray-800">{o.full_name}</div>
                      <span className="text-[10px] text-gray-400">@{o.username}</span>
                    </td>
                    <td className="py-3 px-3 text-gray-600 max-w-xs truncate">{o.textile_specialization}</td>
                    <td className="py-3 px-3 text-gray-600">{o.location}</td>
                    <td className="py-3 px-3 font-mono font-bold text-gray-800">{o.loom_count}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        o.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        o.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' :
                        o.status === 'SUSPENDED' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {tstat(o.status)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          setChangingStatusUser(o);
                          setTargetStatus(o.status === 'APPROVED' ? 'SUSPENDED' : 'APPROVED');
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                      >
                        {t('worker.change_status')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 5: ALL WORKERS DIRECTORY */}
      {activeTab === 'all-workers' && (
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-[#0D1224] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#008080]" />
                <span>{t('worker.all_workers_title')} ({filteredWorkers.length})</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{t('worker.all_workers_desc')}</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={t('worker.weaver_search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs focus:border-[#008080] focus:outline-none w-48 sm:w-60"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs focus:border-[#008080] focus:outline-none"
              >
                <option value="ALL">{t('admin.all_statuses')}</option>
                <option value="APPROVED">{t('status.approved')}</option>
                <option value="PENDING_APPROVAL">{t('status.pending')}</option>
                <option value="REJECTED">{t('status.rejected')}</option>
                <option value="SUSPENDED">{t('status.suspended')}</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#E6F4F1] text-[#006666] font-semibold border-y border-[#008080]/20">
                <tr>
                  <th className="py-2.5 px-3">{t('worker.weaver_name')}</th>
                  <th className="py-2.5 px-3">{t('worker.specialized_processes')}</th>
                  <th className="py-2.5 px-3">{t('auth.experience_label').replace(' *', '')}</th>
                  <th className="py-2.5 px-3">{t('auth.location')}</th>
                  <th className="py-2.5 px-3">{t('sidebar.loom_status')}</th>
                  <th className="py-2.5 px-3">{t('worker.account_status')}</th>
                  <th className="py-2.5 px-3 text-right">{t('worker.admin_action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredWorkers.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50/80">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-gray-900">{w.full_name}</div>
                      <span className="text-[10px] text-gray-400">@{w.username}</span>
                    </td>
                    <td className="py-3 px-3 text-gray-700">
                      <div className="flex flex-wrap gap-1">
                        {w.skills?.slice(0, 2).map((s: string, idx: number) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px]">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-gray-800">{w.experience_years} yrs</td>
                    <td className="py-3 px-3 text-gray-600">{w.location}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        w.availability === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {tstat(w.availability)}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        w.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        w.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {w.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          setChangingStatusUser(w);
                          setTargetStatus(w.status === 'APPROVED' ? 'SUSPENDED' : 'APPROVED');
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                      >
                        {t('worker.change_status')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 6: PLATFORM AUDIT LOGS */}
      {activeTab === 'logs' && (
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-[#0D1224] flex items-center gap-2">
                <History className="w-5 h-5 text-gray-600" />
                <span>{t('admin.audit_stream')} ({filteredLogs.length})</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{t('admin.governance_desc')}</p>
            </div>

            <input
              type="text"
              placeholder={t('worker.search_audit_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs focus:border-[#D4AF37] focus:outline-none w-64"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto font-mono text-xs pr-2">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-start justify-between gap-3 hover:bg-gray-100/50 transition-colors"
              >
                <div>
                  <span className="font-bold text-[#64152F]">{log.action}</span>
                  <p className="text-gray-800 text-[11px] mt-0.5 font-sans leading-relaxed">{log.details}</p>
                  <span className="text-[10px] text-gray-400">
                    {t('worker.actor')}: @{log.actor_username} ({log.actor_role}) &bull; IP: {log.ip_address} {log.tenant_id ? `• ${t('worker.tenant')}: ${log.tenant_id}` : ''}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0 font-sans">{log.timestamp.slice(0, 19)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MODAL 1: Rejection Reason Modal */}
      {rejectingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-300">
            <h3 className="font-bold text-base text-red-900 flex items-center gap-2 pb-2 border-b border-gray-100">
              <AlertOctagon className="w-5 h-5 text-red-600" />
              <span>{t('admin.reject_title')} for {rejectingUser.full_name}</span>
            </h3>

            <div className="py-4 space-y-3">
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('admin.reject_desc')}
              </p>
              <textarea
                rows={3}
                required
                placeholder={t('worker.reject_reason_placeholder')}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setRejectingUser(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 shadow"
              >
                {t('admin.confirm_rejection')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Request Additional Information Modal */}
      {requestingInfoUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-blue-300">
            <h3 className="font-bold text-base text-blue-900 flex items-center gap-2 pb-2 border-b border-gray-100">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              <span>{t('admin.request_info_title')} from {requestingInfoUser.full_name}</span>
            </h3>

            <div className="py-4 space-y-3">
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('admin.request_info_desc')}
              </p>
              <textarea
                rows={3}
                required
                placeholder={t('worker.request_info_placeholder')}
                value={infoRequestText}
                onChange={(e) => setInfoRequestText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setRequestingInfoUser(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestInfoConfirm}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t('admin.send_request_notice')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Change Account Status Modal */}
      {changingStatusUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-300">
            <h3 className="font-bold text-base text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
              <SlidersHorizontal className="w-5 h-5 text-[#D4AF37]" />
              <span>{t('admin.update_status_title')}: {changingStatusUser.full_name}</span>
            </h3>

            <div className="py-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">{t('admin.select_status')}</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:border-[#D4AF37] focus:outline-none"
                >
                  <option value="APPROVED">{t('status.approved')}</option>
                  <option value="SUSPENDED">{t('status.suspended')}</option>
                  <option value="REJECTED">{t('status.rejected')}</option>
                  <option value="PENDING_APPROVAL">{t('status.pending')}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">{t('admin.admin_note')}</label>
                <textarea
                  rows={2}
                  placeholder={t('worker.status_change_placeholder')}
                  value={statusChangeReason}
                  onChange={(e) => setStatusChangeReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setChangingStatusUser(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleChangeStatusConfirm}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#0D1224] text-[#D4AF37] hover:bg-[#1a1f36] shadow"
              >
                {t('admin.update_account_status')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
