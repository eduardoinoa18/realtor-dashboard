'use client';

import { NowZone } from '@/components/dashboard/NowZone';
import { TaskList } from '@/components/dashboard/TaskList';
import { formatCurrency } from '@/lib/utils';
import { TARGETS } from '@/lib/constants';
import { TrendingUp, AlertCircle, Calendar } from 'lucide-react';

export default function TodayPage() {
  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9] mb-2">Good afternoon, Eduardo</h1>
        <p className="text-[#94A3B8]">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Month Status Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
          <p className="text-xs text-[#64748B] uppercase font-semibold">This Month</p>
          <p className="text-2xl font-bold text-[#D4A043] mt-1">0 / 3</p>
          <p className="text-xs text-[#94A3B8] mt-2">Closings</p>
        </div>
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
          <p className="text-xs text-[#64748B] uppercase font-semibold">Pipeline</p>
          <p className="text-2xl font-bold text-[#3B82F6] mt-1">--</p>
          <p className="text-xs text-[#94A3B8] mt-2">Active Leads</p>
        </div>
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
          <p className="text-xs text-[#64748B] uppercase font-semibold">UAGs</p>
          <p className="text-2xl font-bold text-[#10B981] mt-1">0</p>
          <p className="text-xs text-[#94A3B8] mt-2">Under Agreement</p>
        </div>
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
          <p className="text-xs text-[#64748B] uppercase font-semibold">Target</p>
          <p className="text-2xl font-bold text-[#D4A043] mt-1">{formatCurrency(TARGETS.netMonthlyTarget)}</p>
          <p className="text-xs text-[#94A3B8] mt-2">Monthly Net</p>
        </div>
      </div>

      {/* NowZone Widget */}
      <div className="mb-8">
        <NowZone />
      </div>

      {/* Alerts */}
      <div className="space-y-3 mb-8">
        <div className="bg-red/10 border border-red rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red mb-1">Stale Leads</p>
            <p className="text-sm text-[#94A3B8]">You have 0 leads not contacted in 7+ days. Stay ahead!</p>
          </div>
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
              <h3 className="text-lg font-semibold text-[#F1F5F9]">Today's Appointments</h3>
            </div>
            <p className="text-[#94A3B8] text-sm">No appointments scheduled. Check your calendar or add one.</p>
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
            <p className="text-4xl font-bold text-[#D4A043] mt-2">0</p>
            <p className="text-xs text-[#94A3B8] mt-2">days active</p>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <button className="w-full px-4 py-2 bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] font-semibold rounded transition-colors text-sm">
              Sync with Follow Boss
            </button>
            <button className="w-full px-4 py-2 bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9] font-semibold rounded transition-colors text-sm">
              Review Pipeline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
