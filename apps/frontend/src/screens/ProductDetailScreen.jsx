import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, Edit2, ArrowLeft, Package } from 'lucide-react';
import { productsApi } from '../api/products';
import { stockApi } from '../api/stock';
import { useProductStore } from '../stores/productStore';
import { useAuthStore } from '../stores/authStore';

export default function ProductDetailScreen() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { addRecentlyViewed } = useProductStore();
  const [productData, setProductData] = useState(null);
  const [stockLots, setStockLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'accountant';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const prodRes = await productsApi.getProduct(id);
        if (prodRes.success) {
          setProductData(prodRes.data);
          addRecentlyViewed(prodRes.data.product);
        } else {
          throw new Error(prodRes.error?.message || t('common.error'));
        }

        const stockRes = await stockApi.getProductStockLots(id);
        if (stockRes.success) {
          setStockLots(stockRes.data.stockLots);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, addRecentlyViewed, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="bg-destructive/10 text-destructive p-4 rounded-xl">{error}</div>;
  }

  if (!productData) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t('products.productNotFound')}</p>
      </div>
    );
  }

  const { product, totalStock } = productData;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/products" className="p-2 hover:bg-secondary rounded-md transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold">{product.name}</h2>
            <p className="text-muted-foreground">{t('products.detail')}</p>
          </div>
        </div>
        {isAdmin && (
          <Link
            to={`/admin/products/${product._id}/edit`}
            className="flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary/10 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            <span>{t('products.editProduct')}</span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border p-4 rounded-xl">
          <p className="text-sm text-muted-foreground">{t('products.barcode')}</p>
          <p className="text-lg font-medium mt-1" dir="ltr">{product.barcode}</p>
        </div>
        <div className="bg-card border p-4 rounded-xl">
          <p className="text-sm text-muted-foreground">{t('products.category')}</p>
          <p className="text-lg font-medium mt-1">{product.category}</p>
        </div>
        <div className="bg-card border p-4 rounded-xl">
          <p className="text-sm text-muted-foreground">{t('products.sellingPrice')}</p>
          <p className="text-lg font-medium mt-1">{product.price.toLocaleString()}</p>
        </div>
        <div className="bg-card border p-4 rounded-xl bg-primary/5">
          <p className="text-sm text-muted-foreground">{t('products.totalStock')}</p>
          <p className="text-lg font-bold text-primary mt-1">{totalStock}</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="p-4 border-b bg-muted/30 flex items-center gap-2">
          <Package className="w-5 h-5" />
          <h3 className="text-lg font-bold">{t('stock.activeLots')}</h3>
        </div>

        {stockLots.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>{t('stock.noLots')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted text-muted-foreground border-b">
                <tr>
                  <th className="px-6 py-3 font-medium text-start">{t('stock.lotNumber')}</th>
                  <th className="px-6 py-3 font-medium text-start">{t('stock.quantity')}</th>
                  <th className="px-6 py-3 font-medium text-start">{t('stock.receptionDate')}</th>
                  {/* DO NOT render purchasePrice for regular employees - frontend-plan.md §4 */}
                  {isAdmin && <th className="px-6 py-3 font-medium text-start">{t('products.purchasePrice')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stockLots.map(lot => (
                  <tr key={lot._id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{lot.lotNumber || '—'}</td>
                    <td className="px-6 py-4">{lot.quantity}</td>
                    <td className="px-6 py-4">{new Date(lot.receptionDate).toLocaleDateString()}</td>
                    {isAdmin && <td className="px-6 py-4">{lot.purchasePrice.toLocaleString()}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
