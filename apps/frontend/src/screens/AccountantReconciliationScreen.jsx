import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowLeft, CheckCircle, Scale } from 'lucide-react';
import { walletsApi } from '../api/wallets';
import { useAuthStore } from '../stores/authStore';

export default function AccountantReconciliationScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  
  const [actualBalance, setActualBalance] = useState('');
  const [notes, setNotes] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const isAccountant = user?.role === 'accountant';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!actualBalance) return;
    
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const res = await walletsApi.reconcile(id, {
        actualBalance: Number(actualBalance),
        notes
      });
      
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/accountant/wallets');
        }, 2000);
      } else {
        setError(res.error?.message || t('common.error', 'Reconciliation failed'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAccountant) {
    return <div className="p-6 text-center text-destructive">Unauthorized access</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link to="/accountant/wallets" className="p-2 hover:bg-secondary rounded-md transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="w-6 h-6" />
            {t('wallets.reconcile', 'Reconcile Wallet')}
          </h2>
          <p className="text-muted-foreground text-sm">Wallet ID: {id}</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="text-sm text-destructive p-3 bg-destructive/10 rounded-md">{error}</div>}
          {success && (
            <div className="text-sm text-primary p-3 bg-primary/10 rounded-md flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              {t('wallets.reconcileSuccess', 'Wallet reconciled successfully. Redirecting...')}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('wallets.actualBalance', 'Actual Physical Balance')}</label>
            <input
              type="number"
              value={actualBalance}
              onChange={(e) => setActualBalance(e.target.value)}
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
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px]"
              placeholder={t('wallets.reconcileNotesPlaceholder', 'Any notes about discrepancies...')}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !actualBalance}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {t('common.submit', 'Submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
