'use client';

import { useState } from 'react';
import { TrendingUp, Filter, Plus } from 'lucide-react';
import { formatCurrency, calculateCommission } from '@/lib/utils';

interface Lead {
  id: string;
  name: string;
  lead_source: 'own' | 'company' | 'zillow';
  stage: string;
  days_in_stage: number;
  price_range_max?: number;
  phone?: string;
}

export default function PipelinePage() {
  const [stage, setStage] = useState<string>('all');
  const [leads] = useState<Lead[]>([]);

  const stages = ['All', 'New', 'Nurture', 'Active', 'UAG', 'Closed'];

  const pipelineValue = leads.reduce((sum, lead) => {
    if (lead.price_range_max) {
      const commission = calculateCommission(lead.price_range_max, 0.02, lead.lead_source);
      return sum + commission.net;
    }
    return sum;
  }, 0);

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
            <p className="text-2xl font-bold text-[#D4A043] mt-1">0</p>
          </div>
          <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
            <p className="text-xs text-[#64748B] uppercase font-semibold">Pipeline Value</p>
            <p className="text-lg font-bold text-[#10B981] mt-1">{formatCurrency(pipelineValue)}</p>
          </div>
          <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
            <p className="text-xs text-[#64748B] uppercase font-semibold">Est. Close</p>
            <p className="text-lg font-bold text-[#3B82F6] mt-1">--</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
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
        <button className="ml-auto px-4 py-2 bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] font-semibold rounded flex items-center gap-2">
          <Plus size={18} />
          <span className="hidden sm:inline">Add Lead</span>
        </button>
      </div>

      {/* Empty State */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-12 text-center">
        <TrendingUp size={48} className="text-[#374151] mx-auto mb-4" />
        <p className="text-[#94A3B8] mb-4">No leads yet. Get started by adding a lead or syncing with Follow Boss.</p>
        <div className="flex gap-3 justify-center">
          <button className="px-6 py-2 bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] font-semibold rounded">
            Add Lead
          </button>
          <button className="px-6 py-2 bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9] font-semibold rounded">
            Sync with FUB
          </button>
        </div>
      </div>
    </div>
  );
}
