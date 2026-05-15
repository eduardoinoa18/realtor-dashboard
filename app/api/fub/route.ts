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
  filterMode: 'id-or-exact-name' | 'id-or-fuzzy-name';
}

type EventKind = 'call' | 'text' | 'email';
type EventClassificationMap = Record<string, EventKind | 'ignore'>;

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
        assignmentDiagnostics: {
          filterMode: scoped.filterMode,
          configuredAssignedUserId: configuredAssignedUserId || null,
          configuredAssignedUserName: configuredAssignedUserName,
          resolvedAssignedUserId: assignedContext.assignedUserId || null,
          resolvedAssignedUserName: assignedContext.assignedUserName,
          sampleAssignmentValues: scoped.filteredPeople.length === 0
            ? getAssignmentPreview(scoped.allPeople)
            : undefined,
        },
      });
    }

    if (type === 'activityMetrics') {
      const classificationMap = parseClassificationMap(req.nextUrl.searchParams.get('classificationMap'));
      const days = Math.min(31, Math.max(1, Number(req.nextUrl.searchParams.get('days') || '7')));
      const { startDate, endDate, dayKeys } = getDateRange(days);
      const scoped = await getScopedPeople(apiKey, assignedContext);

      const allEvents = await fetchAllEvents(apiKey, `${startDate}T00:00:00Z`);
      const scopedEvents = allEvents.filter((event) => belongsToAssignedPerson(event, scoped.assignedPeopleById) || isAssignedToUser(event, assignedContext.assignedUserId, assignedContext.assignedUserName));

      const allAppointments = await fetchAllAppointments(apiKey, startDate, endDate);
      const scopedAppointments = allAppointments.filter((appointment) => belongsToAssignedPerson(appointment, scoped.assignedPeopleById) || isAssignedToUser(appointment, assignedContext.assignedUserId, assignedContext.assignedUserName));

      const allTasks = await fetchAllTasks(apiKey);
      const scopedTasks = allTasks.filter((task) => belongsToAssignedPerson(task, scoped.assignedPeopleById) || isAssignedToUser(task, assignedContext.assignedUserId, assignedContext.assignedUserName));

      const byDay = Object.fromEntries(dayKeys.map((day) => [day, { calls: 0, texts: 0, emails: 0, appointments: 0, tasks: 0, touches: 0 }])) as Record<string, { calls: number; texts: number; emails: number; appointments: number; tasks: number; touches: number }>;
      let unclassifiedEvents = 0;
      const unclassifiedSamples = new Set<string>();

      for (const event of scopedEvents) {
        const day = extractDay(event);
        if (!day || !byDay[day]) continue;
        const classification = classifyEvent(event, classificationMap);
        const kind = classification.kind;
        if (!kind) {
          if (classification.ignored) continue;
          unclassifiedEvents += 1;
          if (classification.sample && unclassifiedSamples.size < 10) {
            unclassifiedSamples.add(classification.sample);
          }
          continue;
        }
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
        classificationDiagnostics: {
          classifiedEvents: Math.max(0, scopedEvents.length - unclassifiedEvents),
          unclassifiedEvents,
          sampleUnclassified: Array.from(unclassifiedSamples),
        },
        totals,
        today: todayMetrics,
        byDay: rows,
      });
    }

    if (type === 'events') {
      const after = req.nextUrl.searchParams.get('after') || `${today}T00:00:00Z`;
      const events = await fetchAllEvents(apiKey, after);
      const scoped = await getScopedPeople(apiKey, assignedContext);
      const filtered = events.filter((event) => belongsToAssignedPerson(event, scoped.assignedPeopleById) || isAssignedToUser(event, assignedContext.assignedUserId, assignedContext.assignedUserName));
      return NextResponse.json({
        events: filtered,
        count: filtered.length,
        totalCount: events.length,
        filteredOut: events.length - filtered.length,
      });
    }

    if (type === 'fullSync') {
      const classificationMap = parseClassificationMap(req.nextUrl.searchParams.get('classificationMap'));
      const days = Math.min(60, Math.max(1, Number(req.nextUrl.searchParams.get('days') || '30')));
      const { startDate, endDate } = getDateRange(days);
      const scoped = await getScopedPeople(apiKey, assignedContext);

      const allEvents = await fetchAllEvents(apiKey, `${startDate}T00:00:00Z`);
      const scopedEvents = allEvents.filter((event) => belongsToAssignedPerson(event, scoped.assignedPeopleById) || isAssignedToUser(event, assignedContext.assignedUserId, assignedContext.assignedUserName));

      const allAppointments = await fetchAllAppointments(apiKey, startDate, endDate);
      const scopedAppointments = allAppointments.filter((appointment) => belongsToAssignedPerson(appointment, scoped.assignedPeopleById) || isAssignedToUser(appointment, assignedContext.assignedUserId, assignedContext.assignedUserName));

      const allTasks = await fetchAllTasks(apiKey);
      const scopedTasks = allTasks.filter((task) => belongsToAssignedPerson(task, scoped.assignedPeopleById) || isAssignedToUser(task, assignedContext.assignedUserId, assignedContext.assignedUserName));

      const now = Date.now();
      const unclassifiedSamples = new Set<string>();
      const unclassifiedBuckets = new Map<string, number>();
      let unclassifiedEvents = 0;

      const activitiesByPerson: Record<string, {
        calls: number;
        texts: number;
        emails: number;
        events: number;
        appointmentsTotal: number;
        appointmentsUpcoming: number;
        tasksTotal: number;
        tasksOpen: number;
        tasksOverdue: number;
        lastEventAt?: string;
        lastAppointmentAt?: string;
        nextAppointmentAt?: string;
        lastTaskAt?: string;
        nextTaskDueAt?: string;
      }> = {};
      const timelineByPerson: Record<string, Array<{ id: string; type: 'event' | 'appointment' | 'task'; label: string; at: string; status?: string }>> = {};

      const ensureActivity = (personId: string) => {
        if (!activitiesByPerson[personId]) {
          activitiesByPerson[personId] = {
            calls: 0,
            texts: 0,
            emails: 0,
            events: 0,
            appointmentsTotal: 0,
            appointmentsUpcoming: 0,
            tasksTotal: 0,
            tasksOpen: 0,
            tasksOverdue: 0,
          };
        }
        return activitiesByPerson[personId];
      };
      const pushTimeline = (
        personId: string,
        row: { id: string; type: 'event' | 'appointment' | 'task'; label: string; at: string; status?: string }
      ) => {
        if (!timelineByPerson[personId]) {
          timelineByPerson[personId] = [];
        }
        timelineByPerson[personId].push(row);
      };

      const scopedPersonIds = (item: any) => collectPossiblePersonIds(item).filter((id) => scoped.assignedPeopleById.has(id));

      for (const event of scopedEvents) {
        const classification = classifyEvent(event, classificationMap);
        if (!classification.kind) {
          if (classification.ignored) continue;
          unclassifiedEvents += 1;
          if (classification.sample && unclassifiedSamples.size < 12) {
            unclassifiedSamples.add(classification.sample);
          }
          const bucketKey = String(classification.sample || 'unknown').slice(0, 80);
          unclassifiedBuckets.set(bucketKey, (unclassifiedBuckets.get(bucketKey) || 0) + 1);
        }

        const ts = extractTimestamp(event, ['created', 'createdAt', 'updated', 'updatedAt', 'date']);
        const ids = scopedPersonIds(event);
        for (const personId of ids) {
          const activity = ensureActivity(personId);
          activity.events += 1;
          if (classification.kind === 'call') activity.calls += 1;
          if (classification.kind === 'text') activity.texts += 1;
          if (classification.kind === 'email') activity.emails += 1;
          if (ts && (!activity.lastEventAt || ts > activity.lastEventAt)) {
            activity.lastEventAt = ts;
          }
          if (ts) {
            const label = classification.kind ? `${classification.kind.toUpperCase()} Event` : String(classification.sample || 'Unclassified Event');
            pushTimeline(personId, {
              id: `event-${String(event?.id || `${personId}-${ts}`)}`,
              type: 'event',
              label,
              at: ts,
            });
          }
        }
      }

      for (const appointment of scopedAppointments) {
        const ids = scopedPersonIds(appointment);
        const startAt = extractTimestamp(appointment, ['start', 'startDate', 'date', 'created', 'createdAt']);
        for (const personId of ids) {
          const activity = ensureActivity(personId);
          activity.appointmentsTotal += 1;
          if (startAt) {
            const startTs = new Date(startAt).getTime();
            if (startTs >= now) {
              activity.appointmentsUpcoming += 1;
              if (!activity.nextAppointmentAt || startAt < activity.nextAppointmentAt) {
                activity.nextAppointmentAt = startAt;
              }
            }
            if (!activity.lastAppointmentAt || startAt > activity.lastAppointmentAt) {
              activity.lastAppointmentAt = startAt;
            }
            pushTimeline(personId, {
              id: `appt-${String(appointment?.id || `${personId}-${startAt}`)}`,
              type: 'appointment',
              label: String(appointment?.title || appointment?.name || 'Appointment'),
              at: startAt,
            });
          }
        }
      }

      for (const task of scopedTasks) {
        const ids = scopedPersonIds(task);
        const dueAt = extractTimestamp(task, ['dueDate', 'date', 'updated', 'updatedAt', 'created', 'createdAt']);
        const statusBlob = [task?.status, task?.taskStatus, task?.state, task?.completed, task?.isComplete]
          .map((value) => String(value || ''))
          .join(' ')
          .toLowerCase();
        const isOpen = !/(done|complete|closed|resolved|true)/.test(statusBlob);
        const isOverdue = Boolean(dueAt && new Date(dueAt).getTime() < now && isOpen);

        for (const personId of ids) {
          const activity = ensureActivity(personId);
          activity.tasksTotal += 1;
          if (isOpen) activity.tasksOpen += 1;
          if (isOverdue) activity.tasksOverdue += 1;
          if (dueAt) {
            if (!activity.lastTaskAt || dueAt > activity.lastTaskAt) {
              activity.lastTaskAt = dueAt;
            }
            if (isOpen && new Date(dueAt).getTime() >= now && (!activity.nextTaskDueAt || dueAt < activity.nextTaskDueAt)) {
              activity.nextTaskDueAt = dueAt;
            }
            pushTimeline(personId, {
              id: `task-${String(task?.id || `${personId}-${dueAt}`)}`,
              type: 'task',
              label: String(task?.title || task?.name || task?.subject || 'Task'),
              at: dueAt,
              status: isOpen ? (isOverdue ? 'overdue' : 'open') : 'closed',
            });
          }
        }
      }

      for (const personId of Object.keys(timelineByPerson)) {
        timelineByPerson[personId] = timelineByPerson[personId]
          .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
          .slice(0, 12);
      }

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
        classificationDiagnostics: {
          classifiedEvents: Math.max(0, scopedEvents.length - unclassifiedEvents),
          unclassifiedEvents,
          sampleUnclassified: Array.from(unclassifiedSamples),
          topUnclassified: Array.from(unclassifiedBuckets.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([label, count]) => ({ label, count })),
        },
        people: scoped.filteredPeople,
        activitiesByPerson,
        timelineByPerson,
        appointments: scopedAppointments,
        tasks: scopedTasks,
      });
    }

    if (type === 'appointments') {
      const startDate = req.nextUrl.searchParams.get('startDate') || today;
      const endDate = req.nextUrl.searchParams.get('endDate') || today;
      const appointments = await fetchAllAppointments(apiKey, startDate, endDate);
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
      const tasks = await fetchAllTasks(apiKey);
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

  if (assignedUserId && assignedUserName) {
    const userById = users.find((user: any) => String(user?.id || '') === assignedUserId);
    if (userById) {
      assignedUserName = getUserFullName(userById) || assignedUserName;
    }
  }

  return { assignedUserId, assignedUserName, users };
}

async function fetchAllPeople(apiKey: string) {
  return fetchAllByOffset(apiKey, '/people', 'people', {
    limit: '100',
    sort: 'updated',
    direction: 'desc',
  });
}

async function fetchAllEvents(apiKey: string, afterIsoDateTime: string) {
  return fetchAllByOffset(apiKey, '/events', 'events', {
    limit: '100',
    sort: 'created',
    direction: 'desc',
    after: afterIsoDateTime,
  });
}

async function fetchAllAppointments(apiKey: string, startDate: string, endDate: string) {
  return fetchAllByOffset(apiKey, '/appointments', 'appointments', {
    limit: '100',
    startDate,
    endDate,
  });
}

async function fetchAllTasks(apiKey: string) {
  return fetchAllByOffset(apiKey, '/tasks', 'tasks', {
    limit: '100',
    sort: 'dueDate',
    direction: 'desc',
  });
}

async function fetchAllByOffset(
  apiKey: string,
  endpoint: string,
  collectionKey: string,
  params: Record<string, string>
) {
  const all: any[] = [];
  let offset = 0;
  const limit = Number(params.limit || '100');

  while (true) {
    const query = new URLSearchParams({
      ...params,
      offset: String(offset),
    }).toString();

    const data = await fetchFUB(`${endpoint}?${query}`, apiKey);
    const batch = Array.isArray(data?.[collectionKey]) ? data[collectionKey] : [];
    all.push(...batch);

    if (batch.length < limit) break;
    offset += limit;
  }

  return all;
}

async function getScopedPeople(apiKey: string, assignedContext: AssignedContext): Promise<ScopedPeopleResult> {
  const allPeople = await fetchAllPeople(apiKey);
  let filterMode: ScopedPeopleResult['filterMode'] = 'id-or-exact-name';

  let filteredPeople = allPeople.filter((person) =>
    isAssignedToUser(person, assignedContext.assignedUserId, assignedContext.assignedUserName, false)
  );

  if (filteredPeople.length === 0 && allPeople.length > 0) {
    filteredPeople = allPeople.filter((person) =>
      isAssignedToUser(person, assignedContext.assignedUserId, assignedContext.assignedUserName, true)
    );
    if (filteredPeople.length > 0) {
      filterMode = 'id-or-fuzzy-name';
    }
  }

  const assignedPeopleById = new Set(filteredPeople.map((person) => String(person?.id || '')).filter(Boolean));
  return { allPeople, filteredPeople, assignedPeopleById, filterMode };
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
    item?.personID,
    item?.person_id,
    item?.leadId,
    item?.leadID,
    item?.lead_id,
    item?.contactId,
    item?.contactID,
    item?.contact_id,
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

  if (Array.isArray(item?.peopleIds)) {
    values.push(...item.peopleIds);
  }

  if (Array.isArray(item?.leadIds)) {
    values.push(...item.leadIds);
  }

  if (Array.isArray(item?.contactIds)) {
    values.push(...item.contactIds);
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

function extractTimestamp(item: any, fallbackFields: string[]) {
  for (const field of fallbackFields) {
    const value = item?.[field];
    if (!value) continue;
    const asDate = new Date(value);
    if (!Number.isNaN(asDate.getTime())) {
      return asDate.toISOString();
    }
  }
  return undefined;
}

function classifyEvent(event: any, classificationMap?: EventClassificationMap): { kind: EventKind | null; sample?: string; ignored?: boolean } {
  const flatBlob = [
    event?.type,
    event?.eventType,
    event?.event,
    event?.eventCategory,
    event?.eventName,
    event?.eventDescription,
    event?.messageType,
    event?.subject,
    event?.title,
    event?.name,
    event?.description,
    event?.note,
    event?.content,
    event?.action,
    event?.kind,
    event?.channel,
  ]
    .map((value) => String(value || ''))
    .join(' ')
    .toLowerCase();

  const nestedBlob = collectNestedTextSignals(event).join(' ').toLowerCase();
  const blob = `${flatBlob} ${nestedBlob}`.trim();

  if (classificationMap) {
    const mapped = resolveMappedKind(blob, classificationMap);
    if (mapped === 'ignore') return { kind: null, sample: undefined, ignored: true };
    if (mapped) return { kind: mapped };
  }

  const typeHint = normalize(String(event?.type || event?.eventType || event?.kind || ''));
  const channelHint = normalize(String(event?.channel || event?.medium || event?.messageType || event?.action?.channel || ''));

  if (/(outboundcall|inboundcall|phonecall|callcompleted|dialercall|voicemailleft|voicemail)/.test(typeHint)) return { kind: 'call' };
  if (/(outboundtext|inboundtext|textmessage|sms|mms|conversationtext)/.test(typeHint)) return { kind: 'text' };
  if (/(emailsent|emailreceived|emailopened|emailclicked|mailmessage)/.test(typeHint)) return { kind: 'email' };

  if (/(phone|call|dial|voicemail)/.test(channelHint)) return { kind: 'call' };
  if (/(text|sms|mms)/.test(channelHint)) return { kind: 'text' };
  if (/(email|mail)/.test(channelHint)) return { kind: 'email' };

  if (/(call|phone|dial|voicemail)/.test(blob)) return { kind: 'call' };
  if (/(text|sms|mms)/.test(blob)) return { kind: 'text' };
  if (/(email|gmail|mailchimp|newsletter)/.test(blob)) return { kind: 'email' };

  const sample = [
    event?.type,
    event?.eventType,
    event?.event,
    event?.name,
    event?.subject,
    event?.kind,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' | ')
    .slice(0, 180);

  return { kind: null, sample: sample || undefined };
}

function collectNestedTextSignals(source: any, depth = 0): string[] {
  if (!source || depth > 3) return [];
  if (typeof source === 'string' || typeof source === 'number' || typeof source === 'boolean') {
    const raw = String(source).trim();
    return raw ? [raw] : [];
  }

  const out: string[] = [];
  if (Array.isArray(source)) {
    for (const item of source) {
      out.push(...collectNestedTextSignals(item, depth + 1));
    }
    return out;
  }

  const keys = [
    'type',
    'eventType',
    'event',
    'kind',
    'channel',
    'medium',
    'direction',
    'messageType',
    'name',
    'subject',
    'title',
    'description',
    'note',
    'text',
    'status',
    'action',
    'details',
    'metadata',
    'payload',
  ];

  for (const key of keys) {
    if (source[key] !== undefined) {
      out.push(...collectNestedTextSignals(source[key], depth + 1));
    }
  }

  return out;
}

function parseClassificationMap(raw: string | null): EventClassificationMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const map: EventClassificationMap = {};
    for (const [key, value] of Object.entries(parsed || {})) {
      const normalizedKey = normalize(String(key || ''));
      const normalizedValue = normalize(String(value || ''));
      if (!normalizedKey) continue;
      if (normalizedValue === 'call' || normalizedValue === 'text' || normalizedValue === 'email' || normalizedValue === 'ignore') {
        map[normalizedKey] = normalizedValue;
      }
    }
    return map;
  } catch {
    return {};
  }
}

function resolveMappedKind(blob: string, classificationMap: EventClassificationMap): EventKind | 'ignore' | null {
  const entries = Object.entries(classificationMap);
  if (entries.length === 0) return null;
  for (const [key, kind] of entries) {
    if (blob.includes(key)) return kind;
  }
  return null;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function normalizeName(value: string) {
  return normalize(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
  return candidate === target || candidate.includes(target) || target.includes(candidate);
}

function isAssignedToUser(person: any, assignedUserId?: string, assignedUserName?: string, fuzzyName = false) {
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
      if (candidate === targetName) return true;
      if (!fuzzyName) return false;
      return candidate.includes(targetName) || targetName.includes(candidate);
    });
  }

  return false;
}

function collectAssignedUsers(person: any) {
  const values: Array<{ id?: string; name?: string }> = [];

  const maybeAdd = (item: any) => {
    if (!item) return;
    if (typeof item === 'string' || typeof item === 'number') {
      const raw = String(item).trim();
      if (!raw) return;
      if (/^[0-9]+$/.test(raw)) {
        values.push({ id: raw });
      } else {
        values.push({ name: raw });
      }
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
  maybeAdd(person.assignedToName);
  maybeAdd(person.assignedUserName);
  maybeAdd(person.ownerName);
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
  if (Array.isArray(person.assignedToUsers)) {
    person.assignedToUsers.forEach(maybeAdd);
  }

  return values;
}

function getAssignmentPreview(allPeople: any[]) {
  const sample = allPeople.slice(0, 200);
  const names = new Set<string>();
  const ids = new Set<string>();

  for (const person of sample) {
    const assigned = collectAssignedUsers(person);
    for (const entry of assigned) {
      if (entry.name) names.add(entry.name);
      if (entry.id) ids.add(entry.id);
    }
  }

  return {
    sampleSize: sample.length,
    names: Array.from(names).slice(0, 20),
    ids: Array.from(ids).slice(0, 20),
  };
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
