import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Wallet, Plus, Loader2, ArrowRightLeft, Eye } from 'lucide-react';
import { walletsApi } from '../api/wallets';
import { useAuthStore } from '../stores/authStore';

export default function WalletsListScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAdmin = user?.role === 'admin';
  const isAccountant = user?.role === 'accountant';

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await walletsApi.getWallets();
      if (res.success) {
        setWallets(res.data.wallets || []);
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
    fetchWallets();
  }, [fetchWallets]);

  if (!isAdmin && !isAccountant) {
    return <div className="p-6 text-center text-destructive">Unauthorized access</div>;
  }

  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            {t('wallets.title', 'Wallets')}
          </h2>
          <p className="text-muted-foreground">{t('wallets.subtitle', 'Manage store wallets and balances')}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Link
                to="/admin/wallets/transfer"
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>{t('wallets.transfer', 'Transfer')}</span>
              </Link>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                onClick={() => alert('Add wallet functionality to be implemented')}
              >
                <Plus className="w-4 h-4" />
                <span>{t('wallets.new', 'New Wallet')}</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-card border rounded-xl p-6 mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-1">{t('wallets.totalBalance', 'Total Balance')}</h3>
        <p className="text-3xl font-bold">{totalBalance.toLocaleString()}</p>
      </div>

      {loading && wallets.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl">{error}</div>
      ) : wallets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card border rounded-xl">
          <p>{t('wallets.noWallets', 'No wallets found')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wallets.map((wallet) => (
            <div key={wallet._id} className="bg-card border rounded-xl p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">{wallet.name}</h3>
                  <p className="text-xs text-muted-foreground uppercase">{wallet.type || 'Standard'}</p>
                </div>
                <div className="p-2 bg-primary/10 text-primary rounded-full">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-2xl font-bold">{(wallet.balance || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{t('wallets.currentBalance', 'Current balance')}</p>
              </div>
              
              <div className="flex justify-between items-center border-t pt-4">
                <Link
                  to={`/${isAdmin ? 'admin' : 'accountant'}/wallets/${wallet._id}`}
                  className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                  {t('wallets.viewTransactions', 'Transactions')}
                </Link>
                
                {isAccountant && (
                  <Link
                    to={`/accountant/wallets/${wallet._id}/reconcile`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {t('wallets.reconcile', 'Reconcile')}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
