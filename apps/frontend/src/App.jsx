
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import LoginScreen from './screens/LoginScreen';
import ProfileScreen from './screens/ProfileScreen';
import AdminEmployeesScreen from './screens/AdminEmployeesScreen';
import PosScreen from './screens/PosScreen';
import ProductsListScreen from './screens/ProductsListScreen';
import ProductDetailScreen from './screens/ProductDetailScreen';
import AdminProductFormScreen from './screens/AdminProductFormScreen';
import AdminStockReceiveScreen from './screens/AdminStockReceiveScreen';
import AdminStockAdjustScreen from './screens/AdminStockAdjustScreen';
import AdminStockTransferScreen from './screens/AdminStockTransferScreen';
import CustomerProfileScreen from './screens/CustomerProfileScreen';
import AdminOverdueDebtsScreen from './screens/AdminOverdueDebtsScreen';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        
        {/* Authenticated Routes */}
        <Route element={<AuthGuard />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Dashboard placeholder */}
            <Route path="/dashboard" element={
              <div className="p-4"><h1 className="text-2xl font-bold">Dashboard</h1><p>Welcome to ShopManager Pro.</p></div>
            } />
            
            <Route path="/pos" element={<PosScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            
            {/* Products (Admin & Employee) */}
            <Route path="/products" element={<ProductsListScreen />} />
            <Route path="/products/:id" element={<ProductDetailScreen />} />
            
            {/* Customers (Admin & Employee) */}
            {/* <Route path="/customers" element={<CustomersListScreen />} /> (Placeholder for later) */}
            <Route path="/customers/:id" element={<CustomerProfileScreen />} />
            
            {/* Admin Routes */}
            <Route element={<AuthGuard allowedRoles={['admin']} />}>
              <Route path="/admin/employees" element={<AdminEmployeesScreen />} />
              <Route path="/admin/products/new" element={<AdminProductFormScreen />} />
              <Route path="/admin/products/:id/edit" element={<AdminProductFormScreen />} />
              <Route path="/admin/stock/receive" element={<AdminStockReceiveScreen />} />
              <Route path="/admin/stock/adjust" element={<AdminStockAdjustScreen />} />
              <Route path="/admin/stock/transfer" element={<AdminStockTransferScreen />} />
              <Route path="/admin/debts" element={<AdminOverdueDebtsScreen />} />
            </Route>

          </Route>
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
