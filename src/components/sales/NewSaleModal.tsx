import React, { useState } from 'react';
import { api } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { X, Package, ShoppingBag, DollarSign, Sparkles } from 'lucide-react';

interface NewSaleModalProps {
  stockList: any[];
  onClose: () => void;
  onSaved: () => void;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({ stockList, onClose, onSaved }) => {
  const { t } = useLanguage();
  const [selectedSareeId, setSelectedSareeId] = useState<string>(stockList[0]?.id || '');
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_city: '',
    sale_type: 'WHOLESALE',
    quantity: 1,
    selling_price_inr: stockList[0]?.selling_price_inr || 28000,
    discount_inr: 0,
    payment_method: 'UPI',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSaree = stockList.find((s) => s.id === selectedSareeId) || stockList[0];

  const handleSareeChange = (sareeId: string) => {
    setSelectedSareeId(sareeId);
    const found = stockList.find((s) => s.id === sareeId);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        selling_price_inr: found.selling_price_inr,
        quantity: Math.min(prev.quantity, found.quantity || 1)
      }));
    }
  };

  const totalAmount = Number(formData.selling_price_inr) * Number(formData.quantity);
  const netAmount = Math.max(0, totalAmount - Number(formData.discount_inr));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name || !formData.customer_phone || !selectedSareeId) {
      setError('Please provide customer name, phone, and select a saree.');
      return;
    }

    if (selectedSaree && formData.quantity > selectedSaree.quantity) {
      setError(`Cannot sell ${formData.quantity} sarees. Only ${selectedSaree.quantity} in stock.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.createSale({
        ...formData,
        saree_id: selectedSareeId,
        quantity: Number(formData.quantity),
        selling_price_inr: Number(formData.selling_price_inr),
        discount_inr: Number(formData.discount_inr)
      });
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to record sale');
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
              {t('sales.commercial_desk')}
            </span>
            <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
              <span>{t('sales.record_title')}</span>
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
              {t('sales.select_stock')} <span className="text-[#D4AF37]">*</span>
            </label>
            <select
              value={selectedSareeId}
              onChange={(e) => handleSareeChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0A0D16] border border-[#D4AF37]/40 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
            >
              {stockList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.saree_code} - {s.saree_title} ({s.quantity} pcs in stock - ₹{s.selling_price_inr.toLocaleString()}/pc)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-medium mb-1">{t('sales.sale_type')}</label>
              <select
                value={formData.sale_type}
                onChange={(e) => setFormData({ ...formData, sale_type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              >
                <option value="WHOLESALE">Wholesale (Boutiques &amp; Showrooms)</option>
                <option value="RETAIL">Direct Retail (Counter / Exhibition)</option>
                <option value="BOUTIQUE">Custom Boutique Order</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 font-medium mb-1">
                {t('sales.quantity_max').replace('{max}', (selectedSaree?.quantity || 0).toString())}
              </label>
              <input
                type="number"
                required
                min={1}
                max={selectedSaree?.quantity || 100}
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-medium mb-1">{t('sales.customer_name')} <span className="text-[#D4AF37]">*</span></label>
              <input
                type="text"
                required
                placeholder="e.g. Sundari Silks Boutique"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-medium mb-1">{t('sales.customer_phone')} <span className="text-[#D4AF37]">*</span></label>
              <input
                type="tel"
                required
                placeholder="+91 98401 22334"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-medium mb-1">{t('sales.unit_price')}</label>
              <input
                type="number"
                required
                min={100}
                value={formData.selling_price_inr}
                onChange={(e) => setFormData({ ...formData, selling_price_inr: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-medium mb-1">{t('sales.discount')}</label>
              <input
                type="number"
                min={0}
                value={formData.discount_inr}
                onChange={(e) => setFormData({ ...formData, discount_inr: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-medium mb-1">{t('sales.city_destination')}</label>
              <input
                type="text"
                placeholder="e.g. Chennai, Bangalore, Coimbatore"
                value={formData.customer_city}
                onChange={(e) => setFormData({ ...formData, customer_city: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-medium mb-1">{t('sales.payment_method')}</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0D16] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              >
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="BANK_TRANSFER">NEFT / RTGS Bank Transfer</option>
                <option value="CASH">Cash on Delivery / Counter</option>
                <option value="CHEQUE">Business Cheque</option>
              </select>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="p-3.5 rounded-2xl bg-[#0A0D16] border border-[#D4AF37]/30 flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-400">{t('sales.total_bill')}:</span>
              <div className="text-base font-bold text-emerald-400 font-mono">
                ₹{netAmount.toLocaleString()}
              </div>
            </div>
            <div className="text-right text-[11px] text-gray-400">
              <div>{t('sales.gross_amount')}: ₹{totalAmount.toLocaleString()}</div>
              <div>{t('sales.discount').replace(' (₹)', '')}: -₹{Number(formData.discount_inr).toLocaleString()}</div>
            </div>
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
              className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg hover:brightness-110 flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{loading ? t('sales.recording') : t('sales.complete_record')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
