import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Eye, Edit2, Package } from 'lucide-react';
import { productsApi } from '../api/products';
import { useProductStore } from '../stores/productStore';
import { useAuthStore } from '../stores/authStore';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function ProductsListScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { searchQuery, setSearchQuery } = useProductStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAdmin = user?.role === 'admin';

  const fetchProducts = useCallback(async (q) => {
    setLoading(true);
    setError(null);
    try {
      const res = await productsApi.searchProducts(q);
      if (res.success) {
        setProducts(res.data.products);
      } else {
        setError(res.error?.message || t('common.error'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts(searchQuery);
  }, [searchQuery, fetchProducts]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('products.title')}</h2>
          <p className="text-muted-foreground">{t('products.subtitle')}</p>
        </div>
        {isAdmin && (
          <Link
            to="/admin/products/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('products.addProduct')}</span>
          </Link>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="w-5 h-5 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={t('products.searchPlaceholder')}
          value={searchQuery}
          onChange={handleSearch}
          className="w-full ps-10 pe-4 py-3 bg-card border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {loading ? (
        <LoadingSkeleton variant="table-row" count={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchProducts(searchQuery)} />
      ) : products.length === 0 ? (
        <EmptyState title={t('products.noProducts')} icon={Package} />
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted text-muted-foreground border-b">
                <tr>
                  <th className="px-6 py-3 font-medium text-start">{t('common.name')}</th>
                  <th className="px-6 py-3 font-medium text-start">{t('products.barcode')}</th>
                  <th className="px-6 py-3 font-medium text-start">{t('products.category')}</th>
                  <th className="px-6 py-3 font-medium text-start">{t('products.price')}</th>
                  <th className="px-6 py-3 font-medium text-start">{t('products.totalStock')}</th>
                  <th className="px-6 py-3 font-medium text-end">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map(({ product, totalStock }) => (
                  <tr key={product._id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{product.name}</td>
                    <td className="px-6 py-4" dir="ltr">{product.barcode}</td>
                    <td className="px-6 py-4">{product.category}</td>
                    <td className="px-6 py-4">{product.price.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {totalStock}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-end">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/products/${product._id}`}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {isAdmin && (
                          <Link
                            to={`/admin/products/${product._id}/edit`}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
