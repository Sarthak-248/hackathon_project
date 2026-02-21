import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';
import {
  Bell, BellOff, CheckCircle2, AlertTriangle, AlertCircle, Clock, Package,
  Pill, Flame, Sparkles, Trash2, CheckCheck, Filter, RefreshCw, Info
} from 'lucide-react';

const TYPE_CONFIG = {
  missed_dose:       { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Missed Dose' },
  refill_urgent:     { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Urgent Refill' },
  refill_warning:    { icon: Package, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', label: 'Refill Due' },
  low_stock:         { icon: Package, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', label: 'Low Stock' },
  dose_taken:        { icon: CheckCircle2, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20', label: 'Dose Taken' },
  all_done:          { icon: Sparkles, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20', label: 'Complete' },
  streak:            { icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', label: 'Streak' },
  welcome:           { icon: Bell, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'Welcome' },
  schedule_reminder: { icon: Clock, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', label: 'Reminder' },
  interaction_warning: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Interaction' },
  info:              { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'Info' },
};

const SEVERITY_BADGE = {
  error:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  success: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
  info:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
};

export default function NotificationsPage() {
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, error, warning, success

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Generate smart notifications first, then fetch all
      const data = await api.generateNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      if (data.generated > 0) {
        addToast(`${data.generated} new notification${data.generated > 1 ? 's' : ''} generated`, 'info', 3000);
      }
    } catch (err) {
      // If generate fails, just fetch existing
      try {
        const data = await api.getNotifications();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } catch {
        addToast('Failed to load notifications', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { addToast('Failed to update', 'error'); }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      addToast('All notifications marked as read', 'success', 3000);
    } catch { addToast('Failed to update', 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      addToast('Notification dismissed', 'info', 2000);
    } catch { addToast('Failed to delete', 'error'); }
  };

  const handleClearRead = async () => {
    try {
      const data = await api.clearReadNotifications();
      setNotifications(prev => prev.filter(n => !n.read));
      addToast(`Cleared ${data.deleted} read notifications`, 'success', 3000);
    } catch { addToast('Failed to clear', 'error'); }
  };

  const filteredNotifs = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'error') return n.severity === 'error';
    if (filter === 'warning') return n.severity === 'warning';
    if (filter === 'success') return n.severity === 'success';
    return true;
  });

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMin = Math.floor((now - d) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return 'Yesterday';
    return `${diffDay}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-elder-base">Scanning for notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Bell className="w-8 h-8 text-brand-500" /> Notifications
            {unreadCount > 0 && (
              <span className="bg-danger-500 text-white text-sm font-bold px-2.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-elder-base mt-1">
            Smart alerts for your medicine schedule
          </p>
        </div>
        <button onClick={loadNotifications} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <RefreshCw className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead}
            className="flex items-center gap-2 text-sm font-semibold text-brand-600 dark:text-brand-400 px-4 py-2 rounded-xl bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
        {notifications.some(n => n.read) && (
          <button onClick={handleClearRead}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <Trash2 className="w-4 h-4" /> Clear read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All', count: notifications.length },
          { id: 'unread', label: 'Unread', count: unreadCount },
          { id: 'error', label: '🚨 Urgent', count: notifications.filter(n => n.severity === 'error').length },
          { id: 'warning', label: '⚠️ Warnings', count: notifications.filter(n => n.severity === 'warning').length },
          { id: 'success', label: '✅ Good News', count: notifications.filter(n => n.severity === 'success').length },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              filter === f.id
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}>
            {f.label}
            {f.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                filter === f.id ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
              }`}>{f.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {filteredNotifs.length === 0 ? (
        <div className="card text-center py-16">
          <BellOff className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-elder-lg font-semibold">
            {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
            Notifications appear when doses are missed, stock runs low, or milestones are hit.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifs.map((notif) => {
            const typeCfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
            const TypeIcon = typeCfg.icon;
            return (
              <div key={notif._id}
                className={`card !p-0 overflow-hidden transition-all ${!notif.read ? 'ring-2 ring-brand-200 dark:ring-brand-700/50' : 'opacity-75'}`}>
                <div className="flex items-start gap-4 p-4">
                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-xl ${typeCfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <TypeIcon className={`w-5 h-5 ${typeCfg.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-elder-sm leading-snug">
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="inline-block w-2 h-2 bg-brand-500 rounded-full ml-2 align-middle" />
                        )}
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
                        {formatTime(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${SEVERITY_BADGE[notif.severity] || SEVERITY_BADGE.info}`}>
                        {notif.severity}
                      </span>
                      <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                        {typeCfg.label}
                      </span>
                      {notif.medicineId && (
                        <span className="text-xs text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Pill className="w-3 h-3" /> {notif.medicineId.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex border-t border-gray-100 dark:border-gray-700/50">
                  {!notif.read && (
                    <button onClick={() => handleMarkRead(notif._id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-colors">
                      <CheckCircle2 className="w-4 h-4" /> Mark Read
                    </button>
                  )}
                  <button onClick={() => handleDelete(notif._id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-danger-500 transition-colors">
                    <Trash2 className="w-4 h-4" /> Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
