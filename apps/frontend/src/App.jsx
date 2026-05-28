import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';

// Screen Fallback
const ScreenFallback = () => (
  <div className="flex items-center justify-center h-full w-full min-h-[50vh]">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

// Lazy load all screens
const LoginScreen = lazy(() => import('./screens/LoginScreen'));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen'));
const AdminEmployeesScreen = lazy(() => import('./screens/AdminEmployeesScreen'));
const PosScreen = lazy(() => import('./screens/PosScreen'));
const ProductsListScreen = lazy(() => import('./screens/ProductsListScreen'));
const ProductDetailScreen = lazy(() => import('./screens/ProductDetailScreen'));
const AdminProductFormScreen = lazy(() => import('./screens/AdminProductFormScreen'));
const AdminStockReceiveScreen = lazy(() => import('./screens/AdminStockReceiveScreen'));
const AdminStockAdjustScreen = lazy(() => import('./screens/AdminStockAdjustScreen'));
const AdminStockTransferScreen = lazy(() => import('./screens/AdminStockTransferScreen'));
const CustomerProfileScreen = lazy(() => import('./screens/CustomerProfileScreen'));
const AdminOverdueDebtsScreen = lazy(() => import('./screens/AdminOverdueDebtsScreen'));
const CustomersListScreen = lazy(() => import('./screens/CustomersListScreen'));

// Phase 5 Screens
const SuppliersListScreen = lazy(() => import('./screens/SuppliersListScreen'));
const SupplierProfileScreen = lazy(() => import('./screens/SupplierProfileScreen'));
const WalletsListScreen = lazy(() => import('./screens/WalletsListScreen'));
const WalletTransactionsScreen = lazy(() => import('./screens/WalletTransactionsScreen'));
const WalletTransferScreen = lazy(() => import('./screens/WalletTransferScreen'));
const AccountantReconciliationScreen = lazy(() => import('./screens/AccountantReconciliationScreen'));

// Phase 6 Screens
const InvoiceDetailScreen = lazy(() => import('./screens/InvoiceDetailScreen'));
const ReportsScreen = lazy(() => import('./screens/ReportsScreen'));

// Phase 7 Screens
const EmployeeDashboardScreen = lazy(() => import('./screens/EmployeeDashboardScreen'));
const AdminDashboardScreen = lazy(() => import('./screens/AdminDashboardScreen'));
const AccountantDashboardScreen = lazy(() => import('./screens/AccountantDashboardScreen'));
const NotificationsScreen = lazy(() => import('./screens/NotificationsScreen'));
const AdminAlertsScreen = lazy(() => import('./screens/AdminAlertsScreen'));
const AiChatScreen = lazy(() => import('./screens/AiChatScreen'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<ScreenFallback />}>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          
          {/* Authenticated Routes */}
          <Route element={<AuthGuard />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* Dashboards and Phase 7 features */}
              <Route path="/dashboard" element={<EmployeeDashboardScreen />} />
              <Route path="/notifications" element={<NotificationsScreen />} />
              <Route path="/ai" element={<AiChatScreen />} />
              
              <Route path="/pos" element={<PosScreen />} />
              <Route path="/profile" element={<ProfileScreen />} />
              
              {/* Products (Admin & Employee) */}
              <Route path="/products" element={<ProductsListScreen />} />
              <Route path="/products/:id" element={<ProductDetailScreen />} />
              
              {/* Customers (Admin & Employee) */}
              <Route path="/customers" element={<CustomersListScreen />} />
              <Route path="/customers/:id" element={<CustomerProfileScreen />} />
              
              {/* Invoices (All Authenticated) */}
              <Route path="/invoices/:id" element={<InvoiceDetailScreen />} />
              
              {/* Shared Admin & Accountant */}
              <Route element={<AuthGuard allowedRoles={['admin', 'accountant']} />}>
                <Route path="/admin/wallets" element={<WalletsListScreen />} />
                <Route path="/accountant/wallets" element={<WalletsListScreen />} />
                <Route path="/admin/wallets/:id" element={<WalletTransactionsScreen />} />
                <Route path="/accountant/wallets/:id" element={<WalletTransactionsScreen />} />
                
                <Route path="/admin/dashboard" element={<AdminDashboardScreen />} />
                <Route path="/accountant/dashboard" element={<AccountantDashboardScreen />} />
              </Route>

              {/* Admin Only Routes */}
              <Route element={<AuthGuard allowedRoles={['admin']} />}>
                <Route path="/admin/employees" element={<AdminEmployeesScreen />} />
                <Route path="/admin/products/new" element={<AdminProductFormScreen />} />
                <Route path="/admin/products/:id/edit" element={<AdminProductFormScreen />} />
                <Route path="/admin/stock/receive" element={<AdminStockReceiveScreen />} />
                <Route path="/admin/stock/adjust" element={<AdminStockAdjustScreen />} />
                <Route path="/admin/stock/transfer" element={<AdminStockTransferScreen />} />
                <Route path="/admin/debts" element={<AdminOverdueDebtsScreen />} />
                <Route path="/admin/alerts" element={<AdminAlertsScreen />} />
                <Route path="/admin/reports" element={<ReportsScreen />} />
                
                <Route path="/admin/suppliers" element={<SuppliersListScreen />} />
                <Route path="/admin/suppliers/:id" element={<SupplierProfileScreen />} />
                <Route path="/admin/wallets/transfer" element={<WalletTransferScreen />} />
              </Route>

              {/* Accountant Only Routes */}
              <Route element={<AuthGuard allowedRoles={['accountant']} />}>
                <Route path="/accountant/wallets/:id/reconcile" element={<AccountantReconciliationScreen />} />
                <Route path="/accountant/reports" element={<ReportsScreen />} />
              </Route>

            </Route>
          </Route>
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
