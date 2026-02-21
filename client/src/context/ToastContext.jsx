import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertTriangle, Bell, Pill, Package, Info, AlertCircle } from 'lucide-react';

const ToastContext = createContext(null);

const TOAST_CONFIG = {
  success:  { icon: CheckCircle2, bg: 'bg-brand-50 dark:bg-brand-900/30', border: 'border-brand-300 dark:border-brand-700', iconColor: 'text-brand-500', bar: 'bg-brand-500' },
  error:    { icon: AlertCircle,  bg: 'bg-danger-50 dark:bg-red-900/30', border: 'border-danger-400 dark:border-red-700', iconColor: 'text-danger-500', bar: 'bg-danger-500' },
  warning:  { icon: AlertTriangle, bg: 'bg-warm-50 dark:bg-amber-900/30', border: 'border-warm-300 dark:border-amber-700', iconColor: 'text-warm-500', bar: 'bg-warm-500' },
  info:     { icon: Info,         bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-300 dark:border-blue-700', iconColor: 'text-blue-500', bar: 'bg-blue-500' },
  reminder: { icon: Bell,         bg: 'bg-purple-50 dark:bg-purple-900/30', border: 'border-purple-300 dark:border-purple-700', iconColor: 'text-purple-500', bar: 'bg-purple-500' },
  refill:   { icon: Package,      bg: 'bg-warm-50 dark:bg-amber-900/30', border: 'border-warm-300 dark:border-amber-700', iconColor: 'text-warm-500', bar: 'bg-warm-500' },
  pill:     { icon: Pill,         bg: 'bg-brand-50 dark:bg-brand-900/30', border: 'border-brand-300 dark:border-brand-700', iconColor: 'text-brand-600', bar: 'bg-brand-600' },
};

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = ++_id;
    setToasts(prev => [...prev.slice(-4), { id, message, type, duration, at: Date.now() }]);
    if (duration > 0) setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const cfg = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
          const Icon = cfg.icon;
          return (
            <div key={toast.id}
              className={`pointer-events-auto animate-slide-in-right ${cfg.bg} border ${cfg.border} rounded-2xl shadow-lg overflow-hidden cursor-pointer transition-all hover:shadow-xl`}
              onClick={() => removeToast(toast.id)}>
              <div className="flex items-start gap-3 p-4 pb-3">
                <div className={`flex-shrink-0 mt-0.5 ${cfg.iconColor}`}><Icon className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug">{toast.message}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                    {new Date(toast.at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })} · tap to dismiss
                  </p>
                </div>
                <button onClick={e => { e.stopPropagation(); removeToast(toast.id); }}
                  className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              {toast.duration > 0 && (
                <div className="h-1 w-full bg-gray-100 dark:bg-gray-700/50">
                  <div className={`h-full ${cfg.bar} opacity-60`}
                    style={{ animation: `toast-progress ${toast.duration}ms linear forwards` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
