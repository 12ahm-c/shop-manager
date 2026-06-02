import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowLeft, PackageMinus } from 'lucide-react';
import { stockApi } from '../api/stock';
import { useUiStore } from '../stores/uiStore';

export default function AdminStockAdjustScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addToast } = useUiStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    stockLotId: '',
    productId: '',
    quantityAdjustment: '',
    reason: 'damage'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        stockLotId: formData.stockLotId,
        productId: formData.productId,
        quantityAdjustment: Number(formData.quantityAdjustment),
        reason: formData.reason
      };

      // Idempotency-Key required per API contract §1.3
      const idempotencyKey = crypto.randomUUID();
      const res = await stockApi.adjustStock(payload, idempotencyKey);

      if (res.success) {
        addToast({ type: 'success', title: t('stock.adjustSuccess') });
        navigate('/products');
      } else {
        setError(res.error?.message || t('common.error'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reasons = [
    { value: 'damage', label: t('stock.reasonDamage') },
    { value: 'loss', label: t('stock.reasonLoss') },
    { value: 'correction', label: t('stock.reasonCorrection') },
    { value: 'return', label: t('stock.reasonReturn') },
  ];

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link to="/products" className="p-2 hover:bg-secondary rounded-md transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <PackageMinus className="w-6 h-6" />
            {t('stock.adjustTitle')}
          </h2>
          <p className="text-muted-foreground">{t('stock.adjustDesc')}</p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">{t('stock.stockLotId')}</label>
          <input
            required
            className="w-full p-3 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={formData.stockLotId}
            onChange={(e) => setFormData({ ...formData, stockLotId: e.target.value })}
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">{t('stock.productId')}</label>
          <input
            required
            className="w-full p-3 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={formData.productId}
            onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">{t('stock.quantityAdjustment')}</label>
          <input
            type="number"
            required
            className="w-full p-3 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={formData.quantityAdjustment}
            onChange={(e) => setFormData({ ...formData, quantityAdjustment: e.target.value })}
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">{t('stock.reason')}</label>
          <select
            className="w-full p-3 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          >
            {reasons.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? t('common.processing') : t('stock.adjustStock')}
        </button>
      </form>
    </div>
  );
}
