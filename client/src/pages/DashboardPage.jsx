import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import {
  requestNotificationPermission, sendNotification, scheduleReminder, cacheData, getCachedData
} from '../utils/notifications';
import {
  Clock, CheckCircle2, AlertTriangle, Bell, Pill, BarChart3, Bot,
  Sparkles, RefreshCw, ChevronRight, AlertCircle, Package
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [doseLogs, setDoseLogs] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [refillAlerts, setRefillAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    requestNotificationPermission();
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Generate today's logs first
      await api.generateLogs().catch(() => {});

      const [logsData, medsData, refillData] = await Promise.all([
        api.getTodayLogs(),
        api.getMedicines(),
        api.getRefillAlerts()
      ]);

      setDoseLogs(logsData);
      setMedicines(medsData);
      setRefillAlerts(refillData);

      // Cache for offline
      cacheData('doseLogs', logsData);
      cacheData('medicines', medsData);

      // Schedule browser notifications
      medsData.forEach(med => {
        (med.timeSlots || []).forEach(slot => scheduleReminder(med, slot));
      });
    } catch (err) {
      // Try offline cache
      const cached = getCachedData('doseLogs');
      if (cached) setDoseLogs(cached);
      const cachedMeds = getCachedData('medicines');
      if (cachedMeds) setMedicines(cachedMeds);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeDose = async (logId) => {
    try {
      const updated = await api.markDoseTaken(logId);
      setDoseLogs(prev => prev.map(l => l._id === logId ? updated : l));
      sendNotification('✅ Dose Recorded', `Great job! Keep it up!`);
    } catch (err) {
      console.error(err);
    }
  };

  const now = new Date();
  const totalToday = doseLogs.length;
  const takenToday = doseLogs.filter(l => l.taken).length;
  const missedToday = doseLogs.filter(l => l.missed).length;
  const pendingToday = totalToday - takenToday - missedToday;
  const progressPercent = totalToday > 0 ? Math.round((takenToday / totalToday) * 100) : 0;

  // Group logs by time period
  const groupedLogs = {
    morning: doseLogs.filter(l => { const h = new Date(l.scheduledTime).getHours(); return h >= 5 && h < 12; }),
    afternoon: doseLogs.filter(l => { const h = new Date(l.scheduledTime).getHours(); return h >= 12 && h < 17; }),
    evening: doseLogs.filter(l => { const h = new Date(l.scheduledTime).getHours(); return h >= 17 || h < 5; }),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-elder-base">Loading your schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-gray-500 dark:text-gray-400 text-elder-base mt-1">
            {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={loadData} className="btn-ghost flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Progress Card */}
      <div className="card !p-0 overflow-hidden bg-gradient-to-r from-brand-500 to-brand-600 !border-0">
        <div className="p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-brand-100 text-sm font-medium">Today's Progress</p>
              <p className="text-4xl font-bold mt-1">{progressPercent}%</p>
            </div>
            <div className="w-20 h-20 relative">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${progressPercent}, 100`} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Pill className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/15 rounded-2xl p-3 text-center backdrop-blur-sm">
              <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-green-200" />
              <p className="text-2xl font-bold">{takenToday}</p>
              <p className="text-xs text-brand-100">Taken</p>
            </div>
            <div className="bg-white/15 rounded-2xl p-3 text-center backdrop-blur-sm">
              <Clock className="w-5 h-5 mx-auto mb-1 text-yellow-200" />
              <p className="text-2xl font-bold">{pendingToday}</p>
              <p className="text-xs text-brand-100">Pending</p>
            </div>
            <div className="bg-white/15 rounded-2xl p-3 text-center backdrop-blur-sm">
              <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-red-200" />
              <p className="text-2xl font-bold">{missedToday}</p>
              <p className="text-xs text-brand-100">Missed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Refill Alerts */}
      {refillAlerts.length > 0 && (
        <div className="card !bg-warm-50 dark:!bg-warm-500/10 !border-warm-200 dark:!border-warm-500/20 shadow-glow-warm">
          <div className="flex items-start gap-3">
            <Package className="w-6 h-6 text-warm-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-warm-700 dark:text-warm-400 text-elder-base">Refill Needed Soon</h3>
              {refillAlerts.map((alert, i) => (
                <p key={i} className="text-warm-600 dark:text-warm-300 text-sm mt-1">
                  <span className="font-bold">{alert.medicine.name}</span> — {alert.daysLeft <= 0 ? 'Overdue!' : `${alert.daysLeft} days left`}
                  {alert.medicine.pillsRemaining !== undefined && ` (${alert.medicine.pillsRemaining} pills remaining)`}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Today's Schedule */}
      <div>
        <h2 className="section-title mb-4 flex items-center gap-2">
          <Clock className="w-6 h-6 text-brand-500" />
          Today's Schedule
        </h2>

        {doseLogs.length === 0 ? (
          <div className="card text-center py-12">
            <Pill className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-elder-base">No medicines scheduled today</p>
            <Link to="/medicines" className="btn-primary inline-flex items-center gap-2 mt-4">
              <Pill className="w-5 h-5" /> Add Medicine
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedLogs).map(([period, logs]) => {
              if (logs.length === 0) return null;
              const emoji = period === 'morning' ? '🌅' : period === 'afternoon' ? '☀️' : '🌙';
              return (
                <div key={period}>
                  <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span>{emoji}</span> {period}
                  </h3>
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <DoseCard key={log._id} log={log} onTake={handleTakeDose} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link to="/medicines" className="card flex items-center gap-4 !p-4 group">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Pill className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-white">Medicines</p>
            <p className="text-sm text-gray-500">{medicines.length} active</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300" />
        </Link>

        <Link to="/summary" className="card flex items-center gap-4 !p-4 group">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-white">Weekly Report</p>
            <p className="text-sm text-gray-500">View adherence</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300" />
        </Link>

        <Link to="/ai-assistant" className="card flex items-center gap-4 !p-4 group">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Bot className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-white">AI Assistant</p>
            <p className="text-sm text-gray-500">Get suggestions</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300" />
        </Link>
      </div>
    </div>
  );
}

function DoseCard({ log, onTake }) {
  const med = log.medicineId;
  const time = new Date(log.scheduledTime);
  const timeStr = time.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  const isPast = time < new Date();

  let status, statusColor, statusBg;
  if (log.taken) {
    status = 'Taken';
    statusColor = 'text-brand-600 dark:text-brand-400';
    statusBg = 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-700/30';
  } else if (log.missed) {
    status = 'Missed';
    statusColor = 'text-danger-500';
    statusBg = 'bg-danger-50 dark:bg-danger-500/10 border-danger-200 dark:border-danger-500/20';
  } else if (isPast) {
    status = 'Overdue';
    statusColor = 'text-warm-500';
    statusBg = 'bg-warm-50 dark:bg-warm-500/10 border-warm-200 dark:border-warm-500/20';
  } else {
    status = 'Upcoming';
    statusColor = 'text-gray-500 dark:text-gray-400';
    statusBg = 'bg-white dark:bg-gray-800/80 border-gray-200 dark:border-gray-700';
  }

  return (
    <div className={`rounded-2xl border p-4 flex items-center gap-4 transition-all ${statusBg}`}>
      <div className="flex-shrink-0">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
          log.taken ? 'bg-brand-500' : log.missed ? 'bg-danger-400' : 'bg-gray-200 dark:bg-gray-600'
        }`}>
          {log.taken ? <CheckCircle2 className="w-6 h-6 text-white" /> : 
           log.missed ? <AlertTriangle className="w-6 h-6 text-white" /> :
           <Pill className="w-6 h-6 text-gray-500 dark:text-gray-300" />}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white text-elder-base">{med?.name || 'Unknown'}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {med?.dosage} · {timeStr}
        </p>
        {med?.precautions && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{med.precautions}</p>
        )}
      </div>

      <div className="flex-shrink-0 text-right">
        {!log.taken && !log.missed ? (
          <button
            onClick={() => onTake(log._id)}
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all active:scale-95 shadow-sm"
          >
            Take ✓
          </button>
        ) : (
          <span className={`badge ${log.taken ? 'badge-green' : 'badge-red'}`}>{status}</span>
        )}
      </div>
    </div>
  );
}
