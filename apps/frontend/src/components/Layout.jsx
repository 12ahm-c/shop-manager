import { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { useLanguageStore } from '../stores/languageStore';
import { useUiStore } from '../stores/uiStore';
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
  LineChart,
  FileText,
  Bell,
  Sparkles,
  MessageSquareWarning,
  WifiOff,
  X
} from 'lucide-react';
import { authApi } from '../api/auth';
import { socketService } from '../lib/socket';
import { useNotificationStore } from '../stores/notificationStore';

export default function Layout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, store, clearAuth } = useAuthStore();
  const { initLanguage } = useLanguageStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const { isSidebarOpen, setSidebarOpen, socketConnected } = useUiStore();

  useEffect(() => {
    initLanguage();
  }, [initLanguage]);

  useEffect(() => {
    if (user) {
      socketService.connect();
      fetchNotifications();
    }
    return () => {
      socketService.disconnect();
    };
  }, [user, fetchNotifications]);

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
    { name: t('nav.reports', 'Reports'), href: '/admin/reports', icon: FileText, roles: ['admin'] },
    { name: t('nav.reports', 'Reports'), href: '/accountant/reports', icon: FileText, roles: ['accountant'] },
    { name: t('nav.employees'), href: '/admin/employees', icon: UserCog, roles: ['admin'] },
    { name: t('nav.stockReceive'), href: '/admin/stock/receive', icon: PackagePlus, roles: ['admin'] },
    { name: t('nav.stockAdjust'), href: '/admin/stock/adjust', icon: PackageMinus, roles: ['admin'] },
    { name: t('nav.stockTransfer'), href: '/admin/stock/transfer', icon: ArrowRightLeft, roles: ['admin'] },
    { name: t('nav.debts', 'Overdue Debts'), href: '/admin/debts', icon: AlertCircle, roles: ['admin'] },
    { name: t('nav.notifications', 'Notifications'), href: '/notifications', icon: Bell, roles: ['admin', 'employee', 'accountant'] },
    { name: t('nav.ai', 'AI Assistant'), href: '/ai', icon: Sparkles, roles: ['admin', 'employee'] },
    { name: t('nav.alerts', 'System Alerts'), href: '/admin/alerts', icon: MessageSquareWarning, roles: ['admin'] },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity" 
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 start-0 z-50 w-64 bg-card border-e flex flex-col transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label={t('nav.mainNavigation', 'Main navigation')}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b">
          <h1 className="text-xl font-bold text-primary">SHOPMANAGER PRO</h1>
          <button 
            className="lg:hidden p-2 text-muted-foreground hover:bg-secondary rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setSidebarOpen(false)}
            aria-label={t('common.close', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3" aria-label="Sidebar">
            {navItems
              .filter(item => item.roles.includes(user?.role))
              .map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <Link
                    key={`${item.name}-${item.href}`}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isActive 
                        ? 'bg-primary/10 text-primary font-medium' 
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <item.icon className="w-5 h-5" aria-hidden="true" />
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
      <main role="main" className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header role="banner" className="h-16 flex items-center justify-between px-6 border-b bg-card shrink-0">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 text-muted-foreground hover:text-foreground rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setSidebarOpen(true)}
              aria-label={t('common.toggleMenu', 'Toggle menu')}
              aria-expanded={isSidebarOpen}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            {!socketConnected && (
              <div 
                className="flex items-center gap-2 px-3 py-1 bg-destructive/10 text-destructive text-xs font-medium rounded-full"
                role="status"
                aria-live="polite"
              >
                <WifiOff className="w-3 h-3" />
                <span className="hidden sm:inline">Disconnected</span>
              </div>
            )}
            <Link 
              to="/notifications" 
              className="relative p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t('nav.notifications', 'Notifications')}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
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
