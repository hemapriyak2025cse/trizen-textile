import React, { useState } from 'react';
import { api } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { X, Layers, MinusCircle, AlertCircle } from 'lucide-react';

interface ConsumeMaterialModalProps {
  material: any;
  batches: any[];
  onClose: () => void;
  onConsumed: () => void;
}

export const ConsumeMaterialModal: React.FC<ConsumeMaterialModalProps> = ({
  material,
  batches,
  onClose,
  onConsumed
}) => {
  const { t } = useLanguage();
  const [quantity, setQuantity] = useState<number>(1);
  const [batchId, setBatchId] = useState<string>(batches[0]?.id || '');
  const [stageName, setStageName] = useState<string>('Weaving / Loom');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }
    if (quantity > material.available_quantity) {
      setError(`Cannot consume ${quantity} ${material.unit_of_measurement}. Only ${material.available_quantity} available.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.consumeInventory({
        material_id: material.id,
        quantity_used: Number(quantity),
        batch_id: batchId,
        stage_name: stageName,
        notes
      });
      onConsumed();
    } catch (err: any) {
      setError(err.message || 'Failed to consume material');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0D1224] border border-[#D4AF37]/50 rounded-3xl w-full max-w-md p-6 shadow-2xl text-white space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/20">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
              {t('inventory.stock_deduction')}
            </span>
            <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
              <MinusCircle className="w-5 h-5 text-amber-400" />
              <span>{t('inventory.deduct_title')}</span>
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

        <div className="p-3.5 rounded-2xl bg-[#0A0D16] border border-white/10 text-xs space-y-1">
          <div className="font-semibold text-white">{material.name}</div>
          <div className="flex items-center justify-between text-gray-400">
            <span>{t('inventory.current_available')}:</span>
            <span className="font-bold text-[#D4AF37] font-mono text-sm">{material.available_quantity} {material.unit_of_measurement}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-300 font-medium mb-1">
              {t('inventory.qty_to_consume')} ({material.unit_of_measurement}) <span className="text-[#D4AF37]">*</span>
            </label>
            <input
              type="number"
              required
              step="any"
              min={0.1}
              max={material.available_quantity}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0A0D16] border border-[#D4AF37]/40 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
            />
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-1">
              {t('inventory.assigned_batch')}
            </label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batch_number} - {b.saree_type} ({b.design_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-1">
              {t('inventory.process_stage')}
            </label>
            <select
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
            >
              <option value="Thread / Raw Material Preparation">Thread / Raw Material Preparation</option>
              <option value="Dyeing">Dyeing</option>
              <option value="Warping (Vaarpu)">Warping (Vaarpu)</option>
              <option value="Weaving / Loom">Weaving / Loom</option>
              <option value="Finishing">Finishing</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-1">Notes / Loom Shed Ref</label>
            <input
              type="text"
              placeholder={t('inventory.notes_placeholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
            />
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
              className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg hover:brightness-110 flex items-center gap-2"
            >
              <MinusCircle className="w-4 h-4" />
              <span>{loading ? t('inventory.deducting') : t('inventory.deduct_stock')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
