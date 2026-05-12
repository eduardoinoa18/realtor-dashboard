'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { ContentLog, useEduStorage } from '@/hooks/useEduStorage';

export default function ContentIdeasPage() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState<ContentLog['platform']>('instagram');
  const { state: ideas, setState: setIdeas } = useEduStorage<ContentLog[]>('edu_content_log_v1', []);

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      const body = data.content || 'No idea returned.';
      setIdeas((prev) => [
        {
          id: `${Date.now()}`,
          title: topic,
          body,
          status: 'idea',
          platform,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setTopic('');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = (id: string, status: ContentLog['status']) => {
    setIdeas((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
  };

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9] mb-2">Content Ideas</h1>
        <p className="text-[#94A3B8]">Generate social content and track each piece from idea to posted.</p>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6 space-y-4">
        <label className="block text-sm text-[#94A3B8]">Topic</label>
        <div className="flex gap-3">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Example: first-time buyers in Lawrence MA"
            className="flex-1 px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as ContentLog['platform'])}
            className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
            title="Content platform"
          >
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="both">Both</option>
          </select>
          <button
            onClick={generate}
            disabled={loading || !topic.trim()}
            className="px-4 py-2 bg-[#D4A043] hover:bg-[#E8B84F] text-[#07090F] font-semibold rounded disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Sparkles size={16} />
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {ideas.length === 0 && <p className="text-[#64748B] text-sm">No ideas yet.</p>}
        {ideas.map((idea) => (
          <div key={idea.id} className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-semibold text-[#F1F5F9]">{idea.title}</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#94A3B8] uppercase">{idea.platform}</span>
                <select
                  title="Content status"
                  value={idea.status}
                  onChange={(e) => updateStatus(idea.id, e.target.value as ContentLog['status'])}
                  className="px-2 py-1 bg-[#0D1117] border border-[#374151] rounded text-xs text-[#F1F5F9]"
                >
                  <option value="idea">Idea</option>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="posted">Posted</option>
                </select>
              </div>
            </div>
            <p className="text-sm text-[#94A3B8] whitespace-pre-wrap">{idea.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
