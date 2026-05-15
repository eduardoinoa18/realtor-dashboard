'use client';

import { useMemo, useState } from 'react';
import { Sparkles, CalendarDays } from 'lucide-react';
import { ContentLog, useEduStorage } from '@/hooks/useEduStorage';

export default function ContentIdeasPage() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState<ContentLog['platform']>('instagram');
  const [scheduledFor, setScheduledFor] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContentLog['status']>('all');
  const [platformFilter, setPlatformFilter] = useState<'all' | ContentLog['platform']>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ title: '', body: '', scheduledFor: '' });
  const { state: ideas, setState: setIdeas } = useEduStorage<ContentLog[]>('edu_content_log_v1', []);

  const scheduledCalendar = useMemo(() => {
    const buckets = new Map<string, ContentLog[]>();
    ideas
      .filter((idea) => idea.scheduledFor)
      .forEach((idea) => {
        const key = idea.scheduledFor as string;
        const list = buckets.get(key) || [];
        list.push(idea);
        buckets.set(key, list);
      });
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, rows]) => ({ date, rows }));
  }, [ideas]);

  const reminderItems = useMemo(() => {
    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);

    return ideas
      .filter((idea) => idea.scheduledFor)
      .filter((idea) => {
        if (statusFilter !== 'all' && idea.status !== statusFilter) return false;
        if (platformFilter !== 'all' && idea.platform !== platformFilter) return false;
        const scheduledDate = new Date(String(idea.scheduledFor));
        return scheduledDate <= in3Days || idea.status !== 'posted';
      })
      .sort((a, b) => String(a.scheduledFor || '').localeCompare(String(b.scheduledFor || '')))
      .slice(0, 8);
  }, [ideas, platformFilter, statusFilter]);

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
          scheduledFor: scheduledFor || undefined,
        },
        ...prev,
      ]);
      setTopic('');
      setScheduledFor('');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = (id: string, status: ContentLog['status']) => {
    setIdeas((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
  };

  const startEdit = (idea: ContentLog) => {
    setEditingId(idea.id);
    setEditDraft({
      title: idea.title,
      body: idea.body,
      scheduledFor: idea.scheduledFor || '',
    });
  };

  const saveEdit = (id: string) => {
    if (!editDraft.title.trim()) return;
    setIdeas((prev) => prev.map((row) => (
      row.id === id
        ? {
            ...row,
            title: editDraft.title.trim(),
            body: editDraft.body,
            scheduledFor: editDraft.scheduledFor || undefined,
          }
        : row
    )));
    setEditingId(null);
  };

  const deleteIdea = (id: string) => {
    setIdeas((prev) => prev.filter((row) => row.id !== id));
    if (editingId === id) {
      setEditingId(null);
    }
  };

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9] mb-2">Content Ideas</h1>
        <p className="text-[#94A3B8]">Generate social content and track each piece from idea to posted.</p>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6 space-y-4">
        <label className="block text-sm text-[#94A3B8]">Topic</label>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-3">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Example: first-time buyers in Lawrence MA"
            className="flex-1 px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
          />
          <input
            type="date"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
            title="Schedule date"
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

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
          <label className="space-y-1 text-sm text-[#94A3B8]">
            <span className="block">Status Filter</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ContentLog['status'] | 'all')} className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]">
              <option value="all">All Statuses</option>
              <option value="idea">Idea</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="posted">Posted</option>
            </select>
          </label>
          <label className="space-y-1 text-sm text-[#94A3B8]">
            <span className="block">Platform Filter</span>
            <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value as ContentLog['platform'] | 'all')} className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]">
              <option value="all">All Platforms</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="both">Both</option>
            </select>
          </label>
        </div>
        <div className="text-xs text-[#94A3B8] max-w-xl">
          Items with a scheduled date will show up in the calendar below and in the reminder list for the next three days.
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-[#3B82F6]" />
            <h2 className="text-lg font-semibold text-[#F1F5F9]">Content Calendar</h2>
          </div>
          {scheduledCalendar.length === 0 ? (
            <p className="text-sm text-[#94A3B8]">No content scheduled yet. Add a date when creating an idea.</p>
          ) : (
            <div className="space-y-3">
              {scheduledCalendar.map((bucket) => (
                <div key={bucket.date} className="rounded-lg border border-[#1E293B] bg-[#0D1117] p-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold text-[#F1F5F9]">{bucket.date}</p>
                    <p className="text-xs text-[#94A3B8]">{bucket.rows.length} item(s)</p>
                  </div>
                  <div className="space-y-2">
                    {bucket.rows.map((idea) => (
                      <div key={`calendar-${idea.id}`} className="flex items-center justify-between gap-3 rounded border border-[#1E293B] bg-[#111827] px-3 py-2">
                        <div>
                          <p className="text-sm text-[#F1F5F9] font-semibold">{idea.title}</p>
                          <p className="text-[11px] text-[#94A3B8] uppercase">{idea.platform}</p>
                        </div>
                        <span className="text-[11px] px-2 py-1 rounded bg-[#1E293B] text-[#CBD5E1]">{idea.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[#D4A043]" />
            <h2 className="text-lg font-semibold text-[#F1F5F9]">Workflow View</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {(['idea', 'draft', 'scheduled', 'posted'] as ContentLog['status'][]).map((status) => {
              const count = ideas.filter((idea) => idea.status === status).length;
              return (
                <div key={status} className="rounded-lg border border-[#1E293B] bg-[#0D1117] p-3">
                  <p className="text-xs text-[#94A3B8] uppercase">{status}</p>
                  <p className="text-2xl font-bold text-[#F1F5F9] mt-1">{count}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#F1F5F9]">Content Reminders</h2>
            <p className="text-xs text-[#94A3B8]">Scheduled and near-due items that need attention.</p>
          </div>
          <span className="text-xs text-[#94A3B8]">Next 3 days</span>
        </div>
        {reminderItems.length === 0 ? (
          <p className="text-sm text-[#94A3B8]">No content reminders right now.</p>
        ) : (
          <div className="space-y-2">
            {reminderItems.map((idea) => (
              <div key={`reminder-${idea.id}`} className="rounded-lg border border-[#1E293B] bg-[#0D1117] px-3 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#F1F5F9]">{idea.title}</p>
                  <p className="text-[11px] text-[#94A3B8]">{idea.scheduledFor || 'Unscheduled'} • {idea.platform}</p>
                </div>
                <select
                  title="Reminder status"
                  value={idea.status}
                  onChange={(e) => updateStatus(idea.id, e.target.value as ContentLog['status'])}
                  className="px-2 py-1 bg-[#111827] border border-[#374151] rounded text-xs text-[#F1F5F9]"
                >
                  <option value="idea">Idea</option>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="posted">Posted</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {ideas.length === 0 && <p className="text-[#64748B] text-sm">No ideas yet.</p>}
        {ideas.map((idea) => (
          <div key={idea.id} className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-semibold text-[#F1F5F9]">{idea.title}</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#94A3B8] uppercase">{idea.platform}</span>
                {idea.scheduledFor && <span className="text-xs text-[#3B82F6]">{idea.scheduledFor}</span>}
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
                <button onClick={() => startEdit(idea)} className="px-2 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-xs text-[#F1F5F9]">Edit</button>
                <button onClick={() => deleteIdea(idea.id)} className="px-2 py-1 rounded bg-red/20 hover:bg-red/30 text-xs text-red">Delete</button>
              </div>
            </div>
            {editingId === idea.id ? (
              <div className="space-y-2">
                <input
                  value={editDraft.title}
                  onChange={(e) => setEditDraft((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
                  placeholder="Title"
                />
                <textarea
                  value={editDraft.body}
                  onChange={(e) => setEditDraft((prev) => ({ ...prev, body: e.target.value }))}
                  className="w-full min-h-[120px] px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
                  placeholder="Content body"
                />
                <input
                  type="date"
                  value={editDraft.scheduledFor}
                  onChange={(e) => setEditDraft((prev) => ({ ...prev, scheduledFor: e.target.value }))}
                  className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
                  title="Edit scheduled date"
                />
                <div className="flex items-center gap-2">
                  <button onClick={() => saveEdit(idea.id)} className="px-3 py-1.5 rounded bg-[#D4A043] hover:bg-[#E8B84F] text-[#07090F] text-xs font-semibold">Save</button>
                  <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded bg-[#1E293B] hover:bg-[#334155] text-xs text-[#F1F5F9]">Cancel</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#94A3B8] whitespace-pre-wrap">{idea.body}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
