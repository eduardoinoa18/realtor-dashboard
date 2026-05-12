'use client';

import { NowZone } from '@/components/dashboard/NowZone';
import { TaskList } from '@/components/dashboard/TaskList';
import { formatCurrency } from '@/lib/utils';
import { TARGETS } from '@/lib/constants';
import { AlertCircle, Calendar } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAppSettings } from '@/store/appSettings';
import { ClosingLog, ContentLog, DailyBriefing, DailyKpiLog, DailyMetricSnapshot, PipelineLead, getCurrentMonthClosings, useEduStorage } from '@/hooks/useEduStorage';
import { useRouter } from 'next/navigation';

export default function TodayPage() {
  const router = useRouter();
  const [displayDate, setDisplayDate] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const targets = useAppSettings((state) => state.targets);
  const { state: closings } = useEduStorage<ClosingLog[]>('edu_closings_v1', []);
  const { state: leads } = useEduStorage<PipelineLead[]>('edu_pipeline_leads_v1', []);
  const { state: contentIdeas } = useEduStorage<ContentLog[]>('edu_content_log_v1', []);
  const todayKey = new Date().toISOString().slice(0, 10);
  const { state: daily, setState: setDaily } = useEduStorage<DailyKpiLog>('edu_daily_kpi_v1', {
    calls: 0,
    texts: 0,
    appts: 0,
    emails: 0,
    date: todayKey,
  });
  const { state: streakHistory, setState: setStreakHistory } = useEduStorage<Record<string, number>>('edu_daily_activity_history_v1', {});
  const { state: _dailyMetrics, setState: setDailyMetrics } = useEduStorage<Record<string, DailyMetricSnapshot>>('edu_daily_metrics_history_v1', {});
  const { state: briefings, setState: setBriefings } = useEduStorage<Record<string, DailyBriefing>>('edu_daily_briefings_v1', {});

  useEffect(() => {
    if (daily.date !== todayKey) {
      setDaily({ calls: 0, texts: 0, appts: 0, emails: 0, date: todayKey });
    }
  }, [daily.date, setDaily, todayKey]);

  const monthClosings = useMemo(() => getCurrentMonthClosings(closings), [closings]);
  const monthNet = useMemo(() => monthClosings.reduce((sum, c) => sum + c.netCommission, 0), [monthClosings]);
  const uags = useMemo(() => leads.filter((lead) => lead.stage === 'uag'), [leads]);
  const staleUag = useMemo(() => uags.filter((lead) => {
    if (!lead.expectedCloseDate) return false;
    const daysToClose = Math.ceil((new Date(lead.expectedCloseDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const stale = !lead.updatedAt || (Date.now() - new Date(lead.updatedAt).getTime()) > (7 * 24 * 60 * 60 * 1000);
    return daysToClose <= 14 && stale;
  }), [uags]);
  const dayTotal = daily.calls + daily.texts + daily.appts + daily.emails;
  const todayClosings = useMemo(() => closings.filter((c) => c.closeDate === todayKey).length, [closings, todayKey]);
  const contentBacklog = useMemo(() => ({
    idea: contentIdeas.filter((i) => i.status === 'idea').length,
    draft: contentIdeas.filter((i) => i.status === 'draft').length,
    scheduled: contentIdeas.filter((i) => i.status === 'scheduled').length,
    posted: contentIdeas.filter((i) => i.status === 'posted').length,
  }), [contentIdeas]);
  const streakCount = useMemo(() => {
    let streak = 0;
    const cursor = new Date();
    for (let i = 0; i < 365; i += 1) {
      const key = cursor.toISOString().slice(0, 10);
      if ((streakHistory[key] || 0) <= 0) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }, [streakHistory]);

  useEffect(() => {
    if (dayTotal <= 0) return;
    setStreakHistory((prev) => {
      if ((prev[todayKey] || 0) === dayTotal) return prev;
      return { ...prev, [todayKey]: dayTotal };
    });
  }, [dayTotal, setStreakHistory, todayKey]);

  useEffect(() => {
    setDailyMetrics((prev) => {
      const snapshot: DailyMetricSnapshot = {
        calls: daily.calls,
        texts: daily.texts,
        appts: daily.appts,
        emails: daily.emails,
        closings: todayClosings,
      };
      const existing = prev[todayKey];
      if (
        existing &&
        existing.calls === snapshot.calls &&
        existing.texts === snapshot.texts &&
        existing.appts === snapshot.appts &&
        existing.emails === snapshot.emails &&
        existing.closings === snapshot.closings
      ) {
        return prev;
      }
      return { ...prev, [todayKey]: snapshot };
    });
  }, [daily.appts, daily.calls, daily.emails, daily.texts, setDailyMetrics, todayClosings, todayKey]);

  const buildBriefing = () => {
    const callPace = `${daily.calls}/${targets.dailyCallGoal}`;
    const textPace = `${daily.texts}/${targets.dailyTextGoal}`;
    const apptPace = `${daily.appts}/${targets.dailyApptGoal}`;
    const emailPace = `${daily.emails}/${targets.dailyEmailGoal}`;
    const monthGoalGap = Math.max(0, targets.monthGoal - monthClosings.length);
    const monthNetGap = Math.max(0, targets.netMonthlyTarget - monthNet);
    const pipelineRisk = staleUag.length > 0 ? `${staleUag.length} urgent UAG follow-up risk` : 'No urgent UAG risk detected';

    return [
      `Daily briefing for ${displayDate || todayKey}:`,
      `- KPI pace: Calls ${callPace}, Texts ${textPace}, Appts ${apptPace}, Emails ${emailPace}.`,
      `- Month progress: ${monthClosings.length}/${targets.monthGoal} closings, ${formatCurrency(monthNet)} closed net (${formatCurrency(monthNetGap)} to monthly net target).`,
      `- Pipeline risk: ${pipelineRisk}.`,
      `- Content backlog: ${contentBacklog.idea} ideas, ${contentBacklog.draft} drafts, ${contentBacklog.scheduled} scheduled, ${contentBacklog.posted} posted.`,
      `- Suggested focus: ${monthGoalGap > 0 ? `Need ${monthGoalGap} more closings this month.` : 'Closing goal reached; focus on pipeline hygiene and follow-ups.'}`,
    ].join('\n');
  };

  const generateBriefing = () => {
    const summary = buildBriefing();
    setBriefings((prev) => ({
      ...prev,
      [todayKey]: {
        date: todayKey,
        summary,
        createdAt: new Date().toISOString(),
      },
    }));
  };

  useEffect(() => {
    if (!briefings[todayKey]) {
      generateBriefing();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKey]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning, Eduardo';
    if (hour < 18) return 'Good afternoon, Eduardo';
    return 'Good evening, Eduardo';
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus('');
    try {
      const [people, appointments] = await Promise.all([
        fetch('/api/fub?type=people'),
        fetch('/api/fub?type=appointments'),
      ]);
      if (!people.ok || !appointments.ok) {
        throw new Error('sync_failed');
      }
      const peopleJson = await people.json();
      const currentCount = Number(peopleJson?.count || 0);
      const previousCount = Number(localStorage.getItem('edu_fub_last_count') || '0');
      const delta = Math.max(0, currentCount - previousCount);
      localStorage.setItem('edu_fub_last_count', String(currentCount));
      localStorage.setItem('edu_last_sync', String(Date.now()));

      setSyncStatus(delta > 0
        ? `Follow Up Boss sync completed. ${delta} new FUB updates.`
        : 'Follow Up Boss sync completed.');
    } catch {
      setSyncStatus('Follow Up Boss sync failed. Check API key/settings.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const lastSync = Number(localStorage.getItem('edu_last_sync') || '0');
    const stale = Date.now() - lastSync > 15 * 60 * 1000;
    if (stale && !syncing) {
      handleSync();
    }
    // run once on load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setDisplayDate(
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    );
  }, []);

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9] mb-2">{greeting}</h1>
        <p className="text-[#94A3B8]">{displayDate || 'Loading date...'}</p>
      </div>

      {/* Month Status Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
          <p className="text-xs text-[#64748B] uppercase font-semibold">This Month</p>
          <p className="text-2xl font-bold text-[#D4A043] mt-1">{monthClosings.length} / {targets.monthGoal}</p>
          <p className="text-xs text-[#94A3B8] mt-2">Closings</p>
        </div>
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
          <p className="text-xs text-[#64748B] uppercase font-semibold">Pipeline</p>
          <p className="text-2xl font-bold text-[#3B82F6] mt-1">{leads.length}</p>
          <p className="text-xs text-[#94A3B8] mt-2">Active Leads</p>
        </div>
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
          <p className="text-xs text-[#64748B] uppercase font-semibold">UAGs</p>
          <p className="text-2xl font-bold text-[#10B981] mt-1">{uags.length}</p>
          <p className="text-xs text-[#94A3B8] mt-2">Under Agreement</p>
        </div>
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
          <p className="text-xs text-[#64748B] uppercase font-semibold">Target</p>
          <p className="text-2xl font-bold text-[#D4A043] mt-1">{formatCurrency(targets.netMonthlyTarget || TARGETS.netMonthlyTarget)}</p>
          <p className="text-xs text-[#94A3B8] mt-2">Monthly Net</p>
        </div>
      </div>

      {/* NowZone Widget */}
      <div className="mb-8">
        <NowZone />
      </div>

      {/* Alerts */}
      <div className="space-y-3 mb-8">
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
          <p className="text-sm font-semibold text-[#F1F5F9] mb-3">Today Activity Tracker</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tracker label="Calls" value={daily.calls} goal={targets.dailyCallGoal} onChange={(value) => setDaily((prev) => ({ ...prev, calls: Math.max(0, value) }))} />
            <Tracker label="Texts" value={daily.texts} goal={targets.dailyTextGoal} onChange={(value) => setDaily((prev) => ({ ...prev, texts: Math.max(0, value) }))} />
            <Tracker label="Appts" value={daily.appts} goal={targets.dailyApptGoal} onChange={(value) => setDaily((prev) => ({ ...prev, appts: Math.max(0, value) }))} />
            <Tracker label="Emails" value={daily.emails} goal={targets.dailyEmailGoal} onChange={(value) => setDaily((prev) => ({ ...prev, emails: Math.max(0, value) }))} />
          </div>
        </div>
        <div className="bg-red/10 border border-red rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red mb-1">Stale UAG Follow-up</p>
            <p className="text-sm text-[#94A3B8]">{staleUag.length} UAG leads are closing in 14 days or less and need fresh notes.</p>
          </div>
        </div>
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
          <p className="text-sm text-[#94A3B8]">MTD Net Closed</p>
          <p className="text-xl text-[#10B981] font-semibold">{formatCurrency(monthNet)}</p>
        </div>
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-sm font-semibold text-[#F1F5F9]">Automated Daily Briefing</p>
            <button onClick={generateBriefing} className="px-2 py-1 text-xs rounded bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9]">
              Refresh
            </button>
          </div>
          <p className="text-xs text-[#94A3B8] whitespace-pre-wrap">{briefings[todayKey]?.summary || 'Generating briefing...'}</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Tasks and Appointments */}
        <div className="lg:col-span-2 space-y-8">
          {/* Tasks */}
          <TaskList />

          {/* Schedule */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={20} className="text-[#D4A043]" />
              <h3 className="text-lg font-semibold text-[#F1F5F9]">Today's Appointments</h3>
            </div>
            <p className="text-[#94A3B8] text-sm">No appointments scheduled. Check your calendar or add one.</p>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Motive Card */}
          <div className="bg-gradient-to-br from-[#8B5CF6]/20 to-[#EC4899]/20 border border-[#8B5CF6]/50 rounded-lg p-4">
            <p className="text-sm font-semibold text-[#F1F5F9] mb-2">💪 Remember Why</p>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Your son&apos;s treatments cost <span className="text-[#D4A043] font-semibold">$1,500/month</span>. Every call you make is an investment in his health. Every close is freedom.
            </p>
          </div>

          {/* Streak Counter */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4 text-center">
            <p className="text-xs text-[#64748B] uppercase font-semibold">Daily Streak</p>
            <p className="text-4xl font-bold text-[#D4A043] mt-2">{streakCount}</p>
            <p className="text-xs text-[#94A3B8] mt-2">days active</p>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <button onClick={handleSync} disabled={syncing} className="w-full px-4 py-2 bg-[#D4A043] hover:bg-[#92400E] disabled:opacity-60 text-[#07090F] font-semibold rounded transition-colors text-sm">
              {syncing ? 'Syncing...' : 'Sync with Follow Boss'}
            </button>
            <button onClick={() => router.push('/pipeline')} className="w-full px-4 py-2 bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9] font-semibold rounded transition-colors text-sm">
              Review Pipeline
            </button>
            {syncStatus && <p className="text-xs text-[#94A3B8]">{syncStatus}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Tracker({ label, value, goal, onChange }: { label: string; value: number; goal: number; onChange: (value: number) => void }) {
  return (
    <div className="bg-[#0D1117] border border-[#1E293B] rounded p-3">
      <p className="text-xs text-[#94A3B8]">{label}</p>
      <div className="flex items-center justify-between mt-2">
        <button className="px-2 py-1 bg-[#1E293B] rounded text-[#F1F5F9]" onClick={() => onChange(value - 1)}>−</button>
        <p className="text-lg font-semibold text-[#F1F5F9]">{value} <span className="text-xs text-[#64748B]">/ {goal}</span></p>
        <button className="px-2 py-1 bg-[#1E293B] rounded text-[#F1F5F9]" onClick={() => onChange(value + 1)}>+</button>
      </div>
    </div>
  );
}
