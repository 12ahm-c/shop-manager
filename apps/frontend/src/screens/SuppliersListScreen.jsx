import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Loader2, Eye, Truck } from 'lucide-react';
import { suppliersApi } from '../api/suppliers';
import { useAuthStore } from '../stores/authStore';

export default function SuppliersListScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAdmin = user?.role === 'admin';
  const isAccountant = user?.role === 'accountant';

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await suppliersApi.getSuppliers();
      if (res.success) {
        setSuppliers(res.data.suppliers || []);
      } else {
        setError(res.error?.message || t('common.error', 'An error occurred'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const filteredSuppliers = suppliers.filter(s => 
    (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.phone || '').includes(searchQuery)
  );

  if (!isAdmin && !isAccountant) {
    return <div className="p-6 text-center text-destructive">Unauthorized access</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="w-6 h-6" />
            {t('suppliers.title', 'Suppliers')}
          </h2>
          <p className="text-muted-foreground">{t('suppliers.subtitle', 'Manage suppliers and their debts')}</p>
        </div>
        {isAdmin && (
          <button
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            onClick={() => alert('Add supplier functionality to be implemented')}
          >
            <Plus className="w-4 h-4" />
            <span>{t('suppliers.addSupplier', 'Add Supplier')}</span>
          </button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="w-5 h-5 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={t('suppliers.searchPlaceholder', 'Search by name or phone...')}
          value={searchQuery}
          onChange={handleSearch}
          className="w-full ps-10 pe-4 py-3 bg-card border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {loading && suppliers.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl">{error}</div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card border rounded-xl">
          <p>{t('suppliers.noSuppliers', 'No suppliers found')}</p>
        </div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted text-muted-foreground border-b">
                <tr>
                  <th className="px-6 py-3 font-medium text-start">{t('common.name', 'Name')}</th>
                  <th className="px-6 py-3 font-medium text-start">{t('common.phone', 'Phone')}</th>
                  <th className="px-6 py-3 font-medium text-start">{t('suppliers.debt', 'Debt')}</th>
                  <th className="px-6 py-3 font-medium text-end">{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier._id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                          {supplier.name.charAt(0).toUpperCase()}
                        </div>
                        {supplier.name}
                      </div>
                    </td>
                    <td className="px-6 py-4" dir="ltr">{supplier.phone}</td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${supplier.debt > 0 ? 'text-destructive' : 'text-foreground'}`}>
                        {(supplier.debt || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-end">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/admin/suppliers/${supplier._id}`}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                          title={t('common.view', 'View')}
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
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
