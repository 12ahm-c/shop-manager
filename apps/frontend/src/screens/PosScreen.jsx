import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, CheckCircle, Loader2 } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { useWalletStore } from '../stores/walletStore';
import { useUiStore } from '../stores/uiStore';
import { productsApi } from '../api/products';
import { salesApi } from '../api/sales';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function PosScreen() {
  const { t } = useTranslation();
  const { 
    items, addItem, updateQuantity, removeItem, clearCart,
    customer, paymentMethod, setPayment, cashGiven, useLoyaltyPoints, walletId
  } = useCartStore();
  
  const { wallets, fetchWallets } = useWalletStore();
  const { addToast } = useUiStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saleReceipt, setSaleReceipt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = useCallback(async (q) => {
    setLoadingProducts(true);
    const res = await productsApi.searchProducts(q);
    if (res.success) {
      setProducts(res.data.products);
    }
    setLoadingProducts(false);
  }, []);

  // Load initial products and wallets
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts('');
    fetchWallets();
  }, [fetchProducts, fetchWallets]);

  const handleSearch = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    fetchProducts(q); // In real app, we should debounce this
  };

  const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const finalAmount = subtotal - (useLoyaltyPoints * 10);

  const handleCheckout = () => {
    if (items.length === 0) return;
    setShowCheckout(true);
  };

  const submitSale = async () => {
    setIsSubmitting(true);
    const payload = {
      items: items.map(i => ({ productId: i.product._id, quantity: i.quantity, unitPrice: i.product.price })),
      customerId: customer?._id || null,
      paymentMethod,
      walletId,
      cashGiven: Number(cashGiven),
      useLoyaltyPoints
    };
    
    // Generate simple idempotency key (uuid fallback)
    const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    
    const res = await salesApi.createSale(payload, idempotencyKey);
    setIsSubmitting(false);

    if (res.success) {
      setSaleReceipt(res.data);
      setShowCheckout(false);
      setShowSuccess(true);
      clearCart();
    } else {
      addToast({ type: 'error', title: t('common.error'), message: res.error?.message });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6">
      {/* LEFT: CART PANEL */}
      <div className="w-full lg:w-1/3 lg:min-w-[350px] flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm lg:h-full max-h-[50vh] lg:max-h-full">
        <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            {t('pos.currentSale')}
          </h2>
          {items.length > 0 && (
            <button onClick={clearCart} className="text-sm text-destructive hover:underline">{t('pos.clear')}</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
              <ShoppingCart className="w-12 h-12 mb-2" />
              <p>{t('pos.emptyCart')}</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.product._id} className="flex flex-col gap-2 p-3 border rounded-lg bg-background">
                <div className="flex justify-between font-medium">
                  <span className="truncate pr-2">{item.product.name}</span>
                  <span>{(item.product.price * item.quantity).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">{item.product.price.toLocaleString()} / unit</div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateQuantity(item.product._id, item.quantity - 1)} className="p-1 rounded bg-secondary hover:bg-secondary/80">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-4 text-center font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product._id, item.quantity + 1)} className="p-1 rounded bg-secondary hover:bg-secondary/80">
                      <Plus className="w-3 h-3" />
                    </button>
                    <button onClick={() => removeItem(item.product._id)} className="p-1 ml-2 text-destructive hover:bg-destructive/10 rounded">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t bg-muted/10 space-y-4">
          <div className="flex justify-between text-lg font-bold">
            <span>{t('pos.total')}</span>
            <span>{subtotal.toLocaleString()} MRU</span>
          </div>
          <button 
            onClick={handleCheckout}
            disabled={items.length === 0}
            className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {t('pos.checkout')}
          </button>
        </div>
      </div>

      {/* RIGHT: PRODUCTS PANEL */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text"
              placeholder={t('pos.searchPlaceholder')}
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-3 bg-card border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingProducts ? (
            <LoadingSkeleton variant="card" count={8} />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-10">
              {products.map(p => (
                <button 
                  key={p.product._id} 
                  onClick={() => addItem(p.product)}
                  className="flex flex-col items-start p-4 bg-card border rounded-xl hover:border-primary/50 hover:shadow-sm transition-all text-left"
                >
                  <div className="w-full aspect-video bg-secondary rounded-lg mb-3 flex items-center justify-center text-muted-foreground">
                    IMG
                  </div>
                  <h3 className="font-medium line-clamp-2 leading-tight flex-1">{p.product.name}</h3>
                  <div className="mt-2 w-full flex justify-between items-end">
                    <span className="font-bold text-primary">{p.product.price.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">{p.totalStock} {t('pos.inStock')}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CHECKOUT MODAL */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">{t('pos.completeSale')}</h2>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">{t('pos.paymentMethod')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setPayment({ paymentMethod: 'cash' })} className={`p-3 border rounded-xl flex items-center justify-center gap-2 ${paymentMethod === 'cash' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-secondary'}`}>
                    <Banknote className="w-4 h-4" /> {t('pos.cash')}
                  </button>
                  <button onClick={() => setPayment({ paymentMethod: 'mixed' })} className={`p-3 border rounded-xl flex items-center justify-center gap-2 ${paymentMethod === 'mixed' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-secondary'}`}>
                    <CreditCard className="w-4 h-4" /> {t('pos.mixed')}
                  </button>
                </div>
              </div>

              {(paymentMethod === 'cash' || paymentMethod === 'mixed') && (
                <div>
                  <label className="block text-sm font-medium mb-2">{t('pos.cashGiven')}</label>
                  <input 
                    type="number" 
                    value={cashGiven}
                    onChange={(e) => setPayment({ cashGiven: e.target.value })}
                    className="w-full p-3 bg-background border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none"
                  />
                  {cashGiven > finalAmount && (
                    <div className="mt-2 text-sm text-green-600 font-medium">
                      {t('pos.change')}: {(cashGiven - finalAmount).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">{t('pos.wallet')}</label>
                <select 
                  value={walletId || ''} 
                  onChange={(e) => setPayment({ walletId: e.target.value })}
                  className="w-full p-3 bg-background border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none"
                >
                  <option value="">{t('pos.selectWallet')}</option>
                  {wallets.map(w => (
                    <option key={w._id} value={w._id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t flex justify-between items-center font-bold text-lg">
                <span>{t('pos.totalToPay')}:</span>
                <span className="text-primary">{finalAmount.toLocaleString()} MRU</span>
              </div>
            </div>

            <div className="p-4 border-t bg-muted/30 flex justify-end gap-3">
              <button 
                onClick={() => setShowCheckout(false)}
                className="px-5 py-2.5 rounded-lg font-medium hover:bg-secondary transition-colors"
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={submitSale}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('pos.confirmSale')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 text-center p-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">{t('pos.saleCompleted')}</h2>
            <p className="text-muted-foreground mb-6">{t('pos.invoice')}: {saleReceipt?.invoiceNumber}</p>
            
            <div className="bg-muted p-4 rounded-xl mb-6 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('pos.total')}:</span>
                <span className="font-medium">{saleReceipt?.totalAmount.toLocaleString()} MRU</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('pos.change')}:</span>
                <span className="font-medium">{saleReceipt?.changeAmount.toLocaleString()} MRU</span>
              </div>
              {saleReceipt?.loyaltyPointsEarned > 0 && (
                <div className="flex justify-between text-primary">
                  <span>{t('pos.pointsEarned')}:</span>
                  <span className="font-bold">+{saleReceipt?.loyaltyPointsEarned}</span>
                </div>
              )}
            </div>

            <button 
              onClick={() => setShowSuccess(false)}
              className="w-full py-3 bg-secondary text-foreground font-medium rounded-lg hover:bg-secondary/80 transition-colors"
            >
              {t('pos.newSale')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
