import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowLeft, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { walletsApi } from '../api/wallets';
import { useAuthStore } from '../stores/authStore';

export default function WalletTransactionsScreen() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  
  const [transactions, setTransactions] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const isAdmin = user?.role === 'admin';
  const isAccountant = user?.role === 'accountant';

  const fetchTransactions = useCallback(async (cursor = null) => {
    if (cursor) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setTransactions([]);
    }
    setError(null);
    
    try {
      const res = await walletsApi.getTransactions(id, cursor);
      if (res.success) {
        setTransactions(prev => cursor ? [...prev, ...res.data.transactions] : res.data.transactions);
        setNextCursor(res.meta?.nextCursor || null);
        setHasMore(res.meta?.hasMore || false);
      } else {
        setError(res.error?.message || t('common.error', 'An error occurred'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [id, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTransactions();
  }, [fetchTransactions]);

  if (!isAdmin && !isAccountant) {
    return <div className="p-6 text-center text-destructive">Unauthorized access</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link to={`/${isAdmin ? 'admin' : 'accountant'}/wallets`} className="p-2 hover:bg-secondary rounded-md transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold">{t('wallets.transactions', 'Wallet Transactions')}</h2>
          <p className="text-muted-foreground text-sm">Wallet ID: {id}</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        {loading && transactions.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error && transactions.length === 0 ? (
          <div className="p-4 bg-destructive/10 text-destructive">{error}</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>{t('wallets.noTransactions', 'No transactions found')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-start">
                <thead className="bg-muted text-muted-foreground border-b">
                  <tr>
                    <th className="px-6 py-3 font-medium text-start">{t('common.date', 'Date')}</th>
                    <th className="px-6 py-3 font-medium text-start">{t('wallets.type', 'Type')}</th>
                    <th className="px-6 py-3 font-medium text-start">{t('common.amount', 'Amount')}</th>
                    <th className="px-6 py-3 font-medium text-start">{t('wallets.balance', 'Running Balance')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((tx) => {
                    const isCredit = tx.type === 'credit' || tx.amount > 0;
                    return (
                      <tr key={tx._id} className="hover:bg-secondary/50 transition-colors">
                        <td className="px-6 py-4">
                          {new Date(tx.date || tx.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {isCredit ? (
                              <ArrowDownRight className="w-4 h-4 text-primary" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-destructive" />
                            )}
                            <span className="capitalize">{tx.type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-bold ${isCredit ? 'text-primary' : 'text-destructive'}`}>
                            {isCredit ? '+' : '-'}{Math.abs(tx.amount || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground font-medium">
                          {(tx.balanceAfter || 0).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="p-4 border-t flex justify-center bg-secondary/20">
                <button
                  onClick={() => fetchTransactions(nextCursor)}
                  disabled={loadingMore}
                  className="px-6 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 flex items-center justify-center gap-2 transition-colors font-medium"
                >
                  {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('common.loadMore', 'Load More')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
