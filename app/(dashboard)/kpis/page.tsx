'use client';

import { useState } from 'react';
import { TrendingUp, Calendar } from 'lucide-react';
import { WEEKLY_KPIS } from '@/lib/constants';

export default function KPIsPage() {
  const [kpis, setKpis] = useState<Record<string, number>>({
    touches: 0,
    calls: 0,
    appointments: 0,
    new_leads: 0,
    uags: 0,
    closings: 0,
  });

  const handleKpiChange = (key: string, delta: number) => {
    setKpis(prev => ({
      ...prev,
      [key]: Math.max(0, prev[key] + delta),
    }));
  };

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9]">Weekly KPIs</h1>
          <button className="px-4 py-2 bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9] rounded text-sm font-medium flex items-center gap-2">
            <Calendar size={18} />
            This Week
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {WEEKLY_KPIS.map((kpi) => {
          const current = kpis[kpi.key] || 0;
          const percentage = (current / kpi.target) * 100;
          const isHit = current >= kpi.target;

          return (
            <div
              key={kpi.key}
              className="bg-[#111827] border border-[#1E293B] rounded-lg p-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-[#64748B] uppercase font-semibold">{kpi.label}</p>
                  <p className="text-2xl font-bold text-[#F1F5F9] mt-1">{current}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  isHit ? 'bg-green/20' : 'bg-[#1E293B]'
                }`}>
                  <TrendingUp size={24} className={isHit ? 'text-green' : 'text-[#94A3B8]'} />
                </div>
              </div>

              {/* Target */}
              <p className="text-xs text-[#94A3B8] mb-3">Target: {kpi.target} {kpi.unit}</p>

              {/* Progress Bar */}
              <progress
                className={`h-2 w-full rounded-full overflow-hidden mb-4 ${
                  percentage >= 100 ? 'accent-green' : percentage >= 50 ? 'accent-amber' : 'accent-red'
                }`}
                max={100}
                value={Math.min(percentage, 100)}
                aria-label={`${kpi.label} progress`}
              />

              {/* Controls */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleKpiChange(kpi.key, -1)}
                  className="px-3 py-1 bg-[#1E293B] hover:bg-[#374151] text-[#94A3B8] rounded text-sm transition-colors"
                >
                  −
                </button>
                <span className="text-xs text-[#64748B]">{percentage.toFixed(0)}%</span>
                <button
                  onClick={() => handleKpiChange(kpi.key, 1)}
                  className="px-3 py-1 bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] rounded text-sm font-semibold transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Projection */}
      <div className="bg-gradient-to-r from-[#3B82F6]/20 to-[#06B6D4]/20 border border-[#3B82F6]/50 rounded-lg p-6">
        <h3 className="font-semibold text-[#F1F5F9] mb-4">Monthly Projection</h3>
        <p className="text-[#94A3B8]">If this week's pace continues, you're on track for <span className="font-semibold text-[#3B82F6]">0 closings</span> and <span className="font-semibold text-[#06B6D4]">$0</span> net this month.</p>
      </div>
    </div>
  );
}
