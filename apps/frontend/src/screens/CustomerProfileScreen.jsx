import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowLeft, User, CreditCard, Gift, History, DollarSign } from 'lucide-react';
import { customersApi } from '../api/customers';
import DebtPaymentModal from '../components/DebtPaymentModal';

export default function CustomerProfileScreen() {
  const { id } = useParams();
  const { t } = useTranslation();
  
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await customersApi.getCustomer(id);
      if (res.success) {
        setCustomerData(res.data);
      } else {
        setError(res.error?.message || t('common.error', 'An error occurred'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCustomer();
  }, [fetchCustomer]);

  const handlePaymentSuccess = (newDebt) => {
    setCustomerData(prev => ({
      ...prev,
      customer: {
        ...prev.customer,
        debt: newDebt
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !customerData) {
    return (
      <div className="space-y-6">
        <Link to="/customers" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          {t('common.back', 'Back')}
        </Link>
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl">{error || "Customer not found"}</div>
      </div>
    );
  }

  const { customer, recentPurchases } = customerData;
  const debtRatio = customer.creditLimit > 0 ? (customer.debt / customer.creditLimit) * 100 : 0;
  const isOverLimit = customer.debt > customer.creditLimit;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/customers" className="p-2 hover:bg-secondary rounded-md transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <User className="w-6 h-6" />
          {t('customers.profile', 'Customer Profile')}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info Card */}
        <div className="col-span-1 md:col-span-1 space-y-6">
          <div className="bg-card border rounded-2xl p-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4 text-2xl font-bold">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <h3 className="text-xl font-bold mb-1">{customer.name}</h3>
            <p className="text-muted-foreground mb-4" dir="ltr">{customer.phone}</p>
            
            <div className="pt-4 border-t border-border space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Gift className="w-4 h-4" />
                  {t('customers.loyaltyPoints', 'Loyalty Points')}
                </span>
                <span className="font-bold text-primary">{customer.loyaltyPoints}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Info & Purchases */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Debt Card */}
            <div className={`border rounded-2xl p-6 ${customer.debt > 0 ? 'bg-destructive/5 border-destructive/20' : 'bg-card'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 font-medium">
                  <DollarSign className={`w-5 h-5 ${customer.debt > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                  {t('customers.currentDebt', 'Current Debt')}
                </div>
                {customer.debt > 0 && (
                  <button 
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    {t('customers.payDebt', 'Pay Debt')}
                  </button>
                )}
              </div>
              <p className={`text-3xl font-bold ${customer.debt > 0 ? 'text-destructive' : 'text-foreground'}`}>
                {customer.debt.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">MRU</span>
              </p>
              
              {customer.creditLimit > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t('customers.creditLimit', 'Credit Limit')}: {customer.creditLimit.toLocaleString()} MRU</span>
                    <span>{Math.min(100, Math.round(debtRatio))}%</span>
                  </div>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${isOverLimit ? 'bg-red-600' : 'bg-primary'}`} 
                      style={{ width: `${Math.min(100, debtRatio)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Blank/Stats Card */}
            <div className="bg-card border rounded-2xl p-6 flex flex-col justify-center">
               <div className="flex items-center gap-3 text-muted-foreground mb-2">
                  <History className="w-5 h-5" />
                  <span className="font-medium">{t('customers.totalPurchases', 'Total Purchases')}</span>
               </div>
               <p className="text-2xl font-bold">{recentPurchases?.length || 0}</p>
            </div>
          </div>

          {/* Recent Purchases */}
          <div className="bg-card border rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              {t('customers.recentPurchases', 'Recent Purchases')}
            </h3>
            
            {recentPurchases && recentPurchases.length > 0 ? (
              <div className="space-y-3">
                {recentPurchases.map(sale => (
                  <div key={sale._id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:bg-secondary/30 transition-colors">
                    <div>
                      <p className="font-medium">{t('sales.invoice', 'Invoice')} #{sale._id}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="font-bold">{sale.totalAmount.toLocaleString()} MRU</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                        {sale.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t('customers.noPurchases', 'No purchases yet')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <DebtPaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
        customer={customer} 
        onPaymentSuccess={handlePaymentSuccess} 
      />
    </div>
  );
}
