import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { X, Send, UserCheck, Sparkles, DollarSign, Calendar } from 'lucide-react';

interface CreateOfferModalProps {
  stage: any;
  batch: any;
  onClose: () => void;
  onSent: () => void;
}

export const CreateOfferModal: React.FC<CreateOfferModalProps> = ({
  stage,
  batch,
  onClose,
  onSent
}) => {
  const { t } = useLanguage();
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [formData, setFormData] = useState({
    work_instructions: `Perform standard small-scale handloom ${stage.stage_name} for batch ${batch.batch_number} (${batch.saree_type}). Maintain uniform tension and Silk Mark quality standards.`,
    quantity: stage.input_quantity || batch.planned_quantity,
    unit: 'pieces',
    proposed_rate: stage.agreed_rate_inr || (stage.stage_name.includes('Weaving') ? 2400 : stage.stage_name.includes('Dyeing') ? 350 : 250),
    rate_type: 'PER_PIECE',
    start_date: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    materials_provided: 'Pre-inspected silk yarn and materials provided at loom shed.',
    quality_requirements: 'Zero tension defects, uniform density, Silk Mark compliance.'
  });
  const [loading, setLoading] = useState(false);
  const [fetchingWorkers, setFetchingWorkers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    try {
      const res = await api.getEligibleWorkers(stage.stage_name);
      const eligible = res.workers || [];
      setWorkers(eligible);
      if (eligible.length > 0) {
        setSelectedWorkerId(eligible[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingWorkers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId) {
      setError('Please select an artisan weaver or worker.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.createWorkOffer({
        worker_id: selectedWorkerId,
        batch_id: batch.id,
        stage_id: stage.id,
        work_instructions: formData.work_instructions,
        quantity: Number(formData.quantity),
        unit: formData.unit,
        proposed_rate: Number(formData.proposed_rate),
        rate_type: formData.rate_type,
        start_date: formData.start_date,
        deadline: formData.deadline,
        materials_provided: formData.materials_provided,
        quality_requirements: formData.quality_requirements
      });
      onSent();
    } catch (err: any) {
      setError(err.message || 'Failed to send work offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0D1224] border border-[#D4AF37]/50 rounded-3xl w-full max-w-lg p-6 shadow-2xl text-white my-8 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/20">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
              {t('create_offer.stage_x_of_y').replace('{x}', stage.stage_number.toString())}
            </span>
            <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-[#D4AF37]" />
              <span>{t('create_offer.title')} &bull; {stage.stage_name}</span>
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-xs text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-300 font-medium mb-1">
              {t('create_offer.select_artisan')} <span className="text-[#D4AF37]">*</span>
            </label>
            {fetchingWorkers ? (
              <div className="text-gray-400 italic">{t('create_offer.loading_artisans')}</div>
            ) : workers.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200 italic">
                {t('create_offer.no_eligible_workers').replace('{stage}', stage.stage_name)}
              </div>
            ) : (
              <select
                required
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0A0D16] border border-[#D4AF37]/40 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              >
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.full_name} ({w.location} - {w.experience_years || 10} yrs exp - {w.availability})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-medium mb-1">{t('create_offer.quantity_label')}</label>
              <input
                type="number"
                required
                min={1}
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-medium mb-1">{t('create_offer.rate_label')}</label>
              <input
                type="number"
                required
                min={10}
                value={formData.proposed_rate}
                onChange={(e) => setFormData({ ...formData, proposed_rate: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-medium mb-1">{t('create_offer.start_date')}</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-medium mb-1">{t('create_offer.deadline')}</label>
              <input
                type="date"
                required
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-1">{t('create_offer.instructions_label')}</label>
            <textarea
              rows={2}
              required
              value={formData.work_instructions}
              onChange={(e) => setFormData({ ...formData, work_instructions: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
            />
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-1">{t('create_offer.materials_label')}</label>
            <input
              type="text"
              value={formData.materials_provided}
              onChange={(e) => setFormData({ ...formData, materials_provided: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
            />
          </div>

          <div className="p-3 rounded-xl bg-[#0A0D16] border border-[#D4AF37]/30 text-[11px] text-[#D4AF37]">
            {t('create_offer.est_total').replace('{total}', (Number(formData.quantity) * Number(formData.proposed_rate)).toLocaleString())}
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-gray-300 hover:bg-white/10"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#C6A15B] text-[#0A0D16] shadow-lg hover:brightness-110 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? t('create_offer.sending') : t('create_offer.title')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
