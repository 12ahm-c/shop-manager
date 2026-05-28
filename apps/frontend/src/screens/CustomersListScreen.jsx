import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Loader2, Eye, User } from 'lucide-react';
import { customersApi } from '../api/customers';
import { useAuthStore } from '../stores/authStore';

export default function CustomersListScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAdmin = user?.role === 'admin';
  const isEmployee = user?.role === 'employee';

  const fetchCustomers = useCallback(async (q) => {
    setLoading(true);
    setError(null);
    try {
      const res = await customersApi.searchCustomers(q);
      if (res.success) {
        setCustomers(res.data.customers || []);
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
    // Basic debounce for search
    const timer = setTimeout(() => {
      fetchCustomers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchCustomers]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <User className="w-6 h-6" />
            {t('customers.title', 'Customers')}
          </h2>
          <p className="text-muted-foreground">{t('customers.subtitle', 'Manage your customers and debts')}</p>
        </div>
        {/* Placeholder for future Add Customer modal/screen */}
        {(isAdmin || isEmployee) && (
          <button
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            onClick={() => alert('Add customer functionality to be implemented')}
          >
            <Plus className="w-4 h-4" />
            <span>{t('customers.addCustomer', 'Add Customer')}</span>
          </button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="w-5 h-5 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={t('customers.searchPlaceholder', 'Search by name or phone...')}
          value={searchQuery}
          onChange={handleSearch}
          className="w-full ps-10 pe-4 py-3 bg-card border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {loading && customers.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl">{error}</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card border rounded-xl">
          <p>{t('customers.noCustomers', 'No customers found')}</p>
        </div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted text-muted-foreground border-b">
                <tr>
                  <th className="px-6 py-3 font-medium text-start">{t('common.name', 'Name')}</th>
                  <th className="px-6 py-3 font-medium text-start">{t('common.phone', 'Phone')}</th>
                  <th className="px-6 py-3 font-medium text-start">{t('customers.loyaltyPoints', 'Loyalty Points')}</th>
                  <th className="px-6 py-3 font-medium text-start">{t('customers.currentDebt', 'Debt')}</th>
                  <th className="px-6 py-3 font-medium text-start">{t('customers.creditLimit', 'Credit Limit')}</th>
                  <th className="px-6 py-3 font-medium text-end">{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((customer) => (
                  <tr key={customer._id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        {customer.name}
                      </div>
                    </td>
                    <td className="px-6 py-4" dir="ltr">{customer.phone}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                        {customer.loyaltyPoints}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${customer.debt > 0 ? 'text-destructive' : 'text-foreground'}`}>
                        {customer.debt.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {customer.creditLimit > 0 ? customer.creditLimit.toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-end">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/customers/${customer._id}`}
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
