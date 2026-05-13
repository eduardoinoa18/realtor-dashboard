'use client';

import { useEffect, useMemo, useState } from 'react';

export function useEduStorage<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        setState(JSON.parse(raw));
      }
    } catch {
      // Keep default state if parsing fails.
    } finally {
      setLoaded(true);
    }
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(key, JSON.stringify(state));
    window.dispatchEvent(new Event('edu-storage-updated'));
  }, [key, loaded, state]);

  return { state, setState, loaded };
}

export interface ClosingLog {
  id: string;
  address: string;
  salePrice: number;
  netCommission: number;
  netPct: number;
  closeDate: string;
  source: 'own' | 'company' | 'zillow';
}

export interface DailyKpiLog {
  calls: number;
  texts: number;
  appts: number;
  emails: number;
  date: string;
}

export interface PipelineLead {
  id: string;
  fubId?: string;
  name: string;
  lead_source: 'own' | 'company' | 'zillow';
  stage: 'new' | 'nurture' | 'active' | 'uag' | 'closed';
  days_in_stage: number;
  price_range_max?: number;
  phone?: string;
  email?: string;
  expectedCloseDate?: string;
  notes?: string;
  updatedAt?: string;
  lastContactAt?: string;
}

export function getLeadStalenessDays(lead: PipelineLead): number {
  const anchor = lead.lastContactAt || lead.updatedAt;
  if (!anchor) return 999;
  return Math.floor((Date.now() - new Date(anchor).getTime()) / (1000 * 60 * 60 * 24));
}

export function getLeadStalenessLevel(lead: PipelineLead): 'danger' | 'warning' | 'ok' {
  const days = getLeadStalenessDays(lead);
  if (lead.stage === 'new' && days > 1) return 'danger';
  if (lead.stage === 'nurture' && days > 7) return 'warning';
  if (lead.stage === 'active' && days > 14) return 'warning';
  if (lead.stage === 'uag' && days > 45) return 'danger';
  return 'ok';
}

export interface ContentLog {
  id: string;
  title: string;
  body: string;
  status: 'idea' | 'draft' | 'scheduled' | 'posted';
  platform: 'instagram' | 'facebook' | 'both';
  createdAt: string;
}

export interface AIInteractionLog {
  id: string;
  promptType: string;
  context: string;
  response: string;
  createdAt: string;
}

export interface DailyMetricSnapshot {
  calls: number;
  texts: number;
  appts: number;
  emails: number;
  closings: number;
}

export interface DailyBriefing {
  date: string;
  summary: string;
  createdAt: string;
}

export interface FubActivityDay {
  date: string;
  calls: number;
  texts: number;
  emails: number;
  appointments: number;
  tasks: number;
  touches: number;
}

export interface FubActivitySnapshot {
  syncedAt: string;
  assignedUserName: string;
  assignedUserId?: string;
  startDate: string;
  endDate: string;
  totals: {
    calls: number;
    texts: number;
    emails: number;
    appointments: number;
    tasks: number;
    touches: number;
  };
  today: FubActivityDay;
  byDay: FubActivityDay[];
}

export interface FubScopeAuditEntry {
  id: string;
  createdAt: string;
  assignedUserName: string;
  status: 'PASS' | 'WARN';
  reason: string;
  leadScope: {
    assigned: number;
    total: number;
  };
  sourceCounts: {
    events: { scoped: number; total: number };
    appointments: { scoped: number; total: number };
    tasks: { scoped: number; total: number };
  };
}

export function getCurrentMonthClosings(closings: ClosingLog[]) {
  const now = new Date();
  return closings.filter((c) => {
    const d = new Date(c.closeDate);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
}

export function getWeekRange(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

export function getIsoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getLastNDates(days: number, endDate: Date = new Date()) {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    dates.push(getIsoDay(d));
  }
  return dates;
}

export function useStorageUsage() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setVersion((v) => v + 1);
    window.addEventListener('storage', refresh);
    window.addEventListener('edu-storage-updated', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('edu-storage-updated', refresh);
    };
  }, []);

  return useMemo(() => {
    if (typeof window === 'undefined') return { bytes: 0, mb: 0, overLimit: false, version: 0 };
    let bytes = 0;
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('edu_')) continue;
      const value = localStorage.getItem(key) || '';
      bytes += key.length + value.length;
    }
    const mb = bytes / (1024 * 1024);
    return { bytes, mb, overLimit: mb > 4, version };
  }, [version]);
}
