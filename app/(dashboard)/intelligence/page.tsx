'use client';

import { useMemo, useState } from 'react';
import { Brain, Sparkles, TrendingUp, AlertTriangle, Receipt, Car } from 'lucide-react';
import { useAppSettings } from '@/store/appSettings';
import { BusinessProfile, ClosingLog, ExpenseEntry, FubActivitySnapshot, FubScopeAuditEntry, MileageEntry, PipelineLead, getCurrentMonthClosings, useEduStorage } from '@/hooks/useEduStorage';
import { formatCurrency } from '@/lib/utils';

interface WeeklyInsight {
  createdAt: string;
  content: string;
  model?: string;
}

export default function IntelligencePage() {
  const targets = useAppSettings((state) => state.targets);
  const updateTarget = useAppSettings((state) => state.updateTarget);
  const { state: closings } = useEduStorage<ClosingLog[]>('edu_closings_v1', []);
  const { state: leads } = useEduStorage<PipelineLead[]>('edu_pipeline_leads_v1', []);
  const { state: fubActivity } = useEduStorage<FubActivitySnapshot | null>('edu_fub_activity_metrics_v1', null);
  const { state: scopeAudits } = useEduStorage<FubScopeAuditEntry[]>('edu_fub_scope_audits_v1', []);
  const { state: weeklyInsight, setState: setWeeklyInsight } = useEduStorage<WeeklyInsight | null>('edu_ai_weekly_insight_v1', null);
  const { state: aiLeadPlans, setState: setAiLeadPlans } = useEduStorage<Record<string, { createdAt: string; content: string }>>('edu_ai_lead_action_plans_v1', {});
  const { state: expenses } = useEduStorage<ExpenseEntry[]>('edu_expenses_v1', []);
  const { state: mileage } = useEduStorage<MileageEntry[]>('edu_mileage_v1', []);
  const { state: profile } = useEduStorage<BusinessProfile>('edu_business_profile_v1', {
    fullName: 'Eduardo Inoa',
    brokerage: 'Century 21 NE',
    primaryEmail: '',
    primaryPhone: '',
    mileageRate: 0.67,
  });
  const [generating, setGenerating] = useState(false);
  const [pipelineGenerating, setPipelineGenerating] = useState(false);
  const [leadPlanLoadingId, setLeadPlanLoadingId] = useState<string | null>(null);
  const [briefCopyStatus, setBriefCopyStatus] = useState('');

  const monthClosings = useMemo(() => getCurrentMonthClosings(closings), [closings]);
  const monthNet = useMemo(() => monthClosings.reduce((sum, row) => sum + row.netCommission, 0), [monthClosings]);
  const uagLeads = useMemo(() => leads.filter((lead) => lead.stage === 'uag'), [leads]);
  const staleUagCount = useMemo(() => {
    return uagLeads.filter((lead) => {
      const marker = lead.lastContactAt || lead.updatedAt;
      if (!marker) return true;
      return Date.now() - new Date(marker).getTime() > 7 * 24 * 60 * 60 * 1000;
    }).length;
  }, [uagLeads]);

  const rolling = useMemo(() => {
    if (!fubActivity || !fubActivity.byDay.length) {
      return {
        days: 0,
        avgCalls: 0,
        avgTexts: 0,
        avgEmails: 0,
        avgAppointments: 0,
        avgTouches: 0,
      };
    }
    const days = fubActivity.byDay.length;
    return {
      days,
      avgCalls: fubActivity.totals.calls / days,
      avgTexts: fubActivity.totals.texts / days,
      avgEmails: fubActivity.totals.emails / days,
      avgAppointments: fubActivity.totals.appointments / days,
      avgTouches: fubActivity.totals.touches / days,
    };
  }, [fubActivity]);

  const conversion = useMemo(() => {
    const calls = fubActivity?.totals.calls || 0;
    const appts = fubActivity?.totals.appointments || 0;
    const callToAppt = calls > 0 ? appts / calls : 0;
    const uagToClose = uagLeads.length > 0 ? monthClosings.length / uagLeads.length : 0;
    return {
      callToAppt,
      uagToClose,
    };
  }, [fubActivity?.totals.appointments, fubActivity?.totals.calls, monthClosings.length, uagLeads.length]);

  const forecast = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const elapsed = now.getDate();
    const remaining = Math.max(0, daysInMonth - elapsed);
    const projectedAdditionalAppointments = Math.round(rolling.avgAppointments * remaining);
    const apptToCloseRate = Math.max(0.06, Math.min(0.35, conversion.callToAppt * 0.6));
    const projectedAdditionalClosings = Math.round(projectedAdditionalAppointments * apptToCloseRate);
    const projectedClosings = monthClosings.length + projectedAdditionalClosings;
    const avgNetPerClosing = monthClosings.length > 0 ? monthNet / monthClosings.length : (targets.avgSalePrice * 0.03 * 0.6);
    const projectedNet = Math.round(monthNet + projectedAdditionalClosings * avgNetPerClosing);

    return {
      projectedClosings,
      projectedNet,
      projectedAdditionalAppointments,
      apptToCloseRate,
    };
  }, [conversion.callToAppt, monthClosings.length, monthNet, rolling.avgAppointments, targets.avgSalePrice]);

  const anomalies = useMemo(() => {
    const items: Array<{ level: 'high' | 'medium'; message: string }> = [];
    const rows = fubActivity?.byDay || [];

    if (rows.length >= 6) {
      const half = Math.floor(rows.length / 2);
      const firstTouches = rows.slice(0, half).reduce((sum, row) => sum + row.touches, 0);
      const lastTouches = rows.slice(half).reduce((sum, row) => sum + row.touches, 0);
      if (firstTouches > 0 && lastTouches < firstTouches * 0.75) {
        items.push({
          level: 'high',
          message: `Touch volume dropped ${Math.round(((firstTouches - lastTouches) / firstTouches) * 100)}% in the recent half of your trend window.`,
        });
      }
    }

    if (rolling.avgCalls >= targets.dailyCallGoal && rolling.avgAppointments < targets.dailyApptGoal) {
      items.push({
        level: 'high',
        message: 'Calls are on target, but appointments are under target. Focus on tighter next-step closes on every conversation.',
      });
    }

    if (staleUagCount > 0) {
      items.push({
        level: 'medium',
        message: `${staleUagCount} UAG lead(s) have stale follow-up and may threaten monthly conversion reliability.`,
      });
    }

    if (items.length === 0) {
      items.push({
        level: 'medium',
        message: 'No major anomalies detected. Maintain current cadence and keep conversion scripts sharp.',
      });
    }

    return items;
  }, [fubActivity?.byDay, rolling.avgAppointments, rolling.avgCalls, staleUagCount, targets.dailyApptGoal, targets.dailyCallGoal]);

  const adaptiveGoals = useMemo(() => {
    const suggest = (avg: number, target: number) => {
      if (target <= 0) return 0;
      if (avg >= target * 1.2) return Math.round(target * 1.15);
      if (avg <= target * 0.7) return target;
      return Math.round((avg + target) / 2);
    };

    return {
      calls: suggest(rolling.avgCalls, targets.dailyCallGoal),
      texts: suggest(rolling.avgTexts, targets.dailyTextGoal),
      appts: suggest(rolling.avgAppointments, targets.dailyApptGoal),
      emails: suggest(rolling.avgEmails, targets.dailyEmailGoal),
    };
  }, [rolling.avgAppointments, rolling.avgCalls, rolling.avgEmails, rolling.avgTexts, targets.dailyApptGoal, targets.dailyCallGoal, targets.dailyEmailGoal, targets.dailyTextGoal]);
  const scopeSummary = useMemo(() => {
    const passCount = scopeAudits.filter((item) => item.status === 'PASS').length;
    const warnCount = scopeAudits.filter((item) => item.status === 'WARN').length;
    return { passCount, warnCount, latest: scopeAudits[0] };
  }, [scopeAudits]);
  const prioritizedLeads = useMemo(() => {
    return leads
      .map((lead) => ({
        lead,
        score: scoreLeadPriority(lead),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [leads]);
  const opsInsights = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const in14 = new Date();
    in14.setDate(in14.getDate() + 14);
    const monthSpend = expenses.reduce((sum, item) => {
      const date = item.paidDate || item.dueDate;
      if (!date) return sum;
      const entryDate = new Date(date);
      if (entryDate.getFullYear() !== now.getFullYear() || entryDate.getMonth() !== now.getMonth()) return sum;
      return sum + item.amount;
    }, 0);
    const ytdSpend = expenses.reduce((sum, item) => {
      const date = item.paidDate || item.dueDate;
      if (!date || new Date(date).getFullYear() !== year) return sum;
      return sum + item.amount;
    }, 0);
    const dueSoon = expenses.filter((item) => item.dueDate && item.status !== 'paid' && new Date(item.dueDate) >= now && new Date(item.dueDate) <= in14);
    const dueSoonAmount = dueSoon.reduce((sum, item) => sum + item.amount, 0);
    const ytdMiles = mileage.reduce((sum, item) => new Date(item.date).getFullYear() === year ? sum + item.miles : sum, 0);
    const ytdMileageValue = ytdMiles * (profile.mileageRate || 0);
    const netAfterOps = Math.round(monthNet - monthSpend);

    return {
      monthSpend,
      ytdSpend,
      dueSoonCount: dueSoon.length,
      dueSoonAmount,
      ytdMiles,
      ytdMileageValue,
      netAfterOps,
    };
  }, [expenses, mileage, monthNet, profile.mileageRate]);

  const smartSignals = useMemo(() => {
    const callGap = Math.max(0, targets.dailyCallGoal - (fubActivity?.today.calls || 0));
    const textGap = Math.max(0, targets.dailyTextGoal - (fubActivity?.today.texts || 0));
    const apptGap = Math.max(0, targets.dailyApptGoal - (fubActivity?.today.appointments || 0));
    const emailGap = Math.max(0, targets.dailyEmailGoal - (fubActivity?.today.emails || 0));
    const monthGoalGap = Math.max(0, targets.monthGoal - monthClosings.length);
    const netGap = Math.max(0, targets.netMonthlyTarget - monthNet);

    const actionQueue = [
      {
        label: 'Call sprint',
        detail: callGap > 0
          ? `You are ${callGap} calls short of today’s goal. Block two focused call sessions and work the highest-priority leads first.`
          : 'Calls are on pace. Use your best energy window for conversions and follow-up.',
        weight: 100 - Math.min(25, callGap * 6),
      },
      {
        label: 'Appointment close',
        detail: apptGap > 0
          ? `You still need ${apptGap} appointment(s). Tighten closes and ask for the next meeting on every conversation.`
          : 'Appointments are on pace. Protect them and confirm every meeting.',
        weight: 95 - Math.min(20, apptGap * 8),
      },
      {
        label: 'UAG rescue',
        detail: staleUagCount > 0
          ? `${staleUagCount} UAG lead(s) are stale. Re-open the conversation today before it softens further.`
          : 'UAG follow-up is healthy.',
        weight: 92 - Math.min(30, staleUagCount * 5),
      },
      {
        label: 'Expense check',
        detail: opsInsights.dueSoonCount > 0
          ? `${opsInsights.dueSoonCount} expense(s) are due soon. Review cash flow and clear anything already paid.`
          : 'No immediate expense pressure.',
        weight: 75 + Math.min(10, opsInsights.dueSoonCount * 3),
      },
      {
        label: 'Content move',
        detail: 'Use one market update, one proof-of-work story, and one nurture touchpoint to keep your content engine active.',
        weight: 65 + Math.min(10, contentIdeas.filter((item) => item.status !== 'posted').length),
      },
      {
        label: 'Monthly pace',
        detail: monthGoalGap > 0
          ? `You still need ${monthGoalGap} closings and ${formatCurrency(netGap)} net this month.`
          : 'Closing goal is on pace. Shift toward pipeline quality and maintenance.',
        weight: 90 - Math.min(20, monthGoalGap * 2),
      },
    ].sort((a, b) => b.weight - a.weight).slice(0, 4);

    const smartScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          70 +
            (conversion.callToAppt > 0.15 ? 8 : -4) +
            (staleUagCount === 0 ? 6 : -Math.min(12, staleUagCount * 3)) +
            (opsInsights.dueSoonCount === 0 ? 4 : -Math.min(8, opsInsights.dueSoonCount * 2)) +
            (monthGoalGap === 0 ? 8 : -Math.min(12, monthGoalGap * 2)) +
            (fubActivity?.byDay?.length ? Math.min(8, Math.round(rolling.avgTouches / 3)) : 0)
        )
      )
    );

    return {
      smartScore,
      actionQueue,
      summary:
        smartScore >= 85
          ? 'Strong operating rhythm. Keep the cadence and protect the pipeline.'
          : smartScore >= 70
            ? 'Good momentum, but a few high-value items need attention now.'
            : 'The system needs a tighter day. Start with the top action and work down.',
    };
  }, [contentIdeas, conversion.callToAppt, fubActivity?.byDay?.length, fubActivity?.today.appointments, fubActivity?.today.calls, fubActivity?.today.emails, fubActivity?.today.texts, monthClosings.length, monthNet, opsInsights.dueSoonCount, opsInsights.netAfterOps, staleUagCount, targets.dailyApptGoal, targets.dailyCallGoal, targets.dailyEmailGoal, targets.dailyTextGoal, targets.monthGoal, targets.netMonthlyTarget, rolling.avgTouches]);

    const smartBrief = useMemo(() => {
      return [
        `Smart Brief for ${new Date().toLocaleDateString()}`,
        `Score: ${smartSignals.smartScore}/100`,
        `Status: ${smartSignals.summary}`,
        `Projected closings: ${forecast.projectedClosings} | Projected net: ${formatCurrency(forecast.projectedNet)}`,
        `Ops pressure: ${opsInsights.dueSoonCount} due soon, ${formatCurrency(opsInsights.monthSpend)} month spend, ${opsInsights.ytdMiles.toFixed(0)} miles tracked`,
        `Pipeline: ${staleUagCount} stale UAG risk, ${monthClosings.length}/${targets.monthGoal} closings, ${formatCurrency(monthNet)} net`,
        `Top actions: ${smartSignals.actionQueue.map((action) => `${action.label} - ${action.detail}`).join(' | ')}`,
      ].join('\n');
    }, [forecast.projectedClosings, forecast.projectedNet, monthClosings.length, monthNet, opsInsights.dueSoonCount, opsInsights.monthSpend, opsInsights.ytdMiles, smartSignals.actionQueue, smartSignals.smartScore, smartSignals.summary, staleUagCount, targets.monthGoal]);

    const copySmartBrief = async () => {
      try {
        await navigator.clipboard.writeText(smartBrief);
        setBriefCopyStatus('Smart brief copied');
      } catch {
        setBriefCopyStatus('Copy failed');
      } finally {
        window.setTimeout(() => setBriefCopyStatus(''), 1800);
      }
    };

  const generateWeeklyStrategy = async () => {
    setGenerating(true);
    try {
      const context = [
        `Assigned user: ${fubActivity?.assignedUserName || 'Eduardo Inoa'}`,
        `Current month closings: ${monthClosings.length}/${targets.monthGoal}`,
        `Current month net: ${formatCurrency(monthNet)} of ${formatCurrency(targets.netMonthlyTarget)}`,
        `Rolling averages (${rolling.days} days): calls ${rolling.avgCalls.toFixed(1)}, texts ${rolling.avgTexts.toFixed(1)}, emails ${rolling.avgEmails.toFixed(1)}, appointments ${rolling.avgAppointments.toFixed(1)}`,
        `Call->appointment ratio: ${(conversion.callToAppt * 100).toFixed(1)}%`,
        `UAG leads: ${uagLeads.length}, stale UAG: ${staleUagCount}`,
        `Forecast: ${forecast.projectedClosings} projected closings, ${formatCurrency(forecast.projectedNet)} projected net`,
        `Adaptive goals recommendation: calls ${adaptiveGoals.calls}, texts ${adaptiveGoals.texts}, appts ${adaptiveGoals.appts}, emails ${adaptiveGoals.emails}`,
        `Business ops: month spend ${formatCurrency(opsInsights.monthSpend)}, due soon ${opsInsights.dueSoonCount} for ${formatCurrency(opsInsights.dueSoonAmount)}, YTD spend ${formatCurrency(opsInsights.ytdSpend)}, YTD miles ${opsInsights.ytdMiles.toFixed(0)} worth ${formatCurrency(Math.round(opsInsights.ytdMileageValue))}`,
        `Anomalies: ${anomalies.map((a) => a.message).join(' | ')}`,
        'Provide an advanced weekly strategy with tactical actions, scripts/process improvements, and measurable checkpoints.',
      ].join('\n');

      const res = await fetch('/api/ai/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'weekly_strategy_failed');

      setWeeklyInsight({
        createdAt: new Date().toISOString(),
        content: data.content || '',
        model: data.model,
      });
    } catch {
      setWeeklyInsight({
        createdAt: new Date().toISOString(),
        content: 'Unable to generate weekly strategy right now. Check your AI API settings and retry.',
      });
    } finally {
      setGenerating(false);
    }
  };

  const generatePipelineAnalysis = async () => {
    setPipelineGenerating(true);
    try {
      const context = prioritizedLeads.map(({ lead, score }) => {
        const staleDays = getLeadAgingDays(lead);
        return `${lead.name} | stage=${lead.stage} | source=${lead.lead_source} | staleDays=${staleDays} | expectedClose=${lead.expectedCloseDate || 'n/a'} | score=${score}`;
      }).join('\n');

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pipeline_review', context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'pipeline_review_failed');

      setWeeklyInsight({
        createdAt: new Date().toISOString(),
        content: data.content || '',
        model: data.model,
      });
    } catch {
      setWeeklyInsight({
        createdAt: new Date().toISOString(),
        content: 'Unable to generate pipeline analysis right now. Retry after confirming AI credentials.',
      });
    } finally {
      setPipelineGenerating(false);
    }
  };

  const generateLeadActionPlan = async (lead: PipelineLead) => {
    setLeadPlanLoadingId(lead.id);
    try {
      const context = [
        `Lead: ${lead.name}`,
        `Stage: ${lead.stage}`,
        `Source: ${lead.lead_source}`,
        `Days in stage: ${lead.days_in_stage}`,
        `Expected close: ${lead.expectedCloseDate || 'n/a'}`,
        `Last contact days ago: ${getLeadAgingDays(lead)}`,
        `Notes: ${lead.notes || 'n/a'}`,
        'Create an action plan focused on exactly who to contact, what to say, and what outcome to get. Eduardo will execute in FUB, not in this platform.',
      ].join('\n');

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'action_plan', context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'action_plan_failed');

      setAiLeadPlans((prev) => ({
        ...prev,
        [lead.id]: {
          createdAt: new Date().toISOString(),
          content: String(data.content || ''),
        },
      }));
    } catch {
      setAiLeadPlans((prev) => ({
        ...prev,
        [lead.id]: {
          createdAt: new Date().toISOString(),
          content: 'Unable to generate a lead action plan right now. Retry after confirming AI credentials.',
        },
      }));
    } finally {
      setLeadPlanLoadingId(null);
    }
  };

  const applySuggestedGoals = () => {
    updateTarget('dailyCallGoal', adaptiveGoals.calls);
    updateTarget('dailyTextGoal', adaptiveGoals.texts);
    updateTarget('dailyApptGoal', adaptiveGoals.appts);
    updateTarget('dailyEmailGoal', adaptiveGoals.emails);
  };

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9] mb-2">Intelligence</h1>
        <p className="text-[#94A3B8]">Forecasting, anomaly detection, and AI strategy tuned to your real FUB performance data.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Projected Closings" value={`${forecast.projectedClosings}`} tone="text-[#3B82F6]" />
        <MetricCard label="Projected Net" value={formatCurrency(forecast.projectedNet)} tone="text-[#10B981]" />
        <MetricCard label="Call->Appt Ratio" value={`${(conversion.callToAppt * 100).toFixed(1)}%`} tone="text-[#D4A043]" />
        <MetricCard label="Stale UAG Risk" value={`${staleUagCount}`} tone={staleUagCount > 0 ? 'text-red' : 'text-[#10B981]'} />
      </div>

      <div className="bg-gradient-to-r from-[#1E293B] to-[#0B1220] border border-[#334155] rounded-lg p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-[#F1F5F9] flex items-center gap-2">
              <Sparkles size={18} className="text-[#D4A043]" /> Smart Command Center
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">A live operating score built from your business data, FUB signals, and operations.</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#94A3B8] uppercase">Smart Score</p>
            <p className={`text-3xl font-bold ${smartSignals.smartScore >= 85 ? 'text-[#10B981]' : smartSignals.smartScore >= 70 ? 'text-[#D4A043]' : 'text-red'}`}>{smartSignals.smartScore}</p>
          </div>
        </div>
        <p className="text-sm text-[#E2E8F0] mb-4">{smartSignals.summary}</p>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button onClick={copySmartBrief} className="px-3 py-1.5 rounded bg-[#D4A043] hover:bg-[#E8B84F] text-[#07090F] text-sm font-semibold">
            Copy Brief
          </button>
          <span className="text-xs text-[#94A3B8]">Paste this into a text, email, or team update.</span>
          {briefCopyStatus && <span className="text-xs text-[#CBD5E1]">{briefCopyStatus}</span>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {smartSignals.actionQueue.map((action) => (
            <div key={action.label} className="bg-[#0D1117] border border-[#1E293B] rounded-lg p-3">
              <p className="text-sm font-semibold text-[#F1F5F9]">{action.label}</p>
              <p className="text-xs text-[#94A3B8] mt-1 leading-6">{action.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={18} className="text-[#D4A043]" />
          <h2 className="text-lg font-semibold text-[#F1F5F9]">Anomaly Radar</h2>
        </div>
        <div className="space-y-2">
          {anomalies.map((item, idx) => (
            <p key={`anomaly-${idx}`} className={`text-sm ${item.level === 'high' ? 'text-red' : 'text-[#CBD5E1]'}`}>
              • {item.message}
            </p>
          ))}
        </div>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-[#D4A043]" />
            <h2 className="text-lg font-semibold text-[#F1F5F9]">Business Ops Intelligence</h2>
          </div>
          <p className="text-xs text-[#94A3B8]">Manual ops layer calibrated from Profile, Expenses, and Mileage</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <GoalTile label="Month Spend" current={Math.round(opsInsights.monthSpend)} suggested={Math.round(monthNet)} />
          <GoalTile label="Due Soon" current={opsInsights.dueSoonCount} suggested={0} />
          <GoalTile label="YTD Miles" current={Math.round(opsInsights.ytdMiles)} suggested={Math.round(opsInsights.ytdMileageValue)} />
          <GoalTile label="Net After Ops" current={opsInsights.netAfterOps} suggested={Math.round(targets.netMonthlyTarget)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-[#0D1117] border border-[#1E293B] rounded p-3">
            <p className="text-xs text-[#64748B] uppercase">Ops Burn</p>
            <p className="text-lg font-semibold text-red mt-1">{formatCurrency(opsInsights.monthSpend)}</p>
            <p className="text-xs text-[#94A3B8] mt-1">YTD {formatCurrency(opsInsights.ytdSpend)}</p>
          </div>
          <div className="bg-[#0D1117] border border-[#1E293B] rounded p-3">
            <div className="flex items-center gap-2 mb-1">
              <Receipt size={14} className="text-[#D4A043]" />
              <p className="text-xs text-[#64748B] uppercase">Upcoming Dues</p>
            </div>
            <p className="text-lg font-semibold text-[#D4A043]">{opsInsights.dueSoonCount}</p>
            <p className="text-xs text-[#94A3B8] mt-1">{formatCurrency(opsInsights.dueSoonAmount)} due in 14 days</p>
          </div>
          <div className="bg-[#0D1117] border border-[#1E293B] rounded p-3">
            <div className="flex items-center gap-2 mb-1">
              <Car size={14} className="text-[#3B82F6]" />
              <p className="text-xs text-[#64748B] uppercase">Mileage Value</p>
            </div>
            <p className="text-lg font-semibold text-[#3B82F6]">{opsInsights.ytdMiles.toFixed(0)} mi</p>
            <p className="text-xs text-[#94A3B8] mt-1">{formatCurrency(Math.round(opsInsights.ytdMileageValue))} estimated value</p>
          </div>
        </div>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold text-[#F1F5F9]">FUB Scope Health</h2>
          <div className="text-xs text-[#94A3B8]">
            PASS: <span className="text-[#10B981] font-semibold">{scopeSummary.passCount}</span> • WARN: <span className="text-red font-semibold">{scopeSummary.warnCount}</span>
          </div>
        </div>
        {scopeSummary.latest ? (
          <div className="space-y-2">
            <p className="text-xs text-[#94A3B8]">Latest: {new Date(scopeSummary.latest.createdAt).toLocaleString()} • {scopeSummary.latest.assignedUserName}</p>
            <p className={`text-sm font-semibold ${scopeSummary.latest.status === 'PASS' ? 'text-[#10B981]' : 'text-red'}`}>{scopeSummary.latest.status}</p>
            <p className="text-xs text-[#CBD5E1]">{scopeSummary.latest.reason}</p>
            <div className="max-h-44 overflow-y-auto space-y-2 pt-2">
              {scopeAudits.slice(0, 10).map((audit) => (
                <div key={audit.id} className="bg-[#0D1117] border border-[#1E293B] rounded p-2">
                  <p className="text-[11px] text-[#94A3B8]">{new Date(audit.createdAt).toLocaleString()} • {audit.assignedUserName}</p>
                  <p className={`text-xs font-semibold ${audit.status === 'PASS' ? 'text-[#10B981]' : 'text-red'}`}>{audit.status}</p>
                  <p className="text-[11px] text-[#64748B]">
                    Leads {audit.leadScope.assigned}/{audit.leadScope.total} • Events {audit.sourceCounts.events.scoped}/{audit.sourceCounts.events.total} • Appts {audit.sourceCounts.appointments.scoped}/{audit.sourceCounts.appointments.total} • Tasks {audit.sourceCounts.tasks.scoped}/{audit.sourceCounts.tasks.total}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#94A3B8]">No scope audits yet. Run Follow Boss sync from Today to generate audit entries.</p>
        )}
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={18} className="text-[#3B82F6]" />
          <h2 className="text-lg font-semibold text-[#F1F5F9]">Adaptive Goal Recommendations</h2>
        </div>
        <p className="text-xs text-[#94A3B8] mb-4">Auto-calibrated from your rolling FUB averages and current targets.</p>
        <button
          onClick={applySuggestedGoals}
          className="mb-4 px-3 py-1.5 rounded bg-[#1E293B] hover:bg-[#334155] text-[#F1F5F9] text-sm"
        >
          Apply Suggested Goals
        </button>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <GoalTile label="Calls" current={targets.dailyCallGoal} suggested={adaptiveGoals.calls} />
          <GoalTile label="Texts" current={targets.dailyTextGoal} suggested={adaptiveGoals.texts} />
          <GoalTile label="Appts" current={targets.dailyApptGoal} suggested={adaptiveGoals.appts} />
          <GoalTile label="Emails" current={targets.dailyEmailGoal} suggested={adaptiveGoals.emails} />
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#1E293B] to-[#0B1220] border border-[#334155] rounded-lg p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-[#A78BFA]" />
            <h2 className="text-lg font-semibold text-[#F1F5F9]">AI Weekly Strategy</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={generatePipelineAnalysis}
              disabled={pipelineGenerating}
              className="px-3 py-1.5 rounded bg-[#1E293B] hover:bg-[#334155] disabled:opacity-60 text-[#F1F5F9] text-sm font-semibold inline-flex items-center gap-2"
            >
              <Sparkles size={14} />
              {pipelineGenerating ? 'Analyzing...' : 'Analyze Pipeline'}
            </button>
            <button
              onClick={generateWeeklyStrategy}
              disabled={generating}
              className="px-3 py-1.5 rounded bg-[#D4A043] hover:bg-[#E8B84F] disabled:opacity-60 text-[#07090F] text-sm font-semibold inline-flex items-center gap-2"
            >
              <Sparkles size={14} />
              {generating ? 'Generating...' : 'Generate Strategy'}
            </button>
          </div>
        </div>
        {weeklyInsight?.content ? (
          <div>
            <p className="text-[11px] text-[#94A3B8] mb-2">
              Generated {new Date(weeklyInsight.createdAt).toLocaleString()} {weeklyInsight.model ? `• ${weeklyInsight.model}` : ''}
            </p>
            <p className="text-sm text-[#E2E8F0] whitespace-pre-wrap">{weeklyInsight.content}</p>
          </div>
        ) : (
          <p className="text-sm text-[#94A3B8]">Generate a strategy to receive a detailed weekly operating plan based on your latest data.</p>
        )}
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={18} className="text-[#3B82F6]" />
          <h2 className="text-lg font-semibold text-[#F1F5F9]">Prioritized Contact Queue</h2>
        </div>
        <p className="text-xs text-[#94A3B8] mb-4">Highest-impact leads to review in FUB based on stage, staleness, expected close timing, and source value.</p>
        <div className="space-y-3">
          {prioritizedLeads.map(({ lead, score }) => (
            <div key={lead.id} className="bg-[#0D1117] border border-[#1E293B] rounded p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#F1F5F9]">{lead.name}</p>
                  <p className="text-xs text-[#94A3B8] mt-1">Stage {lead.stage.toUpperCase()} • Source {lead.lead_source} • Priority {score}</p>
                  <p className="text-xs text-[#CBD5E1] mt-2">Recommended next move: {buildLeadRecommendation(lead)}</p>
                </div>
                <button
                  onClick={() => generateLeadActionPlan(lead)}
                  disabled={leadPlanLoadingId === lead.id}
                  className="px-3 py-1.5 rounded bg-[#D4A043] hover:bg-[#E8B84F] disabled:opacity-60 text-[#07090F] text-xs font-semibold"
                >
                  {leadPlanLoadingId === lead.id ? 'Generating...' : 'Action Plan'}
                </button>
              </div>
              {aiLeadPlans[lead.id]?.content && (
                <div className="mt-3 pt-3 border-t border-[#1E293B]">
                  <p className="text-[11px] text-[#94A3B8] mb-2">AI Lead Plan • {new Date(aiLeadPlans[lead.id].createdAt).toLocaleString()}</p>
                  <p className="text-xs text-[#E2E8F0] whitespace-pre-wrap">{aiLeadPlans[lead.id].content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getLeadAgingDays(lead: PipelineLead) {
  const anchor = lead.lastContactAt || lead.updatedAt;
  if (!anchor) return 999;
  return Math.floor((Date.now() - new Date(anchor).getTime()) / (1000 * 60 * 60 * 24));
}

function scoreLeadPriority(lead: PipelineLead) {
  const stageWeight: Record<PipelineLead['stage'], number> = {
    new: 35,
    nurture: 45,
    active: 70,
    uag: 95,
    closed: 10,
  };
  const staleDays = getLeadAgingDays(lead);
  let score = stageWeight[lead.stage];
  if (lead.lead_source === 'own') score += 6;
  if (lead.lead_source === 'zillow') score -= 4;
  if (lead.expectedCloseDate) {
    const daysToClose = Math.ceil((new Date(lead.expectedCloseDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysToClose <= 14) score += 12;
  }
  if (staleDays > 7) score += 8;
  if (staleDays > 21) score += 8;
  return Math.max(0, Math.round(score));
}

function buildLeadRecommendation(lead: PipelineLead) {
  const staleDays = getLeadAgingDays(lead);
  if (lead.stage === 'uag') return staleDays > 3 ? 'Call today, confirm contingencies/timeline, and update notes in FUB immediately.' : 'Confirm next milestone and keep momentum tight.';
  if (lead.stage === 'active') return 'Push for a concrete appointment or showing follow-up and get a calendar commitment.';
  if (lead.stage === 'nurture') return 'Send a personal text, then call if no reply, aiming to move them into an active conversation.';
  if (lead.stage === 'new') return 'First-contact fast: call, text, and set the tone with a direct next-step ask.';
  return 'Review closed lead for referral/repeat opportunity.';
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
      <p className="text-xs text-[#64748B] uppercase font-semibold">{label}</p>
      <p className={`text-xl font-bold mt-1 ${tone}`}>{value}</p>
    </div>
  );
}

function GoalTile({ label, current, suggested }: { label: string; current: number; suggested: number }) {
  const up = suggested > current;
  const down = suggested < current;
  return (
    <div className="bg-[#0D1117] border border-[#1E293B] rounded p-3">
      <p className="text-xs text-[#64748B] uppercase">{label}</p>
      <p className="text-sm text-[#F1F5F9] mt-1">Current: {current}</p>
      <p className={`text-sm font-semibold ${up ? 'text-[#10B981]' : down ? 'text-[#F59E0B]' : 'text-[#94A3B8]'}`}>
        Suggested: {suggested}
      </p>
    </div>
  );
}
