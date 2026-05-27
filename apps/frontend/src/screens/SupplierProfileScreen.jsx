import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowLeft, CreditCard, CheckCircle } from 'lucide-react';
import { suppliersApi } from '../api/suppliers';
import { walletsApi } from '../api/wallets';
import { useAuthStore } from '../stores/authStore';

export default function SupplierProfileScreen() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [debtData, setDebtData] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);
  const [paySuccess, setPaySuccess] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isAccountant = user?.role === 'accountant';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [debtRes, walletsRes] = await Promise.all([
        suppliersApi.getSupplierDebt(id),
        walletsApi.getWallets()
      ]);
      
      if (debtRes.success) {
        setDebtData(debtRes.data);
      } else {
        setError(debtRes.error?.message || t('common.error', 'An error occurred'));
      }

      if (walletsRes.success) {
        setWallets(walletsRes.data.wallets || []);
        if (walletsRes.data.wallets?.length > 0) {
          setSelectedWallet(walletsRes.data.wallets[0]._id);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0 || !selectedWallet) return;
    
    setPaying(true);
    setPayError(null);
    setPaySuccess(false);
    
    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await suppliersApi.paySupplier(id, {
        amount: Number(paymentAmount),
        walletId: selectedWallet
      }, idempotencyKey);
      
      if (res.success) {
        setPaySuccess(true);
        setPaymentAmount('');
        fetchData(); // Refresh debt
      } else {
        setPayError(res.error?.message || t('common.error', 'Payment failed'));
      }
    } catch (err) {
      setPayError(err.message);
    } finally {
      setPaying(false);
    }
  };

  if (!isAdmin && !isAccountant) {
    return <div className="p-6 text-center text-destructive">Unauthorized access</div>;
  }

  if (loading && !debtData) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-destructive/10 text-destructive rounded-xl max-w-2xl mx-auto">{error}</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link to="/admin/suppliers" className="p-2 hover:bg-secondary rounded-md transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold">{t('suppliers.profile', 'Supplier Details')}</h2>
          <p className="text-muted-foreground text-sm">ID: {id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-bold">{t('suppliers.debtOverview', 'Debt Overview')}</h3>
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
            <span className="text-muted-foreground">{t('suppliers.currentDebt', 'Current Debt')}</span>
            <span className={`text-2xl font-bold ${debtData?.debt > 0 ? 'text-destructive' : 'text-primary'}`}>
              {(debtData?.debt || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {isAdmin && debtData?.debt > 0 && (
          <div className="bg-card border rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {t('suppliers.makePayment', 'Make Payment')}
            </h3>
            
            <form onSubmit={handlePayment} className="space-y-4">
              {payError && <div className="text-sm text-destructive">{payError}</div>}
              {paySuccess && (
                <div className="text-sm text-primary flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Payment successful
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('common.amount', 'Amount')}</label>
                <input
                  type="number"
                  min="1"
                  max={debtData?.debt || 0}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('suppliers.payFromWallet', 'Pay From Wallet')}</label>
                <select
                  value={selectedWallet}
                  onChange={(e) => setSelectedWallet(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  {wallets.map(w => (
                    <option key={w._id} value={w._id}>{w.name} ({w.balance.toLocaleString()})</option>
                  ))}
                </select>
              </div>
              
              <button
                type="submit"
                disabled={paying || !paymentAmount}
                className="w-full py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {paying && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('common.pay', 'Pay')}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
