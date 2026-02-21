import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { api } from '../utils/api';
import {
  LayoutDashboard, Pill, BarChart3, Bot, LogOut,
  Sun, Moon, Menu, X, Shield, Bell, Heart, Package, AlertCircle
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/medicines', label: 'Medicines', icon: Pill },
  { path: '/summary', label: 'Weekly Report', icon: BarChart3 },
  { path: '/ai-assistant', label: 'AI Assistant', icon: Bot },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastNotifDate, setLastNotifDate] = useState(new Date());

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = async (isInitial = false) => {
    try {
      const notifs = await api.getNotifications();
      setNotifications(notifs);
      if (isInitial) {
        setLastNotifDate(notifs.length > 0 ? new Date(notifs[0].createdAt) : new Date());
      } else if (notifs.length > 0) {
        const latestNotifDate = new Date(notifs[0].createdAt);
        if (latestNotifDate > lastNotifDate) {
          const newNotif = notifs[0];
          showToast(newNotif.message, {
            type: newNotif.severity === 'warning' ? 'warning' : 'info',
            duration: 5000
          });
          setLastNotifDate(latestNotifDate);
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  useEffect(() => {
    fetchNotifications(true);
    const interval = setInterval(() => fetchNotifications(), 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = (notif) => {
    api.markNotificationAsRead(notif._id);
    setNotifications(notifications.map(n => n._id === notif._id ? { ...n, read: true } : n));
    if (notif.medicineId) {
      navigate('/medicines');
    }
    setShowNotifications(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f7f5] dark:bg-[#0d1210] transition-colors duration-300">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50">
            <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💊</span>
            <span className="font-display text-elder-lg text-gray-900 dark:text-white">MediCare</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell unreadCount={unreadCount} onClick={() => setShowNotifications(!showNotifications)} />
            <button onClick={toggle} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50">
              {dark ? <Sun className="w-5 h-5 text-warm-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-72 
        bg-white dark:bg-gray-900 
        border-r border-gray-200 dark:border-gray-800
        transition-transform duration-300 ease-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-glow">
                  <Heart className="w-6 h-6 text-white" fill="white" />
                </div>
                <div>
                  <h1 className="font-display text-elder-lg text-gray-900 dark:text-white leading-none">MediCare</h1>
                  <p className="text-sm text-brand-600 dark:text-brand-400 font-medium">Companion</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* User Info */}
          <div className="px-6 pb-6">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800/30">
              <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">{user?.name?.[0] || 'U'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate text-sm">{user?.name || 'User'}</p>
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-brand-500" />
                  <span className="text-xs text-brand-600 dark:text-brand-400 capitalize">{user?.role || 'elderly'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1">
            {navItems.map(({ path, label, icon: Icon }) => {
              const active = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3.5 rounded-2xl text-elder-base font-medium
                    transition-all duration-200
                    ${active
                      ? 'bg-brand-500 text-white shadow-glow'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                  {path === '/ai-assistant' && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-warm-400/20 text-warm-500 font-bold">AI</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 space-y-2 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="hidden lg:flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-elder-base font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 relative"
            >
              <Bell className="w-5 h-5" />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="ml-auto text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full bg-danger-400/20 text-danger-500">{unreadCount}</span>
              )}
            </button>
            <button
              onClick={toggle}
              className="hidden lg:flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-elder-base font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60"
            >
              {dark ? <Sun className="w-5 h-5 text-warm-400" /> : <Moon className="w-5 h-5" />}
              <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-elder-base font-medium text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/10"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 pt-16 lg:pt-0 min-h-screen">
        <div className="max-w-5xl mx-auto p-4 lg:p-8">
          {children}
        </div>
      </main>

      {/* Notifications Dropdown */}
      <NotificationDropdown
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onReadAll={() => {
          api.markAllNotificationsAsRead();
          setNotifications(notifications.map(n => ({ ...n, read: true })));
        }}
      />
    </div>
  );
}

function NotificationBell({ unreadCount, onClick }) {
  return (
    <button onClick={onClick} className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50">
      <Bell className="w-6 h-6 text-gray-700 dark:text-gray-300" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1.5 w-4 h-4 text-xs bg-danger-500 text-white rounded-full flex items-center justify-center font-bold">
          {unreadCount}
        </span>
      )}
    </button>
  );
}

function NotificationDropdown({ isOpen, onClose, notifications, onNotificationClick, onReadAll }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type) => {
    switch (type) {
      case 'missed_dose': return <AlertCircle className="w-5 h-5 text-danger-500" />;
      case 'refill_warning': return <Package className="w-5 h-5 text-warm-500" />;
      default: return <Bell className="w-5 h-5 text-brand-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        className="absolute top-16 right-4 lg:right-auto lg:left-72 lg:top-auto lg:bottom-24 w-80 max-h-[70vh] overflow-y-auto card !p-0 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
          {unreadCount > 0 && (
            <button onClick={onReadAll} className="text-sm font-medium text-brand-600 hover:text-brand-500">Mark all as read</button>
          )}
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {notifications.length === 0 ? (
            <p className="p-8 text-center text-gray-500">No notifications yet.</p>
          ) : (
            notifications.map(notif => (
              <div
                key={notif._id}
                onClick={() => onNotificationClick(notif)}
                className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 ${!notif.read ? 'bg-brand-50/50 dark:bg-brand-900/20' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getIcon(notif.type)}</div>
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                  </div>
                  {!notif.read && <div className="w-2.5 h-2.5 rounded-full bg-brand-500 mt-2 ml-auto flex-shrink-0" />}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-2 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => { onClose(); navigate('/notifications'); }}
            className="w-full text-center py-2 text-sm font-semibold text-brand-600 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-lg"
          >
            View all notifications
          </button>
        </div>
      </div>
    </div>
  );
}