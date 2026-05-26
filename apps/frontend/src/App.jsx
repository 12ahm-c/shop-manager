
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import LoginScreen from './screens/LoginScreen';
import ProfileScreen from './screens/ProfileScreen';
import AdminEmployeesScreen from './screens/AdminEmployeesScreen';
import PosScreen from './screens/PosScreen';

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
            
            {/* Admin Routes */}
            <Route element={<AuthGuard allowedRoles={['admin']} />}>
              <Route path="/admin/employees" element={<AdminEmployeesScreen />} />
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
