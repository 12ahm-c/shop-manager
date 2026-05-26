import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertCircle, Phone, Calendar, ArrowRight } from 'lucide-react';
import { customersApi } from '../api/customers';

export default function AdminOverdueDebtsScreen() {
  const { t } = useTranslation();
  
  const [overdueList, setOverdueList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverdueDebts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await customersApi.getOverdueDebts();
      if (res.success) {
        setOverdueList(res.data.overdue);
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
    fetchOverdueDebts();
  }, [fetchOverdueDebts]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2 text-destructive">
          <AlertCircle className="w-6 h-6" />
          {t('customers.overdueDebts', 'Overdue Debts')}
        </h2>
        <p className="text-muted-foreground">
          {t('customers.overdueDebtsDesc', 'Customers with unpaid balances older than 30 days.')}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl">{error}</div>
      ) : overdueList.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card border rounded-2xl">
          <p>{t('customers.noOverdue', 'No overdue debts found. Great job!')}</p>
        </div>
      ) : (
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted text-muted-foreground border-b">
                <tr>
                  <th className="px-6 py-4 font-medium text-start">{t('common.name', 'Name')}</th>
                  <th className="px-6 py-4 font-medium text-start">{t('common.phone', 'Phone')}</th>
                  <th className="px-6 py-4 font-medium text-start">{t('customers.currentDebt', 'Debt Amount')}</th>
                  <th className="px-6 py-4 font-medium text-start">{t('customers.daysOverdue', 'Days Overdue')}</th>
                  <th className="px-6 py-4 font-medium text-end">{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {overdueList.map(({ customer, daysOverdue }) => (
                  <tr key={customer._id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        {customer.name}
                      </div>
                    </td>
                    <td className="px-6 py-4" dir="ltr">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        {customer.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-destructive">
                      {customer.debt.toLocaleString()} MRU
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${daysOverdue > 60 ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                          {daysOverdue} {t('common.days', 'days')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-end">
                      <Link
                        to={`/customers/${customer._id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground rounded-lg transition-colors"
                      >
                        {t('customers.viewProfile', 'View Profile')}
                        <ArrowRight className="w-3 h-3" />
                      </Link>
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
