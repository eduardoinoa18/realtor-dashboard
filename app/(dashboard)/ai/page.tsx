'use client';

import { useState } from 'react';
import { Zap, Copy } from 'lucide-react';

interface Prompt {
  type: string;
  title: string;
  description: string;
  icon: string;
}

const prompts: Prompt[] = [
  { type: 'draft_text', title: 'Draft Text', description: 'Generate follow-up texts for leads', icon: '💬' },
  { type: 'draft_email', title: 'Draft Email', description: 'Write professional emails', icon: '📧' },
  { type: 'coaching', title: 'Coaching', description: 'Get direct action coaching', icon: '🎯' },
  { type: 'pipeline_review', title: 'Pipeline Review', description: 'Analyze your pipeline', icon: '📊' },
  { type: 'weekly_review', title: 'Weekly Review', description: "Coach on this week's KPIs", icon: '📈' },
  { type: 'instagram', title: 'Instagram Reel', description: 'Create social content', icon: '📱' },
  { type: 'action_plan', title: 'Action Plan', description: 'Build a 14-day follow-up', icon: '📋' },
];

export default function AIPage() {
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [context, setContext] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!selectedPrompt || !context.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedPrompt, context }),
      });
      const data = await res.json();
      setResponse(data.content || '');
    } catch {
      setResponse('Error generating response. Please try again.');
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
  };

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9] mb-2">Claude AI Coach</h1>
        <p className="text-[#94A3B8]">Your personal real estate business coach, powered by Claude</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Prompt Selection */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-3">
            {prompts.map((p) => (
              <button
                key={p.type}
                onClick={() => {
                  setSelectedPrompt(p.type);
                  setResponse('');
                  setContext('');
                }}
                className={`w-full text-left px-4 py-3 rounded transition-all ${
                  selectedPrompt === p.type
                    ? 'bg-[#D4A043] text-[#07090F]'
                    : 'bg-[#111827] text-[#F1F5F9] hover:bg-[#1E293B]'
                }`}
              >
                <div className="text-lg mb-1">{p.icon}</div>
                <p className="font-semibold text-sm">{p.title}</p>
                <p className={`text-xs mt-1 ${selectedPrompt === p.type ? 'text-[#07090F]/70' : 'text-[#64748B]'}`}>
                  {p.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          {selectedPrompt ? (
            <div className="space-y-4">
              {/* Context Input */}
              <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
                <label className="block text-sm font-semibold text-[#F1F5F9] mb-2">
                  Describe your situation
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Be specific. The more detail, the better the coaching."
                  className="w-full h-24 px-4 py-3 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#D4A043] resize-none"
                />
                <button
                  onClick={handleGenerate}
                  disabled={loading || !context.trim()}
                  className="w-full mt-4 px-4 py-2 bg-[#D4A043] hover:bg-[#92400E] disabled:opacity-50 text-[#07090F] font-semibold rounded flex items-center justify-center gap-2 transition-colors"
                >
                  <Zap size={18} />
                  {loading ? 'Generating...' : 'Generate'}
                </button>
              </div>

              {/* Response */}
              {response && (
                <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6 animate-slide-up">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-[#F1F5F9]">Claude's Response</h4>
                    <button
                      onClick={handleCopy}
                      className="px-3 py-1 bg-[#1E293B] hover:bg-[#374151] text-[#94A3B8] hover:text-[#F1F5F9] rounded text-sm flex items-center gap-2 transition-colors"
                    >
                      <Copy size={16} />
                      Copy
                    </button>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-[#F1F5F9] whitespace-pre-wrap text-sm leading-relaxed">
                      {response}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-12 text-center">
              <Zap size={48} className="text-[#374151] mx-auto mb-4" />
              <p className="text-[#94A3B8]">Select a prompt type to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
