import { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { useLanguageStore } from '../stores/languageStore';
import LanguageSwitcher from './LanguageSwitcher';
import {
  LayoutDashboard,
  Store,
  Package,
  PackagePlus,
  PackageMinus,
  ArrowRightLeft,
  Users,
  UserCog,
  LogOut,
  User as UserIcon,
  Menu,
  AlertCircle,
  Truck,
  Wallet,
  LineChart
} from 'lucide-react';
import { authApi } from '../api/auth';

export default function Layout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, store, clearAuth } = useAuthStore();
  const { initLanguage } = useLanguageStore();

  useEffect(() => {
    initLanguage();
  }, [initLanguage]);

  const handleLogout = async () => {
    await authApi.logout();
    clearAuth();
    navigate('/login');
  };

  const navItems = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'employee'] },
    { name: t('nav.adminDashboard', 'Admin Dashboard'), href: '/admin/dashboard', icon: LineChart, roles: ['admin'] },
    { name: t('nav.accountantDashboard', 'Accountant Dashboard'), href: '/accountant/dashboard', icon: LineChart, roles: ['accountant'] },
    { name: t('nav.pos'), href: '/pos', icon: Store, roles: ['admin', 'employee'] },
    { name: t('nav.products'), href: '/products', icon: Package, roles: ['admin', 'employee'] },
    { name: t('nav.customers'), href: '/customers', icon: Users, roles: ['admin', 'employee'] },
    { name: t('nav.suppliers', 'Suppliers'), href: '/admin/suppliers', icon: Truck, roles: ['admin'] },
    { name: t('nav.wallets', 'Wallets'), href: '/admin/wallets', icon: Wallet, roles: ['admin'] },
    { name: t('nav.wallets', 'Wallets'), href: '/accountant/wallets', icon: Wallet, roles: ['accountant'] },
    { name: t('nav.employees'), href: '/admin/employees', icon: UserCog, roles: ['admin'] },
    { name: t('nav.stockReceive'), href: '/admin/stock/receive', icon: PackagePlus, roles: ['admin'] },
    { name: t('nav.stockAdjust'), href: '/admin/stock/adjust', icon: PackageMinus, roles: ['admin'] },
    { name: t('nav.stockTransfer'), href: '/admin/stock/transfer', icon: ArrowRightLeft, roles: ['admin'] },
    { name: t('nav.debts', 'Overdue Debts'), href: '/admin/debts', icon: AlertCircle, roles: ['admin'] },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-e flex flex-col transition-all duration-300">
        <div className="h-16 flex items-center px-6 border-b">
          <h1 className="text-xl font-bold text-primary">SHOPMANAGER PRO</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navItems
              .filter(item => item.roles.includes(user?.role))
              .map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <Link
                    key={`${item.name}-${item.href}`}
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                      isActive 
                        ? 'bg-primary/10 text-primary font-medium' 
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
          </nav>
        </div>

        <div className="p-4 border-t">
          <div className="mb-4 px-3 flex flex-col space-y-1">
            <span className="text-sm font-medium">{user?.name}</span>
            <span className="text-xs text-muted-foreground truncate">{store?.name}</span>
          </div>
          
          <div className="space-y-1">
            <Link
              to="/profile"
              className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground rounded-md transition-colors"
            >
              <UserIcon className="w-4 h-4" />
              <span>{t('nav.profile')}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 border-b bg-card">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-muted-foreground hover:text-foreground">
              <Menu className="w-6 h-6" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
