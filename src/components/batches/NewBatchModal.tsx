import React, { useState } from 'react';
import { api } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { X, Sparkles, Layers, Scissors, Info } from 'lucide-react';

interface NewBatchModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export const NewBatchModal: React.FC<NewBatchModalProps> = ({ onClose, onCreated }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    saree_type: 'Kanchipuram Silk Saree',
    design_name: '',
    color: '',
    border_details: '',
    planned_quantity: 25,
    unit_of_measure: 'pieces',
    start_date: new Date().toISOString().split('T')[0],
    target_completion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.design_name || !formData.color) {
      setError('Design pattern and color/shade are required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.createBatch(formData);
      onCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to initialize new batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0D1224] border border-[#D4AF37]/40 rounded-3xl w-full max-w-xl p-6 shadow-2xl text-white my-8 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/20">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
              {t('new_batch.step_1')}
            </span>
            <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
              <Scissors className="w-5 h-5 text-[#D4AF37]" />
              <span>{t('new_batch.init_title')}</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 font-medium mb-1">
                {t('new_batch.category_label')} <span className="text-[#D4AF37]">*</span>
              </label>
              <select
                value={formData.saree_type}
                onChange={(e) => setFormData({ ...formData, saree_type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-[#D4AF37]/30 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              >
                <option value="Kanchipuram Silk Saree">Kanchipuram Pure Silk (Bridal)</option>
                <option value="Arani Silk Saree">Arani Lightweight Silk</option>
                <option value="Handloom Cotton Saree">Pure Handloom Cotton (Chettinad/Salem)</option>
                <option value="Korvai Zari Brocade">Korvai Pure Zari Brocade</option>
                <option value="Tussar Mulberry Blend">Tussar Mulberry Raw Silk</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 font-medium mb-1">
                {t('new_batch.design_label')} <span className="text-[#D4AF37]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={t('new_batch.design_placeholder')}
                value={formData.design_name}
                onChange={(e) => setFormData({ ...formData, design_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 font-medium mb-1">
                {t('new_batch.color_label')} <span className="text-[#D4AF37]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={t('new_batch.color_placeholder')}
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-medium mb-1">
                {t('new_batch.planned_qty_label')} <span className="text-[#D4AF37]">*</span>
              </label>
              <input
                type="number"
                required
                min={1}
                max={500}
                value={formData.planned_quantity}
                onChange={(e) => setFormData({ ...formData, planned_quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-1">
              {t('new_batch.border_label')}
            </label>
            <input
              type="text"
              placeholder={t('new_batch.border_placeholder')}
              value={formData.border_details}
              onChange={(e) => setFormData({ ...formData, border_details: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 font-medium mb-1">{t('new_batch.start_date')}</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-medium mb-1">{t('new_batch.target_date')}</label>
              <input
                type="date"
                required
                value={formData.target_completion_date}
                onChange={(e) => setFormData({ ...formData, target_completion_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-1">{t('new_batch.notes_label')}</label>
            <textarea
              rows={2}
              placeholder={t('new_batch.notes_placeholder')}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
            />
          </div>

          <div className="p-3 rounded-2xl bg-[#0A0D16] border border-[#D4AF37]/30 text-[11px] text-[#D4AF37] flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#D4AF37]" />
            <span>
              <strong>{t('new_batch.auto_pipeline')}:</strong> {t('new_batch.pipeline_desc')}
            </span>
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
              <Sparkles className="w-4 h-4" />
              <span>{loading ? t('common.loading') : t('new_batch.init_batch')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
