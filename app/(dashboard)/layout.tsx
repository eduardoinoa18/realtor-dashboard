'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useMemo } from 'react';
import { LayoutGrid, TrendingUp, Calculator, Zap, Users, Settings, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppSettings } from '@/store/appSettings';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const quickLinks = useAppSettings((state) => state.quickLinks);
  const sidebarQuickLinksCollapsed = useAppSettings((state) => state.sidebarQuickLinksCollapsed);
  const toggleSidebarQuickLinks = useAppSettings((state) => state.toggleSidebarQuickLinks);

  const navItems = [
    { href: '/today', label: 'Today', icon: LayoutGrid },
    { href: '/pipeline', label: 'Pipeline', icon: TrendingUp },
    { href: '/kpis', label: 'KPIs', icon: TrendingUp },
    { href: '/calculator', label: 'Calc', icon: Calculator },
    { href: '/ai', label: 'AI Coach', icon: Zap },
    { href: '/team', label: 'Team', icon: Users },
  ];

  const currentPage = useMemo(() => {
    const match = navItems.find((item) => pathname.startsWith(item.href));
    return match?.label || 'Dashboard';
  }, [navItems, pathname]);

  return (
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
            <div className="space-y-1">
              {quickLinks.map((link) => (
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
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
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
        <header className="border-b border-[#1E293B] px-4 md:px-6 py-3 bg-[#0D1117]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#F1F5F9]">{currentPage}</p>
              <Link href="/settings" className="text-xs text-[#94A3B8] hover:text-[#D4A043] transition-colors">
                Manage links and commissions
              </Link>
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
      <MobileNav navItems={navItems} pathname={pathname} />
    </div>
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
