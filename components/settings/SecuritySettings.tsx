'use client';

import { useState } from 'react';
import { Lock, Eye, EyeOff, Copy, Check, AlertTriangle } from 'lucide-react';
import { useAppSettings } from '@/store/appSettings';
import { hashPin, generateRecoveryCode } from '@/lib/crypto';

export default function SecuritySettings() {
  // Current PIN State
  const pinHash = useAppSettings((state) => state.security.pinHash);
  const isPinRequired = useAppSettings((state) => state.security.isPinRequired);
  const aiModeEnabled = useAppSettings((state) => state.security.aiModeEnabled);
  const aiModePinHash = useAppSettings((state) => state.security.aiModePinHash);
  
  const setPinHash = useAppSettings((state) => state.setPinHash);
  const setIsPinRequired = useAppSettings((state) => state.setIsPinRequired);
  const setAiModeEnabled = useAppSettings((state) => state.setAiModeEnabled);
  const setAiModePinHash = useAppSettings((state) => state.setAiModePinHash);

  // Local state
  const [tab, setTab] = useState<'dashboard' | 'ai'>('dashboard');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPins, setShowPins] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [copied, setCopied] = useState(false);

  const activePin = tab === 'dashboard' ? pinHash : aiModePinHash;
  const setPinFn = tab === 'dashboard' ? setPinHash : setAiModePinHash;

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validation
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setMessage({ type: 'error', text: 'PIN must be exactly 6 digits' });
      return;
    }

    if (newPin !== confirmPin) {
      setMessage({ type: 'error', text: 'PINs do not match' });
      return;
    }

    if (activePin && !currentPin) {
      setMessage({ type: 'error', text: 'Current PIN required to change PIN' });
      return;
    }

    setLoading(true);

    try {
      // Verify current PIN if one exists
      if (activePin) {
        const inputHash = await hashPin(currentPin);
        if (inputHash !== activePin) {
          setMessage({ type: 'error', text: 'Incorrect current PIN' });
          setLoading(false);
          return;
        }
      }

      // Hash new PIN
      const newHash = await hashPin(newPin);
      const code = generateRecoveryCode();

      setPinFn(newHash);
      setRecoveryCode(code);
      setShowRecovery(true);
      setMessage({
        type: 'success',
        text: `PIN ${activePin ? 'updated' : 'set'} successfully. Save your recovery code!`,
      });

      // Clear form
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to set PIN' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePin = async () => {
    if (!window.confirm('Remove PIN protection? Dashboard will be unlocked.')) return;

    setLoading(true);
    try {
      setPinFn(null);
      setMessage({ type: 'success', text: 'PIN removed' });
      setCurrentPin('');
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to remove PIN' });
    } finally {
      setLoading(false);
    }
  };

  const copyRecoveryCode = () => {
    navigator.clipboard.writeText(recoveryCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Lock size={24} className="text-[#D4A043]" />
        <div>
          <h2 className="text-xl font-bold text-[#F1F5F9]">Security Settings</h2>
          <p className="text-sm text-[#64748B]">Manage PIN protection and access modes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#1E293B]">
        <button
          onClick={() => setTab('dashboard')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            tab === 'dashboard'
              ? 'border-[#D4A043] text-[#D4A043]'
              : 'border-transparent text-[#64748B] hover:text-[#94A3B8]'
          }`}
        >
          Dashboard PIN
        </button>
        <button
          onClick={() => setTab('ai')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            tab === 'ai'
              ? 'border-[#D4A043] text-[#D4A043]'
              : 'border-transparent text-[#64748B] hover:text-[#94A3B8]'
          }`}
        >
          AI Mode PIN
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {tab === 'dashboard' && (
          <>
            {/* Status */}
            <div className={`p-4 rounded-lg border ${
              isPinRequired
                ? 'bg-green-500/5 border-green-500/20'
                : 'bg-amber-500/5 border-amber-500/20'
            }`}>
              <p className={`text-sm font-medium ${
                isPinRequired ? 'text-green-400' : 'text-amber-400'
              }`}>
                {isPinRequired ? '✓ PIN Protection Enabled' : '⚠ PIN Protection Disabled'}
              </p>
              <p className="text-xs text-[#94A3B8] mt-1">
                When enabled, dashboard requires 6-digit PIN on each session
              </p>
            </div>

            {/* PIN Form */}
            <form onSubmit={handleSetPin} className="space-y-4">
              {/* Current PIN */}
              {pinHash && (
                <div>
                  <label className="block text-sm font-medium text-[#F1F5F9] mb-2">
                    Current PIN
                  </label>
                  <div className="relative">
                    <input
                      type={showPins ? 'text' : 'password'}
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      placeholder="••••••"
                      maxLength={6}
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#1E293B] rounded-lg text-[#D4A043] placeholder-[#475569] focus:outline-none focus:border-[#D4A043] font-mono"
                      aria-label="Current PIN"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPins(!showPins)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]"
                      aria-label={showPins ? 'Hide PINs' : 'Show PINs'}
                    >
                      {showPins ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {/* New PIN */}
              <div>
                <label className="block text-sm font-medium text-[#F1F5F9] mb-2">
                  {pinHash ? 'New PIN' : 'Set PIN'}
                </label>
                <input
                  type={showPins ? 'text' : 'password'}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="••••••"
                  maxLength={6}
                  className="w-full px-4 py-2 bg-[#0D1117] border border-[#1E293B] rounded-lg text-[#D4A043] placeholder-[#475569] focus:outline-none focus:border-[#D4A043] font-mono"
                  aria-label="New PIN"
                />
              </div>

              {/* Confirm PIN */}
              <div>
                <label className="block text-sm font-medium text-[#F1F5F9] mb-2">
                  Confirm PIN
                </label>
                <input
                  type={showPins ? 'text' : 'password'}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="••••••"
                  maxLength={6}
                  className="w-full px-4 py-2 bg-[#0D1117] border border-[#1E293B] rounded-lg text-[#D4A043] placeholder-[#475569] focus:outline-none focus:border-[#D4A043] font-mono"
                  aria-label="Confirm PIN"
                />
              </div>

              {/* Messages */}
              {message && (
                <div
                  className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                    message.type === 'error'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-green-500/10 text-green-400 border border-green-500/20'
                  }`}
                >
                  {message.type === 'error' && <AlertTriangle size={16} />}
                  {message.text}
                </div>
              )}

              {/* Recovery Code Display */}
              {showRecovery && recoveryCode && (
                <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-purple-400">Recovery Code</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-[#0D1117] border border-purple-500/20 rounded font-mono text-sm text-[#D4A043]">
                      {recoveryCode}
                    </code>
                    <button
                      type="button"
                      onClick={copyRecoveryCode}
                      className="p-2 bg-[#111827] hover:bg-[#1E293B] border border-[#1E293B] rounded transition-colors"
                      aria-label="Copy recovery code"
                    >
                      {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} className="text-[#94A3B8]" />}
                    </button>
                  </div>
                  <p className="text-xs text-[#94A3B8]">Save this code. It can reset your PIN if locked out.</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={!!(loading || newPin.length !== 6 || confirmPin.length !== 6 || (pinHash && !currentPin))}
                  className="flex-1 py-2 bg-[#D4A043] hover:bg-[#E8B84F] text-[#07090F] font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : pinHash ? 'Update PIN' : 'Set PIN'}
                </button>
                {pinHash && (
                  <button
                    type="button"
                    onClick={handleRemovePin}
                    disabled={loading}
                    className="px-4 py-2 bg-[#1E293B] hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </form>

            {/* Toggle PIN Requirement */}
            {pinHash && (
              <div className="pt-4 border-t border-[#1E293B] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#F1F5F9]">Require PIN on Start</p>
                    <p className="text-xs text-[#64748B] mt-1">Ask for PIN when opening dashboard</p>
                  </div>
                  <button
                    onClick={() => setIsPinRequired(!isPinRequired)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isPinRequired
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-[#1E293B] text-[#94A3B8] border border-[#1E293B]'
                    }`}
                  >
                    {isPinRequired ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'ai' && (
          <>
            {/* AI Mode Status */}
            <div className={`p-4 rounded-lg border ${
              aiModeEnabled
                ? 'bg-blue-500/5 border-blue-500/20'
                : 'bg-slate-500/5 border-slate-500/20'
            }`}>
              <p className={`text-sm font-medium ${
                aiModeEnabled ? 'text-blue-400' : 'text-[#94A3B8]'
              }`}>
                {aiModeEnabled ? '✓ AI Mode Enabled' : '○ AI Mode Disabled'}
              </p>
              <p className="text-xs text-[#94A3B8] mt-1">
                AI Mode locks dashboard to read-only. Data sync and pulse checks continue.
              </p>
            </div>

            {/* AI Mode PIN Controls */}
            <form onSubmit={handleSetPin} className="space-y-4">
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg text-sm text-blue-400">
                Set a separate PIN for AI Mode to enable read-only access for coaching and data review.
              </div>

              {/* Current PIN */}
              {aiModePinHash && (
                <div>
                  <label className="block text-sm font-medium text-[#F1F5F9] mb-2">
                    Current AI PIN
                  </label>
                  <div className="relative">
                    <input
                      type={showPins ? 'text' : 'password'}
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      placeholder="••••••"
                      maxLength={6}
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#1E293B] rounded-lg text-[#D4A043] placeholder-[#475569] focus:outline-none focus:border-[#D4A043] font-mono"
                      aria-label="Current AI PIN"
                    />
                  </div>
                </div>
              )}

              {/* New PIN */}
              <div>
                <label className="block text-sm font-medium text-[#F1F5F9] mb-2">
                  {aiModePinHash ? 'New AI PIN' : 'Set AI PIN'}
                </label>
                <input
                  type={showPins ? 'text' : 'password'}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="••••••"
                  maxLength={6}
                  className="w-full px-4 py-2 bg-[#0D1117] border border-[#1E293B] rounded-lg text-[#D4A043] placeholder-[#475569] focus:outline-none focus:border-[#D4A043] font-mono"
                  aria-label="New AI PIN"
                />
              </div>

              {/* Confirm PIN */}
              <div>
                <label className="block text-sm font-medium text-[#F1F5F9] mb-2">
                  Confirm AI PIN
                </label>
                <input
                  type={showPins ? 'text' : 'password'}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="••••••"
                  maxLength={6}
                  className="w-full px-4 py-2 bg-[#0D1117] border border-[#1E293B] rounded-lg text-[#D4A043] placeholder-[#475569] focus:outline-none focus:border-[#D4A043] font-mono"
                  aria-label="Confirm AI PIN"
                />
              </div>

              {/* Messages */}
              {message && (
                <div
                  className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                    message.type === 'error'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-green-500/10 text-green-400 border border-green-500/20'
                  }`}
                >
                  {message.type === 'error' && <AlertTriangle size={16} />}
                  {message.text}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={!!(loading || newPin.length !== 6 || confirmPin.length !== 6 || (aiModePinHash && !currentPin))}
                  className="flex-1 py-2 bg-[#D4A043] hover:bg-[#E8B84F] text-[#07090F] font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : aiModePinHash ? 'Update AI PIN' : 'Set AI PIN'}
                </button>
                {aiModePinHash && (
                  <button
                    type="button"
                    onClick={handleRemovePin}
                    disabled={loading}
                    className="px-4 py-2 bg-[#1E293B] hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </form>

            {/* Toggle AI Mode */}
            {aiModePinHash && (
              <div className="pt-4 border-t border-[#1E293B] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#F1F5F9]">Enable AI Mode</p>
                    <p className="text-xs text-[#64748B] mt-1">Dashboard becomes read-only for coaching</p>
                  </div>
                  <button
                    onClick={() => setAiModeEnabled(!aiModeEnabled)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      aiModeEnabled
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-[#1E293B] text-[#94A3B8] border border-[#1E293B]'
                    }`}
                  >
                    {aiModeEnabled ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


