'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Mail } from 'lucide-react';

const MAGIC_LINK_COOLDOWN_KEY = 'edu_magic_link_cooldown_until';

function extractCooldownSeconds(errorMessage: string) {
  const match = errorMessage.match(/(\d+)\s*second/i);
  if (match?.[1]) {
    return Math.max(15, Number(match[1]));
  }
  return 60;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [accessPin, setAccessPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [instantLoading, setInstantLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success'>('success');
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [nowTs, setNowTs] = useState(Date.now());

  const cooldownRemaining = Math.max(0, Math.ceil((cooldownUntil - nowTs) / 1000));
  const isCooldownActive = cooldownRemaining > 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const errorCode = params.get('error_code');
    const reset = params.get('reset');

    if (reset === '1') {
      localStorage.removeItem(MAGIC_LINK_COOLDOWN_KEY);
      setCooldownUntil(0);
      setNowTs(Date.now());
      setMessage('Login session reset. Request a fresh magic link below.');
      setMessageType('success');
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('reset');
      window.history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search);
      return;
    }

    if (!error) return;

    const normalized = decodeURIComponent(error).replaceAll('_', ' ').trim();
    const normalizedCode = decodeURIComponent(String(errorCode || '')).replaceAll('_', ' ').trim().toLowerCase();

    const text = normalized === 'missing_code'
      ? 'Login link is invalid or expired. Please request a new one.'
      : normalizedCode === 'otp expired'
        ? 'This login link already expired. Request a fresh magic link below.'
      : normalized.toLowerCase().includes('rate limit')
        ? 'Email rate limit exceeded. Wait for cooldown, or use your latest unexpired link. You can also reset login session below.'
      : `Login error: ${normalized}`;
    setMessage(text);
    setMessageType('error');
  }, []);

  useEffect(() => {
    const stored = Number(localStorage.getItem(MAGIC_LINK_COOLDOWN_KEY) || '0');
    if (Number.isFinite(stored) && stored > Date.now()) {
      setCooldownUntil(stored);
    }
  }, []);

  useEffect(() => {
    if (!isCooldownActive) return;
    const interval = window.setInterval(() => {
      setNowTs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isCooldownActive]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCooldownActive) {
      setMessage(`Email rate limit is active. Wait ${cooldownRemaining}s and try again.`);
      setMessageType('error');
      return;
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setMessage('Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
    const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const redirectBase = runtimeOrigin || appUrl;
    if (!redirectBase) {
      setMessage('Missing app URL configuration. Set NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL.');
      setMessageType('error');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const nextPath = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('next') || '/today'
      : '/today';

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${redirectBase}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (error) {
      const normalizedError = String(error.message || '').toLowerCase();
      if (normalizedError.includes('rate limit')) {
        const seconds = extractCooldownSeconds(error.message || '');
        const until = Date.now() + seconds * 1000;
        localStorage.setItem(MAGIC_LINK_COOLDOWN_KEY, String(until));
        setCooldownUntil(until);
        setNowTs(Date.now());
        setMessage(`Email rate limit exceeded. Wait ${seconds}s, then request a new magic link. If stuck, use Reset Login Session below.`);
      } else {
        setMessage(`Error: ${error.message}`);
      }
      setMessageType('error');
    } else {
      const until = Date.now() + 60 * 1000;
      localStorage.setItem(MAGIC_LINK_COOLDOWN_KEY, String(until));
      setCooldownUntil(until);
      setNowTs(Date.now());
      setMessage('Check your email for a login link!');
      setMessageType('success');
      setEmail('');
    }
    setLoading(false);
  };

  const handleInstantAccess = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessage('Enter your email first.');
      setMessageType('error');
      return;
    }

    if (!accessPin.trim()) {
      setMessage('Enter your access PIN.');
      setMessageType('error');
      return;
    }

    setInstantLoading(true);
    try {
      const nextPath = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('next') || '/today'
        : '/today';

      const response = await fetch('/api/auth/instant-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, pin: accessPin.trim(), next: nextPath }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(`Instant link failed: ${data?.error || 'Unknown error'}`);
        setMessageType('error');
        return;
      }

      if (!data?.actionLink) {
        setMessage('Instant link was empty. Try again in a few seconds.');
        setMessageType('error');
        return;
      }

      window.location.href = data.actionLink;
    } catch (err: any) {
      setMessage(`Instant link request failed: ${String(err?.message || err)}`);
      setMessageType('error');
    } finally {
      setInstantLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090F] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#D4A043] mb-2">Realtor HQ</h1>
          <p className="text-[#94A3B8]">Eduardo Inoa&apos;s Real Estate Command Center</p>
        </div>

        <form onSubmit={handleSignIn} className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#F1F5F9] mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="eduardoinoa18@gmail.com"
              className="w-full px-4 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#D4A043]"
              required
            />
            <p className="mt-2 text-xs text-[#94A3B8]">
              Fast login: use your email + access PIN. Magic link remains available as backup.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#F1F5F9] mb-2">
              Access PIN
            </label>
            <input
              type="password"
              value={accessPin}
              onChange={(e) => setAccessPin(e.target.value)}
              placeholder="Enter access PIN"
              className="w-full px-4 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#D4A043]"
              autoComplete="one-time-code"
            />
          </div>

          <button
            type="button"
            onClick={handleInstantAccess}
            disabled={instantLoading}
            className="w-full bg-[#1F2937] hover:bg-[#334155] disabled:opacity-50 text-[#E2E8F0] font-semibold py-2 rounded"
          >
            {instantLoading ? 'Signing in...' : 'Sign In'}
          </button>

          <button
            type="submit"
            disabled={loading || isCooldownActive}
            className="w-full mt-2 bg-[#D4A043] hover:bg-[#92400E] disabled:opacity-50 text-[#07090F] font-semibold py-2 rounded flex items-center justify-center gap-2"
          >
            <Mail size={18} />
            {loading ? 'Sending...' : isCooldownActive ? `Retry in ${cooldownRemaining}s` : 'Send Magic Link'}
          </button>

          {message && (
            <p className={`mt-4 text-sm text-center ${messageType === 'error' ? 'text-red-400' : 'text-[#10B981]'}`}>{message}</p>
          )}
        </form>

        <p className="text-center text-xs text-[#64748B] mt-6">
          We&apos;ll send you a link to log in. No password needed.
        </p>
        <div className="mt-3 text-center">
          <a
            href="/auth/reset"
            className="text-xs text-[#94A3B8] hover:text-[#D4A043] underline"
          >
            Reset Login Session
          </a>
        </div>

      </div>
    </div>
  );
}
