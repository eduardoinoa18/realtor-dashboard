'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGrid, TrendingUp, Calculator, Zap, Users, Settings, ChevronDown, ChevronRight, ExternalLink, CheckSquare, Home, Shield, Brain, UserCircle2, Receipt } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppSettings } from '@/store/appSettings';
import PinGate from '@/components/auth/PinGate';
import ReadOnlyBanner from '@/components/auth/ReadOnlyBanner';
import { ContentLog, ExpenseEntry, PipelineLead, useEduStorage } from '@/hooks/useEduStorage';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const quickLinks = useAppSettings((state) => state.quickLinks);
  const sidebarQuickLinksCollapsed = useAppSettings((state) => state.sidebarQuickLinksCollapsed);
  const toggleSidebarQuickLinks = useAppSettings((state) => state.toggleSidebarQuickLinks);
  const aiModeEnabled = useAppSettings((state) => state.security.aiModeEnabled);
  const [searchQuery, setSearchQuery] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const shortcutSequence = useRef<string | null>(null);
  const shortcutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const todayKey = new Date().toISOString().slice(0, 10);
  const { state: expenses } = useEduStorage<ExpenseEntry[]>('edu_expenses_v1', []);
  const { state: leads } = useEduStorage<PipelineLead[]>('edu_pipeline_leads_v1', []);
  const { state: contentIdeas } = useEduStorage<ContentLog[]>('edu_content_log_v1', []);
  const { state: todayTasks } = useEduStorage<Array<{ id: string; title: string; is_done: boolean }>>(`edu_tasks_${todayKey}`, []);

  const navItems = [
    { href: '/today', label: 'Today', icon: LayoutGrid },
    { href: '/pipeline', label: 'Pipeline', icon: TrendingUp },
    { href: '/kpis', label: 'KPIs', icon: TrendingUp },
    { href: '/closings', label: 'Closings', icon: Home },
    { href: '/checklists', label: 'Checklists', icon: CheckSquare },
    { href: '/calculator', label: 'Calc', icon: Calculator },
    { href: '/ai', label: 'AI Coach', icon: Zap },
    { href: '/content-ideas', label: 'Content', icon: Zap },
    { href: '/intelligence', label: 'Intelligence', icon: Brain },
    { href: '/profile', label: 'Profile', icon: UserCircle2 },
    { href: '/expenses', label: 'Expenses', icon: Receipt },
    { href: '/license', label: 'License', icon: Shield },
    { href: '/team', label: 'Team', icon: Users },
  ];

  const mobileNavItems = navItems.slice(0, 5);

  const currentPage = useMemo(() => {
    const match = navItems.find((item) => pathname.startsWith(item.href));
    return match?.label || 'Dashboard';
  }, [navItems, pathname]);

  const reminderCounts = useMemo(() => {
    const overdueExpenses = expenses.filter((item) => item.dueDate && item.status !== 'paid' && item.dueDate < todayKey).length;
    const staleLeads = leads.filter((lead) => lead.stage !== 'closed' && (!lead.lastContactAt || (Date.now() - new Date(lead.lastContactAt).getTime()) > 7 * 24 * 60 * 60 * 1000)).length;
    const contentDueSoon = contentIdeas.filter((item) => item.scheduledFor && item.status !== 'posted' && item.scheduledFor <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)).length;
    const openTasks = todayTasks.filter((task) => !task.is_done).length;
    return {
      overdueExpenses,
      staleLeads,
      contentDueSoon,
      openTasks,
      total: overdueExpenses + staleLeads + contentDueSoon + openTasks,
    };
  }, [contentIdeas, expenses, leads, todayKey, todayTasks]);

  const searchableItems = useMemo(() => {
    const routeItems = [
      ...navItems,
      { href: '/plans', label: 'Plans', icon: LayoutGrid },
      { href: '/mlo', label: 'MLO', icon: Home },
      { href: '/calculator', label: 'Calculator', icon: Calculator },
      { href: '/settings', label: 'Settings', icon: Settings },
    ];
    const linkItems = quickLinks.map((link) => ({
      href: link.url,
      label: link.label,
      icon: ExternalLink,
      external: true,
    }));
    return [...routeItems, ...linkItems];
  }, [navItems, quickLinks]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return searchableItems.filter((item) => item.label.toLowerCase().includes(query)).slice(0, 8);
  }, [searchQuery, searchableItems]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingField = Boolean(target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

      if (event.key === '?' && !isTypingField) {
        event.preventDefault();
        setShowShortcuts((prev) => !prev);
        return;
      }

      if (event.key === '/' && event.shiftKey && !isTypingField) {
        event.preventDefault();
        const input = document.getElementById('dashboard-global-search') as HTMLInputElement | null;
        input?.focus();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const input = document.getElementById('dashboard-global-search') as HTMLInputElement | null;
        input?.focus();
        return;
      }

      if (isTypingField) return;

      const key = event.key.toLowerCase();
      if (key === 'g') {
        shortcutSequence.current = 'g';
        if (shortcutTimer.current) clearTimeout(shortcutTimer.current);
        shortcutTimer.current = setTimeout(() => {
          shortcutSequence.current = null;
        }, 1200);
        return;
      }

      if (shortcutSequence.current === 'g') {
        const routes: Record<string, string> = {
          t: '/today',
          p: '/pipeline',
          c: '/closings',
          e: '/expenses',
          k: '/kpis',
          l: '/license',
          s: '/settings',
        };
        const route = routes[key];
        shortcutSequence.current = null;
        if (shortcutTimer.current) clearTimeout(shortcutTimer.current);
        if (route) {
          event.preventDefault();
          router.push(route);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (shortcutTimer.current) clearTimeout(shortcutTimer.current);
    };
  }, []);

  const groupedQuickLinks = useMemo(() => {
    return quickLinks.reduce<Record<string, typeof quickLinks>>((acc, link) => {
      const key = link.group || 'General';
      if (!acc[key]) acc[key] = [];
      acc[key].push(link);
      return acc;
    }, {});
  }, [quickLinks]);

  return (
    <PinGate>
      <div className="flex h-screen bg-[#07090F]">
        {/* Sidebar - Desktop Only */}
        <div className="hidden md:flex w-64 bg-[#111827] border-r border-[#1E293B] flex-col">
          <div className="p-4 border-b border-[#1E293B]">
            <h1 className="text-xl font-bold text-[#D4A043]">Realtor HQ</h1>
            <p className="text-xs text-[#64748B]">Eduardo Inoa</p>
          </div>

          {/* Quick Links */}
          <div className="p-4 border-b border-[#1E293B]">
            <button
              onClick={toggleSidebarQuickLinks}
              className="w-full flex items-center justify-between text-xs font-semibold text-[#94A3B8] mb-2 uppercase"
            >
              Quick Links
              {sidebarQuickLinksCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
            {!sidebarQuickLinksCollapsed && (
              <div className="space-y-2">
                {Object.entries(groupedQuickLinks).map(([groupName, links]) => (
                  <div key={groupName}>
                    <p className="text-[10px] uppercase tracking-wide text-[#64748B] px-3 mb-1">{groupName}</p>
                    <div className="space-y-1">
                      {links.map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm px-3 py-1.5 rounded hover:bg-[#1E293B] text-[#94A3B8] hover:text-[#D4A043] transition-colors"
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const badge =
                item.href === '/today' ? reminderCounts.total :
                item.href === '/pipeline' ? reminderCounts.staleLeads :
                item.href === '/expenses' ? reminderCounts.overdueExpenses :
                item.href === '/content-ideas' ? reminderCounts.contentDueSoon :
                item.href === '/checklists' ? reminderCounts.openTasks : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2 rounded transition-colors ${
                    isActive
                      ? 'bg-[#D4A043] text-[#07090F] font-semibold'
                      : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#1E293B]'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-sm">{item.label}</span>
                  {badge > 0 && (
                    <span className="ml-auto min-w-6 rounded-full bg-[#D4A043] px-2 py-0.5 text-[10px] font-semibold text-[#07090F] text-center">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Settings */}
          <div className="p-4 border-t border-[#1E293B]">
            <Link
              href="/settings"
              className="flex items-center gap-3 px-4 py-2 rounded text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#1E293B] transition-colors"
            >
              <Settings size={20} />
              <span className="text-sm">Settings</span>
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Read-Only Banner */}
          {aiModeEnabled && <ReadOnlyBanner reason="ai-mode" />}

          <header className="border-b border-[#1E293B] px-4 md:px-6 py-3 bg-[#0D1117]">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#F1F5F9]">{currentPage}</p>
                <div className="flex items-center gap-3 text-xs">
                  <button onClick={() => setShowShortcuts(true)} className="text-[#94A3B8] hover:text-[#D4A043] transition-colors">
                    Shortcuts
                  </button>
                  <Link href="/settings" className="text-[#94A3B8] hover:text-[#D4A043] transition-colors">
                    Manage links and commissions
                  </Link>
                </div>
              </div>
              <div className="relative max-w-2xl w-full">
                <input
                  id="dashboard-global-search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search pages, links, and tools..."
                  className="w-full px-4 py-2.5 rounded-lg bg-[#111827] border border-[#1E293B] text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-[#D4A043]"
                />
                {searchQuery.trim().length > 0 && searchResults.length > 0 && (
                  <div className="absolute z-20 mt-2 w-full rounded-lg border border-[#1E293B] bg-[#111827] shadow-xl overflow-hidden">
                    {searchResults.map((item) => (
                      <button
                        key={`${item.label}-${item.href}`}
                        onClick={() => {
                          if (item.external) {
                            window.open(item.href, '_blank', 'noopener,noreferrer');
                          } else {
                            router.push(item.href);
                          }
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#1E293B] transition-colors"
                      >
                        <item.icon size={16} className="text-[#D4A043]" />
                        <div>
                          <p className="text-sm text-[#F1F5F9]">{item.label}</p>
                          <p className="text-[11px] text-[#64748B]">{item.external ? 'External link' : item.href}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {[
                  { label: 'Alerts', value: reminderCounts.total, tone: 'bg-[#D4A043] text-[#07090F]' },
                  { label: 'Leads', value: reminderCounts.staleLeads, tone: 'bg-[#1E293B] text-[#F1F5F9]' },
                  { label: 'Expenses', value: reminderCounts.overdueExpenses, tone: 'bg-[#1E293B] text-[#F1F5F9]' },
                  { label: 'Content', value: reminderCounts.contentDueSoon, tone: 'bg-[#1E293B] text-[#F1F5F9]' },
                  { label: 'Tasks', value: reminderCounts.openTasks, tone: 'bg-[#1E293B] text-[#F1F5F9]' },
                ].map((item) => (
                  <span key={item.label} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${item.tone}`}>
                    <span className="font-semibold">{item.label}</span>
                    <span>{item.value}</span>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {quickLinks.map((link) => (
                  <a
                    key={`top-${link.id}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#111827] border border-[#1E293B] text-xs text-[#94A3B8] hover:text-[#D4A043] hover:border-[#374151] transition-colors whitespace-nowrap"
                  >
                    {link.label}
                    <ExternalLink size={12} />
                  </a>
                ))}
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>

        {/* Mobile Nav - Mobile Only */}
        <MobileNav navItems={mobileNavItems} pathname={pathname} />
        {showShortcuts && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowShortcuts(false)}>
            <div className="w-full max-w-2xl rounded-2xl border border-[#1E293B] bg-[#111827] shadow-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#F1F5F9]">Keyboard Shortcuts</h2>
                  <p className="text-xs text-[#94A3B8]">Move faster across the dashboard.</p>
                </div>
                <button onClick={() => setShowShortcuts(false)} className="px-3 py-1.5 rounded bg-[#1E293B] text-[#F1F5F9] text-sm">
                  Close
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-[#F1F5F9]">
                {[
                  ['Ctrl/Cmd + K', 'Focus global search'],
                  ['Shift + /', 'Open search from anywhere'],
                  ['?', 'Show/hide this help panel'],
                  ['g then t', 'Go to Today'],
                  ['g then p', 'Go to Pipeline'],
                  ['g then c', 'Go to Closings'],
                  ['g then e', 'Go to Expenses'],
                  ['g then k', 'Go to KPIs'],
                  ['g then l', 'Go to License'],
                  ['g then s', 'Go to Settings'],
                ].map(([keys, action]) => (
                  <div key={keys} className="flex items-center justify-between gap-3 rounded-lg border border-[#1E293B] bg-[#0D1117] px-3 py-2">
                    <span className="font-mono text-[#D4A043]">{keys}</span>
                    <span className="text-right text-[#94A3B8]">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </PinGate>
  );
}

function MobileNav({ navItems, pathname }: {
  navItems: Array<{ href: string; label: string; icon: LucideIcon }>;
  pathname: string;
}) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#111827] border-t border-[#1E293B] flex justify-around">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-colors ${
              isActive ? 'text-[#D4A043]' : 'text-[#64748B]'
            }`}
          >
            <Icon size={24} />
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        );
      })}
      <Link
        href="/settings"
        className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-colors text-[#64748B] hover:text-[#94A3B8]`}
      >
        <Settings size={24} />
        <span className="text-xs mt-1">More</span>
      </Link>
    </nav>
  );
}
