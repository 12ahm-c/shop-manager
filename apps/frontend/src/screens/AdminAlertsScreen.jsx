import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertCircle } from 'lucide-react';
import { notificationsApi } from '../api/notifications';

export default function AdminAlertsScreen() {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationsApi.getAlerts();
      if (res.success) {
        setAlerts(res.data?.alerts || []);
      } else {
        setError(res.error?.message || t('common.error', 'Failed to fetch alerts'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAlerts();
  }, [fetchAlerts]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('alerts.title', 'System Alerts')}</h2>
        <p className="text-muted-foreground">{t('alerts.subtitle', 'Active critical alerts across all stores.')}</p>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        {loading && alerts.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error && alerts.length === 0 ? (
          <div className="p-4 bg-destructive/10 text-destructive">{error}</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>{t('alerts.empty', 'No active system alerts.')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {alerts.map((alert) => (
              <div key={alert._id} className="p-4 flex gap-4 items-start">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <h4 className="font-medium">{alert.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
