'use client';

import { AlertCircle } from 'lucide-react';

interface ReadOnlyBannerProps {
  reason?: 'ai-mode' | 'readonly-mode' | 'read-only';
}

export default function ReadOnlyBanner({ reason = 'readonly-mode' }: ReadOnlyBannerProps) {
  const messages = {
    'ai-mode': 'AI Coach Mode: Dashboard is read-only. Use Settings to switch modes.',
    'readonly-mode': 'Read-Only Mode: Editing disabled. Enable in Settings.',
    'read-only': 'Read-Only Mode: Changes are not persisted.',
  };

  return (
    <div className="px-4 py-2 bg-purple-500/10 border-b border-purple-500/20 flex items-center gap-2">
      <AlertCircle size={16} className="text-purple-400 flex-shrink-0" />
      <span className="text-sm text-purple-400">{messages[reason]}</span>
    </div>
  );
}
