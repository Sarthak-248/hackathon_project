import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { BarChart3, TrendingUp, CheckCircle2, AlertTriangle, Clock, Award } from 'lucide-react';

export default function WeeklySummaryPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getWeeklySummary()
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
    </div>
  );

  if (!summary) return (
    <div className="card text-center py-16">
      <BarChart3 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
      <p className="text-gray-500 text-elder-lg">No data available yet</p>
    </div>
  );

  const { adherencePercent, taken, missed, pending, total, byMedicine, daily } = summary;
  const maxDayTotal = Math.max(...daily.map(d => d.total), 1);

  const getAdherenceColor = (pct) => {
    if (pct >= 90) return 'text-brand-500';
    if (pct >= 70) return 'text-warm-500';
    return 'text-danger-500';
  };

  const getAdherenceEmoji = (pct) => {
    if (pct >= 90) return '🌟';
    if (pct >= 70) return '💪';
    if (pct >= 50) return '📈';
    return '⚠️';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-brand-500" /> Weekly Report
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-elder-base mt-1">Last 7 days overview</p>
      </div>

      {/* Main Score Card */}
      <div className="card !p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-8 text-center text-white">
          <p className="text-brand-100 font-medium mb-2">Adherence Score</p>
          <div className="flex items-center justify-center gap-4">
            <span className="text-7xl font-bold">{adherencePercent}%</span>
            <span className="text-5xl">{getAdherenceEmoji(adherencePercent)}</span>
          </div>
          <p className="mt-3 text-brand-100 text-lg">
            {adherencePercent >= 90 ? 'Excellent! Keep it up!' :
             adherencePercent >= 70 ? 'Good progress! Stay consistent.' :
             'Room for improvement. Set reminders!'}
          </p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700">
          <div className="p-5 text-center">
            <CheckCircle2 className="w-6 h-6 text-brand-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{taken}</p>
            <p className="text-sm text-gray-500">Taken</p>
          </div>
          <div className="p-5 text-center">
            <AlertTriangle className="w-6 h-6 text-danger-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{missed}</p>
            <p className="text-sm text-gray-500">Missed</p>
          </div>
          <div className="p-5 text-center">
            <Clock className="w-6 h-6 text-warm-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{pending}</p>
            <p className="text-sm text-gray-500">Pending</p>
          </div>
        </div>
      </div>

      {/* Daily Bar Chart */}
      <div className="card">
        <h3 className="section-title mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-500" /> Daily Breakdown
        </h3>
        <div className="flex items-end justify-between gap-2 h-48">
          {daily.map((day, i) => {
            const takenH = day.total > 0 ? (day.taken / maxDayTotal) * 100 : 0;
            const missedH = day.total > 0 ? (day.missed / maxDayTotal) * 100 : 0;
            const isToday = i === daily.length - 1;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center" style={{ height: '160px', justifyContent: 'flex-end' }}>
                  {day.missed > 0 && (
                    <div className="w-full max-w-[40px] bg-danger-400/80 rounded-t-lg transition-all duration-500" 
                         style={{ height: `${missedH}%`, minHeight: day.missed > 0 ? '8px' : 0 }} 
                         title={`${day.missed} missed`} />
                  )}
                  <div className={`w-full max-w-[40px] rounded-t-lg transition-all duration-500 ${isToday ? 'bg-brand-500' : 'bg-brand-400/70'}`}
                       style={{ height: `${takenH}%`, minHeight: day.taken > 0 ? '8px' : 0, borderRadius: day.missed > 0 ? '0' : '8px 8px 0 0' }}
                       title={`${day.taken} taken`} />
                </div>
                <div className="text-center">
                  <p className={`text-xs font-bold ${isToday ? 'text-brand-500' : 'text-gray-400'}`}>{day.dayName}</p>
                  <p className="text-[10px] text-gray-400">{day.taken}/{day.total}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-3 h-3 rounded bg-brand-400" /> Taken
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-3 h-3 rounded bg-danger-400" /> Missed
          </div>
        </div>
      </div>

      {/* By Medicine */}
      <div className="card">
        <h3 className="section-title mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-brand-500" /> By Medicine
        </h3>
        <div className="space-y-4">
          {Object.entries(byMedicine).map(([name, data]) => {
            const pct = data.total > 0 ? Math.round((data.taken / data.total) * 100) : 0;
            return (
              <div key={name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900 dark:text-white text-elder-sm">{name}</span>
                  <span className={`font-bold ${getAdherenceColor(pct)}`}>{pct}%</span>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-500 transition-all duration-700"
                       style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{data.taken} taken · {data.missed} missed · {data.total} total</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
