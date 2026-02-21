import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Heart, Eye, EyeOff, Sun, Moon, ArrowRight, UserPlus, LogIn } from 'lucide-react';

export default function LoginPage() {
  const { login, register } = useAuth();
  const { dark, toggle } = useTheme();
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'elderly', caregiverPIN: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegister) {
        await register(form);
      } else {
        await login(form.email, form.password, form.caregiverPIN);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setForm(f => ({ ...f, email: 'demo@medicine.com', password: 'demo1234' }));
    setIsRegister(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#f4f7f5] dark:bg-[#0d1210]">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-300/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-warm-300/5 rounded-full blur-3xl" />
      </div>

      {/* Theme toggle */}
      <button onClick={toggle} className="absolute top-6 right-6 p-3 rounded-2xl glass hover:shadow-md transition-all z-10">
        {dark ? <Sun className="w-5 h-5 text-warm-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
      </button>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow mb-4">
            <Heart className="w-10 h-10 text-white" fill="white" />
          </div>
          <h1 className="font-display text-elder-3xl text-gray-900 dark:text-white mb-1">MediCare</h1>
          <p className="text-elder-base text-gray-500 dark:text-gray-400">Your Medicine Companion</p>
        </div>

        {/* Card */}
        <div className="card !p-8">
          <h2 className="font-display text-elder-xl text-gray-900 dark:text-white mb-6 text-center">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>

          {error && (
            <div className="mb-4 p-4 rounded-2xl bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/20 text-danger-600 dark:text-danger-400 text-elder-sm animate-scale-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Full Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter your name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="your@email.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            {!isRegister && (
              <div>
                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Caregiver PIN</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Enter 4-digit PIN"
                  value={form.caregiverPIN}
                  onChange={e => setForm(f => ({ ...f, caregiverPIN: e.target.value }))}
                  maxLength="4"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field !pr-12"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['elderly', 'caregiver'].map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, role }))}
                        className={`p-3 rounded-2xl border-2 text-center font-semibold capitalize transition-all ${
                          form.role === role
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                            : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {role === 'elderly' ? '👴 Elderly' : '👨‍⚕️ Caregiver'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    Caregiver PIN (4 digits)
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Enter 4-digit PIN"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    value={form.caregiverPIN}
                    onChange={e => setForm(f => ({ ...f, caregiverPIN: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">This PIN protects edit/delete actions</p>
                </div>
              </>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isRegister ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                  {isRegister ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-brand-600 dark:text-brand-400 font-semibold text-elder-sm hover:underline"
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>

            {!isRegister && (
              <div>
                <button onClick={fillDemo} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline">
                  Use Demo Account
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          Medicine Companion — Safe & Simple Medication Tracking
        </p>
      </div>
    </div>
  );
}
