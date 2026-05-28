import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, DollarSign, Package, AlertCircle, ShoppingCart } from 'lucide-react';
import { dashboardApi } from '../api/dashboard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';

export default function AdminDashboardScreen() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('today');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardApi.getAdminDashboard(period);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error?.message || t('common.error', 'Failed to load dashboard'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [period, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboard();
  }, [fetchDashboard]);

  const kpis = [
    { label: t('dashboard.revenue', 'Revenue'), value: data?.revenue || 0, icon: DollarSign },
    { label: t('dashboard.margin', 'Margin'), value: data?.margin || 0, icon: TrendingUp },
    { label: t('dashboard.salesCount', 'Sales Count'), value: data?.salesCount || 0, icon: ShoppingCart },
    { label: t('dashboard.stockValue', 'Stock Value'), value: data?.stockValue || 0, icon: Package },
    { label: t('dashboard.activeDebts', 'Active Debts'), value: data?.activeDebts || 0, icon: AlertCircle },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('dashboard.adminTitle', 'Admin Dashboard')}</h2>
          <p className="text-muted-foreground">{t('dashboard.adminSubtitle', 'Store performance metrics.')}</p>
        </div>
        
        <select 
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="border rounded-md px-3 py-1.5 bg-background focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="today">{t('dashboard.periodToday', 'Today')}</option>
          <option value="week">{t('dashboard.periodWeek', 'This Week')}</option>
          <option value="month">{t('dashboard.periodMonth', 'This Month')}</option>
        </select>
      </div>

      {loading && !data ? (
        <LoadingSkeleton variant="card" count={5} />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={fetchDashboard} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {kpis.map((kpi, index) => (
            <div key={index} className="bg-card border rounded-xl p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground font-medium text-sm">{kpi.label}</span>
                <div className="p-2 bg-primary/10 text-primary rounded-full">
                  <kpi.icon className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-bold">{kpi.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
