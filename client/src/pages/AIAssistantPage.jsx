import React, { useState } from 'react';
import { api } from '../utils/api';
import { Bot, Send, Sparkles, AlertTriangle, CheckCircle2, Clock, Shield, Info, Loader2, ThumbsUp, X } from 'lucide-react';

export default function AIAssistantPage() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const suggestions = [
    'I have BP and diabetes medicines. Make a simple schedule.',
    'I take thyroid and cholesterol medicines. Suggest timing.',
    'I have heart medicine and blood pressure medicine.',
    'I need a schedule for diabetes, acid reflux and vitamins.',
  ];

  const handleSubmit = async (text) => {
    const query = text || input;
    if (!query.trim()) return;
    setLoading(true); setError(''); setResult(null); setSaved(false);
    try {
      const data = await api.suggestSchedule(query);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAndSave = async () => {
    if (!result?.schedule) return;
    setSaved(false);
    try {
      const allMeds = [
        ...result.schedule.morning || [],
        ...result.schedule.afternoon || [],
        ...result.schedule.evening || [],
        ...result.schedule.beforeBed || [],
      ];
      for (const med of allMeds) {
        const [hourStr, minuteStr] = (med.time !== 'As needed' ? med.time : '08:00').split(':');
        const hour = parseInt(hourStr, 10);
        const period = hour < 12 ? 'AM' : 'PM';
        const time12hr = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const formattedTime = `${String(time12hr).padStart(2, '0')}:${minuteStr}`;

        await api.addMedicine({
          name: med.name,
          dosage: med.dosage || '1 tablet',
          frequency: 'daily',
          timeSlots: [{ time: formattedTime, period }],
          category: med.category || '',
          pillsRemaining: 30, // Default
          precautions: result.precautions?.find(p => p.category === med.category)?.precaution || '',
        });
      }
      setSaved(true);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-3">
          <Bot className="w-8 h-8 text-purple-500" /> AI Assistant
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-elder-base mt-1">
          Describe your medicines and get a smart schedule
        </p>
      </div>

      {/* Disclaimer */}
      <div className="card !bg-blue-50 dark:!bg-blue-900/20 !border-blue-200 dark:!border-blue-800/30">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-700 dark:text-blue-300 text-sm">AI Safety Notice</p>
            <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
              This AI provides informational suggestions only. It does not prescribe medicines or provide medical diagnosis. 
              Always consult your doctor before making any changes to your medication.
            </p>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="card">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">
          Tell me about your medicines or conditions
        </label>
        <textarea
          className="input-field min-h-[100px] resize-none mb-4"
          placeholder="Example: I have BP and diabetes medicines. Make a simple schedule with precautions."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
        />
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => { setInput(s); handleSubmit(s); }}
              className="text-xs px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors border border-purple-200 dark:border-purple-800/30">
              {s}
            </button>
          ))}
        </div>
        <button onClick={() => handleSubmit()} disabled={loading || !input.trim()} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-5 h-5" /> Generate Schedule</>}
        </button>
      </div>

      {error && (
        <div className="card !bg-danger-50 dark:!bg-danger-500/10 !border-danger-200 dark:!border-danger-500/20">
          <p className="text-danger-600 dark:text-danger-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-slide-up">
          {!result.success ? (
            <div className="card">
              <p className="text-gray-600 dark:text-gray-300 text-elder-base">{result.message}</p>
              <p className="text-sm text-gray-400 mt-3">{result.disclaimer}</p>
            </div>
          ) : (
            <>
              {/* Detected Categories */}
              <div className="card">
                <h3 className="section-title mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-500" /> Detected Conditions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.detectedCategories?.map((cat, i) => (
                    <span key={i} className="badge-green">{cat}</span>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div className="card">
                <h3 className="section-title mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-brand-500" /> Suggested Schedule
                </h3>
                {Object.entries(result.schedule).map(([period, meds]) => {
                  if (!meds || meds.length === 0) return null;
                  const emoji = { morning: '🌅', afternoon: '☀️', evening: '🌙', beforeBed: '😴' }[period] || '⏰';
                  return (
                    <div key={period} className="mb-4 last:mb-0">
                      <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <span>{emoji}</span> {period.replace(/([A-Z])/g, ' $1')}
                      </h4>
                      {meds.map((med, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 mb-2 last:mb-0">
                          <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                            <span className="text-lg">💊</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 dark:text-white">{med.name}</p>
                            <p className="text-sm text-gray-500">{med.dosage} · {med.time}</p>
                            {med.note && <p className="text-xs text-gray-400 mt-0.5">{med.note}</p>}
                          </div>
                          <span className="badge bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 text-xs">{med.category}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Reasoning */}
              <div className="card">
                <h3 className="section-title mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" /> Why This Schedule?
                </h3>
                <ul className="space-y-2">
                  {result.reasoning?.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-600 dark:text-gray-300 text-elder-sm">
                      <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0 mt-1" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Precautions */}
              <div className="card">
                <h3 className="section-title mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warm-500" /> Precautions
                </h3>
                <div className="space-y-3">
                  {result.precautions?.map((p, i) => (
                    <div key={i} className="p-3 rounded-xl bg-warm-50 dark:bg-warm-500/10 border border-warm-200/50 dark:border-warm-500/20">
                      <p className="font-semibold text-warm-700 dark:text-warm-300 text-sm">{p.category}</p>
                      <p className="text-warm-600 dark:text-warm-400 text-xs mt-1">{p.precaution}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interactions */}
              <div className="card">
                <h3 className="section-title mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-danger-500" /> Interaction Check
                </h3>
                {result.interactions?.map((w, i) => (
                  <p key={i} className="text-sm text-gray-600 dark:text-gray-300 mb-2">{w}</p>
                ))}
                {result.interactionWarning && (
                  <div className="mt-3 p-3 rounded-xl bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/20">
                    <p className="text-danger-600 dark:text-danger-400 font-semibold text-sm">{result.interactionWarning}</p>
                  </div>
                )}
              </div>

              {/* Disclaimer */}
              <div className="card !bg-gray-50 dark:!bg-gray-800/50 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{result.disclaimer}</p>
              </div>

              {/* Save Button */}
              {!saved ? (
                <button onClick={handleApproveAndSave} className="btn-primary w-full flex items-center justify-center gap-2 !py-4">
                  <ThumbsUp className="w-5 h-5" /> Approve & Save to My Medicines
                </button>
              ) : (
                <div className="card !bg-brand-50 dark:!bg-brand-900/20 !border-brand-200 dark:!border-brand-700/30 text-center">
                  <CheckCircle2 className="w-10 h-10 text-brand-500 mx-auto mb-2" />
                  <p className="font-semibold text-brand-700 dark:text-brand-300 text-elder-base">Schedule Saved!</p>
                  <p className="text-brand-600 dark:text-brand-400 text-sm mt-1">Medicines have been added to your dashboard.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
