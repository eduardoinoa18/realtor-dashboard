'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Mail } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = createClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Check your email for a login link!');
      setEmail('');
    }
    setLoading(false);
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#D4A043] hover:bg-[#92400E] disabled:opacity-50 text-[#07090F] font-semibold py-2 rounded flex items-center justify-center gap-2"
          >
            <Mail size={18} />
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>

          {message && (
            <p className="mt-4 text-sm text-center text-[#10B981]">{message}</p>
          )}
        </form>

        <p className="text-center text-xs text-[#64748B] mt-6">
          We&apos;ll send you a link to log in. No password needed.
        </p>
      </div>
    </div>
  );
}
