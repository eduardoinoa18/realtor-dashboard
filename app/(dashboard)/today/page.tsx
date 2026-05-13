'use client';

import { NowZone } from '@/components/dashboard/NowZone';
import { TaskList } from '@/components/dashboard/TaskList';
import { formatCurrency } from '@/lib/utils';
import { TARGETS } from '@/lib/constants';
import { AlertCircle, Brain, Calendar, Car, Receipt, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAppSettings } from '@/store/appSettings';
import { BusinessProfile, ClosingLog, ContentLog, DailyBriefing, DailyKpiLog, DailyMetricSnapshot, ExpenseEntry, FubActivitySnapshot, FubAppointment, FubScopeAuditEntry, MileageEntry, PipelineLead, getCurrentMonthClosings, useEduStorage } from '@/hooks/useEduStorage';
import { useRouter } from 'next/navigation';

export default function TodayPage() {
  const router = useRouter();
  const [displayDate, setDisplayDate] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [aiPlanLoading, setAiPlanLoading] = useState(false);
  const targets = useAppSettings((state) => state.targets);
  const { state: closings } = useEduStorage<ClosingLog[]>('edu_closings_v1', []);
  const { state: leads, setState: setLeads } = useEduStorage<PipelineLead[]>('edu_pipeline_leads_v1', []);
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
  const { state: fubActivity, setState: setFubActivity } = useEduStorage<FubActivitySnapshot | null>('edu_fub_activity_metrics_v1', null);
  const { state: scopeAudits, setState: setScopeAudits } = useEduStorage<FubScopeAuditEntry[]>('edu_fub_scope_audits_v1', []);
  const { state: fubAppointments, setState: setFubAppointments } = useEduStorage<FubAppointment[]>('edu_fub_appointments_v1', []);
  const { state: fubSyncAudit, setState: setFubSyncAudit } = useEduStorage<Record<string, { syncedAt: string; eventsScoped: number; eventsTotal: number; unclassifiedEvents: number; sampleUnclassified: string[]; calls: number; texts: number; emails: number; appointments: number; tasks: number }>>('edu_fub_sync_audit_v1', {});
  const { state: aiDailyPlan, setState: setAiDailyPlan } = useEduStorage<Record<string, { createdAt: string; content: string }>>('edu_ai_daily_plan_v1', {});
  const { state: expenses } = useEduStorage<ExpenseEntry[]>('edu_expenses_v1', []);
  const { state: mileage } = useEduStorage<MileageEntry[]>('edu_mileage_v1', []);
  const { state: profile } = useEduStorage<BusinessProfile>('edu_business_profile_v1', {
    fullName: 'Eduardo Inoa',
    brokerage: 'Century 21 NE',
    primaryEmail: '',
    primaryPhone: '',
    mileageRate: 0.67,
  });
  const latestScopeAudit = scopeAudits[0];
  const latestFubSyncAudit = fubSyncAudit[todayKey] || null;

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
  const fubTrend = useMemo(() => {
    if (!fubActivity?.byDay?.length) {
      return {
        avgCalls: 0,
        avgTexts: 0,
        avgEmails: 0,
        avgAppts: 0,
      };
    }
    const days = fubActivity.byDay.length;
    const sums = fubActivity.byDay.reduce(
      (acc, row) => ({
        calls: acc.calls + row.calls,
        texts: acc.texts + row.texts,
        emails: acc.emails + row.emails,
        appts: acc.appts + row.appointments,
      }),
      { calls: 0, texts: 0, emails: 0, appts: 0 }
    );

    return {
      avgCalls: Math.round(sums.calls / days),
      avgTexts: Math.round(sums.texts / days),
      avgEmails: Math.round(sums.emails / days),
      avgAppts: Math.round(sums.appts / days),
    };
  }, [fubActivity]);
  const performanceTips = useMemo(() => {
    const tips: string[] = [];
    const callGap = Math.max(0, targets.dailyCallGoal - daily.calls);
    const textGap = Math.max(0, targets.dailyTextGoal - daily.texts);
    const apptGap = Math.max(0, targets.dailyApptGoal - daily.appts);
    const emailGap = Math.max(0, targets.dailyEmailGoal - daily.emails);

    if (callGap > 0) {
      tips.push(`You are ${callGap} calls under goal. Block two 25-minute call sprints and prioritize hot/UAG follow-up first.`);
    } else {
      tips.push('Calls are on pace. Keep call quality high by focusing on appointment conversion scripts.');
    }

    if (textGap > 0) {
      tips.push(`Texts are ${textGap} under target. Send quick check-ins to warm nurture leads before 4pm.`);
    }

    if (apptGap > 0 && daily.calls > 0) {
      const apptRate = ((daily.appts / Math.max(1, daily.calls)) * 100).toFixed(1);
      tips.push(`Appointment rate is ${apptRate}%. Aim for stronger closes on calls with a clear next-step ask.`);
    }

    if (emailGap > 0) {
      tips.push(`Emails are ${emailGap} below plan. Send one market update and one lender/partner touchpoint today.`);
    }

    if (fubActivity) {
      if (fubTrend.avgAppts < targets.dailyApptGoal) {
        tips.push(`7-day FUB average appointments is ${fubTrend.avgAppts}/day. Improve by converting nurture conversations into booked consults.`);
      }
      if (fubTrend.avgCalls >= targets.dailyCallGoal && fubTrend.avgAppts < targets.dailyApptGoal) {
        tips.push('Call volume is strong, but conversion lags. Review objection handling and closing language on first call.');
      }
    }

    return tips.slice(0, 4);
  }, [daily.appts, daily.calls, daily.emails, daily.texts, fubActivity, fubTrend.avgAppts, fubTrend.avgCalls, targets.dailyApptGoal, targets.dailyCallGoal, targets.dailyEmailGoal, targets.dailyTextGoal]);
  const executionPlan = useMemo(() => {
    const blocks: Array<{ time: string; title: string; action: string }> = [];
    const hot = leads.filter((lead) => lead.stage === 'uag' || lead.stage === 'active').slice(0, 4);
    const callGap = Math.max(0, targets.dailyCallGoal - daily.calls);
    const textGap = Math.max(0, targets.dailyTextGoal - daily.texts);
    const apptGap = Math.max(0, targets.dailyApptGoal - daily.appts);

    blocks.push({
      time: 'Next 45 min',
      title: 'Revenue Calls Sprint',
      action: callGap > 0
        ? `Complete ${Math.min(10, callGap)} calls focused on ${hot.map((lead) => lead.name).join(', ') || 'UAG and Active leads'}.`
        : 'Calls are on pace. Use this block for high-conversion follow-ups and setting appointments.',
    });

    blocks.push({
      time: '+45 to +90 min',
      title: 'Appointment Conversion Block',
      action: apptGap > 0
        ? `Book ${Math.min(2, apptGap)} appointments from your warmest conversations and confirm next-step commitments.`
        : 'Protect current appointments: confirm attendance and prep scripts for each meeting.',
    });

    blocks.push({
      time: '+90 to +120 min',
      title: 'Text + Email Layer',
      action: `Send ${Math.min(8, Math.max(4, textGap))} quick text check-ins and ${Math.max(2, Math.ceil(Math.max(0, targets.dailyEmailGoal - daily.emails) / 2))} high-intent emails.`,
    });

    blocks.push({
      time: 'End of day',
      title: 'Pipeline Hygiene + Tomorrow Setup',
      action: `Update notes for all UAG leads (${staleUag.length} stale risk) and set tomorrow's top 3 priorities in the task list.`,
    });

    return blocks;
  }, [daily.appts, daily.calls, daily.emails, daily.texts, leads, staleUag.length, targets.dailyApptGoal, targets.dailyCallGoal, targets.dailyEmailGoal, targets.dailyTextGoal]);
  const opsSnapshot = useMemo(() => {
    const now = new Date();
    const in14 = new Date();
    in14.setDate(in14.getDate() + 14);
    const monthSpend = expenses.reduce((sum, item) => {
      const date = item.paidDate || item.dueDate;
      if (!date) return sum;
      const entryDate = new Date(date);
      if (entryDate.getFullYear() !== now.getFullYear() || entryDate.getMonth() !== now.getMonth()) return sum;
      return sum + item.amount;
    }, 0);
    const dueSoon = expenses.filter((item) => item.dueDate && item.status !== 'paid' && new Date(item.dueDate) >= now && new Date(item.dueDate) <= in14);
    const monthMiles = mileage.reduce((sum, item) => {
      const entryDate = new Date(item.date);
      if (entryDate.getFullYear() !== now.getFullYear() || entryDate.getMonth() !== now.getMonth()) return sum;
      return sum + item.miles;
    }, 0);

    return {
      monthSpend,
      dueSoon,
      monthMiles,
      monthMileageValue: monthMiles * (profile.mileageRate || 0),
      vehicleLabel: [profile.vehicleYear, profile.vehicleMake, profile.vehicleModel].filter(Boolean).join(' '),
    };
  }, [expenses, mileage, profile.mileageRate, profile.vehicleMake, profile.vehicleModel, profile.vehicleYear]);

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
    const fubSummary = fubActivity
      ? `FUB 7-day averages: Calls ${fubTrend.avgCalls}, Texts ${fubTrend.avgTexts}, Emails ${fubTrend.avgEmails}, Appointments ${fubTrend.avgAppts}.`
      : 'FUB activity sync pending. Run sync to calibrate metrics and coaching.';
    const opsSummary = `Business ops: ${formatCurrency(opsSnapshot.monthSpend)} spend this month, ${opsSnapshot.dueSoon.length} dues due soon, ${opsSnapshot.monthMiles.toFixed(0)} miles logged (${formatCurrency(Math.round(opsSnapshot.monthMileageValue))}).`;

    return [
      `Daily briefing for ${displayDate || todayKey}:`,
      `- KPI pace: Calls ${callPace}, Texts ${textPace}, Appts ${apptPace}, Emails ${emailPace}.`,
      `- Month progress: ${monthClosings.length}/${targets.monthGoal} closings, ${formatCurrency(monthNet)} closed net (${formatCurrency(monthNetGap)} to monthly net target).`,
      `- Pipeline risk: ${pipelineRisk}.`,
      `- ${fubSummary}`,
      `- ${opsSummary}`,
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
    const firstName = String(profile.fullName || 'Eduardo').trim().split(/\s+/)[0] || 'Eduardo';
    const hour = new Date().getHours();
    if (hour < 12) return `Good morning, ${firstName}`;
    if (hour < 18) return `Good afternoon, ${firstName}`;
    return `Good evening, ${firstName}`;
  }, [profile.fullName]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus('');
    try {
      const [people, appointments, metrics] = await Promise.all([
        fetch('/api/fub?type=people'),
        fetch('/api/fub?type=appointments'),
        fetch('/api/fub?type=activityMetrics&days=7'),
      ]);
      if (!people.ok || !appointments.ok || !metrics.ok) {
        throw new Error('sync_failed');
      }
      const peopleJson = await people.json();
      const appointmentsJson = await appointments.json();
      const metricsJson = await metrics.json();
      const peopleRows = Array.isArray(peopleJson?.people) ? peopleJson.people : [];
      const currentCount = Number(peopleJson?.count || 0);
      const previousCount = Number(localStorage.getItem('edu_fub_last_count') || '0');
      const delta = Math.max(0, currentCount - previousCount);
      localStorage.setItem('edu_fub_last_count', String(currentCount));
      localStorage.setItem('edu_last_sync', String(Date.now()));

      const mappedLeads = peopleRows.map((p: any) => {
        const fullName = p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown Lead';
        const phone = p.phones?.[0]?.value || p.phone || undefined;
        const email = p.emails?.[0]?.value || p.email || undefined;
        const stage = mapFubStage(p.stage || p.stageName || p?.tags?.join(' '));
        const leadSource = mapFubLeadSource(p.source || p.sourceName || p.leadSource || p?.tags?.join(' '));

        return {
          id: `fub-${p.id}`,
          fubId: String(p.id),
          name: fullName,
          phone,
          email,
          lead_source: leadSource,
          stage,
          days_in_stage: Number(p.daysInStage || 0),
          price_range_max: Number(p.priceRangeMax || p.price || 0) || undefined,
          notes: p.notes || undefined,
          updatedAt: p.updated || new Date().toISOString(),
          lastContactAt: p.lastCommunication || p.updated || undefined,
        } as PipelineLead;
      });

      setLeads((prev) => {
        const byFubId = new Map(prev.filter((lead) => lead.fubId).map((lead) => [String(lead.fubId), lead]));
        const untouchedLocal = prev.filter((lead) => !lead.fubId);
        const merged = mappedLeads.map((incoming: PipelineLead) => {
          const existing = byFubId.get(String(incoming.fubId));
          if (!existing) return incoming;
          return {
            ...existing,
            ...incoming,
            id: existing.id,
            notes: existing.notes || incoming.notes,
          };
        });
        return [...untouchedLocal, ...merged];
      });

      if (metricsJson?.today) {
        setDaily((prev) => ({
          ...prev,
          calls: Math.max(prev.calls, Number(metricsJson.today.calls || 0)),
          texts: Math.max(prev.texts, Number(metricsJson.today.texts || 0)),
          emails: Math.max(prev.emails, Number(metricsJson.today.emails || 0)),
          appts: Math.max(prev.appts, Number(metricsJson.today.appointments || 0)),
          date: todayKey,
        }));
      }

      if (Array.isArray(metricsJson?.byDay)) {
        setDailyMetrics((prev) => {
          const next = { ...prev };
          for (const row of metricsJson.byDay) {
            next[row.date] = {
              calls: Number(row.calls || 0),
              texts: Number(row.texts || 0),
              emails: Number(row.emails || 0),
              appts: Number(row.appointments || 0),
              closings: prev[row.date]?.closings || 0,
            };
          }
          return next;
        });
      }

      const mappedFubAppointments: FubAppointment[] = Array.isArray(appointmentsJson?.appointments)
        ? appointmentsJson.appointments.map((item: any) => ({
            id: String(item?.id || `${item?.start || item?.startDate || Date.now()}`),
            title: String(item?.title || item?.name || item?.type || 'Appointment'),
            startAt: String(item?.start || item?.startDate || item?.date || new Date().toISOString()),
            endAt: item?.end || item?.endDate || undefined,
            location: item?.location || undefined,
            personName: item?.person?.name || item?.lead?.name || item?.contact?.name || undefined,
            source: 'fub',
          }))
        : [];

      let mappedGoogleAppointments: FubAppointment[] = [];
      const calendarId = String(profile.googleCalendarId || profile.primaryEmail || '').trim();
      const calendarFeed = String(profile.googleCalendarIcsUrl || '').trim();
      if (calendarId || calendarFeed) {
        try {
          const calendarQuery = calendarId
            ? `calendarId=${encodeURIComponent(calendarId)}`
            : `icsUrl=${encodeURIComponent(calendarFeed)}`;
          const googleRes = await fetch(`/api/calendar?startDate=${todayKey}&endDate=${todayKey}&${calendarQuery}`);
          if (googleRes.ok) {
            const googleJson = await googleRes.json();
            mappedGoogleAppointments = Array.isArray(googleJson?.events)
              ? googleJson.events.map((item: any) => ({
                  id: `google-${String(item.id || `${item.startAt}-${item.title}`)}`,
                  title: String(item.title || profile.googleCalendarLabel || 'Google Calendar Event'),
                  startAt: String(item.startAt || new Date().toISOString()),
                  endAt: item.endAt || undefined,
                  location: item.location || undefined,
                  source: 'google',
                }))
              : [];
          }
        } catch {
          // Keep sync resilient when Google feed is unavailable.
        }
      }

      const mergedAppointments = [...mappedFubAppointments, ...mappedGoogleAppointments]
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      setFubAppointments(mergedAppointments);

      setFubActivity({
        syncedAt: new Date().toISOString(),
        assignedUserName: String(metricsJson?.assignedUser?.name || 'Eduardo Inoa'),
        assignedUserId: metricsJson?.assignedUser?.id ? String(metricsJson.assignedUser.id) : undefined,
        startDate: String(metricsJson?.dateRange?.startDate || todayKey),
        endDate: String(metricsJson?.dateRange?.endDate || todayKey),
        totals: {
          calls: Number(metricsJson?.totals?.calls || 0),
          texts: Number(metricsJson?.totals?.texts || 0),
          emails: Number(metricsJson?.totals?.emails || 0),
          appointments: Number(metricsJson?.totals?.appointments || 0),
          tasks: Number(metricsJson?.totals?.tasks || 0),
          touches: Number(metricsJson?.totals?.touches || 0),
        },
        today: {
          date: String(metricsJson?.today?.date || todayKey),
          calls: Number(metricsJson?.today?.calls || 0),
          texts: Number(metricsJson?.today?.texts || 0),
          emails: Number(metricsJson?.today?.emails || 0),
          appointments: Number(metricsJson?.today?.appointments || 0),
          tasks: Number(metricsJson?.today?.tasks || 0),
          touches: Number(metricsJson?.today?.touches || 0),
        },
        byDay: Array.isArray(metricsJson?.byDay) ? metricsJson.byDay.map((row: any) => ({
          date: String(row.date),
          calls: Number(row.calls || 0),
          texts: Number(row.texts || 0),
          emails: Number(row.emails || 0),
          appointments: Number(row.appointments || 0),
          tasks: Number(row.tasks || 0),
          touches: Number(row.touches || 0),
        })) : [],
        classificationDiagnostics: {
          classifiedEvents: Number(metricsJson?.classificationDiagnostics?.classifiedEvents || 0),
          unclassifiedEvents: Number(metricsJson?.classificationDiagnostics?.unclassifiedEvents || 0),
          sampleUnclassified: Array.isArray(metricsJson?.classificationDiagnostics?.sampleUnclassified)
            ? metricsJson.classificationDiagnostics.sampleUnclassified.slice(0, 10).map((item: any) => String(item))
            : [],
        },
      });

      const ownerName = String(metricsJson?.assignedUser?.name || 'Eduardo Inoa');
      const assignedCount = Number(metricsJson?.leadScope?.assignedPeopleCount || currentCount);
      const totalCount = Number(metricsJson?.leadScope?.totalPeopleCount || currentCount);
      const scopedEvents = Number(metricsJson?.sourceCounts?.events?.scoped || 0);
      const totalEvents = Number(metricsJson?.sourceCounts?.events?.total || scopedEvents);
      const scopedAppointments = Number(metricsJson?.sourceCounts?.appointments?.scoped || 0);
      const totalAppointments = Number(metricsJson?.sourceCounts?.appointments?.total || scopedAppointments);
      const scopedTasks = Number(metricsJson?.sourceCounts?.tasks?.scoped || 0);
      const totalTasks = Number(metricsJson?.sourceCounts?.tasks?.total || scopedTasks);
      const communications = Number(metricsJson?.totals?.calls || 0) + Number(metricsJson?.totals?.texts || 0) + Number(metricsJson?.totals?.emails || 0);
      const unclassifiedEvents = Number(metricsJson?.classificationDiagnostics?.unclassifiedEvents || 0);
      const sampleUnclassified = Array.isArray(metricsJson?.classificationDiagnostics?.sampleUnclassified)
        ? metricsJson.classificationDiagnostics.sampleUnclassified.slice(0, 10).map((item: any) => String(item))
        : [];

      const hasAnomaly = (
        assignedCount > totalCount ||
        scopedEvents > totalEvents ||
        scopedAppointments > totalAppointments ||
        scopedTasks > totalTasks ||
        (totalCount > 0 && assignedCount === 0)
      );
      const status: FubScopeAuditEntry['status'] = hasAnomaly ? 'WARN' : 'PASS';
      const reason = hasAnomaly
        ? 'Potential scope mismatch detected (counts outside expected bounds or zero assigned records from non-empty dataset).'
        : 'Scope guard active. Out-of-scope records were filtered or none were returned.';

      setScopeAudits((prev) => [
        {
          id: `${Date.now()}`,
          createdAt: new Date().toISOString(),
          assignedUserName: ownerName,
          status,
          reason,
          leadScope: {
            assigned: assignedCount,
            total: totalCount,
          },
          sourceCounts: {
            events: { scoped: scopedEvents, total: totalEvents },
            appointments: { scoped: scopedAppointments, total: totalAppointments },
            tasks: { scoped: scopedTasks, total: totalTasks },
          },
        },
        ...prev,
      ].slice(0, 10));

      setFubSyncAudit((prev) => ({
        ...prev,
        [todayKey]: {
          syncedAt: new Date().toISOString(),
          eventsScoped: scopedEvents,
          eventsTotal: totalEvents,
          unclassifiedEvents,
          sampleUnclassified,
          calls: Number(metricsJson?.totals?.calls || 0),
          texts: Number(metricsJson?.totals?.texts || 0),
          emails: Number(metricsJson?.totals?.emails || 0),
          appointments: Number(metricsJson?.totals?.appointments || 0),
          tasks: Number(metricsJson?.totals?.tasks || 0),
        },
      }));

      const googleLabel = String(profile.googleCalendarLabel || 'Google Calendar').trim();
      const googleSyncNote = (calendarId || calendarFeed)
        ? ` ${googleLabel}: ${mappedGoogleAppointments.length} appointment(s) merged.`
        : ' Google Calendar not configured.';
      const eventAuditNote = unclassifiedEvents > 0
        ? ` ${unclassifiedEvents} event(s) need classification review.`
        : '';

      setSyncStatus(delta > 0
        ? `FUB sync complete for ${ownerName}: ${assignedCount}/${totalCount} assigned leads, ${communications} comm activities (Calls ${Number(metricsJson?.totals?.calls || 0)}, Texts ${Number(metricsJson?.totals?.texts || 0)}, Emails ${Number(metricsJson?.totals?.emails || 0)}), ${scopedEvents} events, ${scopedAppointments} appointments, ${scopedTasks} tasks. ${delta} new lead updates.${googleSyncNote}${eventAuditNote}`
        : `FUB sync complete for ${ownerName}: ${assignedCount}/${totalCount} assigned leads, ${communications} comm activities (Calls ${Number(metricsJson?.totals?.calls || 0)}, Texts ${Number(metricsJson?.totals?.texts || 0)}, Emails ${Number(metricsJson?.totals?.emails || 0)}), ${scopedEvents} events, ${scopedAppointments} appointments, ${scopedTasks} tasks.${googleSyncNote}${eventAuditNote}`);
    } catch {
      setSyncStatus('Follow Up Boss sync failed. Check API key/settings.');
    } finally {
      setSyncing(false);
    }
  };

  const generateAiExecutionPlan = async () => {
    setAiPlanLoading(true);
    try {
      const topPipeline = leads
        .filter((lead) => lead.stage === 'uag' || lead.stage === 'active' || lead.stage === 'nurture')
        .slice(0, 8)
        .map((lead) => `${lead.name} (${lead.stage}, ${lead.lead_source})`)
        .join(', ');

      const context = [
        `Today KPI pace: calls ${daily.calls}/${targets.dailyCallGoal}, texts ${daily.texts}/${targets.dailyTextGoal}, appts ${daily.appts}/${targets.dailyApptGoal}, emails ${daily.emails}/${targets.dailyEmailGoal}`,
        `Month progress: closings ${monthClosings.length}/${targets.monthGoal}, net ${formatCurrency(monthNet)}/${formatCurrency(targets.netMonthlyTarget)}`,
        `Pipeline priority leads: ${topPipeline || 'No priority leads listed'}`,
        `Stale UAG risk count: ${staleUag.length}`,
        `7-day FUB trend: calls ${fubTrend.avgCalls}, texts ${fubTrend.avgTexts}, emails ${fubTrend.avgEmails}, appointments ${fubTrend.avgAppts}`,
        `Draft a tactical next-6-hours plan in ordered blocks with scripts and measurable output targets.`,
      ].join('\n');

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'coaching', context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'ai_plan_failed');

      setAiDailyPlan((prev) => ({
        ...prev,
        [todayKey]: {
          createdAt: new Date().toISOString(),
          content: String(data?.content || ''),
        },
      }));
    } catch {
      setAiDailyPlan((prev) => ({
        ...prev,
        [todayKey]: {
          createdAt: new Date().toISOString(),
          content: 'AI execution plan unavailable right now. Continue with the deterministic execution optimizer blocks and re-try AI plan shortly.',
        },
      }));
    } finally {
      setAiPlanLoading(false);
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
        {latestScopeAudit && latestScopeAudit.status === 'WARN' && (
          <div className="bg-red/10 border border-red rounded-lg p-4">
            <p className="text-sm font-semibold text-red">FUB Scope Audit Warning</p>
            <p className="text-xs text-[#94A3B8] mt-1">{latestScopeAudit.reason}</p>
          </div>
        )}
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
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
          <p className="text-sm font-semibold text-[#F1F5F9] mb-2">Performance Auto-Coach</p>
          <p className="text-xs text-[#94A3B8] mb-3">
            {fubActivity
              ? `Based on your ${fubActivity.byDay.length}-day FUB activity trend for ${fubActivity.assignedUserName}.`
              : 'Sync FUB to unlock activity-based recommendations.'}
          </p>
          <ul className="space-y-2">
            {performanceTips.map((tip, idx) => (
              <li key={`tip-${idx}`} className="text-xs text-[#CBD5E1]">• {tip}</li>
            ))}
          </ul>
        </div>
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
          <p className="text-sm font-semibold text-[#F1F5F9] mb-3">FUB Communication Snapshot</p>
          {fubActivity ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                <MiniStat label="Calls" value={fubActivity.totals.calls} tone="text-[#10B981]" />
                <MiniStat label="Texts" value={fubActivity.totals.texts} tone="text-[#3B82F6]" />
                <MiniStat label="Emails" value={fubActivity.totals.emails} tone="text-[#D4A043]" />
                <MiniStat label="Appts" value={fubActivity.totals.appointments} tone="text-[#A78BFA]" />
                <MiniStat label="Tasks" value={fubActivity.totals.tasks} tone="text-[#F97316]" />
              </div>
              <p className="text-xs text-[#94A3B8]">7-day touches: {fubActivity.totals.touches} • today: Calls {fubActivity.today.calls}, Texts {fubActivity.today.texts}, Emails {fubActivity.today.emails}</p>
              {latestFubSyncAudit && latestFubSyncAudit.unclassifiedEvents > 0 && (
                <div className="mt-3 bg-[#0D1117] border border-[#334155] rounded p-3">
                  <p className="text-xs text-[#F59E0B] font-semibold">Audit: {latestFubSyncAudit.unclassifiedEvents} unclassified event(s)</p>
                  {latestFubSyncAudit.sampleUnclassified.length > 0 && (
                    <p className="text-[11px] text-[#94A3B8] mt-1">Samples: {latestFubSyncAudit.sampleUnclassified.join(' | ')}</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-[#94A3B8]">No FUB communication data yet. Run sync to pull calls, texts, emails, appointments, and tasks.</p>
          )}
        </div>
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2"><Brain size={16} className="text-[#3B82F6]" />Execution Optimizer</p>
            <button
              onClick={generateAiExecutionPlan}
              disabled={aiPlanLoading}
              className="px-2 py-1 text-xs rounded bg-[#1E293B] hover:bg-[#374151] disabled:opacity-60 text-[#F1F5F9] inline-flex items-center gap-1"
            >
              <Sparkles size={12} />
              {aiPlanLoading ? 'Generating...' : 'AI Plan'}
            </button>
          </div>
          <div className="space-y-3">
            {executionPlan.map((item, idx) => (
              <div key={`exec-${idx}`} className="bg-[#0D1117] border border-[#1E293B] rounded p-3">
                <p className="text-xs text-[#64748B] uppercase">{item.time}</p>
                <p className="text-sm text-[#F1F5F9] font-semibold mt-1">{item.title}</p>
                <p className="text-xs text-[#94A3B8] mt-1">{item.action}</p>
              </div>
            ))}
          </div>
          {aiDailyPlan[todayKey]?.content && (
            <div className="mt-3 pt-3 border-t border-[#1E293B]">
              <p className="text-xs text-[#94A3B8] mb-2">AI Tactical Plan ({new Date(aiDailyPlan[todayKey].createdAt).toLocaleTimeString()})</p>
              <p className="text-xs text-[#CBD5E1] whitespace-pre-wrap">{aiDailyPlan[todayKey].content}</p>
            </div>
          )}
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
              <h3 className="text-lg font-semibold text-[#F1F5F9]">Today's Appointments (FUB + Google)</h3>
            </div>
            {fubAppointments.length === 0 ? (
              <p className="text-[#94A3B8] text-sm">No scoped appointments scheduled for today. Add your Google Calendar ID (or email) in Profile to include Google events.</p>
            ) : (
              <div className="space-y-2">
                {fubAppointments.slice(0, 8).map((appointment) => (
                  <div key={appointment.id} className="bg-[#0D1117] border border-[#1E293B] rounded p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-[#F1F5F9] font-semibold">{appointment.title}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${appointment.source === 'google' ? 'bg-[#1E3A8A] text-[#BFDBFE]' : 'bg-[#14532D] text-[#BBF7D0]'}`}>
                        {appointment.source === 'google' ? (profile.googleCalendarLabel || 'Google') : 'FUB'}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8]">
                      {new Date(appointment.startAt).toLocaleString()}
                      {appointment.personName ? ` • ${appointment.personName}` : ''}
                      {appointment.location ? ` • ${appointment.location}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
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

          <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Receipt size={16} className="text-[#D4A043]" />
              <p className="text-sm font-semibold text-[#F1F5F9]">Business Ops</p>
            </div>
            <div className="space-y-3">
              <div className="bg-[#0D1117] border border-[#1E293B] rounded p-3">
                <p className="text-xs text-[#64748B] uppercase">Monthly Spend</p>
                <p className="text-lg font-semibold text-red mt-1">{formatCurrency(opsSnapshot.monthSpend)}</p>
                <p className="text-xs text-[#94A3B8] mt-1">{opsSnapshot.dueSoon.length} due in next 14 days</p>
              </div>
              <div className="bg-[#0D1117] border border-[#1E293B] rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Car size={14} className="text-[#3B82F6]" />
                  <p className="text-xs text-[#64748B] uppercase">Mileage</p>
                </div>
                <p className="text-lg font-semibold text-[#3B82F6]">{opsSnapshot.monthMiles.toFixed(0)} mi</p>
                <p className="text-xs text-[#94A3B8] mt-1">{formatCurrency(Math.round(opsSnapshot.monthMileageValue))} value{opsSnapshot.vehicleLabel ? ` • ${opsSnapshot.vehicleLabel}` : ''}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <button onClick={handleSync} disabled={syncing} className="w-full px-4 py-2 bg-[#D4A043] hover:bg-[#92400E] disabled:opacity-60 text-[#07090F] font-semibold rounded transition-colors text-sm">
              {syncing ? 'Syncing...' : 'Sync with Follow Boss'}
            </button>
            <button onClick={() => router.push('/pipeline')} className="w-full px-4 py-2 bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9] font-semibold rounded transition-colors text-sm">
              Review Pipeline
            </button>
            <button onClick={() => router.push('/expenses')} className="w-full px-4 py-2 bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9] font-semibold rounded transition-colors text-sm">
              Review Expenses
            </button>
            <button onClick={() => router.push('/profile')} className="w-full px-4 py-2 bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9] font-semibold rounded transition-colors text-sm">
              Update Profile
            </button>
            {syncStatus && <p className="text-xs text-[#94A3B8]">{syncStatus}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function mapFubStage(raw: string): PipelineLead['stage'] {
  const value = String(raw || '').toLowerCase();
  if (value.includes('closed') || value.includes('won')) return 'closed';
  if (value.includes('uag') || value.includes('under agreement') || value.includes('contract')) return 'uag';
  if (value.includes('active') || value.includes('showing') || value.includes('pre-approved') || value.includes('pre approved')) return 'active';
  if (value.includes('nurture') || value.includes('warm') || value.includes('follow')) return 'nurture';
  return 'new';
}

function mapFubLeadSource(raw: string): PipelineLead['lead_source'] {
  const value = String(raw || '').toLowerCase();
  if (value.includes('zillow')) return 'zillow';
  if (value.includes('company') || value.includes('team') || value.includes('realtor')) return 'company';
  return 'own';
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

function MiniStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="bg-[#0D1117] border border-[#1E293B] rounded p-2">
      <p className="text-[10px] text-[#64748B] uppercase">{label}</p>
      <p className={`text-sm font-semibold mt-1 ${tone}`}>{value}</p>
    </div>
  );
}
