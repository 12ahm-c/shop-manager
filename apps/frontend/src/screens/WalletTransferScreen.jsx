import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowLeft, ArrowRightLeft, CheckCircle } from 'lucide-react';
import { walletsApi } from '../api/wallets';
import { useAuthStore } from '../stores/authStore';

export default function WalletTransferScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [sourceWallet, setSourceWallet] = useState('');
  const [destinationWallet, setDestinationWallet] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState(null);
  const [transferSuccess, setTransferSuccess] = useState(false);

  const isAdmin = user?.role === 'admin';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sourceWallet || !destinationWallet || !amount || Number(amount) <= 0) return;
    if (sourceWallet === destinationWallet) {
      setTransferError(t('wallets.sameWalletError', 'Source and destination cannot be the same'));
      return;
    }
    
    setTransferring(true);
    setTransferError(null);
    setTransferSuccess(false);
    
    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await walletsApi.transfer({
        sourceWalletId: sourceWallet,
        destinationWalletId: destinationWallet,
        amount: Number(amount),
        notes
      }, idempotencyKey);
      
      if (res.success) {
        setTransferSuccess(true);
        setTimeout(() => {
          navigate('/admin/wallets');
        }, 2000);
      } else {
        setTransferError(res.error?.message || t('common.error', 'Transfer failed'));
      }
    } catch (err) {
      setTransferError(err.message);
    } finally {
      setTransferring(false);
    }
  };

  if (!isAdmin) {
    return <div className="p-6 text-center text-destructive">Unauthorized access</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link to="/admin/wallets" className="p-2 hover:bg-secondary rounded-md transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6" />
            {t('wallets.transfer', 'Wallet Transfer')}
          </h2>
          <p className="text-muted-foreground text-sm">{t('wallets.transferSubtitle', 'Move funds between wallets')}</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive p-4 bg-destructive/10 rounded-md">{error}</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {transferError && <div className="text-sm text-destructive p-3 bg-destructive/10 rounded-md">{transferError}</div>}
            {transferSuccess && (
              <div className="text-sm text-primary p-3 bg-primary/10 rounded-md flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {t('wallets.transferSuccess', 'Transfer completed successfully. Redirecting...')}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('wallets.sourceWallet', 'From Wallet')}</label>
              <select
                value={sourceWallet}
                onChange={(e) => setSourceWallet(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              >
                <option value="">{t('common.select', 'Select...')}</option>
                {wallets.map(w => (
                  <option key={w._id} value={w._id}>{w.name} (Bal: {w.balance.toLocaleString()})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('wallets.destinationWallet', 'To Wallet')}</label>
              <select
                value={destinationWallet}
                onChange={(e) => setDestinationWallet(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              >
                <option value="">{t('common.select', 'Select...')}</option>
                {wallets.map(w => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('common.amount', 'Amount')}</label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="0"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('common.notes', 'Notes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
                placeholder={t('common.optional', 'Optional')}
              />
            </div>

            <button
              type="submit"
              disabled={transferring || !sourceWallet || !destinationWallet || !amount}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
            >
              {transferring && <Loader2 className="w-5 h-5 animate-spin" />}
              {t('common.transfer', 'Transfer')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
