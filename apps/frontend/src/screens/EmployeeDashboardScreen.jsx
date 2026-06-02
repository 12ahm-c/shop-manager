import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, ShoppingCart, Tag } from 'lucide-react';
import { dashboardApi } from '../api/dashboard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';

export default function EmployeeDashboardScreen() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardApi.getEmployeeDashboard();
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
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading && !data) {
    return <LoadingSkeleton variant="card" count={3} />;
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={fetchDashboard} />;
  }

  const kpis = [
    { label: t('dashboard.dailySales', 'Daily Sales Count'), value: data?.dailySalesCount || 0, icon: ShoppingCart },
    { label: t('dashboard.itemsSold', 'Items Sold'), value: data?.itemsSold || 0, icon: Tag },
    { label: t('dashboard.revenue', 'Revenue'), value: data?.revenue || 0, icon: DollarSign },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">{t('dashboard.employeeTitle', 'Employee Dashboard')}</h2>
        <p className="text-muted-foreground">{t('dashboard.employeeSubtitle', 'Your daily performance overview.')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis.map((kpi, index) => (
          <div key={index} className="bg-card border rounded-xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted-foreground font-medium">{kpi.label}</span>
              <div className="p-2 bg-primary/10 text-primary rounded-full">
                <kpi.icon className="w-5 h-5" />
              </div>
            </div>
            <span className="text-2xl font-bold">{kpi.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
