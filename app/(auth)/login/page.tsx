'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Mail } from 'lucide-react';

function extractCooldownSeconds(errorMessage: string) {
  const match = errorMessage.match(/(\d+)\s*second/i);
  if (match?.[1]) {
    return Math.max(15, Number(match[1]));
  }
  return 60;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [instantLoading, setInstantLoading] = useState(false);
  const [authResolving, setAuthResolving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success'>('success');

  const getSafeNextPath = () => {
    const nextParam = new URLSearchParams(window.location.search).get('next') || '/today';
    return nextParam.startsWith('/') ? nextParam : '/today';
  };

  const syncServerSession = async (accessToken: string, refreshToken: string) => {
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(String(data?.error || 'Failed to sync authenticated session'));
    }
  };

  useEffect(() => {
    const completeAuthFromLink = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const tokenHash = params.get('token_hash');
      const type = params.get('type');
      const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      const supabase = createClient();
      const safeNext = getSafeNextPath();

      try {
        if (!code && !(tokenHash && type) && !(accessToken && refreshToken)) {
          return;
        }

        setAuthResolving(true);
        setMessage('Completing login...');
        setMessageType('success');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            setMessage(`Login error: ${error.message}`);
            setMessageType('error');
            return;
          }
          await syncServerSession(accessToken, refreshToken);
          window.history.replaceState({}, '', window.location.pathname + window.location.search);
          window.location.replace(safeNext);
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setMessage(`Login error: ${error.message}`);
            setMessageType('error');
            return;
          }
          const { data: exchanged } = await supabase.auth.getSession();
          const exchangedAccess = exchanged.session?.access_token;
          const exchangedRefresh = exchanged.session?.refresh_token;
          if (exchangedAccess && exchangedRefresh) {
            await syncServerSession(exchangedAccess, exchangedRefresh);
          }
          window.location.replace(safeNext);
          return;
        }

        if (tokenHash && type) {
          const normalizedType = type === 'magiclink' ? 'email' : type;
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: normalizedType as any,
          });
          if (error) {
            setMessage(`Login error: ${error.message}`);
            setMessageType('error');
            return;
          }
          const { data: verified } = await supabase.auth.getSession();
          const verifiedAccess = verified.session?.access_token;
          const verifiedRefresh = verified.session?.refresh_token;
          if (verifiedAccess && verifiedRefresh) {
            await syncServerSession(verifiedAccess, verifiedRefresh);
          }
          window.location.replace(safeNext);
        }
      } catch (err: any) {
        setMessage(`Login error: ${String(err?.message || err)}`);
        setMessageType('error');
      } finally {
        setAuthResolving(false);
      }
    };

    completeAuthFromLink();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const errorCode = params.get('error_code');
    const reset = params.get('reset');

    if (reset === '1') {
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

  const finalizeFromActionLink = async (rawLink: string, nextPath: string) => {
    const authLink = new URL(rawLink);
    const runtimeOrigin = window.location.origin;
    if (authLink.hostname === 'localhost' || authLink.hostname === '127.0.0.1') {
      authLink.protocol = window.location.protocol;
      authLink.host = window.location.host;
    }

    const hashParams = new URLSearchParams(authLink.hash.startsWith('#') ? authLink.hash.slice(1) : authLink.hash);
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (accessToken && refreshToken) {
      const supabase = createClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        throw new Error(`Instant session failed: ${sessionError.message}`);
      }

      await syncServerSession(accessToken, refreshToken);
      window.history.replaceState({}, '', window.location.pathname + window.location.search);
      window.location.href = nextPath;
      return;
    }

    if (authLink.hostname.includes('.supabase.co') && authLink.pathname.includes('/auth/v1/verify')) {
      authLink.searchParams.set('redirect_to', `${runtimeOrigin}/login?next=${encodeURIComponent(nextPath)}`);
    }

    window.location.href = authLink.toString();
  };

  const requestMagicLink = async (normalizedEmail: string, nextPath: string) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
    const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const redirectBase = runtimeOrigin || appUrl;
    if (!redirectBase) {
      setMessage('Missing app URL configuration. Set NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL.');
      setMessageType('error');
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${redirectBase}/login?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (error) {
      const normalizedError = String(error.message || '').toLowerCase();
      if (normalizedError.includes('rate limit')) {
        const seconds = extractCooldownSeconds(error.message || '');
        setMessage(`Email provider rate-limited this request. Wait ${seconds}s and try again.`);
      } else {
        setMessage(`Error: ${error.message}`);
      }
      setMessageType('error');
      return;
    }

    setMessage('Check your email for a login link.');
    setMessageType('success');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setMessage('Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      setMessageType('error');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessage('Enter your email first.');
      setMessageType('error');
      return;
    }

    const nextPath = getSafeNextPath();
    setLoading(true);
    setMessage('Signing in...');
    setMessageType('success');

    try {
      const response = await fetch('/api/auth/instant-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, next: nextPath }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.actionLink) {
        await finalizeFromActionLink(data.actionLink, nextPath);
        return;
      }

      await requestMagicLink(normalizedEmail, nextPath);
    } catch (err: any) {
      await requestMagicLink(normalizedEmail, nextPath);
      if (!message) {
        setMessage(`Login request failed: ${String(err?.message || err)}`);
        setMessageType('error');
      }
    } finally {
      setLoading(false);
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
              Fast login: use your email only. Dashboard PIN still protects access after login.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || instantLoading || authResolving}
            className="w-full bg-[#D4A043] hover:bg-[#92400E] disabled:opacity-50 text-[#07090F] font-semibold py-2 rounded flex items-center justify-center gap-2"
          >
            <Mail size={18} />
            {authResolving ? 'Completing login...' : loading || instantLoading ? 'Signing in...' : 'Sign In'}
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
