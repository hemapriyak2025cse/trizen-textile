import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../api/client';
import { Tenant, AuditLog } from '../types';
import { BatchDetailModal } from '../components/batches/BatchDetailModal';
import { NewBatchModal } from '../components/batches/NewBatchModal';
import { CreateOfferModal } from '../components/batches/CreateOfferModal';
import { ConsumeMaterialModal } from '../components/inventory/ConsumeMaterialModal';
import { NewSaleModal } from '../components/sales/NewSaleModal';
import {
  Building2,
  Scissors,
  Package,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  History,
  Edit3,
  Save,
  X,
  Users,
  Send,
  Plus,
  ShoppingBag,
  Wallet,
  Clock,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Check,
  ExternalLink,
  Info
} from 'lucide-react';

interface OwnerDashboardProps {
  currentView?: string;
  setCurrentView: (view: string) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ currentView = 'dashboard', setCurrentView }) => {
  const { user, tenant, refreshProfile } = useAuth();
  const { t, ts, tstat } = useLanguage();

  // Tab mapping
  const resolveTab = (view: string) => {
    switch (view) {
      case 'owner-batches': return 'batches';
      case 'owner-offers': return 'offers';
      case 'owner-inventory': return 'inventory';
      case 'owner-stock-sales': return 'stock-sales';
      case 'owner-payments': return 'payments';
      case 'owner-profile': return 'profile';
      case 'tenant-audit': return 'logs';
      case 'dashboard':
      default: return 'overview';
    }
  };

  const [activeTab, setActiveTab] = useState<string>(resolveTab(currentView));

  useEffect(() => {
    setActiveTab(resolveTab(currentView));
  }, [currentView]);

  // Data states
  const [batches, setBatches] = useState<any[]>([]);
  const [workOffers, setWorkOffers] = useState<any[]>([]);
  const [workRequests, setWorkRequests] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [stockList, setStockList] = useState<any[]>([]);
  const [salesList, setSalesList] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [selectedBatchStages, setSelectedBatchStages] = useState<any[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [newBatchModalOpen, setNewBatchModalOpen] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offerStage, setOfferStage] = useState<any>(null);
  const [consumeModalOpen, setConsumeModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [newSaleModalOpen, setNewSaleModalOpen] = useState(false);

  // Respond to artisan request modal state
  const [respondModalOpen, setRespondModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [respondAction, setRespondAction] = useState<'ACCEPTED' | 'REJECTED' | 'INFO_REQUESTED'>('ACCEPTED');
  const [respondNote, setRespondNote] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [requestNotice, setRequestNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pay modal state
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Edit business profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    business_name: tenant?.business_name || '',
    location: tenant?.location || '',
    textile_specialization: tenant?.textile_specialization || '',
    loom_count: tenant?.loom_count || 4,
    registration_number: tenant?.registration_number || ''
  });
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, [tenant, activeTab]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        batchRes,
        offerRes,
        reqRes,
        invRes,
        stockRes,
        saleRes,
        payRes,
        logsRes
      ] = await Promise.allSettled([
        api.getBatches(),
        api.getWorkOffers(),
        api.getWorkRequests(),
        api.getInventory(),
        api.getStock(),
        api.getSales(),
        api.getPayments(),
        api.getTenantAuditLogs()
      ]);

      if (batchRes.status === 'fulfilled') setBatches(batchRes.value.batches || []);
      if (offerRes.status === 'fulfilled') setWorkOffers(offerRes.value.offers || []);
      if (reqRes.status === 'fulfilled') setWorkRequests(reqRes.value.requests || []);
      if (invRes.status === 'fulfilled') setInventory(invRes.value.items || []);
      if (stockRes.status === 'fulfilled') setStockList(stockRes.value.sarees || []);
      if (saleRes.status === 'fulfilled') setSalesList(saleRes.value.sales || []);
      if (payRes.status === 'fulfilled') setPayments(payRes.value.payments || []);
      if (logsRes.status === 'fulfilled') setAuditLogs(logsRes.value.logs || []);
    } catch (err) {
      console.error('Error loading tenant data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBatchDetails = async (batchId: string) => {
    try {
      const res = await api.getBatchDetails(batchId);
      setSelectedBatch(res.batch);
      setSelectedBatchStages(res.stages || []);
      setBatchModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to open batch details');
    }
  };

  const handleOpenOfferModal = (stage: any) => {
    setOfferStage(stage);
    setOfferModalOpen(true);
  };

  const handleOpenConsumeModal = (item: any) => {
    setSelectedMaterial(item);
    setConsumeModalOpen(true);
  };

  const handleOpenPayModal = (payment: any) => {
    setSelectedPayment(payment);
    setPaymentAmount(payment.balance_remaining || payment.net_payable);
    setPaymentMethod('UPI');
    setTransactionRef(`UPI-${Math.floor(100000000 + Math.random() * 900000000)}`);
    setPayModalOpen(true);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setSubmittingPayment(true);
    try {
      await api.payWorker(selectedPayment.id, {
        amount_paid: Number(paymentAmount),
        payment_method: paymentMethod,
        transaction_ref: transactionRef
      });
      setPayModalOpen(false);
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to disburse payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleOpenRespondModal = (req: any, action: 'ACCEPTED' | 'REJECTED' | 'INFO_REQUESTED') => {
    setSelectedRequest(req);
    setRespondAction(action);
    setRespondNote(
      action === 'ACCEPTED'
        ? 'Proposal accepted. Production job assignment initiated.'
        : action === 'INFO_REQUESTED'
        ? 'Please specify your earliest start date and confirmation of loom setup availability.'
        : 'Thank you for your interest. Current production loom capacity is fully committed.'
    );
    setRespondModalOpen(true);
  };

  const handleConfirmResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setSubmittingResponse(true);
    setRequestNotice(null);
    try {
      const res = await api.respondWorkRequest(selectedRequest.id, respondAction, respondNote);
      setRespondModalOpen(false);
      setRequestNotice({
        type: 'success',
        message:
          respondAction === 'ACCEPTED'
            ? `Work request accepted! Assigned job ${res.jobNumber || ''} has been created and assigned to ${selectedRequest.worker_name}.`
            : respondAction === 'REJECTED'
            ? `Work request declined. Notification recorded for ${selectedRequest.worker_name}.`
            : `Clarification request sent to ${selectedRequest.worker_name}.`
      });
      loadAllData();
    } catch (err: any) {
      setRequestNotice({
        type: 'error',
        message: err.data?.message || err.message || 'Failed to submit response'
      });
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateTenantProfile({
        business_name: editForm.business_name,
        location: editForm.location,
        textile_specialization: editForm.textile_specialization,
        loom_count: Number(editForm.loom_count),
        registration_number: editForm.registration_number
      });
      await refreshProfile();
      setIsEditing(false);
      setSaveNotice(t('worker.profile_updated'));
      setTimeout(() => setSaveNotice(null), 3000);
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to update business profile');
    }
  };

  // KPI Calculations
  const totalSareesProduced = stockList.reduce((acc, s) => acc + (s.quantity || 0), 0);
  const activeBatchesCount = batches.filter((b) => b.status === 'IN_PROGRESS').length;
  const totalRevenue = salesList.reduce((acc, s) => acc + (s.net_amount_inr || 0), 0);
  const pendingWages = payments.filter((p) => p.payment_status === 'PENDING').reduce((acc, p) => acc + (p.balance_remaining || p.net_payable || 0), 0);

  return (
    <div className="space-y-6 py-4">
      {/* Top Tenant Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#64152F] via-[#0D1224] to-[#0A0D16] border border-[#D4AF37]/50 shadow-2xl text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-semibold uppercase tracking-wider mb-2">
              <Building2 className="w-3.5 h-3.5" />
              {t('common.app_name')} &bull; {tenant?.id}
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
              {tenant?.business_name || t('auth.business_name')}
            </h1>
            <p className="text-xs text-gray-300 mt-1 max-w-2xl">
              {tenant?.textile_specialization} &bull; {tenant?.location}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setNewBatchModalOpen(true)}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-[#D4AF37] to-[#C6A15B] text-[#0A0D16] shadow-lg hover:brightness-110 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t('dashboard.new_batch')}</span>
            </button>

            <button
              onClick={() => setNewSaleModalOpen(true)}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg flex items-center gap-1.5 transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{t('dashboard.record_sale')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-gray-200">
        {[
          { id: 'overview', label: t('dashboard.overview'), icon: TrendingUp },
          { id: 'batches', label: `${t('dashboard.production')} (${batches.length})`, icon: Scissors },
          { id: 'offers', label: `${t('dashboard.workers')} (${workOffers.length + workRequests.length})`, icon: Users },
          { id: 'inventory', label: `${t('dashboard.inventory')} (${inventory.length})`, icon: Layers },
          { id: 'stock-sales', label: `${t('dashboard.sales')} (${stockList.length})`, icon: Package },
          { id: 'payments', label: `${t('dashboard.wages')} (₹${pendingWages.toLocaleString()})`, icon: Wallet },
          { id: 'profile', label: t('common.profile'), icon: Building2 },
          { id: 'logs', label: t('sidebar.tenant_audit'), icon: History }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'overview') setCurrentView('dashboard');
                else if (tab.id === 'batches') setCurrentView('owner-batches');
                else if (tab.id === 'offers') setCurrentView('owner-offers');
                else if (tab.id === 'inventory') setCurrentView('owner-inventory');
                else if (tab.id === 'stock-sales') setCurrentView('owner-stock-sales');
                else if (tab.id === 'payments') setCurrentView('owner-payments');
                else if (tab.id === 'profile') setCurrentView('owner-profile');
                else if (tab.id === 'logs') setCurrentView('tenant-audit');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#0D1224] text-[#D4AF37] shadow border border-[#D4AF37]/40'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & STATS */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-[#D4AF37]/30 shadow-sm space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                <span>{t('dashboard.active_batches')}</span>
                <Scissors className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-[#0D1224]">{activeBatchesCount}</div>
              <div className="text-[11px] text-gray-500">{batches.length} {t('dashboard.production').toLowerCase()}</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#D4AF37]/30 shadow-sm space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                <span>{t('dashboard.inventory')}</span>
                <Package className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-[#0D1224]">{totalSareesProduced}</div>
              <div className="text-[11px] text-emerald-600 font-medium">{t('dashboard.completed_batches')}</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#D4AF37]/30 shadow-sm space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                <span>{t('dashboard.total_sales')}</span>
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-indigo-900 font-mono">
                ₹{totalRevenue.toLocaleString()}
              </div>
              <div className="text-[11px] text-gray-500">{salesList.length} {t('dashboard.sales').toLowerCase()}</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#D4AF37]/30 shadow-sm space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                <span>{t('dashboard.wages')}</span>
                <Wallet className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-amber-800 font-mono">
                ₹{pendingWages.toLocaleString()}
              </div>
              <div className="text-[11px] text-amber-700 font-medium">{payments.filter(p => p.payment_status === 'PENDING').length} {t('status.pending').toLowerCase()}</div>
            </div>
          </div>

          {/* Saree Production Snapshot */}
          <div className="p-6 rounded-3xl bg-white border border-[#D4AF37]/30 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-lg text-[#0D1224] flex items-center gap-2">
                <Scissors className="w-5 h-5 text-[#D4AF37]" />
                <span>{t('owner.active_jobs_preview')} (7-Stage)</span>
              </h2>
              <button
                onClick={() => setActiveTab('batches')}
                className="text-xs text-[#64152F] hover:text-[#D4AF37] font-semibold flex items-center gap-1"
              >
                <span>{t('dashboard.actions')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {batches.slice(0, 2).map((batch) => (
                <div
                  key={batch.id}
                  onClick={() => handleOpenBatchDetails(batch.id)}
                  className="p-4 rounded-2xl bg-[#F7F3EA] border border-gray-200 hover:border-[#D4AF37] cursor-pointer transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#0D1224] text-[#D4AF37]">
                        {batch.batch_number}
                      </span>
                      <h3 className="font-serif font-bold text-sm text-[#0D1224] mt-1.5">
                        {batch.saree_type} &bull; {batch.design_name}
                      </h3>
                      <p className="text-xs text-gray-600">{batch.color}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                      {batch.completed_stages || 2} / {batch.total_stages || 7} {t('status.completed')}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-gray-500 font-medium">
                      <span>{t('dashboard.stage')}: {ts(batch.active_stage_name) || t('status.in_progress')}</span>
                      <span>{Math.round(((batch.completed_stages || 2) / 7) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#64152F] to-[#D4AF37] h-2 rounded-full transition-all"
                        style={{ width: `${Math.round(((batch.completed_stages || 2) / 7) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PRODUCTION BATCHES & 7-STAGE PIPELINE */}
      {/* ========================================================================= */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-serif font-bold text-[#0D1224]">
                {t('sidebar.production_batches')} &bull; 7-Stage Pipeline
              </h2>
              <p className="text-xs text-gray-500">
                {t('home.hero_description')}
              </p>
            </div>

            <button
              onClick={() => setNewBatchModalOpen(true)}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-[#D4AF37] to-[#C6A15B] text-[#0A0D16] shadow-md hover:brightness-110 flex items-center gap-1.5 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{t('owner.start_new_batch')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batches.map((batch) => (
              <button
                type="button"
                key={batch.id}
                onClick={() => handleOpenBatchDetails(batch.id)}
                className="w-full text-left p-5 rounded-2xl bg-white border border-[#D4AF37]/30 hover:border-[#D4AF37] shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded bg-[#0D1224] text-[#D4AF37]">
                      {batch.batch_number}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${batch.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                      {tstat(batch.status)}
                    </span>
                  </div>

                  <h3 className="text-base font-serif font-bold text-[#0D1224] group-hover:text-[#64152F] transition-colors">
                    {batch.saree_type}
                  </h3>
                  <div className="text-xs font-semibold text-[#D4AF37] mt-0.5">
                    {batch.design_name}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Color: {batch.color}
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{t('owner.planned_quantity')}:</span>
                    <span className="font-bold text-[#0D1224]">{batch.planned_quantity} {batch.unit_of_measure}</span>
                  </div>

                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{t('dashboard.stage')}:</span>
                    <span className="font-medium text-[#64152F] truncate max-w-[150px]">
                      {ts(batch.active_stage_name) || t('status.completed')}
                    </span>
                  </div>

                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-1">
                    <div
                      className="bg-gradient-to-r from-[#64152F] to-[#D4AF37] h-2 rounded-full"
                      style={{ width: `${Math.round(((batch.completed_stages || 2) / 7) * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                    <span>{t('owner.target_date')}: {batch.target_completion_date}</span>
                    <span className="font-bold text-[#D4AF37] group-hover:underline flex items-center gap-0.5">
                      <span>{t('dashboard.view_details')}</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: WORK OFFERS & WORK REQUESTS */}
      {/* ========================================================================= */}
      {activeTab === 'offers' && (
        <div className="space-y-8">
          {/* Incoming Work Requests from Artisans */}
          <div className="p-6 rounded-3xl bg-white border border-[#D4AF37]/30 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#0D1224] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#D4AF37]" />
                  <span>{t('sidebar.worker_offers')}</span>
                </h3>
                <p className="text-xs text-gray-500">
                  {t('worker.work_proposals_desc')}
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#D4AF37]/20 text-[#0D1224]">
                {workRequests.length} {t('owner.received')}
              </span>
            </div>

            {requestNotice && (
              <div
                className={`p-3.5 rounded-2xl text-xs flex items-center justify-between border ${
                  requestNotice.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  {requestNotice.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{requestNotice.message}</span>
                </div>
                <button onClick={() => setRequestNotice(null)} className="text-xs font-bold hover:underline">
                  ✕
                </button>
              </div>
            )}

            {workRequests.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400 bg-[#FBF9F5] rounded-2xl border border-dashed border-gray-200">
                {t('owner.no_requests')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workRequests.map((req) => (
                  <div key={req.id} className="p-4 rounded-2xl bg-[#F7F3EA] border border-gray-200 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#0D1224] text-[#D4AF37]">
                              {req.request_number}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(req.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="font-serif font-bold text-sm text-[#0D1224] mt-1">{req.worker_name}</h4>
                          <p className="text-xs text-gray-600">{req.worker_location} &bull; {req.worker_phone}</p>
                          {req.worker_experience_years && (
                            <p className="text-[11px] text-[#D4AF37] font-semibold">{req.worker_experience_years} {t('auth.experience_label').replace(' *', '')}</p>
                          )}
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            req.status === 'ACCEPTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800 animate-pulse'
                              : req.status === 'INFO_REQUESTED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {tstat(req.status)}
                        </span>
                      </div>

                      <div className="text-xs text-gray-700 bg-white p-3 rounded-xl border border-gray-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span><strong>{t('worker.requested_process')}:</strong> {ts(req.requested_process)}</span>
                          <span className="font-mono font-bold text-[#0D1224]">{req.quantity} {req.unit}</span>
                        </div>
                        {req.proposed_rate_inr && (
                          <div className="flex items-center justify-between text-[#64152F] font-semibold">
                            <span>{t('worker.proposed_rate').replace(' (₹)', '')}:</span>
                            <span className="font-mono font-bold">₹{Number(req.proposed_rate_inr).toLocaleString()}/{req.unit}</span>
                          </div>
                        )}
                        {req.expected_completion_date && (
                          <div className="text-[11px] text-gray-500">
                            {t('worker.expected_completion')}: <span className="font-medium text-gray-800">{req.expected_completion_date}</span>
                          </div>
                        )}
                        {req.message && (
                          <div className="mt-1 pt-1.5 border-t border-gray-100 text-gray-600 italic">
                            "{req.message}"
                          </div>
                        )}
                      </div>

                      {req.owner_response_note && (
                        <div className="text-xs p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-700">
                          <span className="font-semibold text-gray-900 block text-[11px]">Owner Decision Note:</span>
                          <p className="italic text-gray-600 mt-0.5">"{req.owner_response_note}"</p>
                        </div>
                      )}
                    </div>

                    {req.status === 'PENDING' ? (
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                        <button
                          onClick={() => handleOpenRespondModal(req, 'ACCEPTED')}
                          className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{t('worker.accept_assign')}</span>
                        </button>
                        <button
                          onClick={() => handleOpenRespondModal(req, 'INFO_REQUESTED')}
                          className="px-3 py-1.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-all"
                        >
                          {t('owner.request_info')}
                        </button>
                          <button
                          onClick={() => handleOpenRespondModal(req, 'REJECTED')}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition-all"
                        >
                          {t('owner.reject')}
                        </button>
                      </div>
                    ) : req.status === 'ACCEPTED' ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 pt-2 border-t border-gray-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{t('worker.accepted_job_assigned')}</span>
                      </div>
                    ) : req.status === 'INFO_REQUESTED' ? (
                      <div className="flex items-center justify-between text-xs text-blue-700 pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-1.5">
                          <Info className="w-4 h-4 shrink-0" />
                          <span>{t('worker.awaiting_clarification')}</span>
                        </div>
                        <button
                          onClick={() => handleOpenRespondModal(req, 'ACCEPTED')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all"
                        >
                          {t('worker.accept_now')}
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 italic pt-2 border-t border-gray-200">
                        {t('worker.request_declined')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sent Work Offers by Owner */}
          <div className="p-6 rounded-3xl bg-white border border-[#D4AF37]/30 shadow-sm space-y-4">
            <h3 className="text-lg font-serif font-bold text-[#0D1224] flex items-center gap-2">
              <Send className="w-5 h-5 text-[#D4AF37]" />
              <span>{t('owner.incoming_requests')}</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0D1224] text-[#D4AF37] uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-3 rounded-l-xl">{t('owner.offer_number')}</th>
                    <th className="p-3">{t('owner.artisan')}</th>
                    <th className="p-3">{t('owner.batch_stage')}</th>
                    <th className="p-3">{t('owner.quantity')}</th>
                    <th className="p-3">{t('owner.proposed_rate')}</th>
                    <th className="p-3">{t('owner.deadline')}</th>
                    <th className="p-3 rounded-r-xl">{t('dashboard.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {workOffers.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="p-3 font-mono font-bold text-[#0D1224]">{o.offer_number}</td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-800">{o.worker_name}</div>
                        <div className="text-[10px] text-gray-400">{o.worker_phone}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-800">{o.process_stage}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{o.batch_number}</div>
                      </td>
                      <td className="p-3 font-semibold">{o.quantity} {o.unit}</td>
                      <td className="p-3 font-bold text-[#64152F]">₹{o.proposed_rate.toLocaleString()}/pc</td>
                      <td className="p-3 text-gray-500">{o.deadline}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${o.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' : o.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'}`}>
                          {tstat(o.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RAW MATERIAL INVENTORY */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-serif font-bold text-[#0D1224]">
                {t('owner.inventory_title')}
              </h2>
              <p className="text-xs text-gray-500">
                Track yarn hanks, gold/silver zari spools, dyes, and monitor real-time stock consumption per batch.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {inventory.map((item) => {
              const isLow = item.available_quantity <= item.reorder_level;
              return (
                <div key={item.id} className="p-5 rounded-2xl bg-white border border-[#D4AF37]/30 shadow-sm flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[10px] font-bold text-gray-400">{item.material_code}</span>
                      {isLow && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {t('owner.reorder_alert')}
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif font-bold text-sm text-[#0D1224]">{item.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{item.supplier_name}</p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-gray-500">{t('owner.available_stock')}:</span>
                      <span className="text-lg font-bold font-mono text-[#0D1224]">
                        {item.available_quantity} {item.unit_of_measurement}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{t('owner.cost')}: ₹{item.purchase_cost_inr.toLocaleString()}/{item.unit_of_measurement}</span>
                      <span>Min: {item.reorder_level}</span>
                    </div>

                    <button
                      onClick={() => handleOpenConsumeModal(item)}
                      className="w-full py-2 rounded-xl bg-[#0D1224] hover:bg-[#1A2238] text-[#D4AF37] font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <span>{t('owner.deduct_consumption')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: FINISHED SAREES & SALES */}
      {/* ========================================================================= */}
      {activeTab === 'stock-sales' && (
        <div className="space-y-6">
          {/* Finished Saree Stock */}
          <div className="p-6 rounded-3xl bg-white border border-[#D4AF37]/30 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#0D1224] flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#D4AF37]" />
                  <span>{t('owner.stock_title')}</span>
                </h3>
                <p className="text-xs text-gray-500">
                  {t('owner.finished_saree_desc')}
                </p>
              </div>

              <button
                onClick={() => setNewSaleModalOpen(true)}
                className="px-4 py-2 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center gap-1.5 transition-all"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{t('dashboard.record_sale')}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stockList.map((saree) => (
                <div key={saree.id} className="p-4 rounded-2xl bg-[#F7F3EA] border border-[#D4AF37]/30 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#0D1224] text-[#D4AF37]">
                        {saree.saree_code}
                      </span>
                      <h4 className="font-serif font-bold text-sm text-[#0D1224] mt-1.5">{saree.saree_title}</h4>
                      <p className="text-xs text-gray-600">{saree.color}</p>
                    </div>
                    <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                      {saree.quantity} {t('status.completed').toLowerCase()}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-gray-500 text-[10px]">{t('worker.selling_price')}:</span>
                      <div className="font-bold text-[#64152F] text-sm font-mono">₹{saree.selling_price_inr.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500 text-[10px]">{t('worker.location')}:</span>
                      <div className="font-medium text-gray-700">{saree.rack_location}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recorded Sales Orders */}
          <div className="p-6 rounded-3xl bg-white border border-[#D4AF37]/30 shadow-sm space-y-4">
            <h3 className="text-lg font-serif font-bold text-[#0D1224] flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-600" />
              <span>{t('owner.sales_title')}</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0D1224] text-[#D4AF37] uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-3 rounded-l-xl">{t('owner.order_number')}</th>
                    <th className="p-3">{t('owner.customer_boutique')}</th>
                    <th className="p-3">{t('owner.channel')}</th>
                    <th className="p-3">{t('owner.items')}</th>
                    <th className="p-3">{t('owner.net_bill')}</th>
                    <th className="p-3">{t('owner.payment')}</th>
                    <th className="p-3 rounded-r-xl">{t('owner.date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {salesList.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="p-3 font-mono font-bold text-[#0D1224]">{sale.order_number}</td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-800">{sale.customer_name}</div>
                        <div className="text-[10px] text-gray-400">{sale.customer_phone} {sale.customer_city ? `• ${sale.customer_city}` : ''}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                          {sale.sale_type}
                        </span>
                      </td>
                      <td className="p-3 font-semibold">{sale.total_items} sarees</td>
                      <td className="p-3 font-bold font-mono text-emerald-700">₹{sale.net_amount_inr.toLocaleString()}</td>
                      <td className="p-3 font-medium text-gray-600">{sale.payment_method} ({sale.payment_status})</td>
                      <td className="p-3 text-gray-500">{sale.sale_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: ARTISAN WAGE LEDGER */}
      {/* ========================================================================= */}
      {activeTab === 'payments' && (
        <div className="p-6 rounded-3xl bg-white border border-[#D4AF37]/30 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-serif font-bold text-[#0D1224] flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#D4AF37]" />
                <span>{t('owner.wage_ledger_title')}</span>
              </h2>
              <p className="text-xs text-gray-500">
                {t('owner.wage_ledger_title')} description.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#0D1224] text-[#D4AF37] uppercase font-mono text-[10px]">
                <tr>
                  <th className="p-3 rounded-l-xl">{t('owner.order_number').replace('Order', 'Voucher')}</th>
                  <th className="p-3">{t('owner.artisan')}</th>
                  <th className="p-3">{t('owner.batch_stage')}</th>
                  <th className="p-3">{t('worker.proposed_rate').replace('Proposed', 'Agreed')}</th>
                  <th className="p-3">{t('status.approved')} Qty</th>
                  <th className="p-3">Gross</th>
                  <th className="p-3">Balance Due</th>
                  <th className="p-3">{t('dashboard.status')}</th>
                  <th className="p-3 rounded-r-xl text-right">{t('dashboard.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => {
                  const isPaid = p.payment_status === 'PAID';
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="p-3 font-mono font-bold text-gray-500">{p.id.substring(0, 10)}</td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-800">{p.worker_name}</div>
                        <div className="text-[10px] text-gray-400">{p.worker_phone}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-800">{p.stage_name}</div>
                        <div className="text-[10px] text-gray-500">{p.production_id}</div>
                      </td>
                      <td className="p-3 font-mono">₹{p.agreed_rate}/{p.rate_type === 'PER_KG' ? 'kg' : 'pc'}</td>
                      <td className="p-3 font-bold">{p.approved_quantity}</td>
                      <td className="p-3 font-mono">₹{p.gross_amount.toLocaleString()}</td>
                      <td className="p-3 font-mono font-bold text-amber-800">₹{p.balance_remaining.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {p.payment_status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {!isPaid && (
                          <button
                            onClick={() => handleOpenPayModal(p)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow transition-all"
                          >
                            {t('owner.disburse')}
                          </button>
                        )}
                        {isPaid && (
                          <span className="text-[10px] text-gray-400">{t('status.completed')} ({p.payment_method})</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: BUSINESS & LOOM PROFILE */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="p-6 rounded-3xl bg-white border border-[#D4AF37]/30 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#8C6D1F] text-xs font-semibold uppercase tracking-wider mb-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>Textile Business Tenant &bull; {tenant?.id}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#0D1224]">
                {t('sidebar.business_profile')}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('auth.registration_subtitle')}
              </p>
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#0D1224] text-[#D4AF37] hover:bg-[#1A2238] shadow transition-all self-start sm:self-auto"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? t('common.cancel') : t('common.edit') + ' ' + t('dashboard.profile')}</span> 
            </button>
          </div>

          {saveNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{saveNotice}</span>
            </div>
          )}

          {!isEditing ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#F7F3EA] border border-[#D4AF37]/30 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">{t('admin.all_owners_dir')}</span>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#0D1224]">{tenant?.business_name}</h3>
                    <p className="text-xs text-gray-600">{tenant?.location}</p>
                  </div>
                  <div className="pt-2 border-t border-gray-200 text-xs space-y-1">
                    <div><span className="text-gray-400">{t('sidebar.tenant_id')}:</span> <code className="text-[#64152F]">{tenant?.id}</code></div>
                    <div><span className="text-gray-400">{t('auth.reg_number_label')}:</span> <span className="font-mono text-gray-800">{tenant?.registration_number || 'Small Business Exemption'}</span></div>
                    <div><span className="text-gray-400">{t('dashboard.status')}:</span> <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">{tenant?.subscription_status || t('status.active')}</span></div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F7F3EA] border border-[#D4AF37]/30 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">{t('auth.craft_profile')}</span>
                  <div>
                    <div className="text-xs text-gray-500">{t('auth.specialization_label')}:</div>
                    <div className="font-bold text-sm text-[#0D1224]">{tenant?.textile_specialization}</div>
                  </div>
                  <div className="pt-2 border-t border-gray-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">{t('auth.loom_count_label')}:</span>
                      <span className="font-bold font-mono text-base text-[#64152F]">{tenant?.loom_count} {t('owner.looms')}</span>
                    </div>
                    <div className="pt-1">
                      <span className="text-gray-400 block text-[11px] mb-1">{t('worker.loom_config')}:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {tenant?.loom_types?.map((type: string, idx: number) => (
                          <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-white border border-[#D4AF37]/30 text-[11px] font-medium text-gray-800">
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  {t('worker.profile_shared_desc')}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">{t('auth.business_name_label')}</label>
                <input
                  type="text"
                  required
                  value={editForm.business_name}
                  onChange={(e) => setEditForm({ ...editForm, business_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">{t('auth.location_label')}</label>
                  <input
                    type="text"
                    required
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">{t('auth.loom_count_label')}</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={editForm.loom_count}
                    onChange={(e) => setEditForm({ ...editForm, loom_count: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">{t('auth.specialization_label')}</label>
                <input
                  type="text"
                  required
                  value={editForm.textile_specialization}
                  onChange={(e) => setEditForm({ ...editForm, textile_specialization: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">{t('auth.reg_number_label')}</label>
                <input
                  type="text"
                  placeholder="e.g. 33AAAAA0000A1Z5 or Handloom Co-op #4512"
                  value={editForm.registration_number}
                  onChange={(e) => setEditForm({ ...editForm, registration_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#D4AF37] text-[#0A0D16] hover:brightness-110 shadow"
                >
                  {t('common.save')} {t('dashboard.profile')}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: TENANT ACTIVITY LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="p-6 rounded-3xl bg-white border border-[#D4AF37]/30 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-1">
                <History className="w-3.5 h-3.5" />
                <span>Tenant {tenant?.id} &bull; Security Audit</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#0D1224]">
                {t('sidebar.tenant_audit')} &bull; {t('admin.audit_logs')}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('admin.audit_stream')} description.
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-[#8C6D1F]">
              {auditLogs.length} {t('admin.audit_logs')}
            </span>
          </div>

          <div className="divide-y divide-gray-100 text-xs space-y-2 max-h-[500px] overflow-y-auto pr-2">
            {auditLogs.length === 0 ? (
              <p className="text-center py-8 text-gray-400">{t('admin.audit_logs')} is empty.</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="pt-2 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-gray-50/50 p-2 rounded-xl transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {t('worker.actor_label')}: @{log.actor_username} ({log.actor_role})
                      </span>
                    </div>
                    <p className="text-gray-700 text-xs">{log.details}</p>
                    <span className="text-[10px] text-gray-400">IP: {log.ip_address}</span>
                  </div>
                  <span className="text-[11px] text-gray-400 font-mono shrink-0">{log.timestamp.slice(0, 19).replace('T', ' ')}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Batch Details & 7-Stage Interactive Pipeline Modal */}
      {batchModalOpen && selectedBatch && (
        <BatchDetailModal
          batch={selectedBatch}
          stages={selectedBatchStages}
          onClose={() => setBatchModalOpen(false)}
          onRefresh={() => {
            handleOpenBatchDetails(selectedBatch.id);
            loadAllData();
          }}
          onOpenOfferModal={(stage) => handleOpenOfferModal(stage)}
        />
      )}

      {/* Start New Batch Modal */}
      {newBatchModalOpen && (
        <NewBatchModal
          onClose={() => setNewBatchModalOpen(false)}
          onCreated={() => {
            setNewBatchModalOpen(false);
            loadAllData();
          }}
        />
      )}

      {/* Send Work Offer Modal */}
      {offerModalOpen && offerStage && selectedBatch && (
        <CreateOfferModal
          stage={offerStage}
          batch={selectedBatch}
          onClose={() => setOfferModalOpen(false)}
          onSent={() => {
            setOfferModalOpen(false);
            handleOpenBatchDetails(selectedBatch.id);
            loadAllData();
          }}
        />
      )}

      {/* Consume Material Modal */}
      {consumeModalOpen && selectedMaterial && (
        <ConsumeMaterialModal
          material={selectedMaterial}
          batches={batches}
          onClose={() => setConsumeModalOpen(false)}
          onConsumed={() => {
            setConsumeModalOpen(false);
            loadAllData();
          }}
        />
      )}

      {/* New Sale Modal */}
      {newSaleModalOpen && (
        <NewSaleModal
          stockList={stockList}
          onClose={() => setNewSaleModalOpen(false)}
          onSaved={() => {
            setNewSaleModalOpen(false);
            loadAllData();
          }}
        />
      )}

      {/* Disburse Payment Modal */}
      {payModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0D1224] border border-[#D4AF37]/50 rounded-3xl w-full max-w-md p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/20">
              <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <span>{t('owner.payment_modal_title')}</span>
              </h3>
              <button onClick={() => setPayModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#0A0D16] border border-white/10 space-y-1">
                <div className="text-gray-400">{t('owner.artisan')}: <span className="font-bold text-white">{selectedPayment.worker_name}</span></div>
                <div className="text-gray-400">{t('dashboard.stage')}: <span className="font-bold text-[#D4AF37]">{selectedPayment.stage_name}</span> &bull; {selectedPayment.approved_quantity} {t('owner.items')}</div>
                <div className="text-gray-400">Total Net Due: <span className="font-bold text-emerald-400 font-mono">₹{selectedPayment.balance_remaining.toLocaleString()}</span></div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">{t('owner.disburse')} {t('owner.amount')} (₹)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={selectedPayment.balance_remaining}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0A0D16] border border-[#D4AF37]/40 text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">{t('owner.method')}</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                  >
                    <option value="UPI">UPI (GPay / PhonePe)</option>
                    <option value="NEFT">NEFT / Bank Transfer</option>
                    <option value="CASH">Cash Disbursement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">{t('owner.transaction_id')}</label>
                  <input
                    type="text"
                    required
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg transition-all"
                >
                  {submittingPayment ? t('common.loading') : t('owner.disburse')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESPOND TO WORK REQUEST MODAL */}
      {/* ========================================================================= */}
      {respondModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0D1224] border border-[#D4AF37]/50 rounded-3xl w-full max-w-lg p-6 shadow-2xl text-white space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/20">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-lg font-serif font-bold text-white">
                  {t('owner.respond_modal_title')}
                </h3>
              </div>
              <button
                onClick={() => setRespondModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0A0D16] border border-white/10 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-mono text-[11px]">{selectedRequest.request_number}</span>
                <span className="text-[#D4AF37] font-semibold">{selectedRequest.worker_location}</span>
              </div>
              <div className="text-sm font-bold text-white">{selectedRequest.worker_name}</div>
              <div className="text-gray-300">
                Offering <strong>{selectedRequest.requested_process}</strong> for{' '}
                <strong>{selectedRequest.quantity} {selectedRequest.unit}</strong>
              </div>
              {selectedRequest.proposed_rate_inr && (
                <div className="text-emerald-400 font-mono">
                  Proposed Labor Rate: ₹{Number(selectedRequest.proposed_rate_inr).toLocaleString()}/{selectedRequest.unit}
                </div>
              )}
              {selectedRequest.message && (
                <div className="text-gray-400 italic pt-1 border-t border-white/5">
                  Artisan message: "{selectedRequest.message}"
                </div>
              )}
            </div>

            <form onSubmit={handleConfirmResponse} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1.5">{t('dashboard.actions')}</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRespondAction('ACCEPTED');
                      setRespondNote('Proposal accepted. Production job assignment initiated.');
                    }}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                      respondAction === 'ACCEPTED'
                        ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                        : 'bg-[#0A0D16] border-white/10 text-gray-300 hover:bg-white/5'
                    }`}
                  >
                      {t('owner.accept')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRespondAction('INFO_REQUESTED');
                      setRespondNote('Please specify your earliest start date and confirmation of loom setup availability.');
                    }}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                      respondAction === 'INFO_REQUESTED'
                        ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                        : 'bg-[#0A0D16] border-white/10 text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {t('owner.request_info')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRespondAction('REJECTED');
                      setRespondNote('Thank you for your interest. Current production loom capacity is fully committed.');
                    }}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                      respondAction === 'REJECTED'
                        ? 'bg-rose-700 border-rose-500 text-white shadow-md'
                        : 'bg-[#0A0D16] border-white/10 text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {t('owner.reject')}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  {respondAction === 'ACCEPTED'
                    ? 'Owner Instructions / Notes (Dispatched with Job):'
                    : respondAction === 'INFO_REQUESTED'
                    ? 'Clarification Details Requested from Artisan:'
                    : 'Reason for Declining (Optional):'}
                </label>
                <textarea
                  rows={3}
                  required={respondAction === 'INFO_REQUESTED'}
                  value={respondNote}
                  onChange={(e) => setRespondNote(e.target.value)}
                  placeholder="Enter response notes..."
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0A0D16] border border-[#D4AF37]/40 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                />
              </div>

              {respondAction === 'ACCEPTED' && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Accepting will immediately create a production job record (JOB-YYYY-XXX), assign it to {selectedRequest.worker_name}, and link it to your active manufacturing workflow.
                  </span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setRespondModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResponse}
                  className={`px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all ${
                    respondAction === 'ACCEPTED'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : respondAction === 'INFO_REQUESTED'
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-rose-700 hover:bg-rose-600 text-white'
                  }`}
                >
                  {submittingResponse ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
