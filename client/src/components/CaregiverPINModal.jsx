import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, X, Lock } from 'lucide-react';

export default function CaregiverPINModal({ isOpen, onClose, onVerified, action = 'perform this action' }) {
  const { verifyPIN, caregiverVerified } = useAuth();
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', '']);
      setError('');
      setTimeout(() => inputRefs[0].current?.focus(), 100);
    }
  }, [isOpen]);

  // If already verified, skip modal
  useEffect(() => {
    if (isOpen && caregiverVerified) {
      onVerified();
      onClose();
    }
  }, [isOpen, caregiverVerified]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    if (value && index < 3) inputRefs[index + 1].current?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleSubmit = async () => {
    const fullPIN = pin.join('');
    if (fullPIN.length !== 4) { setError('Enter all 4 digits'); return; }
    setLoading(true);
    setError('');
    try {
      await verifyPIN(fullPIN);
      onVerified();
      onClose();
    } catch (err) {
      setError('Invalid PIN. Try again.');
      setPin(['', '', '', '']);
      inputRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || caregiverVerified) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="card !p-8 w-full max-w-sm text-center animate-scale-in relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50">
          <X className="w-5 h-5 text-gray-400" />
        </button>

        <div className="w-16 h-16 rounded-2xl bg-warm-100 dark:bg-warm-500/20 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-warm-500" />
        </div>

        <h3 className="font-display text-elder-xl text-gray-900 dark:text-white mb-2">Caregiver Verification</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-elder-sm">
          Enter your 4-digit PIN to {action}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-danger-50 dark:bg-danger-500/10 text-danger-500 text-sm font-medium animate-scale-in">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-center mb-6">
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className="w-14 h-16 text-center text-2xl font-bold rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-gray-900 dark:text-white transition-all"
            />
          ))}
        </div>

        <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Lock className="w-5 h-5" />
              Verify & Continue
            </>
          )}
        </button>

        <p className="text-xs text-gray-400 mt-4">
          PIN verification expires after 5 minutes
        </p>
      </div>
    </div>
  );
}
