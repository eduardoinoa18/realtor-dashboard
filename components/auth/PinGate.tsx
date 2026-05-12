'use client';

import { useState, useEffect } from 'react';
import { Lock, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useAppSettings } from '@/store/appSettings';
import { hashPin } from '@/lib/crypto';

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockoutTime, setLockoutTime] = useState(0);
  const [unlocked, setUnlocked] = useState(false);

  const pinHash = useAppSettings((state) => state.security.pinHash);
  const pinAttempts = useAppSettings((state) => state.pinAttempts);
  const setPinAttempts = useAppSettings((state) => state.setPinAttempts);
  const isPinRequired = useAppSettings((state) => state.security.isPinRequired);

  // Handle lockout timer
  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setTimeout(() => setLockoutTime(lockoutTime - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [lockoutTime]);

  // Skip PIN gate if not required or already unlocked
  if (!isPinRequired || unlocked) {
    return <>{children}</>;
  }

  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 300; // 5 minutes
  const isLockedOut = pinAttempts >= MAX_ATTEMPTS && lockoutTime > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut || isLoading) return;

    setError('');
    setIsLoading(true);

    try {
      if (!pinHash) {
        setError('PIN not configured');
        return;
      }

      const inputHash = await hashPin(pinInput);
      if (inputHash === pinHash) {
        setUnlocked(true);
        setPinAttempts(0);
        // Mark as unlocked in session storage (persists until page reload)
        sessionStorage.setItem('pin_unlocked_at', new Date().toISOString());
      } else {
        const newAttempts = pinAttempts + 1;
        setPinAttempts(newAttempts);
        
        if (newAttempts >= MAX_ATTEMPTS) {
          setLockoutTime(LOCKOUT_DURATION);
          setError(`Too many attempts. Locked for ${LOCKOUT_DURATION} seconds.`);
        } else {
          setError(`Incorrect PIN. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
        }
        setPinInput('');
      }
    } catch (err) {
      setError('PIN verification failed');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#07090F]/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <div className="bg-[#111827] rounded-lg border border-[#1E293B] p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1E293B]">
              <Lock size={24} className="text-[#D4A043]" />
            </div>
            <h1 className="text-2xl font-bold text-[#F1F5F9]">Enter PIN</h1>
            <p className="text-sm text-[#94A3B8]">Dashboard access requires PIN verification</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* PIN Input */}
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="••••••"
                maxLength={6}
                disabled={isLockedOut || isLoading}
                className="w-full px-4 py-3 bg-[#0D1117] border border-[#1E293B] rounded-lg text-center text-2xl font-mono tracking-widest text-[#D4A043] placeholder-[#475569] focus:outline-none focus:border-[#D4A043] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="PIN"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                disabled={isLockedOut || isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#94A3B8] disabled:opacity-50"
                aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Error State */}
            {error && (
              <div className={`p-3 rounded-lg flex gap-2 items-start text-sm ${
                isLockedOut
                  ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                  : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
              }`}>
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={pinInput.length !== 6 || isLockedOut || isLoading}
              className="w-full py-3 bg-[#D4A043] hover:bg-[#E8B84F] text-[#07090F] font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : isLockedOut ? `Locked (${lockoutTime}s)` : 'Unlock'}
            </button>
          </form>

          {/* Info */}
          <div className="pt-4 border-t border-[#1E293B] text-xs text-[#64748B] text-center">
            <p>6-digit PIN required for dashboard access</p>
            <p className="mt-1">PIN is encrypted and never logged</p>
          </div>
        </div>
      </div>
    </div>
  );
}





