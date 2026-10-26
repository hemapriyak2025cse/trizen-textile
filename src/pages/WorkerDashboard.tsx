import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../api/client';
import {
  UserCheck,
  Search,
  Sparkles,
  Building2,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  Calendar,
  Wallet,
  Check,
  Scissors,
  Send,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  X,
  Plus,
  FileText,
  MessageSquare
} from 'lucide-react';

interface WorkerDashboardProps {
  currentView?: string;
  setCurrentView: (view: string) => void;
}

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ currentView = 'dashboard', setCurrentView }) => {
  const { user, refreshProfile } = useAuth();
  const { t, ts, tstat } = useLanguage();

  const resolveTab = (view: string) => {
    switch (view) {
      case 'worker-offers': return 'offers';
      case 'worker-requests': return 'my-requests';
      case 'worker-jobs': return 'jobs';
      case 'worker-payments': return 'payments';
      case 'worker-search-owners': return 'search-owners';
      case 'worker-skills': return 'skills';
      case 'dashboard':
      default: return 'workbench';
    }
  };

  const [activeTab, setActiveTab] = useState<string>(resolveTab(currentView));

  useEffect(() => {
    setActiveTab(resolveTab(currentView));
  }, [currentView]);

  const [availability, setAvailability] = useState<'AVAILABLE' | 'BUSY'>(user?.availability || 'AVAILABLE');
  const [updatingAvail, setUpdatingAvail] = useState(false);
  const [availNotice, setAvailNotice] = useState<string | null>(null);

  // Data states
  const [offers, setOffers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);

  // Progress form state
  const [progressQty, setProgressQty] = useState<number>(0);
  const [wastageQty, setWastageQty] = useState<number>(0);
  const [progressNotes, setProgressNotes] = useState('');
  const [issuesReported, setIssuesReported] = useState('');
  const [submittingProgress, setSubmittingProgress] = useState(false);

  // Proposal form state
  const [proposalData, setProposalData] = useState({
    requested_process: 'Weaving / Loom',
    quantity: 25,
    unit: 'pieces',
    proposed_rate: 2400,
    expected_completion: '14 Days from Yarn Handover',
    message: ''
  });
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);

  // Clarification reply state
  const [replyingRequestId, setReplyingRequestId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (user?.availability) {
      setAvailability(user.availability);
    }
    loadData();
    handleSearch();
  }, [user, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [offerRes, jobRes, payRes, reqRes] = await Promise.allSettled([
        api.getWorkOffers(),
        api.getJobs(),
        api.getPayments(),
        api.getWorkRequests()
      ]);

      if (offerRes.status === 'fulfilled') setOffers(offerRes.value.offers || []);
      if (jobRes.status === 'fulfilled') setJobs(jobRes.value.jobs || []);
      if (payRes.status === 'fulfilled') setPayments(payRes.value.payments || []);
      if (reqRes.status === 'fulfilled') setMyRequests(reqRes.value.requests || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (newStatus: 'AVAILABLE' | 'BUSY') => {
    setUpdatingAvail(true);
    try {
      await api.setWorkerAvailability(newStatus);
      setAvailability(newStatus);
      setAvailNotice(`Loom availability updated to ${newStatus}`);
      await refreshProfile();
      setTimeout(() => setAvailNotice(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update availability');
    } finally {
      setUpdatingAvail(false);
    }
  };

  const handleSearch = async () => {
    setSearching(true);
    try {
      const res = await api.searchOwners(searchQuery);
      setBusinesses(res.businesses || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleRespondOffer = async (offerId: string, action: 'ACCEPTED' | 'DECLINED' | 'CHANGES_REQUESTED') => {
    let note = '';
    if (action !== 'ACCEPTED') {
      const promptRes = prompt(`Please provide note for saree owner (${action}):`, action === 'DECLINED' ? 'Loom currently committed to wedding batch.' : 'Request ₹150 adjustment on border work.');
      if (promptRes === null) return;
      note = promptRes;
    }

    try {
      await api.respondWorkOffer(offerId, action, note);
      await loadData();
      if (action === 'ACCEPTED') {
        setActiveTab('jobs');
        setCurrentView('worker-jobs');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to respond to offer');
    }
  };

  const handleStartJob = async (jobId: string) => {
    try {
      await api.startJob(jobId);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to start job');
    }
  };

  const handleOpenProgress = (job: any) => {
    setSelectedJob(job);
    setProgressQty(job.completed_quantity || 0);
    setWastageQty(job.wastage_quantity || 0);
    setProgressNotes('');
    setIssuesReported('');
    setProgressModalOpen(true);
  };

  const handleSaveProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    setSubmittingProgress(true);
    try {
      await api.logJobProgress(selectedJob.id, {
        completed_quantity: Number(progressQty),
        wastage_quantity: Number(wastageQty),
        notes: progressNotes,
        issues_reported: issuesReported
      });
      setProgressModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save progress');
    } finally {
      setSubmittingProgress(false);
    }
  };

  const handleOpenSubmit = (job: any) => {
    setSelectedJob(job);
    setProgressQty(job.required_quantity);
    setProgressNotes('Handloom weaving completed. 0 flaws, ready for quality checking.');
    setSubmitModalOpen(true);
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    setSubmittingProgress(true);
    try {
      await api.submitJob(selectedJob.id, {
        final_quantity: Number(progressQty),
        final_wastage: Number(wastageQty),
        completion_notes: progressNotes
      });
      setSubmitModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit work for review');
    } finally {
      setSubmittingProgress(false);
    }
  };

  const handleOpenProposal = (biz: any) => {
    setSelectedBusiness(biz);
    setProposalError(null);
    setProposalData({
      requested_process: 'Weaving / Loom',
      quantity: 25,
      unit: 'pieces',
      proposed_rate: 2400,
      expected_completion: '14 Days from Yarn Handover',
      message: `Namaste, I am available for your upcoming silk batches. Specializing in traditional handloom ${user?.skills?.[0] || 'weaving'}.`
    });
    setRequestModalOpen(true);
  };

  const handleSendProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness) return;
    setProposalError(null);
    setSubmittingProposal(true);
    try {
      const res = await api.createWorkRequest({
        tenant_id: selectedBusiness.id,
        requested_process: proposalData.requested_process,
        quantity: Number(proposalData.quantity),
        unit: proposalData.unit,
        proposed_rate: Number(proposalData.proposed_rate),
        expected_completion: proposalData.expected_completion,
        message: proposalData.message
      });
      setRequestModalOpen(false);
      setActionNotice({
        type: 'success',
        text: res.message || `Work proposal ${res.requestNumber} submitted to ${selectedBusiness.business_name}!`
      });
      await loadData();
      setActiveTab('my-requests');
      setCurrentView('worker-requests');
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      setProposalError(err.message || 'Failed to submit work proposal.');
      setActionNotice({
        type: 'error',
        text: err.message || 'Failed to submit work request'
      });
    } finally {
      setSubmittingProposal(false);
    }
  };

  const handleReplyRequest = async (requestId: string) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const res = await api.replyWorkRequest(requestId, replyText.trim());
      setActionNotice({
        type: 'success',
        text: res.message || 'Clarification reply sent to owner!'
      });
      setReplyingRequestId(null);
      setReplyText('');
      await loadData();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        text: err.message || 'Failed to send reply'
      });
    } finally {
      setSubmittingReply(false);
    }
  };

  const totalEarned = payments.reduce((acc, p) => acc + (p.gross_amount || 0), 0);
  const totalPaid = payments.filter((p) => p.payment_status === 'PAID').reduce((acc, p) => acc + (p.amount_paid || p.net_payable || 0), 0);
  const pendingWage = payments.filter((p) => p.payment_status === 'PENDING').reduce((acc, p) => acc + (p.balance_remaining || p.net_payable || 0), 0);


  return (
    <div className="space-y-6 py-4">
      {/* Artisan Workbench Header Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#004D4D] via-[#006666] to-[#0A1128] border border-[#38BDF8]/40 shadow-2xl text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-cyan-200 text-xs font-semibold uppercase tracking-wider mb-2">
              <UserCheck className="w-3.5 h-3.5" />
              {t('worker.workbench_title')}
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
              {user?.full_name}
            </h1>
            <p className="text-xs text-cyan-100 mt-1 max-w-xl">
              @{user?.username} &bull; {user?.location} &bull; {user?.experience_years ?? 10} {t('auth.experience_label').replace(' *', '')}
            </p>
          </div>

          {/* Interactive Live Availability Switcher */}
          <div className="p-3.5 rounded-2xl bg-[#0A0D16]/70 border border-white/20 backdrop-blur-sm shrink-0 space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-300 block">
              {t('worker.availability_label')}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={updatingAvail}
                onClick={() => handleToggleAvailability('AVAILABLE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  availability === 'AVAILABLE'
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t('auth.available_work').toUpperCase()}</span>
              </button>
              <button
                type="button"
                disabled={updatingAvail}
                onClick={() => handleToggleAvailability('BUSY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  availability === 'BUSY'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{t('auth.busy_loom').toUpperCase()}</span>
              </button>
            </div>
            {availNotice && (
              <span className="text-[10px] text-emerald-300 block animate-fade-in font-medium">
                {availNotice}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Global Action Notice Banner */}
      {actionNotice && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between shadow-md border ${
            actionNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{actionNotice.text}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-xs font-bold p-1 hover:underline">
            ✕
          </button>
        </div>
      )}

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-gray-200">
        {[
          { id: 'workbench', label: t('dashboard.overview'), icon: TrendingUp },
          { id: 'offers', label: `${t('sidebar.work_offers')} (${offers.length})`, icon: UserCheck },
          { id: 'my-requests', label: `${t('sidebar.my_requests')} (${myRequests.length})`, icon: Send },
          { id: 'jobs', label: `${t('sidebar.assigned_jobs')} (${jobs.length})`, icon: Scissors },
          { id: 'payments', label: `${t('sidebar.wage_payouts')} (₹${pendingWage.toLocaleString()})`, icon: Wallet },
          { id: 'search-owners', label: t('sidebar.search_owners'), icon: Search },
          { id: 'skills', label: t('sidebar.skills_availability'), icon: Sparkles }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'workbench') setCurrentView('dashboard');
                else if (tab.id === 'offers') setCurrentView('worker-offers');
                else if (tab.id === 'my-requests') setCurrentView('worker-requests');
                else if (tab.id === 'jobs') setCurrentView('worker-jobs');
                else if (tab.id === 'payments') setCurrentView('worker-payments');
                else if (tab.id === 'search-owners') setCurrentView('worker-search-owners');
                else if (tab.id === 'skills') setCurrentView('worker-skills');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#004D4D] text-cyan-200 shadow border border-cyan-400/40'
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
      {/* TAB 1: ARTISAN OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'workbench' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-teal-200 shadow-sm space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                <span>{t('worker.active_assigned_jobs')}</span>
                <Scissors className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-teal-950">
                {jobs.filter((j) => j.status === 'IN_PROGRESS' || j.status === 'ASSIGNED').length}
              </div>
              <div className="text-[11px] text-teal-700">{jobs.length} {t('worker.jobs_title').toLowerCase()}</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-cyan-200 shadow-sm space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                <span>{t('worker.new_offers_waiting')}</span>
                <UserCheck className="w-4 h-4 text-cyan-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-cyan-950">
                {offers.filter((o) => o.status === 'PENDING').length}
              </div>
              <div className="text-[11px] text-cyan-700">{t('worker.incoming_offers')}</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-sm space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                <span>{t('worker.total_wages_received')}</span>
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-emerald-950 font-mono">
                ₹{totalPaid.toLocaleString()}
              </div>
              <div className="text-[11px] text-emerald-700">{t('worker.total_earnings')}</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-amber-200 shadow-sm space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                <span>{t('worker.pending_wage_vouchers')}</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-amber-900 font-mono">
                ₹{pendingWage.toLocaleString()}
              </div>
              <div className="text-[11px] text-amber-700">{t('worker.pending_payouts')}</div>
            </div>
          </div>

          {/* Quick Active Jobs Preview */}
          <div className="p-6 rounded-3xl bg-white border border-teal-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-serif font-bold text-teal-950 flex items-center gap-2">
                <Scissors className="w-5 h-5 text-teal-600" />
                <span>{t('worker.active_jobs_preview')}</span>
              </h3>
              <button
                onClick={() => setActiveTab('jobs')}
                className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1"
              >
                <span>{t('worker.jobs_title')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.slice(0, 2).map((job) => (
                <div key={job.id} className="p-4 rounded-2xl bg-[#F7F3EA] border border-gray-200 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#004D4D] text-cyan-200">
                        {job.job_number}
                      </span>
                      <h4 className="font-serif font-bold text-sm text-[#0D1224] mt-1.5">{ts(job.process_stage)}</h4>
                      <p className="text-xs text-gray-600">{job.business_name} &bull; {job.batch_number}</p>
                    </div>
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-900">
                      ₹{job.agreed_rate}/pc
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600 font-medium">
                      <span>Completed: {job.completed_quantity} / {job.required_quantity} pcs</span>
                      <span>{Math.round((job.completed_quantity / job.required_quantity) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-teal-600 to-cyan-500 h-2 rounded-full"
                        style={{ width: `${Math.round((job.completed_quantity / job.required_quantity) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {job.status === 'ASSIGNED' && (
                      <button
                        onClick={() => handleStartJob(job.id)}
                        className="flex-1 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
                      >
                        {t('worker.start_work')}
                      </button>
                    )}
                    {(job.status === 'IN_PROGRESS' || job.status === 'REWORK_REQUIRED') && (
                      <>
                        <button
                          onClick={() => handleOpenProgress(job)}
                          className="flex-1 py-1.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-xs font-bold text-gray-800"
                        >
                          {t('worker.log_progress')}
                        </button>
                        <button
                          onClick={() => handleOpenSubmit(job)}
                          className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                        >
                          {t('worker.submit_work')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INCOMING WORK OFFERS */}
      {/* ========================================================================= */}
      {activeTab === 'offers' && (
        <div className="p-6 rounded-3xl bg-white border border-teal-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-serif font-bold text-[#0D1224] flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-teal-600" />
                <span>{t('worker.incoming_offers')}</span>
              </h3>
              <p className="text-xs text-gray-500">
                {t('worker.no_offers')}
              </p>
            </div>
          </div>

          {offers.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">
              {t('worker.no_offers')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offers.map((offer) => {
                const isPending = offer.status === 'PENDING';
                return (
                  <div key={offer.id} className="p-5 rounded-2xl bg-[#F7F3EA] border border-[#D4AF37]/30 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#0D1224] text-[#D4AF37]">
                          {offer.offer_number}
                        </span>
                        <h4 className="font-serif font-bold text-base text-[#0D1224] mt-1.5">
                          {ts(offer.process_stage)}
                        </h4>
                        <p className="text-xs text-gray-700 font-medium">
                          {offer.business_name} &bull; {offer.business_location}
                        </p>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${offer.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' : isPending ? 'bg-amber-100 text-amber-800 animate-pulse' : 'bg-gray-100 text-gray-800'}`}>
                        {tstat(offer.status)}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-gray-200 text-xs space-y-1">
                      <div><strong>{t('dashboard.batch_id')}:</strong> {offer.batch_number} ({offer.saree_type} - {offer.design_name})</div>
                      <div><strong>{t('owner.quantity')}:</strong> {offer.quantity} {offer.unit} @ <span className="font-bold text-emerald-700 font-mono">₹{offer.proposed_rate.toLocaleString()}/pc</span> (Est. Total: ₹{(offer.quantity * offer.proposed_rate).toLocaleString()})</div>
                      <div><strong>{t('owner.deadline')}:</strong> {offer.deadline}</div>
                      {offer.work_instructions && (
                        <div className="text-gray-600 mt-1 italic">"{offer.work_instructions}"</div>
                      )}
                    </div>

                    {isPending && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleRespondOffer(offer.id, 'ACCEPTED')}
                          className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:brightness-110 text-white font-bold text-xs shadow transition-all flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>{t('worker.accept_offer')}</span>
                        </button>
                        <button
                          onClick={() => handleRespondOffer(offer.id, 'CHANGES_REQUESTED')}
                          className="px-3 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-all"
                        >
                          {t('worker.request_terms_change')}
                        </button>
                        <button
                          onClick={() => handleRespondOffer(offer.id, 'DECLINED')}
                          className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition-all"
                        >
                          {t('owner.reject')}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2.5: MY WORK REQUESTS / PROPOSALS SENT TO OWNERS */}
      {/* ========================================================================= */}
      {activeTab === 'my-requests' && (
        <div className="p-6 rounded-3xl bg-white border border-teal-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-serif font-bold text-[#0D1224] flex items-center gap-2">
                <Send className="w-5 h-5 text-teal-600" />
                <span>{t('worker.my_proposals')}</span>
              </h3>
              <p className="text-xs text-gray-500">
                {t('worker.my_proposals')} description.
              </p>
            </div>

            <button
              onClick={() => {
                setActiveTab('search-owners');
                setCurrentView('worker-search-owners');
              }}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow flex items-center gap-1.5 transition-all self-start sm:self-auto"
            >
              <Search className="w-4 h-4" />
              <span>{t('worker.discover_businesses')}</span>
            </button>
          </div>

          {myRequests.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-[#F7F3EA] border border-dashed border-gray-300 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto text-teal-600">
                <Send className="w-6 h-6" />
              </div>
              <div className="font-serif font-bold text-base text-[#0D1224]">{t('worker.no_proposals')}</div>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {t('worker.no_proposals')} description.
              </p>
              <button
                onClick={() => {
                  setActiveTab('search-owners');
                  setCurrentView('worker-search-owners');
                }}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow transition-all"
              >
                Browse Saree Businesses
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myRequests.map((req) => {
                const isReplying = replyingRequestId === req.id;
                return (
                  <div key={req.id} className="p-5 rounded-2xl bg-[#F7F3EA] border border-[#D4AF37]/30 space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#0D1224] text-[#D4AF37]">
                            {req.request_number}
                          </span>
                          <h4 className="font-serif font-bold text-base text-[#0D1224] mt-1.5">
                            {ts(req.requested_process)}
                          </h4>
                          <p className="text-xs text-gray-700 font-medium">
                            {req.business_name} &bull; {req.business_location}
                          </p>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          req.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                          req.status === 'PENDING' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                          req.status === 'INFO_REQUESTED' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {tstat(req.status)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-gray-200 text-xs space-y-1">
                        <div><strong>{t('worker.target_capacity')}:</strong> {req.quantity} {req.unit}</div>
                        <div><strong>{t('owner.proposed_rate')}:</strong> <span className="font-mono font-bold text-emerald-700">₹{req.proposed_rate ? Number(req.proposed_rate).toLocaleString() : '2,400'}/{req.unit}</span></div>
                        <div><strong>{t('worker.expected_delivery')}:</strong> {req.expected_completion}</div>
                        <div className="text-gray-400 text-[10px]">{t('worker.submitted_at')}: {new Date(req.created_at).toLocaleString()}</div>
                        {req.message && (
                          <div className="text-gray-700 mt-2 p-2 bg-gray-50 rounded-lg text-xs italic border-l-2 border-teal-500 whitespace-pre-line">
                            "{req.message}"
                          </div>
                        )}
                      </div>

                      {/* Owner Note / Decision Response */}
                      {req.owner_response && (
                        <div className={`p-3 rounded-xl text-xs space-y-1 border ${
                          req.status === 'ACCEPTED' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                          req.status === 'INFO_REQUESTED' ? 'bg-indigo-50 border-indigo-200 text-indigo-900' :
                          'bg-rose-50 border-rose-200 text-rose-900'
                        }`}>
                          <div className="font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{t('worker.owner_response')} &bull; {req.business_name}</span>
                          </div>
                          <p className="italic">"{req.owner_response}"</p>
                        </div>
                      )}
                    </div>

                    {/* Actions based on Request Status */}
                    <div className="pt-2 border-t border-gray-200">
                      {req.status === 'ACCEPTED' && (
                          <button
                          onClick={() => {
                            setActiveTab('jobs');
                            setCurrentView('worker-jobs');
                          }}
                          className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Scissors className="w-4 h-4" />
                          <span>{t('sidebar.assigned_jobs')}</span>
                        </button>
                      )}

                      {req.status === 'INFO_REQUESTED' && (
                        <div className="space-y-2">
                          {isReplying ? (
                            <div className="p-3 rounded-xl bg-white border border-indigo-300 space-y-2">
                              <label className="block text-[11px] font-bold text-indigo-900">
                                {t('worker.your_clarification')}:
                              </label>
                              <textarea
                                rows={2}
                                required
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder={t('worker.clarification_placeholder')}
                                className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setReplyingRequestId(null)}
                                  className="px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-100"
                                >
                                  {t('common.cancel')}
                                </button>
                                <button
                                  type="button"
                                  disabled={submittingReply || !replyText.trim()}
                                  onClick={() => handleReplyRequest(req.id)}
                                  className="px-3.5 py-1.5 rounded-lg font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow"
                                >
                                  {submittingReply ? t('common.loading') : t('worker.provide_clarification')}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setReplyingRequestId(req.id);
                                setReplyText('');
                              }}
                              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 transition-all"
                            >
                              <MessageSquare className="w-4 h-4" />
                              <span>{t('worker.provide_clarification')}</span>
                            </button>
                          )}
                        </div>
                      )}

                      {req.status === 'PENDING' && (
                        <div className="text-center text-xs text-amber-700 font-medium py-1">
                          {t('worker.awaiting_decision').replace('{name}', req.business_name)}
                        </div>
                      )}

                      {req.status === 'REJECTED' && (
                        <div className="text-center text-xs text-gray-400 py-1">
                          {t('worker.proposal_declined')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MY ASSIGNED JOBS */}
      {/* ========================================================================= */}
      {activeTab === 'jobs' && (
        <div className="p-6 rounded-3xl bg-white border border-teal-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-serif font-bold text-[#0D1224] flex items-center gap-2">
                <Scissors className="w-5 h-5 text-teal-600" />
                <span>{t('worker.jobs_title')}</span>
              </h3>
              <p className="text-xs text-gray-500">
                {t('worker.jobs_title')} description.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobs.map((job) => {
              const percent = Math.min(100, Math.round((job.completed_quantity / job.required_quantity) * 100));
              return (
                <div key={job.id} className="p-5 rounded-2xl bg-[#F7F3EA] border border-gray-200 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#004D4D] text-cyan-200">
                        {job.job_number}
                      </span>
                      <h4 className="font-serif font-bold text-base text-[#0D1224] mt-1.5">{ts(job.process_stage)}</h4>
                      <p className="text-xs text-gray-600">{job.business_name} &bull; {job.batch_number}</p>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      job.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      job.status === 'SUBMITTED_FOR_REVIEW' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                      job.status === 'REWORK_REQUIRED' ? 'bg-rose-100 text-rose-800' :
                      job.status === 'IN_PROGRESS' ? 'bg-cyan-100 text-cyan-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {tstat(job.status)}
                    </span>
                  </div>

                  {job.rework_reason && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-0.5">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Correction Requested:
                      </div>
                      <p>{job.rework_reason}</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-700 font-medium">
                      <span>{t('worker.completed')}: <strong>{job.completed_quantity}</strong> / {job.required_quantity} pcs</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-teal-600 to-cyan-500 h-2.5 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                    <span>{t('dashboard.wages')}: <strong>₹{job.agreed_rate}/pc</strong></span>
                    <span>{t('batch.wastage_defects')}: {job.wastage_quantity || 0} {t('owner.items')}</span>
                    <span>{t('owner.deadline')}: {job.deadline}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                    {job.status === 'ASSIGNED' && (
                      <button
                        onClick={() => handleStartJob(job.id)}
                        className="w-full py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow"
                      >
                        {t('worker.start_work_loom')}
                      </button>
                    )}

                    {(job.status === 'IN_PROGRESS' || job.status === 'REWORK_REQUIRED') && (
                      <>
                        <button
                          onClick={() => handleOpenProgress(job)}
                          className="flex-1 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-xs font-bold text-gray-800"
                        >
                          {t('worker.daily_progress')}
                        </button>
                        <button
                          onClick={() => handleOpenSubmit(job)}
                          className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow"
                        >
                          {t('worker.submit_for_approval')}
                        </button>
                      </>
                    )}

                    {job.status === 'SUBMITTED_FOR_REVIEW' && (
                      <div className="text-xs text-amber-700 italic text-center w-full py-1">
                        {t('worker.submitted_for_inspection')}
                      </div>
                    )}

                    {job.status === 'APPROVED' && (
                      <div className="text-xs text-emerald-700 font-bold flex items-center justify-center gap-1.5 w-full py-1">
                        <CheckCircle2 className="w-4 h-4" /> Work approved &bull; Payment voucher issued
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: WAGE PAYOUTS & EARNINGS */}
      {/* ========================================================================= */}
      {activeTab === 'payments' && (
        <div className="p-6 rounded-3xl bg-white border border-teal-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-serif font-bold text-[#0D1224] flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                <span>{t('worker.wage_ledger_desc')}</span>
              </h3>
              <p className="text-xs text-gray-500">
                {t('worker.wage_ledger_sub')}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#004D4D] text-cyan-200 uppercase font-mono text-[10px]">
                <tr>
                  <th className="p-3 rounded-l-xl">{t('worker.voucher_no')}</th>
                  <th className="p-3">{t('auth.business_name_label').replace(' *', '')}</th>
                  <th className="p-3">{t('dashboard.stage')}</th>
                  <th className="p-3">{t('worker.approved_qty')}</th>
                  <th className="p-3">{t('batch.agreed_rate')}</th>
                  <th className="p-3">{t('worker.total_payable')}</th>
                  <th className="p-3">{t('dashboard.status')}</th>
                  <th className="p-3 rounded-r-xl">{t('worker.disbursement_details')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => {
                  const isPaid = p.payment_status === 'PAID';
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="p-3 font-mono font-bold text-gray-500">{p.id.substring(0, 10)}</td>
                      <td className="p-3 font-semibold text-gray-800">{p.business_name}</td>
                      <td className="p-3 font-medium text-gray-800">{p.stage_name}</td>
                      <td className="p-3 font-bold">{p.approved_quantity} pcs</td>
                      <td className="p-3 font-mono">₹{p.agreed_rate}/pc</td>
                      <td className="p-3 font-bold font-mono text-emerald-700">₹{p.net_payable.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {p.payment_status}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500">
                        {isPaid ? (
                          <span className="text-[11px] text-emerald-700 font-medium">{p.payment_method} {t('owner.transaction_id')}: {p.transaction_ref || 'Direct'}</span>
                        ) : (
                          <span className="text-gray-400 italic">{t('worker.voucher_pending')}</span>
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
      {/* TAB 5: DISCOVER SAREE BUSINESSES */}
      {/* ========================================================================= */}
      {activeTab === 'search-owners' && (
        <div className="p-6 rounded-3xl bg-white border border-teal-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-serif font-bold text-[#0D1224] flex items-center gap-2">
                <Search className="w-5 h-5 text-teal-600" />
                <span>{t('worker.search_businesses')}</span>
              </h3>
              <p className="text-xs text-gray-500">
                {t('worker.discover_businesses_desc')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={t('worker.search_placeholder_long')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-600 w-64"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 transition-all shadow"
              >
                {t('dashboard.overview')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {businesses.map((biz) => (
              <div key={biz.id} className="p-5 rounded-2xl bg-[#F7F3EA] border border-gray-200 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-serif font-bold text-base text-[#0D1224]">{biz.business_name}</h4>
                    <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{biz.location}</span>
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
                    {biz.loom_count} Looms
                  </span>
                </div>

                <div className="text-xs text-gray-700 bg-white p-3 rounded-xl border border-gray-200 space-y-1">
                  <div><strong>Specialization:</strong> {biz.textile_specialization}</div>
                  <div><strong>Loom Types:</strong> {(biz.loom_types || []).join(', ')}</div>
                </div>

                <button
                  onClick={() => handleOpenProposal(biz)}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:brightness-110 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>{t('worker.send_proposal_btn')}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: CRAFT SKILLS & LOOM CONFIG */}
      {/* ========================================================================= */}
      {activeTab === 'skills' && (
        <div className="p-6 rounded-3xl bg-white border border-teal-200 shadow-sm space-y-4">
          <h3 className="text-lg font-serif font-bold text-[#0D1224] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            <span>{t('worker.craft_credentials')}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#F7F3EA] border border-gray-200 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Specialized Skills</span>
              <div className="flex flex-wrap gap-1.5">
                {(user?.skills || ['Korvai Double-Border Weaving', 'Weaving / Loom', 'Silk Weft Shuttle', 'Pure Zari Handling']).map((s, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-teal-600 text-white font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F7F3EA] border border-gray-200 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('worker.loom_capacity')}</span>
              <div className="space-y-1 text-gray-700">
                <div><strong>{t('worker.loom_type')}:</strong> {user?.loom_type || 'Traditional Pit Handloom (2-Person Korvai)'}</div>
                <div><strong>{t('worker.daily_capacity')}:</strong> {user?.daily_capacity || '1 saree / 4-5 days'}</div>
                <div><strong>{t('worker.mastery')}:</strong> {user?.experience_years || 18} {t('worker.years')}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Log Progress Modal */}
      {progressModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0D1224] border border-cyan-400/40 rounded-3xl w-full max-w-md p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                <Scissors className="w-5 h-5 text-cyan-400" />
                <span>{t('worker.log_daily_progress')}</span>
              </h3>
              <button onClick={() => setProgressModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProgress} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-[#0A0D16] border border-white/10 text-gray-300">
                {t('worker.job')}: <span className="font-bold text-white">{selectedJob.job_number}</span> &bull; {ts(selectedJob.process_stage)}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    {t('worker.completed_pieces')} <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={selectedJob.required_quantity}
                    value={progressQty}
                    onChange={(e) => setProgressQty(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-cyan-400/40 text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">{t('worker.wastage_scrap')}</label>
                  <input
                    type="number"
                    min={0}
                    value={wastageQty}
                    onChange={(e) => setWastageQty(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">{t('worker.daily_notes_summary')}</label>
                <input
                  type="text"
                  placeholder="e.g. 5 Korvai sarees completed today, shuttle tension perfect."
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">{t('worker.issues_encountered')}</label>
                <input
                  type="text"
                  placeholder="e.g. 1 gold zari spool ran low, requested replenishment"
                  value={issuesReported}
                  onChange={(e) => setIssuesReported(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setProgressModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProgress}
                  className="px-5 py-2.5 rounded-xl font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg"
                >
                  {submittingProgress ? t('common.loading') : t('worker.daily_progress')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Work for Review Modal */}
      {submitModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0D1224] border border-emerald-400/40 rounded-3xl w-full max-w-md p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>{t('worker.submit_work_review')}</span>
              </h3>
              <button onClick={() => setSubmitModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSubmit} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-[#0A0D16] border border-white/10 space-y-1">
                <div>{t('worker.job')}: <span className="font-bold text-white">{selectedJob.job_number}</span> &bull; {ts(selectedJob.process_stage)}</div>
                <div>{t('worker.target_qty')}: <span className="font-bold text-white">{selectedJob.required_quantity} pcs</span> &bull; {t('worker.rate')}: <span className="font-bold text-emerald-400">₹{selectedJob.agreed_rate}/pc</span></div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">{t('worker.final_qty_inspection')}</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={progressQty}
                  onChange={(e) => setProgressQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-emerald-400/40 text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">{t('worker.completion_notes_owner')}</label>
                <textarea
                  rows={2}
                  required
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProgress}
                  className="px-5 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg"
                >
                  {submittingProgress ? 'Submitting...' : 'Submit to Saree Owner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Work Proposal Modal */}
      {requestModalOpen && selectedBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0D1224] border border-teal-400/40 rounded-3xl w-full max-w-md p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-teal-400" />
                <span>{t('worker.proposal_modal_title')}</span>
              </h3>
              <button onClick={() => setRequestModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {proposalError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{proposalError}</span>
              </div>
            )}

            <form onSubmit={handleSendProposal} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-[#0A0D16] border border-white/10">
                {t('worker.business')}: <span className="font-bold text-white">{selectedBusiness.business_name}</span> ({selectedBusiness.location})
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">{t('worker.process_spec')}</label>
                <select
                  value={proposalData.requested_process}
                  onChange={(e) => setProposalData({ ...proposalData, requested_process: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-teal-400"
                >
                  <option value="Weaving / Loom">Weaving / Loom (Pit/Frame Loom)</option>
                  <option value="Dyeing">Silk Yarn Dyeing &amp; Bleaching</option>
                  <option value="Warping (Vaarpu)">Warping / Vaarpu Drum</option>
                  <option value="Finishing">Saree Finishing &amp; Polishing</option>
                  <option value="Quality Inspection">Quality Checking</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">{t('worker.proposed_rate_pc')}</label>
                  <input
                    type="number"
                    required
                    value={proposalData.proposed_rate}
                    onChange={(e) => setProposalData({ ...proposalData, proposed_rate: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">{t('worker.capacity_pcs')}</label>
                  <input
                    type="number"
                    required
                    value={proposalData.quantity}
                    onChange={(e) => setProposalData({ ...proposalData, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-teal-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">{t('worker.message_to_owner')}</label>
                <textarea
                  rows={2}
                  value={proposalData.message}
                  onChange={(e) => setProposalData({ ...proposalData, message: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-teal-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProposal}
                  className="px-5 py-2.5 rounded-xl font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-lg"
                >
                  {submittingProposal ? 'Sending...' : 'Send Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
