'use client';

import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Filter, Plus, Search, ArrowUpDown, CalendarClock, CheckSquare, PhoneCall, MessageSquare, Mail, LayoutGrid, Columns3 } from 'lucide-react';
import { formatCurrency, calculateCommission } from '@/lib/utils';
import { useAppSettings } from '@/store/appSettings';
import { ClosingLog, DailyKpiLog, DailyMetricSnapshot, FubActivitySnapshot, FubAppointment, PipelineLead, getLeadStalenessDays, getLeadStalenessLevel, useEduStorage } from '@/hooks/useEduStorage';

export default function PipelinePage() {
  const [stage, setStage] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | PipelineLead['lead_source']>('all');
  const [staleFilter, setStaleFilter] = useState<'all' | 'attention'>('all');
  const [slaFilter, setSlaFilter] = useState<'all' | 'breach'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'value' | 'stale' | 'recent'>('priority');
  const [viewMode, setViewMode] = useState<'cards' | 'kanban'>('cards');
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [syncingLeadId, setSyncingLeadId] = useState<string | null>(null);
  const [dragLeadId, setDragLeadId] = useState<string | null>(null);
  const [expandedTimelineLeadId, setExpandedTimelineLeadId] = useState<string | null>(null);
  const [fubClosedSuggestions, setFubClosedSuggestions] = useState<PipelineLead[]>([]);
  const [lastSyncTs, setLastSyncTs] = useState<number>(0);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [fubHealth, setFubHealth] = useState<{
    scopedEvents: number;
    totalEvents: number;
    scopedAppointments: number;
    totalAppointments: number;
    scopedTasks: number;
    totalTasks: number;
    classificationCoveragePct: number;
    unclassifiedEvents: number;
    sampleUnclassified: string[];
    topUnclassified: Array<{ label: string; count: number }>;
  } | null>(null);
  const { state: leads, setState: setLeads } = useEduStorage<PipelineLead[]>('edu_pipeline_leads_v1', []);
  const { state: eventMap, setState: setEventMap } = useEduStorage<Record<string, 'call' | 'text' | 'email' | 'ignore'>>('edu_fub_event_map_v1', {});
  const { state: closings, setState: setClosings } = useEduStorage<ClosingLog[]>('edu_closings_v1', []);
  const { setState: setFubActivity } = useEduStorage<FubActivitySnapshot | null>('edu_fub_activity_metrics_v1', null);
  const { setState: setFubAppointments } = useEduStorage<FubAppointment[]>('edu_fub_appointments_v1', []);
  const { setState: setDaily } = useEduStorage<DailyKpiLog>('edu_daily_kpi_v1', {
    calls: 0,
    texts: 0,
    appts: 0,
    emails: 0,
    date: new Date().toISOString().slice(0, 10),
  });
  const { setState: setDailyMetrics } = useEduStorage<Record<string, DailyMetricSnapshot>>('edu_daily_metrics_history_v1', {});
  const commissions = useAppSettings((state) => state.commissions);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    lead_source: 'own' as PipelineLead['lead_source'],
    stage: 'new' as PipelineLead['stage'],
    days_in_stage: '0',
    price_range_max: '',
    expectedCloseDate: '',
    notes: '',
  });

  const commissionOptions = {
    franchiseFeePct: commissions.franchiseFeePct,
    ownAgentPct: commissions.ownAgentPct,
    companyAgentPct: commissions.companyAgentPct,
    zillowReferralPct: commissions.zillowReferralPct,
    zillowAgentPct: commissions.zillowAgentPct,
  };

  const stages = ['All', 'New', 'Nurture', 'Active', 'UAG', 'Closed'];
  const slaDaysByStage: Record<PipelineLead['stage'], number> = {
    new: 1,
    nurture: 5,
    active: 3,
    uag: 2,
    closed: 999,
  };

  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = leads.filter((lead) => {
      if (stage !== 'all' && lead.stage !== stage) return false;
      if (sourceFilter !== 'all' && lead.lead_source !== sourceFilter) return false;
      if (staleFilter === 'attention' && getLeadStalenessLevel(lead) === 'ok') return false;
      if (slaFilter === 'breach' && !isSlaBreached(lead, slaDaysByStage)) return false;
      if (!q) return true;
      return [lead.name, lead.phone, lead.email, lead.notes]
        .map((value) => String(value || '').toLowerCase())
        .some((value) => value.includes(q));
    });

    const sorted = [...rows].sort((a, b) => {
      if (sortBy === 'value') return Number(b.price_range_max || 0) - Number(a.price_range_max || 0);
      if (sortBy === 'stale') return getLeadStalenessDays(b) - getLeadStalenessDays(a);
      if (sortBy === 'recent') return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      const bSlaPenalty = isSlaBreached(b, slaDaysByStage) ? 20 : 0;
      const aSlaPenalty = isSlaBreached(a, slaDaysByStage) ? 20 : 0;
      return (getLeadCloseProbability(b) + getLeadStalenessDays(b) * 0.5 + bSlaPenalty) - (getLeadCloseProbability(a) + getLeadStalenessDays(a) * 0.5 + aSlaPenalty);
    });
    return sorted;
  }, [leads, query, slaDaysByStage, slaFilter, sortBy, sourceFilter, stage, staleFilter]);

  const pipelineValue = leads.reduce((sum, lead) => {
    if (lead.price_range_max) {
      const commission = calculateCommission(lead.price_range_max, commissions.defaultCommissionPct, lead.lead_source, commissionOptions);
      return sum + commission.net;
    }
    return sum;
  }, 0);

  const hotLeads = useMemo(() => leads.filter((lead) => {
    if (lead.stage === 'uag') return true;
    if (lead.stage === 'active' && lead.days_in_stage <= 14) return true;
    return false;
  }), [leads]);

  const uags = leads.filter((l) => l.stage === 'uag');
  const uagAlertCount = uags.filter((lead) => {
    if (!lead.expectedCloseDate) return false;
    const close = new Date(lead.expectedCloseDate);
    const days = Math.ceil((close.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const staleNote = !lead.updatedAt || (Date.now() - new Date(lead.updatedAt).getTime()) > (7 * 24 * 60 * 60 * 1000);
    return days <= 14 && staleNote;
  }).length;

  const staleLeadCount = useMemo(() => leads.filter((lead) => getLeadStalenessLevel(lead) !== 'ok').length, [leads]);
  const leadProbabilities = useMemo(() => {
    return new Map(leads.map((lead) => [lead.id, getLeadCloseProbability(lead)]));
  }, [leads]);
  const weightedPipelineValue = useMemo(() => {
    return leads.reduce((sum, lead) => {
      if (!lead.price_range_max) return sum;
      const probability = leadProbabilities.get(lead.id) || 0;
      const net = calculateCommission(lead.price_range_max, commissions.defaultCommissionPct, lead.lead_source, commissionOptions).net;
      return sum + (net * probability) / 100;
    }, 0);
  }, [commissionOptions, commissions.defaultCommissionPct, leadProbabilities, leads]);
  const expectedClosings = useMemo(() => {
    return leads.reduce((sum, lead) => sum + (leadProbabilities.get(lead.id) || 0) / 100, 0);
  }, [leadProbabilities, leads]);
  const crmTotals = useMemo(() => {
    return leads.reduce(
      (acc, lead) => ({
        calls: acc.calls + Number(lead.fubCalls || 0),
        texts: acc.texts + Number(lead.fubTexts || 0),
        emails: acc.emails + Number(lead.fubEmails || 0),
        upcomingAppts: acc.upcomingAppts + Number(lead.fubAppointmentsUpcoming || 0),
        openTasks: acc.openTasks + Number(lead.fubTasksOpen || 0),
        overdueTasks: acc.overdueTasks + Number(lead.fubTasksOverdue || 0),
      }),
      { calls: 0, texts: 0, emails: 0, upcomingAppts: 0, openTasks: 0, overdueTasks: 0 }
    );
  }, [leads]);
  const stageBuckets = useMemo(() => {
    const bucketOrder: PipelineLead['stage'][] = ['new', 'nurture', 'active', 'uag', 'closed'];
    return bucketOrder.map((bucket) => ({
      stage: bucket,
      label: bucket.toUpperCase(),
      leads: filteredLeads.filter((lead) => lead.stage === bucket),
    }));
  }, [filteredLeads]);
  const slaBreaches = useMemo(() => {
    return leads.filter((lead) => isSlaBreached(lead, slaDaysByStage));
  }, [leads, slaDaysByStage]);
  const nextActionQueue = useMemo(() => {
    return [...leads]
      .map((lead) => {
        const staleDays = getLeadStalenessDays(lead);
        const probability = getLeadCloseProbability(lead);
        const slaBoost = isSlaBreached(lead, slaDaysByStage) ? 25 : 0;
        const urgency = probability + staleDays + slaBoost + (lead.stage === 'uag' ? 20 : lead.stage === 'active' ? 10 : 0) + Number(lead.fubTasksOverdue || 0) * 12;
        return { lead, urgency, staleDays, probability };
      })
      .sort((a, b) => b.urgency - a.urgency)
      .slice(0, 6);
  }, [leads]);

  const handleAddLead = () => {
    if (!form.name) return;
    setLeads((prev) => [
      {
        id: String(Date.now()),
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        lead_source: form.lead_source,
        stage: form.stage,
        days_in_stage: Number(form.days_in_stage || 0),
        price_range_max: form.price_range_max ? Number(form.price_range_max) : undefined,
        expectedCloseDate: form.expectedCloseDate || undefined,
        notes: form.notes || undefined,
        updatedAt: new Date().toISOString(),
        lastContactAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setForm({
      name: '',
      phone: '',
      email: '',
      lead_source: 'own',
      stage: 'new',
      days_in_stage: '0',
      price_range_max: '',
      expectedCloseDate: '',
      notes: '',
    });
  };

  const isLeadSelected = (id: string) => selectedLeadIds.includes(id);

  const toggleLeadSelected = (id: string) => {
    setSelectedLeadIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const clearSelectedLeads = () => {
    setSelectedLeadIds([]);
  };

  const bulkUpdateLeads = (action: 'touch' | 'prev' | 'next' | 'delete') => {
    if (selectedLeadIds.length === 0) return;
    if (action === 'delete') {
      setLeads((prev) => prev.filter((lead) => !selectedLeadIds.includes(lead.id)));
      clearSelectedLeads();
      return;
    }

    if (action === 'touch') {
      setLeads((prev) => prev.map((lead) => (
        selectedLeadIds.includes(lead.id)
          ? { ...lead, updatedAt: new Date().toISOString(), lastContactAt: new Date().toISOString() }
          : lead
      )));
      clearSelectedLeads();
      return;
    }

    setLeads((prev) => prev.map((lead) => {
      if (!selectedLeadIds.includes(lead.id)) return lead;
      const idx = stageOrder.indexOf(lead.stage);
      const nextIdx = action === 'next'
        ? Math.min(stageOrder.length - 1, idx + 1)
        : Math.max(0, idx - 1);
      return { ...lead, stage: stageOrder[nextIdx], updatedAt: new Date().toISOString() };
    }));
    clearSelectedLeads();
  };

  const closedLeadSuggestions = useMemo(() => {
    return leads.filter((lead) => {
      if (lead.stage !== 'closed' || !lead.price_range_max) return false;
      return !closings.some((c) => c.id === `from-lead-${lead.id}`);
    });
  }, [closings, leads]);

  useEffect(() => {
    let active = true;
    const loadServerLeads = async () => {
      try {
        const res = await fetch('/api/leads');
        if (!res.ok) return;
        const data = await res.json();
        if (!active || !Array.isArray(data?.leads)) return;

        const serverLeads: PipelineLead[] = data.leads.map((row: any) => ({
          id: row?.fub_id ? `fub-${String(row.fub_id)}` : String(row.id),
          fubId: row?.fub_id ? String(row.fub_id) : undefined,
          name: String(row?.name || 'Unknown Lead'),
          phone: row?.phone ? String(row.phone) : undefined,
          email: row?.email ? String(row.email) : undefined,
          lead_source: mapFubLeadSource(String(row?.lead_source || '')),
          stage: mapFubStage(String(row?.stage || 'new')),
          days_in_stage: Number(row?.days_in_stage || 0),
          price_range_max: row?.price_range_max ? Number(row.price_range_max) : undefined,
          expectedCloseDate: row?.next_followup ? String(row.next_followup).slice(0, 10) : undefined,
          notes: row?.notes ? String(row.notes) : undefined,
          updatedAt: row?.updated_at ? String(row.updated_at) : undefined,
          lastContactAt: row?.last_contact ? String(row.last_contact) : undefined,
        }));

        if (serverLeads.length > 0) {
          setLeads((prev) => {
            const localManual = prev.filter((lead) => !lead.fubId);
            const byFub = new Map(serverLeads.filter((lead) => lead.fubId).map((lead) => [String(lead.fubId), lead]));
            const deduped = Array.from(byFub.values());
            return [...localManual, ...deduped];
          });
        }
      } catch {
        // Keep local storage state when server load is unavailable.
      }
    };

    loadServerLeads();
    return () => {
      active = false;
    };
  }, [setLeads]);

  const syncFromFub = async () => {
    setSyncing(true);
    setSyncStatus('');
    try {
      const todayKey = new Date().toISOString().slice(0, 10);
      const encodedMap = encodeURIComponent(JSON.stringify(eventMap || {}));
      const [fullSyncRes, metricsRes] = await Promise.all([
        fetch(`/api/fub?type=fullSync&days=30&classificationMap=${encodedMap}`),
        fetch(`/api/fub?type=activityMetrics&days=7&classificationMap=${encodedMap}`),
      ]);
      if (!fullSyncRes.ok || !metricsRes.ok) throw new Error('Failed to sync FUB data');

      const payload = await fullSyncRes.json();
      const metricsPayload = await metricsRes.json();
      const people = (payload?.people || []) as any[];
      const activityByPerson = payload?.activitiesByPerson || {};
      const timelineByPerson = payload?.timelineByPerson || {};

      const mapped = people.map((p) => {
        const fullName = p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown Lead';
        const phone = p.phones?.[0]?.value || p.phone || undefined;
        const email = p.emails?.[0]?.value || p.email || undefined;
        const stage = mapFubStage(p.stage || p.stageName || p?.tags?.join(' '));
        const leadSource = mapFubLeadSource(p.source || p.sourceName || p.leadSource || p?.tags?.join(' '));
        const personActivity = activityByPerson[String(p.id)] || {};

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
          fubCalls: Number(personActivity.calls || 0),
          fubTexts: Number(personActivity.texts || 0),
          fubEmails: Number(personActivity.emails || 0),
          fubEvents: Number(personActivity.events || 0),
          fubAppointmentsUpcoming: Number(personActivity.appointmentsUpcoming || 0),
          fubTasksOpen: Number(personActivity.tasksOpen || 0),
          fubTasksOverdue: Number(personActivity.tasksOverdue || 0),
          fubNextAppointmentAt: personActivity.nextAppointmentAt || undefined,
          fubNextTaskDueAt: personActivity.nextTaskDueAt || undefined,
          fubTimeline: Array.isArray(timelineByPerson[String(p.id)])
            ? timelineByPerson[String(p.id)]
                .slice(0, 10)
                .map((row: any) => ({
                  id: String(row?.id || `${p.id}-${row?.type || 'item'}-${row?.at || Date.now()}`),
                  type: row?.type === 'appointment' || row?.type === 'task' ? row.type : 'event',
                  label: String(row?.label || 'Activity'),
                  at: String(row?.at || new Date().toISOString()),
                  status: row?.status ? String(row.status) : undefined,
                }))
            : undefined,
        } as PipelineLead;
      });

      setLeads((prev) => {
        const byFubId = new Map(prev.filter((l) => l.fubId).map((l) => [String(l.fubId), l]));
        const untouchedLocal = prev.filter((l) => !l.fubId);
        const merged = mapped.map((incoming) => {
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

      try {
        await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'syncFubLeads', leads: mapped }),
        });
      } catch {
        // Keep local pipeline if server lead sync fails.
      }

      const closed = mapped.filter((l) => l.stage === 'closed' && l.price_range_max && !closings.some((c) => c.id === `from-lead-${l.id}`));
      setFubClosedSuggestions(closed.slice(0, 5));

      const mappedAppointments: FubAppointment[] = Array.isArray(payload?.appointments)
        ? payload.appointments.map((item: any) => ({
            id: String(item?.id || `${item?.start || item?.startDate || Date.now()}`),
            title: String(item?.title || item?.name || item?.type || 'Appointment'),
            startAt: String(item?.start || item?.startDate || item?.date || new Date().toISOString()),
            endAt: item?.end || item?.endDate || undefined,
            location: item?.location || undefined,
            personName: item?.person?.name || item?.lead?.name || item?.contact?.name || undefined,
            source: 'fub',
          }))
        : [];
      setFubAppointments(mappedAppointments.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()));

      if (metricsPayload?.today) {
        setDaily((prev) => ({
          ...prev,
          calls: Math.max(prev.calls, Number(metricsPayload.today.calls || 0)),
          texts: Math.max(prev.texts, Number(metricsPayload.today.texts || 0)),
          emails: Math.max(prev.emails, Number(metricsPayload.today.emails || 0)),
          appts: Math.max(prev.appts, Number(metricsPayload.today.appointments || 0)),
          date: todayKey,
        }));
      }

      if (Array.isArray(metricsPayload?.byDay)) {
        setDailyMetrics((prev) => {
          const next = { ...prev };
          for (const row of metricsPayload.byDay) {
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

      setFubActivity({
        syncedAt: new Date().toISOString(),
        assignedUserName: String(metricsPayload?.assignedUser?.name || 'Eduardo Inoa'),
        assignedUserId: metricsPayload?.assignedUser?.id ? String(metricsPayload.assignedUser.id) : undefined,
        startDate: String(metricsPayload?.dateRange?.startDate || todayKey),
        endDate: String(metricsPayload?.dateRange?.endDate || todayKey),
        totals: {
          calls: Number(metricsPayload?.totals?.calls || 0),
          texts: Number(metricsPayload?.totals?.texts || 0),
          emails: Number(metricsPayload?.totals?.emails || 0),
          appointments: Number(metricsPayload?.totals?.appointments || 0),
          tasks: Number(metricsPayload?.totals?.tasks || 0),
          touches: Number(metricsPayload?.totals?.touches || 0),
        },
        today: {
          date: String(metricsPayload?.today?.date || todayKey),
          calls: Number(metricsPayload?.today?.calls || 0),
          texts: Number(metricsPayload?.today?.texts || 0),
          emails: Number(metricsPayload?.today?.emails || 0),
          appointments: Number(metricsPayload?.today?.appointments || 0),
          tasks: Number(metricsPayload?.today?.tasks || 0),
          touches: Number(metricsPayload?.today?.touches || 0),
        },
        byDay: Array.isArray(metricsPayload?.byDay) ? metricsPayload.byDay.map((row: any) => ({
          date: String(row.date),
          calls: Number(row.calls || 0),
          texts: Number(row.texts || 0),
          emails: Number(row.emails || 0),
          appointments: Number(row.appointments || 0),
          tasks: Number(row.tasks || 0),
          touches: Number(row.touches || 0),
        })) : [],
        classificationDiagnostics: {
          classifiedEvents: Number(metricsPayload?.classificationDiagnostics?.classifiedEvents || 0),
          unclassifiedEvents: Number(metricsPayload?.classificationDiagnostics?.unclassifiedEvents || 0),
          sampleUnclassified: Array.isArray(metricsPayload?.classificationDiagnostics?.sampleUnclassified)
            ? metricsPayload.classificationDiagnostics.sampleUnclassified.slice(0, 10).map((item: any) => String(item))
            : [],
        },
      });

      try {
        await fetch('/api/kpis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'syncDaily',
            date: todayKey,
            calls: Number(metricsPayload?.today?.calls || 0),
            texts: Number(metricsPayload?.today?.texts || 0),
            emails: Number(metricsPayload?.today?.emails || 0),
            appointments: Number(metricsPayload?.today?.appointments || 0),
            newLeads: mapped.filter((lead: PipelineLead) => lead.stage === 'new').length,
            uags: mapped.filter((lead: PipelineLead) => lead.stage === 'uag').length,
            closings: closed.length,
            revenue: 0,
          }),
        });
      } catch {
        // Keep local KPI snapshots when server sync is unavailable.
      }

      const nowTs = Date.now();
      localStorage.setItem('edu_last_sync', String(nowTs));
      setLastSyncTs(nowTs);

      const ownerName = payload?.assignedUser?.name || 'Eduardo Inoa';
      const scopedEvents = Number(payload?.sourceCounts?.events?.scoped || 0);
      const unclassifiedEvents = Number(payload?.classificationDiagnostics?.unclassifiedEvents || 0);
      const classifiedEvents = Math.max(0, scopedEvents - unclassifiedEvents);
      const classificationCoveragePct = scopedEvents > 0 ? Math.round((classifiedEvents / scopedEvents) * 100) : 100;
      setFubHealth({
        scopedEvents,
        totalEvents: Number(payload?.sourceCounts?.events?.total || 0),
        scopedAppointments: Number(payload?.sourceCounts?.appointments?.scoped || 0),
        totalAppointments: Number(payload?.sourceCounts?.appointments?.total || 0),
        scopedTasks: Number(payload?.sourceCounts?.tasks?.scoped || 0),
        totalTasks: Number(payload?.sourceCounts?.tasks?.total || 0),
        classificationCoveragePct,
        unclassifiedEvents,
        sampleUnclassified: Array.isArray(payload?.classificationDiagnostics?.sampleUnclassified)
          ? payload.classificationDiagnostics.sampleUnclassified.slice(0, 8).map((item: any) => String(item))
          : [],
        topUnclassified: Array.isArray(payload?.classificationDiagnostics?.topUnclassified)
          ? payload.classificationDiagnostics.topUnclassified
              .slice(0, 8)
              .map((row: any) => ({ label: String(row?.label || 'unknown'), count: Number(row?.count || 0) }))
          : [],
      });
      const scanned = Number(payload?.leadScope?.totalPeopleCount || mapped.length);
      const filteredOut = Math.max(0, scanned - mapped.length);
      if (mapped.length === 0 && scanned > 0) {
        setSyncStatus(`FUB sync found 0 assigned leads for ${ownerName} (${scanned} scanned, ${filteredOut} filtered out). Check assignment filters in FUB settings.`);
      } else {
        setSyncStatus(`FUB full sync complete: ${mapped.length} leads, ${Number(payload?.sourceCounts?.events?.scoped || 0)} events, ${Number(payload?.sourceCounts?.appointments?.scoped || 0)} appointments, ${Number(payload?.sourceCounts?.tasks?.scoped || 0)} tasks for ${ownerName}.`);
      }
    } catch {
      setSyncStatus('FUB sync failed. Check API key or permissions.');
    } finally {
      setSyncing(false);
    }
  };

  const syncLeadToFub = async (lead: PipelineLead) => {
    setSyncingLeadId(lead.id);
    try {
      const action = lead.fubId ? 'updateStage' : 'upsertPerson';
      const body = action === 'updateStage'
        ? { action, personId: lead.fubId, stage: lead.stage }
        : { action, lead };

      const res = await fetch('/api/fub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Sync failed');

      const data = await res.json();
      const personId = data?.person?.id || data?.personId;
      if (personId) {
        setLeads((prev) => prev.map((item) => (
          item.id === lead.id ? { ...item, fubId: String(personId), updatedAt: new Date().toISOString() } : item
        )));
      }
      setSyncStatus(`Synced ${lead.name} to FUB.`);
    } catch {
      setSyncStatus(`Failed syncing ${lead.name} to FUB.`);
    } finally {
      setSyncingLeadId(null);
    }
  };

  useEffect(() => {
    const lastSync = Number(localStorage.getItem('edu_last_sync') || '0');
    setLastSyncTs(lastSync);
    if (Date.now() - lastSync > 30 * 60 * 1000) {
      syncFromFub();
    }
  // run once on load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stageOrder: PipelineLead['stage'][] = ['new', 'nurture', 'active', 'uag', 'closed'];

  const persistLeadPatch = async (lead: PipelineLead | undefined, patch: { stage?: string; notes?: string; lastContactAt?: string; expectedCloseDate?: string; updatedAt?: string }) => {
    if (!lead) return;
    if (!lead.fubId) return;
    try {
      await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fubId: lead.fubId, patch }),
      });
    } catch {
      // Keep local pipeline edits when server persistence is unavailable.
    }
  };

  const persistLeadDelete = async (lead: PipelineLead | undefined) => {
    if (!lead) return;
    if (!lead.fubId) return;
    try {
      await fetch('/api/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fubId: lead.fubId }),
      });
    } catch {
      // Keep local pipeline delete when server persistence is unavailable.
    }
  };

  const moveLeadToStage = (id: string, nextStage: PipelineLead['stage']) => {
    const lead = leads.find((item) => item.id === id);
    const updatedAt = new Date().toISOString();
    setLeads((prev) => prev.map((lead) => (
      lead.id === id ? { ...lead, stage: nextStage, updatedAt } : lead
    )));
    void persistLeadPatch(lead, { stage: nextStage, updatedAt });
  };

  const onDropToStage = (nextStage: PipelineLead['stage']) => {
    if (!dragLeadId) return;
    moveLeadToStage(dragLeadId, nextStage);
    setDragLeadId(null);
  };

  const suggestMapping = (label: string): 'call' | 'text' | 'email' | 'ignore' | null => {
    const value = String(label || '').toLowerCase();
    if (/(call|dial|voicemail|phone)/.test(value)) return 'call';
    if (/(text|sms|mms|message)/.test(value)) return 'text';
    if (/(email|mail|newsletter|campaign)/.test(value)) return 'email';
    if (/(note|tag|system|status|stage)/.test(value)) return 'ignore';
    return null;
  };

  const applyEventMapping = (label: string, kind: 'call' | 'text' | 'email' | 'ignore') => {
    const key = String(label || '').toLowerCase().trim();
    if (!key) return;
    setEventMap((prev) => ({ ...prev, [key]: kind }));
    setSyncStatus(`Saved mapping: "${label}" -> ${kind.toUpperCase()}. Run sync to apply.`);
  };

  const updateLeadStage = (id: string, direction: 'next' | 'prev') => {
    const current = leads.find((lead) => lead.id === id);
    if (!current) return;
    const idx = stageOrder.indexOf(current.stage);
    const nextIdx = direction === 'next' ? Math.min(stageOrder.length - 1, idx + 1) : Math.max(0, idx - 1);
    const nextStage = stageOrder[nextIdx];
    const updatedAt = new Date().toISOString();
    setLeads((prev) => prev.map((lead) => {
      if (lead.id !== id) return lead;
      return { ...lead, stage: nextStage, updatedAt };
    }));
    void persistLeadPatch(current, { stage: nextStage, updatedAt });
  };

  const touchLead = (id: string) => {
    const current = leads.find((lead) => lead.id === id);
    const lastContactAt = new Date().toISOString();
    setLeads((prev) => prev.map((lead) => (lead.id === id ? { ...lead, updatedAt: lastContactAt, lastContactAt } : lead)));
    void persistLeadPatch(current, { updatedAt: lastContactAt, lastContactAt });
  };

  const updateLeadNotes = (id: string, notes: string) => {
    const current = leads.find((lead) => lead.id === id);
    const updatedAt = new Date().toISOString();
    setLeads((prev) => prev.map((lead) => (lead.id === id ? { ...lead, notes, updatedAt, lastContactAt: updatedAt } : lead)));
    void persistLeadPatch(current, { notes, updatedAt, lastContactAt: updatedAt });
  };

  const updateLeadExpectedClose = (id: string, expectedCloseDate: string) => {
    const current = leads.find((lead) => lead.id === id);
    const updatedAt = new Date().toISOString();
    setLeads((prev) => prev.map((lead) => (lead.id === id ? { ...lead, expectedCloseDate, updatedAt } : lead)));
    void persistLeadPatch(current, { expectedCloseDate, updatedAt });
  };

  const deleteLead = (id: string) => {
    const current = leads.find((lead) => lead.id === id);
    setLeads((prev) => prev.filter((lead) => lead.id !== id));
    void persistLeadDelete(current);
  };

  const handleAddClosingFromLead = (lead: PipelineLead) => {
    if (!lead.price_range_max) return;
    const salePrice = lead.price_range_max;
    const calc = calculateCommission(salePrice, commissions.defaultCommissionPct, lead.lead_source, commissionOptions);
    const closeDate = lead.expectedCloseDate || new Date().toISOString().slice(0, 10);
    const netPct = salePrice > 0 ? calc.net / salePrice : 0;

    setClosings((prev) => [
      {
        id: `from-lead-${lead.id}`,
        address: lead.name,
        salePrice,
        netCommission: calc.net,
        netPct,
        closeDate,
        source: lead.lead_source,
      },
      ...prev,
    ]);
  };

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9] mb-4">Pipeline</h1>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
            <p className="text-xs text-[#64748B] uppercase font-semibold">Total Leads</p>
            <p className="text-2xl font-bold text-[#F1F5F9] mt-1">{leads.length}</p>
          </div>
          <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
            <p className="text-xs text-[#64748B] uppercase font-semibold">Hot Leads</p>
            <p className="text-2xl font-bold text-[#D4A043] mt-1">{hotLeads.length}</p>
          </div>
          <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
            <p className="text-xs text-[#64748B] uppercase font-semibold">Pipeline Value</p>
            <p className="text-lg font-bold text-[#10B981] mt-1">{formatCurrency(pipelineValue)}</p>
          </div>
          <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
            <p className="text-xs text-[#64748B] uppercase font-semibold">Est. Close</p>
            <p className="text-lg font-bold text-[#3B82F6] mt-1">{uags.length}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
          <div className="bg-[#0D1117] border border-[#1E293B] rounded p-3">
            <p className="text-[11px] text-[#64748B] uppercase">FUB Communications (30d)</p>
            <p className="text-sm text-[#94A3B8] mt-1 inline-flex items-center gap-2"><PhoneCall size={12} className="text-[#10B981]" /> {crmTotals.calls} <MessageSquare size={12} className="text-[#3B82F6]" /> {crmTotals.texts} <Mail size={12} className="text-[#D4A043]" /> {crmTotals.emails}</p>
          </div>
          <div className="bg-[#0D1117] border border-[#1E293B] rounded p-3">
            <p className="text-[11px] text-[#64748B] uppercase">FUB Follow-Up Load</p>
            <p className="text-sm text-[#94A3B8] mt-1 inline-flex items-center gap-2"><CalendarClock size={12} className="text-[#A78BFA]" /> {crmTotals.upcomingAppts} upcoming <CheckSquare size={12} className="text-[#F59E0B]" /> {crmTotals.openTasks} open</p>
          </div>
          <div className="bg-[#0D1117] border border-[#1E293B] rounded p-3 col-span-2 md:col-span-1">
            <p className="text-[11px] text-[#64748B] uppercase">Sync Freshness</p>
            <p className="text-sm text-[#94A3B8] mt-1">{lastSyncTs > 0 ? `${Math.max(0, Math.round((Date.now() - lastSyncTs) / 60000))}m ago` : 'Not synced yet'}</p>
          </div>
        </div>
        <p className="text-xs text-[#94A3B8] mt-3">
          Weighted pipeline: <span className="text-[#10B981] font-semibold">{formatCurrency(Math.round(weightedPipelineValue))}</span> • Probability-adjusted expected closings: <span className="text-[#D4A043] font-semibold">{expectedClosings.toFixed(1)}</span>
        </p>
        {uagAlertCount > 0 && (
          <p className="text-sm text-amber mt-3">{uagAlertCount} UAG lead(s) closing soon have stale or missing notes.</p>
        )}
        {staleLeadCount > 0 && (
          <p className="text-sm text-red mt-1">{staleLeadCount} lead(s) are stale and need follow-up.</p>
        )}
        {syncStatus && <p className="text-xs text-[#94A3B8] mt-2">{syncStatus}</p>}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Filter size={20} className="text-[#94A3B8]" />
        <div className="flex flex-wrap gap-2">
          {stages.map((s) => (
            <button
              key={s}
              onClick={() => setStage(s.toLowerCase())}
              className={`px-4 py-2 rounded transition-colors text-sm font-medium ${
                stage === s.toLowerCase()
                  ? 'bg-[#D4A043] text-[#07090F]'
                  : 'bg-[#111827] text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button className="px-4 py-2 bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9] font-semibold rounded" onClick={syncFromFub} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync from FUB'}
        </button>
        <button className="ml-auto px-4 py-2 bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] font-semibold rounded flex items-center gap-2" onClick={handleAddLead}>
          <Plus size={18} />
          <span className="hidden sm:inline">Add Lead</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <label className="relative block md:col-span-2">
          <Search size={14} className="absolute left-3 top-3 text-[#64748B]" />
          <input
            className="w-full pl-9 pr-3 py-2 bg-[#111827] border border-[#374151] rounded text-[#F1F5F9]"
            placeholder="Search name, phone, email, notes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select title="Source filter" className="px-3 py-2 bg-[#111827] border border-[#374151] rounded text-[#F1F5F9]" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as 'all' | PipelineLead['lead_source'])}>
          <option value="all">All Sources</option>
          <option value="own">Own</option>
          <option value="company">Company</option>
          <option value="zillow">Zillow</option>
        </select>
        <div className="grid grid-cols-3 gap-2">
          <select title="Stale filter" className="px-3 py-2 bg-[#111827] border border-[#374151] rounded text-[#F1F5F9]" value={staleFilter} onChange={(e) => setStaleFilter(e.target.value as 'all' | 'attention')}>
            <option value="all">All</option>
            <option value="attention">Needs Attention</option>
          </select>
          <select title="SLA filter" className="px-3 py-2 bg-[#111827] border border-[#374151] rounded text-[#F1F5F9]" value={slaFilter} onChange={(e) => setSlaFilter(e.target.value as 'all' | 'breach')}>
            <option value="all">SLA All</option>
            <option value="breach">SLA Breach</option>
          </select>
          <label className="relative block">
            <ArrowUpDown size={13} className="absolute left-2 top-3 text-[#64748B]" />
            <select title="Sort leads" className="w-full pl-7 pr-2 py-2 bg-[#111827] border border-[#374151] rounded text-[#F1F5F9]" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'priority' | 'value' | 'stale' | 'recent')}>
              <option value="priority">Priority</option>
              <option value="value">Value</option>
              <option value="stale">Most Stale</option>
              <option value="recent">Recently Updated</option>
            </select>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-6">
        <p className="text-xs text-[#94A3B8]">View Mode</p>
        <div className="inline-flex gap-2">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded text-xs inline-flex items-center gap-1 ${viewMode === 'cards' ? 'bg-[#D4A043] text-[#07090F]' : 'bg-[#111827] text-[#CBD5E1]'}`}
          >
            <LayoutGrid size={12} /> Cards
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1.5 rounded text-xs inline-flex items-center gap-1 ${viewMode === 'kanban' ? 'bg-[#D4A043] text-[#07090F]' : 'bg-[#111827] text-[#CBD5E1]'}`}
          >
            <Columns3 size={12} /> Kanban
          </button>
        </div>
      </div>

      {selectedLeadIds.length > 0 && (
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#F1F5F9]">{selectedLeadIds.length} lead(s) selected</p>
            <p className="text-xs text-[#94A3B8]">Use bulk actions to move, contact, or clear selected leads.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => bulkUpdateLeads('touch')} className="px-3 py-1.5 rounded bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9] text-xs">Mark Contacted</button>
            <button onClick={() => bulkUpdateLeads('prev')} className="px-3 py-1.5 rounded bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9] text-xs">Move Back</button>
            <button onClick={() => bulkUpdateLeads('next')} className="px-3 py-1.5 rounded bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] text-xs font-semibold">Move Forward</button>
            <button onClick={() => bulkUpdateLeads('delete')} className="px-3 py-1.5 rounded bg-red/20 hover:bg-red/30 text-red text-xs">Delete</button>
            <button onClick={clearSelectedLeads} className="px-3 py-1.5 rounded bg-[#111827] hover:bg-[#1E293B] text-[#94A3B8] text-xs">Clear</button>
          </div>
        </div>
      )}

      {slaBreaches.length > 0 && (
        <div className="bg-red/10 border border-red rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-red">SLA Breach Alert</p>
          <p className="text-xs text-[#94A3B8] mt-1">{slaBreaches.length} lead(s) exceeded stage follow-up SLA and were auto-prioritized.</p>
        </div>
      )}

      {fubHealth && (
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-[#F1F5F9] mb-2">FUB Data Health</p>
          <p className="text-xs text-[#94A3B8] mb-3">
            Events {fubHealth.scopedEvents}/{fubHealth.totalEvents} scoped • Appointments {fubHealth.scopedAppointments}/{fubHealth.totalAppointments} scoped • Tasks {fubHealth.scopedTasks}/{fubHealth.totalTasks} scoped
          </p>
          <p className={`text-xs ${fubHealth.unclassifiedEvents > 0 ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>
            Unclassified event types: {fubHealth.unclassifiedEvents}
          </p>
          <p className={`text-xs mt-1 ${fubHealth.classificationCoveragePct >= 90 ? 'text-[#10B981]' : fubHealth.classificationCoveragePct >= 75 ? 'text-[#F59E0B]' : 'text-red'}`}>
            Classification coverage: {fubHealth.classificationCoveragePct}%
          </p>
          {fubHealth.topUnclassified.length > 0 && (
            <div className="mt-2 space-y-1">
              {fubHealth.topUnclassified.map((row) => {
                const suggested = suggestMapping(row.label);
                return (
                  <div key={`unclass-${row.label}`} className="bg-[#0D1117] border border-[#1E293B] rounded p-2">
                    <p className="text-[11px] text-[#94A3B8]">{row.label} ({row.count})</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <button onClick={() => applyEventMapping(row.label, 'call')} className="text-[10px] px-1.5 py-0.5 rounded bg-[#14532D] text-[#BBF7D0]">Call</button>
                      <button onClick={() => applyEventMapping(row.label, 'text')} className="text-[10px] px-1.5 py-0.5 rounded bg-[#1E3A8A] text-[#BFDBFE]">Text</button>
                      <button onClick={() => applyEventMapping(row.label, 'email')} className="text-[10px] px-1.5 py-0.5 rounded bg-[#92400E] text-[#FDE68A]">Email</button>
                      <button onClick={() => applyEventMapping(row.label, 'ignore')} className="text-[10px] px-1.5 py-0.5 rounded bg-[#334155] text-[#CBD5E1]">Ignore</button>
                      {suggested && (
                        <button onClick={() => applyEventMapping(row.label, suggested)} className="text-[10px] px-1.5 py-0.5 rounded bg-[#D4A043] text-[#07090F]">Auto ({suggested})</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {fubHealth.sampleUnclassified.length > 0 && (
            <p className="text-[11px] text-[#94A3B8] mt-1">Samples: {fubHealth.sampleUnclassified.join(' | ')}</p>
          )}
        </div>
      )}

      {nextActionQueue.length > 0 && (
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-[#F1F5F9] mb-3">Priority Action Queue</p>
          <div className="space-y-2">
            {nextActionQueue.map((item) => (
              <div key={`queue-${item.lead.id}`} className="bg-[#0D1117] border border-[#1E293B] rounded p-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-[#F1F5F9] font-semibold">{item.lead.name}</p>
                  <p className="text-[11px] text-[#94A3B8]">{item.lead.stage.toUpperCase()} • {item.staleDays >= 999 ? 'No contact history' : `${item.staleDays}d stale`} • {item.probability}% close</p>
                </div>
                <button onClick={() => touchLead(item.lead.id)} className="text-xs px-2 py-1 rounded bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9]">Mark Contacted</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4 mb-6 grid md:grid-cols-3 gap-3">
        <input className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" placeholder="Lead name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
        <input className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" placeholder="Phone" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
        <input className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" placeholder="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
        <select title="Lead source" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" value={form.lead_source} onChange={(e) => setForm((prev) => ({ ...prev, lead_source: e.target.value as PipelineLead['lead_source'] }))}>
          <option value="own">Own</option>
          <option value="company">Company</option>
          <option value="zillow">Zillow</option>
        </select>
        <select title="Lead stage" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" value={form.stage} onChange={(e) => setForm((prev) => ({ ...prev, stage: e.target.value as PipelineLead['stage'] }))}>
          <option value="new">New</option>
          <option value="nurture">Nurture</option>
          <option value="active">Active</option>
          <option value="uag">UAG</option>
          <option value="closed">Closed</option>
        </select>
        <input className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" type="number" placeholder="Max price" value={form.price_range_max} onChange={(e) => setForm((prev) => ({ ...prev, price_range_max: e.target.value }))} />
        <input className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" type="date" placeholder="Expected close" value={form.expectedCloseDate} onChange={(e) => setForm((prev) => ({ ...prev, expectedCloseDate: e.target.value }))} />
        <input className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" type="number" placeholder="Days in stage" value={form.days_in_stage} onChange={(e) => setForm((prev) => ({ ...prev, days_in_stage: e.target.value }))} />
        <input className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9] md:col-span-3" placeholder="Notes" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
      </div>

      {closedLeadSuggestions.length > 0 && (
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4 mb-6 space-y-3">
          <p className="text-sm font-semibold text-[#F1F5F9]">Closed Deal Suggestions</p>
          {closedLeadSuggestions.slice(0, 5).map((lead) => (
            <div key={lead.id} className="flex items-center justify-between gap-3">
              <p className="text-sm text-[#94A3B8]">{lead.name} ({formatCurrency(lead.price_range_max || 0)})</p>
              <button onClick={() => handleAddClosingFromLead(lead)} className="px-3 py-1 bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] text-xs font-semibold rounded">
                Add to Closings
              </button>
            </div>
          ))}
        </div>
      )}

      {fubClosedSuggestions.length > 0 && (
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4 mb-6 space-y-3">
          <p className="text-sm font-semibold text-[#F1F5F9]">FUB Closed/Won Suggestions</p>
          {fubClosedSuggestions.map((lead) => (
            <div key={`fub-closed-${lead.id}`} className="flex items-center justify-between gap-3">
              <p className="text-sm text-[#94A3B8]">{lead.name} ({formatCurrency(lead.price_range_max || 0)})</p>
              <button onClick={() => handleAddClosingFromLead(lead)} className="px-3 py-1 bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] text-xs font-semibold rounded">
                Log Closing
              </button>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {stageBuckets.map((bucket) => (
            <div
              key={`kanban-${bucket.stage}`}
              className="bg-[#111827] border border-[#1E293B] rounded-lg p-3 min-h-[280px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDropToStage(bucket.stage)}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-[#F1F5F9] uppercase">{bucket.label}</p>
                <span className="text-[10px] text-[#94A3B8]">{bucket.leads.length}</span>
              </div>
              <div className="space-y-2">
                {bucket.leads.length === 0 ? (
                  <p className="text-[11px] text-[#64748B]">Drop leads here</p>
                ) : bucket.leads.map((lead) => {
                  const probability = leadProbabilities.get(lead.id) || 0;
                  const staleDays = getLeadStalenessDays(lead);
                  return (
                    <div
                      key={`kanban-lead-${lead.id}`}
                      draggable
                      onDragStart={() => setDragLeadId(lead.id)}
                      className={`bg-[#0D1117] border rounded p-2 cursor-move ${stageAccentClass(lead.stage)}`}
                    >
                      <p className="text-xs text-[#F1F5F9] font-semibold truncate">{lead.name}</p>
                      <p className="text-[10px] text-[#94A3B8] mt-1">{lead.lead_source} • {probability}% • {staleDays >= 999 ? 'n/a' : `${staleDays}d stale`}</p>
                      <div className="flex gap-1 mt-2">
                        <button onClick={() => updateLeadStage(lead.id, 'prev')} className="text-[10px] px-1.5 py-0.5 rounded bg-[#1E293B] text-[#F1F5F9]">Back</button>
                        <button onClick={() => updateLeadStage(lead.id, 'next')} className="text-[10px] px-1.5 py-0.5 rounded bg-[#D4A043] text-[#07090F]">Next</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-12 text-center">
          <TrendingUp size={48} className="text-[#374151] mx-auto mb-4" />
          <p className="text-[#94A3B8] mb-4">No leads in this stage.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredLeads.map((lead) => {
            const estNet = lead.price_range_max
              ? calculateCommission(lead.price_range_max, commissions.defaultCommissionPct, lead.lead_source, commissionOptions).net
              : 0;
            const probability = leadProbabilities.get(lead.id) || 0;
            const weightedNet = (estNet * probability) / 100;
            const daysToClose = lead.expectedCloseDate
              ? Math.ceil((new Date(lead.expectedCloseDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;
            const staleDays = getLeadStalenessDays(lead);
            const staleLevel = getLeadStalenessLevel(lead);
            const slaLimit = slaDaysByStage[lead.stage];
            const slaBreached = isSlaBreached(lead, slaDaysByStage);

            return (
              <div key={lead.id} className={`bg-[#111827] border rounded-lg p-4 space-y-2 ${stageAccentClass(lead.stage)} ${isLeadSelected(lead.id) ? 'ring-2 ring-[#D4A043]' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={isLeadSelected(lead.id)}
                      onChange={() => toggleLeadSelected(lead.id)}
                      className="mt-1 h-4 w-4 accent-[#D4A043]"
                      title={`Select ${lead.name}`}
                    />
                    <p className="text-[#F1F5F9] font-semibold">{lead.name}</p>
                  </div>
                  {isLeadSelected(lead.id) && <span className="text-[10px] px-2 py-1 rounded bg-[#D4A043] text-[#07090F] font-semibold">Selected</span>}
                </div>
                <p className="text-sm text-[#94A3B8]">Stage: <span className="uppercase">{lead.stage}</span> • Source: {lead.lead_source}</p>
                <p className={`text-xs ${staleLevel === 'danger' ? 'text-red' : staleLevel === 'warning' ? 'text-amber' : 'text-[#94A3B8]'}`}>
                  Last contact: {staleDays >= 999 ? 'Not tracked' : `${staleDays}d ago`}
                </p>
                <p className={`text-[11px] ${slaBreached ? 'text-red' : 'text-[#94A3B8]'}`}>
                  SLA: {lead.stage === 'closed' ? 'Closed stage (no SLA)' : `${slaLimit}d target`} {slaBreached ? '• Breached' : '• On track'}
                </p>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-[#0D1117] border border-[#1E293B] rounded px-2 py-1 text-[#94A3B8]">Calls <span className="text-[#10B981] font-semibold">{Number(lead.fubCalls || 0)}</span></div>
                  <div className="bg-[#0D1117] border border-[#1E293B] rounded px-2 py-1 text-[#94A3B8]">Texts <span className="text-[#3B82F6] font-semibold">{Number(lead.fubTexts || 0)}</span></div>
                  <div className="bg-[#0D1117] border border-[#1E293B] rounded px-2 py-1 text-[#94A3B8]">Emails <span className="text-[#D4A043] font-semibold">{Number(lead.fubEmails || 0)}</span></div>
                </div>
                <p className="text-xs text-[#94A3B8]">Upcoming: <span className="text-[#A78BFA] font-semibold">{Number(lead.fubAppointmentsUpcoming || 0)} appt(s)</span> • Open tasks: <span className="text-[#F59E0B] font-semibold">{Number(lead.fubTasksOpen || 0)}</span>{Number(lead.fubTasksOverdue || 0) > 0 ? <span className="text-red"> ({Number(lead.fubTasksOverdue || 0)} overdue)</span> : null}</p>
                {lead.fubNextAppointmentAt && (
                  <p className="text-[11px] text-[#94A3B8]">Next appointment: {new Date(lead.fubNextAppointmentAt).toLocaleString()}</p>
                )}
                {lead.fubNextTaskDueAt && (
                  <p className="text-[11px] text-[#94A3B8]">Next task due: {new Date(lead.fubNextTaskDueAt).toLocaleString()}</p>
                )}
                <p className="text-sm text-[#94A3B8]">Est. Net: <span className="text-[#10B981] font-semibold">{formatCurrency(estNet)}</span></p>
                <p className="text-sm text-[#94A3B8]">Close probability: <span className="text-[#3B82F6] font-semibold">{probability}%</span> • Weighted net: <span className="text-[#D4A043] font-semibold">{formatCurrency(Math.round(weightedNet))}</span></p>
                {lead.expectedCloseDate && (
                  <p className="text-sm text-[#94A3B8]">Expected close: {lead.expectedCloseDate} {daysToClose !== null ? `(${daysToClose}d)` : ''}</p>
                )}
                {lead.stage === 'uag' && (
                  <input
                    className="w-full px-2 py-1 bg-[#0D1117] border border-[#374151] rounded text-xs text-[#F1F5F9]"
                    type="date"
                    value={lead.expectedCloseDate || ''}
                    onChange={(e) => updateLeadExpectedClose(lead.id, e.target.value)}
                    title="Expected close date"
                  />
                )}
                <input
                  className="w-full px-2 py-1 bg-[#0D1117] border border-[#374151] rounded text-xs text-[#F1F5F9]"
                  placeholder="Quick note"
                  value={lead.notes || ''}
                  onChange={(e) => updateLeadNotes(lead.id, e.target.value)}
                />
                <div>
                  <button
                    onClick={() => setExpandedTimelineLeadId((prev) => (prev === lead.id ? null : lead.id))}
                    className="text-[11px] px-2 py-1 rounded bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9]"
                  >
                    {expandedTimelineLeadId === lead.id ? 'Hide Timeline' : 'Show Timeline'}
                  </button>
                  {expandedTimelineLeadId === lead.id && (
                    <div className="mt-2 space-y-1">
                      {(lead.fubTimeline && lead.fubTimeline.length > 0) ? lead.fubTimeline.slice(0, 8).map((item) => (
                        <div key={`${lead.id}-${item.id}`} className="bg-[#0D1117] border border-[#1E293B] rounded px-2 py-1">
                          <p className="text-[11px] text-[#CBD5E1]">{item.label}</p>
                          <p className="text-[10px] text-[#64748B]">{item.type.toUpperCase()} • {new Date(item.at).toLocaleString()}{item.status ? ` • ${item.status}` : ''}</p>
                        </div>
                      )) : (
                        <p className="text-[11px] text-[#64748B] mt-1">No timeline yet. Run FUB sync.</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={() => updateLeadStage(lead.id, 'prev')} className="text-xs px-2 py-1 rounded bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9]">Back</button>
                  <button onClick={() => updateLeadStage(lead.id, 'next')} className="text-xs px-2 py-1 rounded bg-[#D4A043] hover:bg-[#92400E] text-[#07090F]">Advance</button>
                  <button onClick={() => touchLead(lead.id)} className="text-xs px-2 py-1 rounded bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9]">Mark Contacted</button>
                  <button onClick={() => syncLeadToFub(lead)} disabled={syncingLeadId === lead.id} className="text-xs px-2 py-1 rounded bg-[#1E293B] hover:bg-[#374151] disabled:opacity-50 text-[#F1F5F9]">{syncingLeadId === lead.id ? 'Syncing...' : 'Sync to FUB'}</button>
                  {lead.phone && <a href={`tel:${lead.phone}`} className="text-xs px-2 py-1 rounded bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9]">Call</a>}
                  <button onClick={() => deleteLead(lead.id)} className="text-xs px-2 py-1 rounded bg-red/20 hover:bg-red/30 text-red">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
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

function getLeadCloseProbability(lead: PipelineLead): number {
  const stageBase: Record<PipelineLead['stage'], number> = {
    new: 10,
    nurture: 20,
    active: 40,
    uag: 75,
    closed: 95,
  };

  let score = stageBase[lead.stage];
  const staleDays = getLeadStalenessDays(lead);
  const hasNotes = Boolean(lead.notes && lead.notes.trim().length > 0);

  if (lead.lead_source === 'own') score += 5;
  if (lead.lead_source === 'zillow') score -= 5;
  if (hasNotes) score += 4;

  if (lead.stage === 'new' && staleDays > 2) score -= 8;
  if (lead.stage === 'nurture' && staleDays > 10) score -= 10;
  if (lead.stage === 'active' && staleDays > 14) score -= 12;
  if (lead.stage === 'uag' && staleDays > 7) score -= 10;

  if (lead.expectedCloseDate) {
    const daysToClose = Math.ceil((new Date(lead.expectedCloseDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysToClose <= 14 && lead.stage === 'uag') score += 8;
    if (daysToClose > 90) score -= 6;
  }

  return Math.max(3, Math.min(95, Math.round(score)));
}

function stageAccentClass(stage: PipelineLead['stage']) {
  if (stage === 'new') return 'border-[#334155]';
  if (stage === 'nurture') return 'border-[#1E40AF]';
  if (stage === 'active') return 'border-[#0E7490]';
  if (stage === 'uag') return 'border-[#166534]';
  if (stage === 'closed') return 'border-[#92400E]';
  return 'border-[#1E293B]';
}

function isSlaBreached(lead: PipelineLead, rules: Record<PipelineLead['stage'], number>) {
  if (lead.stage === 'closed') return false;
  const staleDays = getLeadStalenessDays(lead);
  return staleDays > Number(rules[lead.stage] || 999);
}
