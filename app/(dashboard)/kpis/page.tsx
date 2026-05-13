'use client';

import { useMemo } from 'react';
import { TrendingUp, Calendar } from 'lucide-react';
import { WEEKLY_KPIS } from '@/lib/constants';
import { useEduStorage, ClosingLog, DailyMetricSnapshot, FubActivitySnapshot, PipelineLead, getCurrentMonthClosings, getLastNDates } from '@/hooks/useEduStorage';
import { useAppSettings } from '@/store/appSettings';
import { formatCurrency } from '@/lib/utils';

export default function KPIsPage() {
  const { state: kpis, setState: setKpis } = useEduStorage<Record<string, number>>('edu_weekly_kpis_v1', {
    touches: 0,
    calls: 0,
    appointments: 0,
    new_leads: 0,
    uags: 0,
    closings: 0,
  });
  const { state: closings } = useEduStorage<ClosingLog[]>('edu_closings_v1', []);
  const { state: leads } = useEduStorage<PipelineLead[]>('edu_pipeline_leads_v1', []);
  const { state: metricHistory } = useEduStorage<Record<string, DailyMetricSnapshot>>('edu_daily_metrics_history_v1', {});
  const { state: fubActivity } = useEduStorage<FubActivitySnapshot | null>('edu_fub_activity_metrics_v1', null);
  const targets = useAppSettings((state) => state.targets);
  const commissions = useAppSettings((state) => state.commissions);

  const handleKpiChange = (key: string, delta: number) => {
    setKpis(prev => ({
      ...prev,
      [key]: Math.max(0, prev[key] + delta),
    }));
  };

  const monthClosings = useMemo(() => getCurrentMonthClosings(closings), [closings]);
  const currentMonthNet = useMemo(() => monthClosings.reduce((sum, c) => sum + c.netCommission, 0), [monthClosings]);
  const projectedClosings = Math.max(monthClosings.length, Math.round((kpis.closings || 0) * 4.3));
  const projectedNet = Math.max(
    currentMonthNet,
    Math.round(projectedClosings * targets.avgSalePrice * commissions.defaultCommissionPct * commissions.ownAgentPct * (1 - commissions.franchiseFeePct))
  );

  const trendDays = useMemo(() => getLastNDates(7), []);
  const trendRows = useMemo(() => {
    return trendDays.map((day) => {
      const data = metricHistory[day] || { calls: 0, texts: 0, appts: 0, emails: 0, closings: 0 };
      const touches = data.calls + data.texts + data.emails;
      return { day, ...data, touches };
    });
  }, [metricHistory, trendDays]);
  const fubGoalAttainment = useMemo(() => {
    if (!fubActivity || !fubActivity.byDay.length) {
      return { callsPct: 0, textsPct: 0, apptsPct: 0, emailsPct: 0 };
    }
    const days = fubActivity.byDay.length;
    const avgCalls = fubActivity.totals.calls / days;
    const avgTexts = fubActivity.totals.texts / days;
    const avgAppts = fubActivity.totals.appointments / days;
    const avgEmails = fubActivity.totals.emails / days;

    return {
      callsPct: Math.round((avgCalls / Math.max(1, targets.dailyCallGoal)) * 100),
      textsPct: Math.round((avgTexts / Math.max(1, targets.dailyTextGoal)) * 100),
      apptsPct: Math.round((avgAppts / Math.max(1, targets.dailyApptGoal)) * 100),
      emailsPct: Math.round((avgEmails / Math.max(1, targets.dailyEmailGoal)) * 100),
    };
  }, [fubActivity, targets.dailyApptGoal, targets.dailyCallGoal, targets.dailyEmailGoal, targets.dailyTextGoal]);
  const conversionMetrics = useMemo(() => {
    const totalLeads = leads.length;
    const activeLeads = leads.filter((lead) => lead.stage === 'active').length;
    const uags = leads.filter((lead) => lead.stage === 'uag').length;
    const closedLeads = leads.filter((lead) => lead.stage === 'closed').length;
    const touches = fubActivity?.totals.touches || 0;
    const appointments = fubActivity?.totals.appointments || 0;

    return {
      touchToAppt: touches > 0 ? (appointments / touches) * 100 : 0,
      leadToActive: totalLeads > 0 ? (activeLeads / totalLeads) * 100 : 0,
      activeToUag: activeLeads > 0 ? (uags / activeLeads) * 100 : 0,
      uagToClose: uags > 0 ? (monthClosings.length / uags) * 100 : 0,
      leadToClose: totalLeads > 0 ? (closedLeads / totalLeads) * 100 : 0,
    };
  }, [fubActivity?.totals.appointments, fubActivity?.totals.touches, leads, monthClosings.length]);

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9]">Weekly KPIs</h1>
          <button className="px-4 py-2 bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9] rounded text-sm font-medium flex items-center gap-2">
            <Calendar size={18} />
            This Week
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {WEEKLY_KPIS.map((kpi) => {
          const current = kpis[kpi.key] || 0;
          const percentage = (current / kpi.target) * 100;
          const isHit = current >= kpi.target;

          return (
            <div
              key={kpi.key}
              className="bg-[#111827] border border-[#1E293B] rounded-lg p-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-[#64748B] uppercase font-semibold">{kpi.label}</p>
                  <p className="text-2xl font-bold text-[#F1F5F9] mt-1">{current}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  isHit ? 'bg-green/20' : 'bg-[#1E293B]'
                }`}>
                  <TrendingUp size={24} className={isHit ? 'text-green' : 'text-[#94A3B8]'} />
                </div>
              </div>

              {/* Target */}
              <p className="text-xs text-[#94A3B8] mb-3">Target: {kpi.target} {kpi.unit}</p>

              {/* Progress Bar */}
              <progress
                className={`h-2 w-full rounded-full overflow-hidden mb-4 ${
                  percentage >= 100 ? 'accent-green' : percentage >= 50 ? 'accent-amber' : 'accent-red'
                }`}
                max={100}
                value={Math.min(percentage, 100)}
                aria-label={`${kpi.label} progress`}
              />

              {/* Controls */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleKpiChange(kpi.key, -1)}
                  className="px-3 py-1 bg-[#1E293B] hover:bg-[#374151] text-[#94A3B8] rounded text-sm transition-colors"
                >
                  −
                </button>
                <span className="text-xs text-[#64748B]">{percentage.toFixed(0)}%</span>
                <button
                  onClick={() => handleKpiChange(kpi.key, 1)}
                  className="px-3 py-1 bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] rounded text-sm font-semibold transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Projection */}
      <div className="bg-gradient-to-r from-[#3B82F6]/20 to-[#06B6D4]/20 border border-[#3B82F6]/50 rounded-lg p-6">
        <h3 className="font-semibold text-[#F1F5F9] mb-4">Monthly Projection</h3>
        <p className="text-[#94A3B8]">
          If this week&apos;s pace continues, you&apos;re on track for <span className="font-semibold text-[#3B82F6]">{projectedClosings} closings</span> and <span className="font-semibold text-[#06B6D4]">{formatCurrency(projectedNet)}</span> net this month.
        </p>
      </div>

      <div className="mt-8 bg-[#111827] border border-[#1E293B] rounded-lg p-6">
        <h3 className="font-semibold text-[#F1F5F9] mb-2">FUB Activity Intelligence</h3>
        <p className="text-xs text-[#94A3B8] mb-4">
          {fubActivity
            ? `Last synced ${new Date(fubActivity.syncedAt).toLocaleString()} for ${fubActivity.assignedUserName}.`
            : 'Run Follow Boss sync from Today to load your activity intelligence.'}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniMetric label="Calls vs Goal" value={`${fubGoalAttainment.callsPct}%`} />
          <MiniMetric label="Texts vs Goal" value={`${fubGoalAttainment.textsPct}%`} />
          <MiniMetric label="Appts vs Goal" value={`${fubGoalAttainment.apptsPct}%`} />
          <MiniMetric label="Emails vs Goal" value={`${fubGoalAttainment.emailsPct}%`} />
        </div>
      </div>

      <div className="mt-8 bg-[#111827] border border-[#1E293B] rounded-lg p-6">
        <h3 className="font-semibold text-[#F1F5F9] mb-4">Conversion Intelligence</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MiniMetric label="Touch->Appt" value={`${conversionMetrics.touchToAppt.toFixed(1)}%`} />
          <MiniMetric label="Lead->Active" value={`${conversionMetrics.leadToActive.toFixed(1)}%`} />
          <MiniMetric label="Active->UAG" value={`${conversionMetrics.activeToUag.toFixed(1)}%`} />
          <MiniMetric label="UAG->Close" value={`${conversionMetrics.uagToClose.toFixed(1)}%`} />
          <MiniMetric label="Lead->Close" value={`${conversionMetrics.leadToClose.toFixed(1)}%`} />
        </div>
      </div>

      <div className="mt-8 bg-[#111827] border border-[#1E293B] rounded-lg p-6">
        <h3 className="font-semibold text-[#F1F5F9] mb-4">7-Day Activity Trends</h3>
        <div className="space-y-4">
          <TrendBars label="Touches" color="bg-[#3B82F6]" values={trendRows.map((r) => r.touches)} days={trendRows.map((r) => r.day.slice(5))} />
          <TrendBars label="Calls" color="bg-[#10B981]" values={trendRows.map((r) => r.calls)} days={trendRows.map((r) => r.day.slice(5))} />
          <TrendBars label="Appointments" color="bg-[#D4A043]" values={trendRows.map((r) => r.appts)} days={trendRows.map((r) => r.day.slice(5))} />
          <TrendBars label="Closings" color="bg-[#8B5CF6]" values={trendRows.map((r) => r.closings)} days={trendRows.map((r) => r.day.slice(5))} />
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0D1117] border border-[#1E293B] rounded p-3">
      <p className="text-[11px] text-[#64748B] uppercase">{label}</p>
      <p className="text-sm text-[#F1F5F9] font-semibold mt-1">{value}</p>
    </div>
  );
}

function TrendBars({ label, values, days, color }: { label: string; values: number[]; days: string[]; color: string }) {
  const max = Math.max(1, ...values);
  return (
    <div>
      <p className="text-xs text-[#94A3B8] mb-2 uppercase">{label}</p>
      <div className="grid grid-cols-7 gap-2 items-end">
        {values.map((value, idx) => (
          <div key={`${label}-${days[idx]}`} className="flex flex-col items-center justify-end gap-1">
            <progress className={`h-20 w-full [writing-mode:vertical-lr] ${color === 'bg-[#3B82F6]' ? 'accent-[#3B82F6]' : color === 'bg-[#10B981]' ? 'accent-[#10B981]' : color === 'bg-[#D4A043]' ? 'accent-[#D4A043]' : 'accent-[#8B5CF6]'}`} max={max} value={value} aria-label={`${label} for ${days[idx]}`} />
            <span className="text-[10px] text-[#64748B]">{days[idx]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
