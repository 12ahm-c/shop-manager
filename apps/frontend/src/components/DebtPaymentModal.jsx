import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, X, Wallet, DollarSign } from 'lucide-react';
import { customersApi } from '../api/customers';
import { useUiStore } from '../stores/uiStore';

export default function DebtPaymentModal({ customer, isOpen, onClose, onPaymentSuccess }) {
  const { t } = useTranslation();
  const { addToast } = useUiStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('');

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    
    setLoading(true);
    setError(null);
    try {
      const idempotencyKey = crypto.randomUUID();
      const payload = {
        amount: Number(amount),
        walletId: walletId || undefined
      };
      
      const res = await customersApi.payDebt(customer._id, payload, idempotencyKey);
      
      if (res.success) {
        addToast({ type: 'success', title: t('customers.paymentSuccess', 'Payment recorded successfully') });
        onPaymentSuccess(res.data.newDebt);
        onClose();
        setAmount('');
        setWalletId('');
      } else {
        setError(res.error?.message || t('common.error', 'An error occurred'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            {t('customers.payDebt', 'Pay Debt')}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
              {error}
            </div>
          )}
          
          <div className="p-4 bg-secondary/50 rounded-xl space-y-1">
            <p className="text-sm text-muted-foreground">{t('customers.customer', 'Customer')}</p>
            <p className="font-medium">{customer.name}</p>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">{t('customers.currentDebt', 'Current Debt')}</span>
              <span className="font-bold text-destructive">{customer.debt.toLocaleString()} MRU</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('customers.amountToPay', 'Amount to Pay')}</label>
            <div className="relative">
              <DollarSign className="w-5 h-5 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="number"
                required
                min="1"
                max={customer.debt}
                className="w-full ps-10 pe-4 py-3 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('customers.wallet', 'Wallet')} <span className="text-muted-foreground font-normal">({t('common.optional', 'Optional')})</span>
            </label>
            <div className="relative">
              <Wallet className="w-5 h-5 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('customers.walletPlaceholder', 'Enter Wallet ID')}
                className="w-full ps-10 pe-4 py-3 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                dir="ltr"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !amount || Number(amount) <= 0 || Number(amount) > customer.debt}
            className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mt-4"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? t('common.processing', 'Processing...') : t('customers.confirmPayment', 'Confirm Payment')}
          </button>
        </form>
      </div>
    </div>
  );
}
