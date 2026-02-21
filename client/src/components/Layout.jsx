import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard, Pill, BarChart3, Bot, LogOut,
  Sun, Moon, Menu, X, Shield, Bell, Heart
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          <button onClick={toggle} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50">
            {dark ? <Sun className="w-5 h-5 text-warm-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
          </button>
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
    </div>
  );
}
