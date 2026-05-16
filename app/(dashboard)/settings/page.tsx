'use client';

import { Settings, Key, Download, Link as LinkIcon, Trash2, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppSettings } from '@/store/appSettings';
import SecuritySettings from '@/components/settings/SecuritySettings';
import { useEduStorage, useStorageUsage } from '@/hooks/useEduStorage';

export default function SettingsPage() {
  const [fubKey, setFubKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [theme, setTheme] = useState('dark');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkGroup, setNewLinkGroup] = useState('General');
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editingLinkLabel, setEditingLinkLabel] = useState('');
  const [editingLinkUrl, setEditingLinkUrl] = useState('');
  const [fubStatus, setFubStatus] = useState<{ connected: boolean; scopeMode?: string; assignedLeads?: number; totalLeads?: number; recommendation?: string; error?: string } | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<{ connected: boolean; count?: number; reason?: string; message?: string; source?: string } | null>(null);
  const [claudeStatus, setClaudeStatus] = useState<{ connected: boolean; sonnetAvailable: boolean; haikuAvailable: boolean; error?: string; warning?: string } | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ connected: boolean; configured: boolean; mailbox?: string; messageCount?: number; error?: string; reason?: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const { state: aiProjectContext, setState: setAiProjectContext } = useEduStorage<string>('edu_ai_project_context_v1', 'Primary objective: run this dashboard as the operating brain to increase quality conversations, appointments, own-lead closings, and monthly net income.');
  const { state: profile } = useEduStorage('edu_business_profile_v1', {
    fullName: 'Eduardo Inoa',
    brokerage: 'Century 21 NE',
    primaryEmail: '',
    primaryPhone: '',
    googleCalendarId: '',
    googleCalendarIcsUrl: '',
    googleCalendarLabel: '',
  });

  const quickLinks = useAppSettings((state) => state.quickLinks);
  const addQuickLink = useAppSettings((state) => state.addQuickLink);
  const removeQuickLink = useAppSettings((state) => state.removeQuickLink);
  const updateQuickLink = useAppSettings((state) => state.updateQuickLink);
  const moveQuickLink = useAppSettings((state) => state.moveQuickLink);
  const updateQuickLinkGroup = useAppSettings((state) => state.updateQuickLinkGroup);
  const commissions = useAppSettings((state) => state.commissions);
  const targets = useAppSettings((state) => state.targets);
  const updateCommission = useAppSettings((state) => state.updateCommission);
  const updateTarget = useAppSettings((state) => state.updateTarget);
  const storage = useStorageUsage();

  const handleSave = async () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleAddQuickLink = () => {
    addQuickLink(newLinkLabel, newLinkUrl, newLinkGroup);
    setNewLinkLabel('');
    setNewLinkUrl('');
    setNewLinkGroup('General');
  };

  const startEditQuickLink = (id: string, label: string, url: string) => {
    setEditingLinkId(id);
    setEditingLinkLabel(label);
    setEditingLinkUrl(url);
  };

  const handleSaveQuickLink = () => {
    if (!editingLinkId) return;
    updateQuickLink(editingLinkId, editingLinkLabel, editingLinkUrl);
    setEditingLinkId(null);
    setEditingLinkLabel('');
    setEditingLinkUrl('');
  };

  const refreshClaudeStatus = async () => {
    try {
      const res = await fetch('/api/ai/status');
      const data = await res.json();
      setClaudeStatus({
        connected: Boolean(data?.connected),
        sonnetAvailable: Boolean(data?.sonnetAvailable),
        haikuAvailable: Boolean(data?.haikuAvailable),
        error: data?.error ? String(data.error) : undefined,
        warning: data?.warning ? String(data.warning) : undefined,
      });
    } catch {
      setClaudeStatus({ connected: false, sonnetAvailable: false, haikuAvailable: false, error: 'Unable to check Claude connection.' });
    }
  };

  const refreshEmailStatus = async () => {
    try {
      const res = await fetch('/api/email/status');
      const data = await res.json();
      setEmailStatus({
        connected: Boolean(data?.connected),
        configured: Boolean(data?.configured),
        mailbox: data?.mailbox ? String(data.mailbox) : undefined,
        messageCount: Number.isFinite(Number(data?.messageCount)) ? Number(data.messageCount) : undefined,
        error: data?.error ? String(data.error) : undefined,
        reason: data?.reason ? String(data.reason) : undefined,
      });
    } catch {
      setEmailStatus({ connected: false, configured: false, reason: 'status_fetch_failed', error: 'Unable to check email integration status.' });
    }
  };

  const refreshFubStatus = async () => {
    try {
      const res = await fetch('/api/fub?type=status');
      const data = await res.json();
      setFubStatus({
        connected: Boolean(data?.connected),
        scopeMode: data?.scope?.mode ? String(data.scope.mode) : undefined,
        assignedLeads: Number.isFinite(Number(data?.scope?.assignedLeads)) ? Number(data.scope.assignedLeads) : undefined,
        totalLeads: Number.isFinite(Number(data?.scope?.totalLeads)) ? Number(data.scope.totalLeads) : undefined,
        recommendation: data?.recommendation ? String(data.recommendation) : undefined,
      });
    } catch {
      setFubStatus({ connected: false, error: 'Unable to check FUB connection.' });
    }
  };

  const refreshCalendarStatus = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const calendarId = String(profile?.googleCalendarId || '').trim();
    const icsUrl = String(profile?.googleCalendarIcsUrl || '').trim();

    if (!calendarId && !icsUrl) {
      setCalendarStatus({
        connected: false,
        reason: 'missing_calendar_source',
        message: 'Set Google Calendar ID or public ICS URL in Profile.',
      });
      return;
    }

    try {
      const query = calendarId
        ? `calendarId=${encodeURIComponent(calendarId)}`
        : `icsUrl=${encodeURIComponent(icsUrl)}`;
      const res = await fetch(`/api/calendar?startDate=${today}&endDate=${today}&${query}`);
      const data = await res.json();
      const count = Number(data?.count || 0);
      const reason = data?.diagnostics?.reason ? String(data.diagnostics.reason) : undefined;
      setCalendarStatus({
        connected: res.ok && !reason,
        count,
        reason,
        message: data?.diagnostics?.message ? String(data.diagnostics.message) : undefined,
        source: calendarId ? 'calendarId' : 'icsUrl',
      });
    } catch {
      setCalendarStatus({ connected: false, reason: 'calendar_status_check_failed', message: 'Unable to check calendar connection.' });
    }
  };

  useEffect(() => {
    let cancelled = false;

    const refreshAll = async () => {
      if (cancelled) return;
      await refreshFubStatus();
      if (cancelled) return;
      await refreshCalendarStatus();
      if (cancelled) return;
      await refreshClaudeStatus();
      if (cancelled) return;
      await refreshEmailStatus();
    };

    void refreshAll();
    return () => {
      cancelled = true;
    };
  }, [profile?.googleCalendarIcsUrl, profile?.googleCalendarId]);

  const handleResetLocalData = () => {
    localStorage.removeItem('realtor-hq-settings');
    window.location.reload();
  };

  const handleExportData = () => {
    const payload: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('edu_')) continue;
      payload[key] = localStorage.getItem(key) || '';
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eduardo-dashboard-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = async (file: File) => {
    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      alert('Invalid backup file format. Expected JSON.');
      return;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      alert('Invalid backup payload. Expected key/value object.');
      return;
    }

    const entries = Object.entries(parsed as Record<string, unknown>);
    const allowedKeys = [
      'edu_',
      'realtor-hq-settings',
    ];

    let importedCount = 0;
    for (const [key, value] of entries) {
      const isAllowed = allowedKeys.some((prefix) => key.startsWith(prefix));
      if (!isAllowed) continue;
      if (typeof value !== 'string') continue;
      if (value.length > 2_000_000) continue;

      const trimmed = value.trim();
      if ((trimmed.startsWith('{') || trimmed.startsWith('['))) {
        try {
          JSON.parse(trimmed);
        } catch {
          continue;
        }
      }

      localStorage.setItem(key, value);
      importedCount += 1;
    }

    if (importedCount === 0) {
      alert('No valid backup keys were found to import.');
      return;
    }

    window.location.reload();
  };

  const handleClearOldData = () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('edu_')) continue;
      const match = key.match(/(\d{4}-\d{2}-\d{2})$/);
      if (!match) continue;
      const date = new Date(match[1]);
      if (date < cutoff) keysToDelete.push(key);
    }

    keysToDelete.forEach((key) => localStorage.removeItem(key));
    alert(`Removed ${keysToDelete.length} old data keys.`);
  };

  const integrationFixGuide: Array<{ id: string; title: string; steps: string[] }> = [];

  if (fubStatus?.error) {
    integrationFixGuide.push({
      id: 'fub-connectivity',
      title: 'Fix FUB connectivity',
      steps: [
        'Confirm FUB_API_KEY is set in deployment environment variables.',
        'Verify the Follow Up Boss API key is active and has people/events/appointments access.',
        'Run Recheck FUB after updating env vars.',
      ],
    });
  }

  if (fubStatus?.scopeMode === 'fallback-all-people') {
    integrationFixGuide.push({
      id: 'fub-scope-fallback',
      title: 'Fix FUB assignment scoping',
      steps: [
        'Set FUB_ASSIGNED_USER_ID in environment variables for exact user matching.',
        'Set FUB_ASSIGNED_USER_NAME to the exact full name in Follow Up Boss.',
        'Open FUB and confirm leads are actively assigned to that user.',
      ],
    });
  }

  if (calendarStatus?.reason === 'missing_calendar_source') {
    integrationFixGuide.push({
      id: 'calendar-missing-source',
      title: 'Connect Google Calendar source',
      steps: [
        'Open Profile and set Google Calendar ID or Google Calendar ICS URL.',
        'Use calendarId when possible; use ICS URL only if it is public and stable.',
        'Run Recheck Calendar after saving profile fields.',
      ],
    });
  }

  if (calendarStatus?.reason === 'calendar_not_found_or_private' || calendarStatus?.reason === 'calendar_private_or_forbidden') {
    integrationFixGuide.push({
      id: 'calendar-private-feed',
      title: 'Fix private or invalid Google Calendar feed',
      steps: [
        'In Google Calendar settings, use Public address in iCal format or make the calendar publicly readable.',
        'If using calendarId mode, confirm the calendar ID is exact and still valid.',
        'Run Recheck Calendar and verify Today events is greater than zero on active days.',
      ],
    });
  }

  if (calendarStatus?.reason === 'calendar_sync_failed' || calendarStatus?.reason === 'calendar_fetch_failed' || calendarStatus?.reason === 'calendar_status_check_failed') {
    integrationFixGuide.push({
      id: 'calendar-sync-fail',
      title: 'Resolve calendar sync failures',
      steps: [
        'Verify the calendar URL resolves in a browser without authentication prompts.',
        'Check network/firewall settings in your deployment runtime.',
        'Run Recheck Calendar and confirm diagnostics reason clears.',
      ],
    });
  }

  if (emailStatus?.reason === 'missing_imap_environment_variables' || (!emailStatus?.configured && !emailStatus?.connected)) {
    integrationFixGuide.push({
      id: 'email-env-missing',
      title: 'Configure IMAP environment variables',
      steps: [
        'Set EMAIL_IMAP_HOST, EMAIL_IMAP_PORT, EMAIL_IMAP_SECURE, EMAIL_IMAP_USER, EMAIL_IMAP_PASS.',
        'Set EMAIL_IMAP_MAILBOX if you do not use INBOX.',
        'Redeploy or restart server process, then run Recheck Email Connection.',
      ],
    });
  }

  if (emailStatus?.reason === 'imap_connection_failed' || emailStatus?.reason === 'imap_fetch_failed') {
    integrationFixGuide.push({
      id: 'email-imap-auth',
      title: 'Fix IMAP authentication and mailbox access',
      steps: [
        'Confirm IMAP is enabled for the mailbox provider account.',
        'Use an app password where required instead of the regular account password.',
        'Verify mailbox name (for example INBOX) and run Recheck Email Connection.',
      ],
    });
  }

  if (claudeStatus && !claudeStatus.connected) {
    integrationFixGuide.push({
      id: 'claude-connection',
      title: 'Restore Claude connectivity',
      steps: [
        'Set a valid ANTHROPIC_API_KEY in your environment variables.',
        'Confirm outbound network access to Anthropic API endpoints from deployment.',
        'Run Recheck Connection and verify Sonnet or Haiku availability.',
      ],
    });
  }

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings size={32} className="text-[#D4A043]" />
          <h1 className="text-3xl font-bold text-[#F1F5F9]">Settings</h1>
        </div>
      </div>

      <div className="space-y-6">
        {/* API Keys Section */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <h3 className="font-semibold text-[#F1F5F9] mb-4 flex items-center gap-2">
            <Key size={20} />
            API Keys
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Follow Boss API Key</label>
              <input
                type="password"
                value={fubKey}
                onChange={(e) => setFubKey(e.target.value)}
                placeholder="Paste your FUB API key here"
                className="w-full px-4 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#D4A043]"
              />
              <p className="text-xs text-[#64748B] mt-2">
                Get this from Follow Boss → Admin → API Keys
              </p>
            </div>

            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Claude API Key</label>
              <input
                type="password"
                value={claudeKey}
                onChange={(e) => setClaudeKey(e.target.value)}
                placeholder="Paste your Anthropic API key here"
                className="w-full px-4 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#D4A043]"
              />
              <p className="text-xs text-[#64748B] mt-2">
                Get this from console.anthropic.com → API Keys
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <h3 className="font-semibold text-[#F1F5F9] mb-3">Integration Health</h3>
          <p className="text-xs text-[#94A3B8] mb-4">
            Fast diagnostics for FUB scope and Google Calendar feed status.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded border border-[#1E293B] bg-[#0D1117] p-3">
              <p className={`text-xs ${fubStatus?.connected ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                FUB: {fubStatus?.connected ? 'Connected' : 'Disconnected'}
              </p>
              <p className="text-xs text-[#94A3B8] mt-1">
                Scope: {fubStatus?.scopeMode || 'n/a'}
                {Number.isFinite(fubStatus?.assignedLeads) && Number.isFinite(fubStatus?.totalLeads)
                  ? ` • Leads: ${fubStatus?.assignedLeads}/${fubStatus?.totalLeads}`
                  : ''}
              </p>
              {fubStatus?.recommendation && <p className="text-xs text-[#94A3B8] mt-1">{fubStatus.recommendation}</p>}
              {fubStatus?.error && <p className="text-xs text-red mt-1">{fubStatus.error}</p>}
              <button
                onClick={refreshFubStatus}
                className="mt-3 px-3 py-1.5 bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9] rounded text-xs"
              >
                Recheck FUB
              </button>
            </div>

            <div className="rounded border border-[#1E293B] bg-[#0D1117] p-3">
              <p className={`text-xs ${calendarStatus?.connected ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                Calendar: {calendarStatus?.connected ? 'Connected' : 'Needs attention'}
              </p>
              <p className="text-xs text-[#94A3B8] mt-1">
                Source: {calendarStatus?.source || (profile?.googleCalendarId ? 'calendarId' : profile?.googleCalendarIcsUrl ? 'icsUrl' : 'none')}
                {Number.isFinite(calendarStatus?.count) ? ` • Today events: ${calendarStatus?.count}` : ''}
              </p>
              {calendarStatus?.reason && <p className="text-xs text-[#94A3B8] mt-1">Reason: {calendarStatus.reason}</p>}
              {calendarStatus?.message && <p className="text-xs text-[#94A3B8] mt-1">{calendarStatus.message}</p>}
              <button
                onClick={refreshCalendarStatus}
                className="mt-3 px-3 py-1.5 bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9] rounded text-xs"
              >
                Recheck Calendar
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <h3 className="font-semibold text-[#F1F5F9] mb-4">Claude Project Integration</h3>
          <p className="text-xs text-[#94A3B8] mb-3">
            This context is injected into AI routes so Claude behaves like your business co-pilot with your project goals and operating rules.
          </p>
          <textarea
            value={aiProjectContext}
            onChange={(e) => setAiProjectContext(e.target.value)}
            placeholder="Describe your business operating model, growth targets, constraints, and what the AI must prioritize."
            className="w-full min-h-[130px] px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className={`text-xs ${claudeStatus?.connected ? 'text-[#10B981]' : 'text-red'}`}>
                Claude status: {claudeStatus?.connected ? 'Connected' : 'Disconnected'}
              </p>
              {claudeStatus?.warning && <p className="text-xs text-[#F59E0B] mt-1">{claudeStatus.warning}</p>}
              {claudeStatus?.error && <p className="text-xs text-red mt-1">{claudeStatus.error}</p>}
              {claudeStatus?.connected && (
                <p className="text-xs text-[#94A3B8] mt-1">Sonnet: {claudeStatus.sonnetAvailable ? 'Yes' : 'No'} • Haiku: {claudeStatus.haikuAvailable ? 'Yes' : 'No'}</p>
              )}
            </div>
            <button
              onClick={refreshClaudeStatus}
              className="px-3 py-1.5 bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9] rounded text-xs"
            >
              Recheck Connection
            </button>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <h3 className="font-semibold text-[#F1F5F9] mb-3">Email AI Integration</h3>
          <p className="text-xs text-[#94A3B8] mb-3">
            Connect IMAP inbox so AI can review recent business emails for opportunities, risks, and follow-ups.
          </p>
          <p className={`text-xs ${emailStatus?.connected ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
            Email status: {emailStatus?.connected ? 'Connected' : emailStatus?.configured ? 'Configured but disconnected' : 'Not configured'}
          </p>
          {emailStatus?.mailbox && (
            <p className="text-xs text-[#94A3B8] mt-1">Mailbox: {emailStatus.mailbox}{Number.isFinite(emailStatus.messageCount) ? ` • Messages: ${emailStatus.messageCount}` : ''}</p>
          )}
          {emailStatus?.reason && <p className="text-xs text-[#94A3B8] mt-1">Reason: {emailStatus.reason}</p>}
          {emailStatus?.error && <p className="text-xs text-red mt-1">{emailStatus.error}</p>}
          <div className="mt-3 text-xs text-[#94A3B8]">
            Required env vars: EMAIL_IMAP_HOST, EMAIL_IMAP_PORT, EMAIL_IMAP_SECURE, EMAIL_IMAP_USER, EMAIL_IMAP_PASS, EMAIL_IMAP_MAILBOX (optional).
          </div>
          <button
            onClick={refreshEmailStatus}
            className="mt-3 px-3 py-1.5 bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9] rounded text-xs"
          >
            Recheck Email Connection
          </button>
        </div>

        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <h3 className="font-semibold text-[#F1F5F9] mb-3">Integration Fix Guide</h3>
          <p className="text-xs text-[#94A3B8] mb-4">
            Guided remediation generated from live diagnostics.
          </p>

          {integrationFixGuide.length === 0 ? (
            <p className="text-xs text-[#10B981]">All integration checks look healthy right now.</p>
          ) : (
            <div className="space-y-3">
              {integrationFixGuide.map((item) => (
                <div key={item.id} className="rounded border border-[#1E293B] bg-[#0D1117] p-3">
                  <p className="text-sm text-[#F1F5F9] font-medium">{item.title}</p>
                  <ol className="mt-2 list-decimal list-inside space-y-1 text-xs text-[#94A3B8]">
                    {item.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <h3 className="font-semibold text-[#F1F5F9] mb-4 flex items-center gap-2">
            <LinkIcon size={20} />
            Quick Links
          </h3>

          <div className="space-y-3 mb-4">
            {quickLinks.map((link) => (
              <div key={link.id} className="flex items-center gap-2 bg-[#0D1117] border border-[#374151] rounded px-3 py-2">
                <div className="flex-1 min-w-0">
                  {editingLinkId === link.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingLinkLabel}
                        onChange={(e) => setEditingLinkLabel(e.target.value)}
                        className="w-full px-2 py-1 bg-[#111827] border border-[#1E293B] rounded text-xs text-[#F1F5F9]"
                        placeholder="Link label"
                        title="Quick link label"
                      />
                      <input
                        type="text"
                        value={editingLinkUrl}
                        onChange={(e) => setEditingLinkUrl(e.target.value)}
                        className="w-full px-2 py-1 bg-[#111827] border border-[#1E293B] rounded text-xs text-[#F1F5F9]"
                        placeholder="Link URL"
                        title="Quick link URL"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-[#F1F5F9] truncate">{link.label}</p>
                      <p className="text-xs text-[#64748B] truncate">{link.url}</p>
                    </>
                  )}
                  <input
                    type="text"
                    value={link.group}
                    onChange={(e) => updateQuickLinkGroup(link.id, e.target.value)}
                    className="mt-2 w-full max-w-[180px] px-2 py-1 bg-[#111827] border border-[#1E293B] rounded text-xs text-[#94A3B8]"
                    aria-label="Quick link group"
                  />
                </div>
                <button
                  onClick={() => moveQuickLink(link.id, 'up')}
                  className="p-1 text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  title="Move up"
                  aria-label="Move quick link up"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => moveQuickLink(link.id, 'down')}
                  className="p-1 text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  title="Move down"
                  aria-label="Move quick link down"
                >
                  <ArrowDown size={16} />
                </button>
                {editingLinkId === link.id ? (
                  <>
                    <button
                      onClick={handleSaveQuickLink}
                      className="p-1 text-[#64748B] hover:text-[#10B981] transition-colors"
                      title="Save quick link"
                      aria-label="Save quick link"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingLinkId(null)}
                      className="p-1 text-[#64748B] hover:text-[#94A3B8] transition-colors"
                      title="Cancel quick link edit"
                      aria-label="Cancel quick link edit"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => startEditQuickLink(link.id, link.label, link.url)}
                    className="p-1 text-[#64748B] hover:text-[#94A3B8] transition-colors"
                    title="Edit quick link"
                    aria-label="Edit quick link"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => removeQuickLink(link.id)}
                  className="p-1 text-[#64748B] hover:text-red transition-colors"
                  title="Remove quick link"
                  aria-label="Remove quick link"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={newLinkLabel}
              onChange={(e) => setNewLinkLabel(e.target.value)}
              placeholder="Label (e.g., MLS)"
              className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9] placeholder-[#64748B]"
            />
            <input
              type="text"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="URL (e.g., mls.example.com)"
              className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9] placeholder-[#64748B]"
            />
            <input
              type="text"
              value={newLinkGroup}
              onChange={(e) => setNewLinkGroup(e.target.value)}
              placeholder="Group (e.g., CRM)"
              className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9] placeholder-[#64748B]"
            />
          </div>
          <button
            onClick={handleAddQuickLink}
            className="mt-3 px-4 py-2 bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] rounded font-semibold text-sm flex items-center gap-2"
          >
            <Plus size={16} />
            Add Quick Link
          </button>
        </div>

        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <h3 className="font-semibold text-[#F1F5F9] mb-4">Financial Model</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Default Commission %</label>
              <input
                type="number"
                value={commissions.defaultCommissionPct * 100}
                onChange={(e) => updateCommission('defaultCommissionPct', Number(e.target.value) / 100)}
                title="Default commission percentage"
                aria-label="Default commission percentage"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Franchise Fee %</label>
              <input
                type="number"
                value={commissions.franchiseFeePct * 100}
                onChange={(e) => updateCommission('franchiseFeePct', Number(e.target.value) / 100)}
                title="Franchise fee percentage"
                aria-label="Franchise fee percentage"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Own Lead Agent Split %</label>
              <input
                type="number"
                value={commissions.ownAgentPct * 100}
                onChange={(e) => updateCommission('ownAgentPct', Number(e.target.value) / 100)}
                title="Own lead agent split percentage"
                aria-label="Own lead agent split percentage"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Company Lead Agent Split %</label>
              <input
                type="number"
                value={commissions.companyAgentPct * 100}
                onChange={(e) => updateCommission('companyAgentPct', Number(e.target.value) / 100)}
                title="Company lead agent split percentage"
                aria-label="Company lead agent split percentage"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Zillow Referral %</label>
              <input
                type="number"
                value={commissions.zillowReferralPct * 100}
                onChange={(e) => updateCommission('zillowReferralPct', Number(e.target.value) / 100)}
                title="Zillow referral percentage"
                aria-label="Zillow referral percentage"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Zillow Agent Split %</label>
              <input
                type="number"
                value={commissions.zillowAgentPct * 100}
                onChange={(e) => updateCommission('zillowAgentPct', Number(e.target.value) / 100)}
                title="Zillow agent split percentage"
                aria-label="Zillow agent split percentage"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Monthly Net Goal ($)</label>
              <input
                type="number"
                value={targets.netMonthlyTarget}
                onChange={(e) => updateTarget('netMonthlyTarget', Number(e.target.value))}
                title="Monthly net goal"
                aria-label="Monthly net goal"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Survival Minimum ($)</label>
              <input
                type="number"
                value={targets.survivalMinimum}
                onChange={(e) => updateTarget('survivalMinimum', Number(e.target.value))}
                title="Survival minimum"
                aria-label="Survival minimum"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Monthly Closings Goal</label>
              <input
                type="number"
                value={targets.monthGoal}
                onChange={(e) => updateTarget('monthGoal', Number(e.target.value))}
                title="Monthly closings goal"
                aria-label="Monthly closings goal"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Daily Call Goal</label>
              <input
                type="number"
                value={targets.dailyCallGoal}
                onChange={(e) => updateTarget('dailyCallGoal', Number(e.target.value))}
                title="Daily call goal"
                aria-label="Daily call goal"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Daily Text Goal</label>
              <input
                type="number"
                value={targets.dailyTextGoal}
                onChange={(e) => updateTarget('dailyTextGoal', Number(e.target.value))}
                title="Daily text goal"
                aria-label="Daily text goal"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Daily Appointment Goal</label>
              <input
                type="number"
                value={targets.dailyApptGoal}
                onChange={(e) => updateTarget('dailyApptGoal', Number(e.target.value))}
                title="Daily appointment goal"
                aria-label="Daily appointment goal"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Daily Email Goal</label>
              <input
                type="number"
                value={targets.dailyEmailGoal}
                onChange={(e) => updateTarget('dailyEmailGoal', Number(e.target.value))}
                title="Daily email goal"
                aria-label="Daily email goal"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Average Sale Price ($)</label>
              <input
                type="number"
                value={targets.avgSalePrice}
                onChange={(e) => updateTarget('avgSalePrice', Number(e.target.value))}
                title="Average sale price"
                aria-label="Average sale price"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <h3 className="font-semibold text-[#F1F5F9] mb-4">Preferences</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                title="Theme"
                aria-label="Theme"
                className="w-full px-4 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              >
                <option value="dark">Dark (Default)</option>
                <option value="light">Light</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded border-[#374151]"
              />
              <span className="text-sm text-[#94A3B8]">Enable notifications</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded border-[#374151]"
              />
              <span className="text-sm text-[#94A3B8]">Auto-sync FUB daily at 1pm</span>
            </label>
          </div>
        </div>

        {/* Profile Section */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <h3 className="font-semibold text-[#F1F5F9] mb-4">Profile</h3>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-[#64748B] uppercase mb-1">Name</p>
              <p className="text-[#F1F5F9]">Eduardo Inoa</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B] uppercase mb-1">Email</p>
              <p className="text-[#F1F5F9]">eduardoinoa18@gmail.com</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B] uppercase mb-1">Team</p>
              <p className="text-[#F1F5F9]">Century 21 NE – Fermin Group</p>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <SecuritySettings />
        </div>

        {/* Data Section */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <h3 className="font-semibold text-[#F1F5F9] mb-4 flex items-center gap-2">
            <Download size={20} />
            Data
          </h3>

          <div className="space-y-3">
            <button
              onClick={handleExportData}
              className="w-full px-4 py-2 bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9] rounded font-medium text-sm transition-colors"
            >
              Export Data as JSON
            </button>
            <label className="w-full px-4 py-2 bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9] rounded font-medium text-sm transition-colors text-center block cursor-pointer">
              Import Data from Backup
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImportData(file).catch(() => alert('Failed to import backup file.'));
                  }
                }}
              />
            </label>
            <button
              onClick={handleClearOldData}
              className="w-full px-4 py-2 bg-amber/20 hover:bg-amber/30 text-amber rounded font-medium text-sm transition-colors"
            >
              Clear Old Data (90+ days)
            </button>
            <button
              onClick={handleResetLocalData}
              className="w-full px-4 py-2 bg-red/20 hover:bg-red/30 text-red rounded font-medium text-sm transition-colors"
            >
              Clear All Local Data
            </button>
            <p className={`text-xs ${storage.overLimit ? 'text-red' : 'text-[#94A3B8]'}`}>
              Storage usage: {storage.mb.toFixed(2)} MB {storage.overLimit ? '(approaching 5 MB browser limit)' : ''}
            </p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full px-6 py-3 bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] font-semibold rounded transition-colors"
        >
          {saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
