import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, TrendingUp, DollarSign, CreditCard, Activity } from 'lucide-react';
import { dashboardApi } from '../api/dashboard';
import { useAuthStore } from '../stores/authStore';

export default function FinancialDashboardScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAdmin = user?.role === 'admin';
  const isAccountant = user?.role === 'accountant';

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardApi.getFinancialDashboard();
      if (res.success) {
        setData(res.data || {});
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
    if (isAdmin || isAccountant) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchDashboard();
    }
  }, [fetchDashboard, isAdmin, isAccountant]);

  if (!isAdmin && !isAccountant) {
    return <div className="p-6 text-center text-destructive">Unauthorized access</div>;
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-destructive/10 text-destructive rounded-xl max-w-4xl mx-auto">{error}</div>;
  }

  const kpis = [
    { label: t('dashboard.revenue', 'Total Revenue'), value: data?.revenue || 0, icon: TrendingUp },
    { label: t('dashboard.profit', 'Gross Profit'), value: data?.profit || 0, icon: DollarSign },
    { label: t('dashboard.expenses', 'Total Expenses'), value: data?.expenses || 0, icon: CreditCard },
    { label: t('dashboard.activeDebts', 'Active Debts'), value: data?.activeDebts || 0, icon: Activity },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">{t('dashboard.financialTitle', 'Financial Dashboard')}</h2>
        <p className="text-muted-foreground">{t('dashboard.financialSubtitle', 'Overview of your financial performance')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Additional charts/reports could be added here in the future */}
      <div className="bg-card border rounded-xl p-6 min-h-[300px] flex items-center justify-center text-muted-foreground">
        {t('dashboard.chartsPlaceholder', 'Financial charts and detailed metrics will appear here.')}
      </div>
    </div>
  );
}
