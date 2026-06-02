import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CheckCheck, Bell, AlertTriangle, Package, DollarSign, MessageSquareWarning } from 'lucide-react';
import { useNotificationStore } from '../stores/notificationStore';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, isLoading, error } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const getIcon = (type) => {
    if (!type) return <Bell className="w-5 h-5 text-primary" />;
    switch (type) {
      case 'stock_critical': return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case 'out_of_stock': return <Package className="w-5 h-5 text-destructive" />;
      case 'debt_overdue': return <DollarSign className="w-5 h-5 text-destructive" />;
      case 'low_wallet': return <DollarSign className="w-5 h-5 text-yellow-500" />;
      case 'whatsapp_failed': return <MessageSquareWarning className="w-5 h-5 text-destructive" />;
      default: return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('notifications.title', 'Notifications')}</h2>
          <p className="text-muted-foreground">{t('notifications.subtitle', 'Your recent alerts and updates.')}</p>
        </div>
        <button
          onClick={markAllAsRead}
          disabled={isLoading || notifications.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md transition-colors disabled:opacity-50"
        >
          <CheckCheck className="w-4 h-4" />
          {t('notifications.markAllRead', 'Mark all read')}
        </button>
      </div>

      {error && <div className="p-4 bg-destructive/10 text-destructive rounded-xl">{error}</div>}

      <div className="bg-card border rounded-xl divide-y">
        {isLoading && notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">{t('common.loading', 'Loading...')}</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="p-4 bg-secondary rounded-full mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">{t('notifications.empty', 'You have no notifications.')}</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div 
              key={notif._id} 
              className={`p-4 flex gap-4 transition-colors hover:bg-secondary/30 ${!notif.isRead ? 'bg-primary/5' : ''}`}
            >
              <div className="mt-1">
                {getIcon(notif.type)}
              </div>
              <div className="flex-1">
                <h4 className={`text-sm font-medium ${!notif.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {notif.title}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(notif.createdAt).toLocaleString()}
                </p>
              </div>
              {!notif.isRead && (
                <button
                  onClick={() => markAsRead(notif._id)}
                  className="p-2 text-muted-foreground hover:text-primary transition-colors self-center"
                  title={t('notifications.markRead', 'Mark as read')}
                >
                  <Check className="w-5 h-5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
