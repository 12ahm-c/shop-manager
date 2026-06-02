import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowLeft, Upload } from 'lucide-react';
import { productsApi } from '../api/products';
import { useUiStore } from '../stores/uiStore';

export default function AdminProductFormScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addToast } = useUiStore();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category: '',
    price: ''
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEditing) {
      const fetchProduct = async () => {
        setFetchLoading(true);
        try {
          const res = await productsApi.getProduct(id);
          if (res.success) {
            setFormData({
              name: res.data.product.name,
              barcode: res.data.product.barcode || '',
              category: res.data.product.category || '',
              price: res.data.product.price || ''
            });
          } else {
            setError(res.error?.message || t('common.error'));
          }
        } catch (err) {
          setError(err.message);
        } finally {
          setFetchLoading(false);
        }
      };
      fetchProduct();
    }
  }, [id, isEditing, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        price: Number(formData.price)
      };

      let res;
      if (isEditing) {
        res = await productsApi.updateProduct(id, payload);
      } else {
        res = await productsApi.createProduct(payload);
      }

      if (res.success) {
        addToast({ type: 'success', title: t('common.success') });
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

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await productsApi.importProducts(new FormData());
      if (res.success) {
        addToast({ type: 'success', title: t('products.importSuccess', { count: res.data.importedCount }) });
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

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link to="/products" className="p-2 hover:bg-secondary rounded-md transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold">
          {isEditing ? t('products.editProduct') : t('products.createProduct')}
        </h2>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">{t('common.name')}</label>
          <input
            required
            className="w-full p-3 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">{t('products.barcode')}</label>
          <input
            className="w-full p-3 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={formData.barcode}
            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">{t('products.category')}</label>
          <input
            className="w-full p-3 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">{t('products.sellingPrice')}</label>
          <input
            type="number"
            required
            min="0"
            className="w-full p-3 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            dir="ltr"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? t('products.saving') : t('products.saveProduct')}
        </button>
      </form>

      {!isEditing && (
        <div className="bg-card border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-lg font-bold">{t('products.bulkImport')}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{t('products.bulkImportDesc')}</p>
          <input type="file" className="block text-sm" accept=".csv,.xlsx" />
          <button
            onClick={handleImport}
            disabled={loading}
            className="px-4 py-2.5 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 disabled:opacity-50 transition-colors"
          >
            {t('products.importFile')}
          </button>
        </div>
      )}
    </div>
  );
}
