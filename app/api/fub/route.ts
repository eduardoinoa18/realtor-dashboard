import { NextRequest, NextResponse } from 'next/server';
import { fetchFUB } from '@/lib/fub';

const DEFAULT_ASSIGNED_USER_NAME = 'Eduardo Inoa';

interface AssignedContext {
  assignedUserId: string;
  assignedUserName: string;
  users: any[];
}

interface ScopedPeopleResult {
  allPeople: any[];
  filteredPeople: any[];
  assignedPeopleById: Set<string>;
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.FUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'FUB_API_KEY not set' }, { status: 500 });
  }

  const type = req.nextUrl.searchParams.get('type') || 'people';
  const today = new Date().toISOString().split('T')[0];
  const configuredAssignedUserId = (process.env.FUB_ASSIGNED_USER_ID || '').trim();
  const configuredAssignedUserName = (process.env.FUB_ASSIGNED_USER_NAME || DEFAULT_ASSIGNED_USER_NAME).trim();

  try {
    const assignedContext = await resolveAssignedContext(apiKey, configuredAssignedUserId, configuredAssignedUserName);

    if (type === 'people') {
      const scoped = await getScopedPeople(apiKey, assignedContext);

      return NextResponse.json({
        people: scoped.filteredPeople,
        count: scoped.filteredPeople.length,
        totalCount: scoped.allPeople.length,
        filteredOut: scoped.allPeople.length - scoped.filteredPeople.length,
        assignedUser: {
          id: assignedContext.assignedUserId || null,
          name: assignedContext.assignedUserName,
        },
      });
    }

    if (type === 'activityMetrics') {
      const days = Math.min(31, Math.max(1, Number(req.nextUrl.searchParams.get('days') || '7')));
      const { startDate, endDate, dayKeys } = getDateRange(days);
      const scoped = await getScopedPeople(apiKey, assignedContext);

      const eventsUrl = `/events?limit=1000&sort=created&direction=desc&after=${startDate}T00:00:00Z`;
      const eventsData = await fetchFUB(eventsUrl, apiKey);
      const allEvents = (eventsData.events || []) as any[];
      const scopedEvents = allEvents.filter((event) => belongsToAssignedPerson(event, scoped.assignedPeopleById) || isAssignedToUser(event, assignedContext.assignedUserId, assignedContext.assignedUserName));

      const appointmentsUrl = `/appointments?limit=500&startDate=${startDate}&endDate=${endDate}`;
      const appointmentsData = await fetchFUB(appointmentsUrl, apiKey);
      const allAppointments = (appointmentsData.appointments || []) as any[];
      const scopedAppointments = allAppointments.filter((appointment) => belongsToAssignedPerson(appointment, scoped.assignedPeopleById) || isAssignedToUser(appointment, assignedContext.assignedUserId, assignedContext.assignedUserName));

      const tasksUrl = `/tasks?limit=1000&sort=dueDate&direction=desc`;
      const tasksData = await fetchFUB(tasksUrl, apiKey);
      const allTasks = (tasksData.tasks || []) as any[];
      const scopedTasks = allTasks.filter((task) => belongsToAssignedPerson(task, scoped.assignedPeopleById) || isAssignedToUser(task, assignedContext.assignedUserId, assignedContext.assignedUserName));

      const byDay = Object.fromEntries(dayKeys.map((day) => [day, { calls: 0, texts: 0, emails: 0, appointments: 0, tasks: 0, touches: 0 }])) as Record<string, { calls: number; texts: number; emails: number; appointments: number; tasks: number; touches: number }>;

      for (const event of scopedEvents) {
        const day = extractDay(event);
        if (!day || !byDay[day]) continue;
        const kind = classifyEvent(event);
        if (!kind) continue;
        if (kind === 'call') byDay[day].calls += 1;
        if (kind === 'text') byDay[day].texts += 1;
        if (kind === 'email') byDay[day].emails += 1;
      }

      for (const appointment of scopedAppointments) {
        const day = extractDay(appointment);
        if (!day || !byDay[day]) continue;
        byDay[day].appointments += 1;
      }

      for (const task of scopedTasks) {
        const day = extractDay(task, ['dueDate', 'updated', 'created']);
        if (!day || !byDay[day]) continue;
        byDay[day].tasks += 1;
      }

      const rows = dayKeys.map((date) => {
        const row = byDay[date];
        const touches = row.calls + row.texts + row.emails;
        return {
          date,
          calls: row.calls,
          texts: row.texts,
          emails: row.emails,
          appointments: row.appointments,
          tasks: row.tasks,
          touches,
        };
      });

      const totals = rows.reduce(
        (acc, row) => ({
          calls: acc.calls + row.calls,
          texts: acc.texts + row.texts,
          emails: acc.emails + row.emails,
          appointments: acc.appointments + row.appointments,
          tasks: acc.tasks + row.tasks,
          touches: acc.touches + row.touches,
        }),
        { calls: 0, texts: 0, emails: 0, appointments: 0, tasks: 0, touches: 0 }
      );

      const todayMetrics = rows.find((row) => row.date === endDate) || { date: endDate, calls: 0, texts: 0, emails: 0, appointments: 0, tasks: 0, touches: 0 };

      return NextResponse.json({
        assignedUser: {
          id: assignedContext.assignedUserId || null,
          name: assignedContext.assignedUserName,
        },
        dateRange: { startDate, endDate, days },
        leadScope: {
          assignedPeopleCount: scoped.filteredPeople.length,
          totalPeopleCount: scoped.allPeople.length,
        },
        sourceCounts: {
          events: { scoped: scopedEvents.length, total: allEvents.length },
          appointments: { scoped: scopedAppointments.length, total: allAppointments.length },
          tasks: { scoped: scopedTasks.length, total: allTasks.length },
        },
        totals,
        today: todayMetrics,
        byDay: rows,
      });
    }

    if (type === 'events') {
      const url = `/events?limit=200&sort=created&direction=desc&after=${today}T00:00:00Z`;
      const data = await fetchFUB(url, apiKey);
      const events = (data.events || []) as any[];
      const scoped = await getScopedPeople(apiKey, assignedContext);
      const filtered = events.filter((event) => belongsToAssignedPerson(event, scoped.assignedPeopleById) || isAssignedToUser(event, assignedContext.assignedUserId, assignedContext.assignedUserName));
      return NextResponse.json({
        events: filtered,
        count: filtered.length,
        totalCount: events.length,
        filteredOut: events.length - filtered.length,
      });
    }

    if (type === 'appointments') {
      const url = `/appointments?limit=50&startDate=${today}&endDate=${today}`;
      const data = await fetchFUB(url, apiKey);
      const appointments = (data.appointments || []) as any[];
      const scoped = await getScopedPeople(apiKey, assignedContext);
      const filtered = appointments.filter((appointment) => belongsToAssignedPerson(appointment, scoped.assignedPeopleById) || isAssignedToUser(appointment, assignedContext.assignedUserId, assignedContext.assignedUserName));
      return NextResponse.json({
        appointments: filtered,
        count: filtered.length,
        totalCount: appointments.length,
        filteredOut: appointments.length - filtered.length,
      });
    }

    if (type === 'tasks') {
      const url = `/tasks?limit=100&sort=dueDate&direction=asc`;
      const data = await fetchFUB(url, apiKey);
      const tasks = (data.tasks || []) as any[];
      const scoped = await getScopedPeople(apiKey, assignedContext);
      const filtered = tasks.filter((task) => belongsToAssignedPerson(task, scoped.assignedPeopleById) || isAssignedToUser(task, assignedContext.assignedUserId, assignedContext.assignedUserName));
      return NextResponse.json({
        tasks: filtered,
        count: filtered.length,
        totalCount: tasks.length,
        filteredOut: tasks.length - filtered.length,
      });
    }

    if (type === 'users') {
      return NextResponse.json({ users: assignedContext.users || [] });
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
  } catch (err: any) {
    console.error('FUB API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function resolveAssignedContext(apiKey: string, configuredAssignedUserId: string, configuredAssignedUserName: string): Promise<AssignedContext> {
  let assignedUserId = configuredAssignedUserId;
  let assignedUserName = configuredAssignedUserName;

  const usersResponse = await fetchFUB('/users', apiKey);
  const users = usersResponse.users || [];

  if (!assignedUserId && configuredAssignedUserName) {
    const userByName = users.find((user: any) => namesMatch(user, configuredAssignedUserName));
    if (userByName?.id !== undefined && userByName?.id !== null) {
      assignedUserId = String(userByName.id);
      assignedUserName = getUserFullName(userByName) || configuredAssignedUserName;
    }
  }

  return { assignedUserId, assignedUserName, users };
}

async function fetchAllPeople(apiKey: string) {
  let allPeople: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore && allPeople.length < 3000) {
    const url = `/people?limit=100&offset=${offset}&sort=updated&direction=desc`;
    const data = await fetchFUB(url, apiKey);
    allPeople = [...allPeople, ...(data.people || [])];
    hasMore = (data.people || []).length === 100;
    offset += 100;
  }

  return allPeople;
}

async function getScopedPeople(apiKey: string, assignedContext: AssignedContext): Promise<ScopedPeopleResult> {
  const allPeople = await fetchAllPeople(apiKey);
  const filteredPeople = allPeople.filter((person) => isAssignedToUser(person, assignedContext.assignedUserId, assignedContext.assignedUserName));
  const assignedPeopleById = new Set(filteredPeople.map((person) => String(person?.id || '')).filter(Boolean));
  return { allPeople, filteredPeople, assignedPeopleById };
}

function getDateRange(days: number) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  const toIsoDay = (d: Date) => d.toISOString().slice(0, 10);
  const dayKeys: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dayKeys.push(toIsoDay(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    startDate: toIsoDay(start),
    endDate: toIsoDay(end),
    dayKeys,
  };
}

function belongsToAssignedPerson(item: any, assignedPeopleById: Set<string>) {
  const ids = collectPossiblePersonIds(item);
  return ids.some((id) => assignedPeopleById.has(id));
}

function collectPossiblePersonIds(item: any) {
  const values = [
    item?.personId,
    item?.leadId,
    item?.contactId,
    item?.relatedPersonId,
    item?.person?.id,
    item?.lead?.id,
    item?.contact?.id,
  ];

  if (Array.isArray(item?.people)) {
    for (const person of item.people) {
      values.push(person?.id);
    }
  }

  if (Array.isArray(item?.personIds)) {
    values.push(...item.personIds);
  }

  return values.map((value) => String(value || '').trim()).filter(Boolean);
}

function extractDay(item: any, fallbackFields: string[] = ['created', 'createdAt', 'updated', 'updatedAt', 'start', 'startDate', 'date']) {
  for (const field of fallbackFields) {
    const value = item?.[field];
    if (!value) continue;
    const asDate = new Date(value);
    if (!Number.isNaN(asDate.getTime())) {
      return asDate.toISOString().slice(0, 10);
    }
  }
  return null;
}

function classifyEvent(event: any): 'call' | 'text' | 'email' | null {
  const blob = [
    event?.type,
    event?.eventType,
    event?.name,
    event?.description,
    event?.action,
    event?.kind,
  ]
    .map((value) => String(value || ''))
    .join(' ')
    .toLowerCase();

  if (blob.includes('call') || blob.includes('phone')) return 'call';
  if (blob.includes('text') || blob.includes('sms')) return 'text';
  if (blob.includes('email')) return 'email';
  return null;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function normalizeName(value: string) {
  return normalize(value).replace(/\s+/g, ' ');
}

function getUserFullName(user: any) {
  const fullName = String(user?.name || '').trim();
  if (fullName) return fullName;
  const first = String(user?.firstName || '').trim();
  const last = String(user?.lastName || '').trim();
  return `${first} ${last}`.trim();
}

function namesMatch(user: any, targetName: string) {
  const target = normalizeName(targetName);
  const candidate = normalizeName(getUserFullName(user));
  if (!candidate) return false;
  return candidate === target;
}

function isAssignedToUser(person: any, assignedUserId?: string, assignedUserName?: string) {
  const targetId = String(assignedUserId || '').trim();
  const targetName = normalizeName(String(assignedUserName || ''));
  const assigned = collectAssignedUsers(person);

  if (targetId && assigned.some((entry) => String(entry.id || '').trim() === targetId)) {
    return true;
  }

  if (targetName) {
    return assigned.some((entry) => {
      const candidate = normalizeName(String(entry.name || ''));
      if (!candidate) return false;
      return candidate === targetName;
    });
  }

  return false;
}

function collectAssignedUsers(person: any) {
  const values: Array<{ id?: string; name?: string }> = [];

  const maybeAdd = (item: any) => {
    if (!item) return;
    if (typeof item === 'string' || typeof item === 'number') {
      values.push({ id: String(item) });
      return;
    }
    values.push({
      id: item.id !== undefined && item.id !== null ? String(item.id) : undefined,
      name: String(item.name || `${item.firstName || ''} ${item.lastName || ''}` || '').trim() || undefined,
    });
  };

  maybeAdd(person.assignedUser);
  maybeAdd(person.assignee);
  maybeAdd(person.owner);
  maybeAdd(person.assignedTo);
  maybeAdd(person.assignedUserId);
  maybeAdd(person.assignedToUserId);

  if (Array.isArray(person.assignedUsers)) {
    person.assignedUsers.forEach(maybeAdd);
  }
  if (Array.isArray(person.assignees)) {
    person.assignees.forEach(maybeAdd);
  }
  if (Array.isArray(person.owners)) {
    person.owners.forEach(maybeAdd);
  }
  if (Array.isArray(person.assignedUserIds)) {
    person.assignedUserIds.forEach(maybeAdd);
  }

  return values;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.FUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'FUB_API_KEY not set' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const action = body?.action as string;

    if (action === 'upsertPerson') {
      const lead = body?.lead || {};
      const payload = {
        name: lead.name,
        stage: lead.stage,
        emails: lead.email ? [{ value: lead.email }] : undefined,
        phones: lead.phone ? [{ value: lead.phone }] : undefined,
      };

      if (lead.fubId) {
        const updated = await fetchFUB(`/people/${lead.fubId}`, apiKey, {
          method: 'PUT',
          body: payload,
        });
        return NextResponse.json({ ok: true, person: updated.person || updated });
      }

      const created = await fetchFUB('/people', apiKey, {
        method: 'POST',
        body: payload,
      });
      return NextResponse.json({ ok: true, person: created.person || created });
    }

    if (action === 'updateStage') {
      const personId = body?.personId;
      const stage = body?.stage;
      if (!personId || !stage) {
        return NextResponse.json({ error: 'personId and stage are required' }, { status: 400 });
      }

      const updated = await fetchFUB(`/people/${personId}`, apiKey, {
        method: 'PUT',
        body: { stage },
      });
      return NextResponse.json({ ok: true, person: updated.person || updated });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('FUB POST API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
