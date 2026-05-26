import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowLeft, ArrowRightLeft } from 'lucide-react';
import { stockApi } from '../api/stock';
import { useUiStore } from '../stores/uiStore';

export default function AdminStockTransferScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addToast } = useUiStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    productId: '',
    fromStoreId: '',
    toStoreId: '',
    quantity: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        productId: formData.productId,
        fromStoreId: formData.fromStoreId,
        toStoreId: formData.toStoreId,
        quantity: Number(formData.quantity)
      };

      // Idempotency-Key required per API contract §1.3
      const idempotencyKey = crypto.randomUUID();
      const res = await stockApi.transferStock(payload, idempotencyKey);

      if (res.success) {
        addToast({ type: 'success', title: t('stock.transferSuccess') });
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

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link to="/products" className="p-2 hover:bg-secondary rounded-md transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6" />
            {t('stock.transferTitle')}
          </h2>
          <p className="text-muted-foreground">{t('stock.transferDesc')}</p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 space-y-5">
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
          <label className="block text-sm font-medium mb-2">{t('stock.fromStoreId')}</label>
          <input
            required
            className="w-full p-3 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={formData.fromStoreId}
            onChange={(e) => setFormData({ ...formData, fromStoreId: e.target.value })}
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">{t('stock.toStoreId')}</label>
          <input
            required
            className="w-full p-3 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={formData.toStoreId}
            onChange={(e) => setFormData({ ...formData, toStoreId: e.target.value })}
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">{t('stock.quantity')}</label>
          <input
            type="number"
            required
            min="1"
            className="w-full p-3 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            dir="ltr"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? t('common.processing') : t('stock.transferStock')}
        </button>
      </form>
    </div>
  );
}
