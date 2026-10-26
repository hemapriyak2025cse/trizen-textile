import React, { useState } from 'react';
import { api } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import {
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  UserCheck,
  Send,
  ThumbsUp,
  RotateCcw,
  Sparkles,
  Info,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

interface BatchDetailModalProps {
  batch: any;
  stages: any[];
  onClose: () => void;
  onRefresh: () => void;
  onOpenOfferModal: (stage: any) => void;
}

export const BatchDetailModal: React.FC<BatchDetailModalProps> = ({
  batch,
  stages,
  onClose,
  onRefresh,
  onOpenOfferModal
}) => {
  const { t, ts, tstat } = useLanguage();
  const [selectedStage, setSelectedStage] = useState<any>(stages[0] || null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REWORK'>('APPROVE');
  const [approvedQuantity, setApprovedQuantity] = useState<number>(batch.planned_quantity);
  const [reworkReason, setReworkReason] = useState('');
  const [ownerNotes, setOwnerNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const getStageBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"><CheckCircle2 className="w-3 h-3" /> {t('status.completed')}</span>;
      case 'SUBMITTED_FOR_REVIEW':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"><Clock className="w-3 h-3" /> {t('status.under_review')}</span>;
      case 'IN_PROGRESS':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"><Layers className="w-3 h-3" /> {t('status.in_progress')}</span>;
      case 'ASSIGNED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30"><UserCheck className="w-3 h-3" /> {t('status.active')}</span>;
      case 'WORK_OFFERED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"><Send className="w-3 h-3" /> {t('status.pending')}</span>;
      case 'REWORK_REQUIRED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30"><RotateCcw className="w-3 h-3" /> {t('batch.rework_reason')}</span>;
      case 'READY_FOR_ASSIGNMENT':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40"><Sparkles className="w-3 h-3" /> {t('status.ready_for_assignment')}</span>;
      case 'LOCKED':
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30"><Lock className="w-3 h-3" /> {t('status.pending')}</span>;
    }
  };

  const handleOpenReview = (stage: any, action: 'APPROVE' | 'REWORK') => {
    setSelectedStage(stage);
    setReviewAction(action);
    setApprovedQuantity(stage.output_quantity || stage.input_quantity || batch.planned_quantity);
    setReworkReason(stage.rework_reason || '');
    setOwnerNotes('');
    setReviewError(null);
    setReviewModalOpen(true);
  };

  const handleConfirmReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStage?.job_id) {
      setReviewError('No active job found for this stage review.');
      return;
    }

    if (reviewAction === 'REWORK' && !reworkReason.trim()) {
      setReviewError('Please specify the exact defects and correction instructions.');
      return;
    }

    setSubmittingReview(true);
    setReviewError(null);

    try {
      await api.reviewJob(selectedStage.job_id, {
        action: reviewAction,
        approved_quantity: Number(approvedQuantity),
        rework_reason: reworkReason,
        owner_notes: ownerNotes
      });
      setReviewModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0D1224] border border-[#D4AF37]/40 rounded-3xl w-full max-w-5xl shadow-2xl text-white my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#D4AF37]/20 flex items-start justify-between bg-gradient-to-r from-[#0D1224] via-[#1A2238] to-[#0D1224]">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-xs uppercase px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-bold border border-[#D4AF37]/30">
                {batch.batch_number}
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {batch.production_id}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${batch.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'}`}>
                {batch.status}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-wide">
              {batch.saree_type} &bull; <span className="text-[#D4AF37]">{batch.design_name}</span>
            </h2>
            <p className="text-xs text-gray-300 mt-1">
              Shade: <span className="font-semibold text-white">{batch.color}</span> &bull; {t('owner.planned_quantity')}: <span className="font-semibold text-white">{batch.planned_quantity} {batch.unit_of_measure}</span> &bull; {t('owner.target_date')}: {batch.target_completion_date}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all shrink-0 ml-4"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 7-Stage Visual Roadmap */}
        <div className="px-6 py-4 bg-[#0A0D16] border-b border-white/5 overflow-x-auto">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37] mb-2 flex items-center justify-between">
            <span>{t('batch.visual_roadmap')}</span>
            <span className="text-gray-400 normal-case font-normal">{t('batch.roadmap_desc')}</span>
          </div>
          <div className="flex items-center gap-2 min-w-max pb-1">
            {stages.map((stage, idx) => {
              const isSelected = selectedStage?.id === stage.id;
              const isDone = stage.status === 'APPROVED';
              const isReview = stage.status === 'SUBMITTED_FOR_REVIEW';
              const isReady = stage.status === 'READY_FOR_ASSIGNMENT';
              const isLocked = stage.status === 'LOCKED';

              return (
                <React.Fragment key={stage.id}>
                  <button
                    onClick={() => setSelectedStage(stage)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'bg-[#64152F] border-[#D4AF37] shadow-lg text-white'
                        : isDone
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/30'
                        : isReview
                        ? 'bg-amber-950/50 border-amber-400/60 text-amber-200 animate-pulse'
                        : isReady
                        ? 'bg-[#0D1224] border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10'
                        : isLocked
                        ? 'bg-black/30 border-white/5 text-gray-500 opacity-60'
                        : 'bg-[#12182B] border-white/10 text-gray-300'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono bg-white/10">
                      {stage.stage_number}
                    </span>
                    <div className="text-left">
                      <div className="text-xs font-medium truncate max-w-[130px]">{ts(stage.stage_name)}</div>
                      <div className="text-[10px] opacity-80">{tstat(stage.status)}</div>
                    </div>
                  </button>
                  {idx < stages.length - 1 && (
                    <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${isDone ? 'text-emerald-500' : 'text-gray-600'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Selected Stage Detail Panel */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {selectedStage && (
            <div className="space-y-6">
              {/* Stage Top Bar */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-xs text-[#D4AF37] font-mono uppercase font-bold tracking-wider">
                    {t('batch.stage_x_of_y').replace('{x}', selectedStage.stage_number.toString())}
                  </div>
                  <h3 className="text-lg sm:text-xl font-serif font-bold text-white mt-0.5">
                    {ts(selectedStage.stage_name)}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  {getStageBadge(selectedStage.status)}
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[#0A0D16] border border-white/10">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('batch.input_quantity')}</div>
                  <div className="text-lg font-bold text-white mt-1">
                    {selectedStage.input_quantity !== null ? `${selectedStage.input_quantity} ${t('owner.items')}` : t('status.pending')}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0A0D16] border border-white/10">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('batch.output_completed')}</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    {selectedStage.output_quantity !== null ? `${selectedStage.output_quantity} ${t('owner.items')}` : `0 ${t('owner.items')}`}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0A0D16] border border-white/10">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('batch.wastage_defects')}</div>
                  <div className="text-lg font-bold text-rose-400 mt-1">
                    {selectedStage.wastage_quantity || 0} {t('owner.items')}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0A0D16] border border-white/10">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('batch.agreed_rate')}</div>
                  <div className="text-lg font-bold text-[#D4AF37] mt-1">
                    {selectedStage.agreed_rate_inr ? `₹${selectedStage.agreed_rate_inr.toLocaleString()}` : 'Not set'}
                  </div>
                </div>
              </div>

              {/* Assigned Worker / Artisan Info */}
              <div className="p-4 rounded-2xl bg-[#0A0D16] border border-[#D4AF37]/20">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] mb-2 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" /> {t('batch.assigned_artisan')}
                </h4>
                {selectedStage.worker_name ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-sm text-white">{selectedStage.worker_name}</div>
                      <div className="text-xs text-gray-400">Phone: {selectedStage.worker_phone} &bull; Job ID: {selectedStage.job_number || selectedStage.assigned_job_id}</div>
                    </div>
                    <div className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono">
                      {t('dashboard.status')}: {selectedStage.job_status || selectedStage.status}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 italic">
                    {t('batch.no_artisan')}
                  </div>
                )}
              </div>

              {/* Rework Reason if rejected */}
              {selectedStage.rework_reason && (
                <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-rose-200 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-300">
                    <AlertTriangle className="w-4 h-4" /> {t('batch.rework_reason')}
                  </div>
                  <p className="text-xs mt-1 text-rose-100">{selectedStage.rework_reason}</p>
                </div>
              )}

              {/* Stage Actions */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                {/* When Stage is ready to assign or rework */}
                {(selectedStage.status === 'READY_FOR_ASSIGNMENT' || selectedStage.status === 'WORK_OFFERED' || selectedStage.status === 'REWORK_REQUIRED') && (
                  <button
                    onClick={() => onOpenOfferModal(selectedStage)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#D4AF37] to-[#C6A15B] text-[#0A0D16] shadow-lg hover:brightness-110 flex items-center gap-2 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>{t('batch.send_offer')}</span>
                  </button>
                )}

                {/* When Stage is submitted for review */}
                {selectedStage.status === 'SUBMITTED_FOR_REVIEW' && (
                  <>
                    <button
                      onClick={() => handleOpenReview(selectedStage, 'APPROVE')}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg hover:brightness-110 flex items-center gap-2 transition-all"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>Approve Work &amp; Unlock Next Stage</span>
                    </button>

                    <button
                      onClick={() => handleOpenReview(selectedStage, 'REWORK')}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600/30 text-rose-300 border border-rose-500/50 hover:bg-rose-600/50 flex items-center gap-2 transition-all"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Request Rework / Corrections</span>
                    </button>
                  </>
                )}

                {selectedStage.status === 'APPROVED' && (
                  <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('batch.stage_approved_on').replace('{date}', selectedStage.approved_at ? selectedStage.approved_at.split('T')[0] : 'record')}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#0A0D16] border-t border-white/5 flex items-center justify-between">
          <div className="text-xs text-gray-400">
            {t('batch.batch_total')}: <span className="font-bold text-white">{batch.planned_quantity} {t('owner.items')}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            {t('batch.close_viewer')}
          </button>
        </div>
      </div>

      {/* Review Modal for Approval or Rework */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0D1224] border border-[#D4AF37]/50 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                {reviewAction === 'APPROVE' ? (
                  <>
                    <ThumbsUp className="w-5 h-5 text-emerald-400" />
                    <span>{t('batch.approve_completion')}</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-5 h-5 text-rose-400" />
                    <span>{t('batch.request_quality_rework')}</span>
                  </>
                )}
              </h3>
              <button onClick={() => setReviewModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {reviewError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/50 text-xs text-red-200">
                {reviewError}
              </div>
            )}

            <form onSubmit={handleConfirmReview} className="space-y-4">
              <div className="text-xs text-gray-300">
                {t('dashboard.stage')}: <span className="font-bold text-white">{ts(selectedStage?.stage_name)}</span> &bull; {t('owner.artisan')}: <span className="font-bold text-[#D4AF37]">{selectedStage?.worker_name}</span>
              </div>

              {reviewAction === 'APPROVE' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      {t('batch.approved_qty_label')}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={batch.planned_quantity * 2}
                      value={approvedQuantity}
                      onChange={(e) => setApprovedQuantity(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-[#D4AF37]/40 text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      {t('batch.agreed_rate')}: ₹{selectedStage?.agreed_rate_inr}/{t('owner.items')} &bull; {t('owner.amount')}: ₹{(Number(approvedQuantity) * (selectedStage?.agreed_rate_inr || 0)).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      {t('batch.inspection_notes')}
                    </label>
                    <textarea
                      rows={2}
                      value={ownerNotes}
                      onChange={(e) => setOwnerNotes(e.target.value)}
                      placeholder={t('batch.inspection_placeholder')}
                      className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-[11px] text-emerald-200 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    <span>
                      {t('batch.approve_impact')}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-rose-300 mb-1">
                      {t('batch.defect_description')} <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={reworkReason}
                      onChange={(e) => setReworkReason(e.target.value)}
                      placeholder="e.g. Tension mismatch in border selvedge, loosen reed denting on weft."
                      className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-rose-500/40 text-white text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-[11px] text-rose-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span>
                      {t('batch.rework_impact')}
                    </span>
                  </div>
                </>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs text-gray-300 hover:bg-white/10"
                >
                  {t('common.cancel')}
                </button>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                    reviewAction === 'APPROVE'
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'bg-rose-600 text-white hover:bg-rose-700'
                  }`}
                >
                  {submittingReview ? t('common.loading') : reviewAction === 'APPROVE' ? t('batch.confirm_approval') : t('batch.send_rework')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
