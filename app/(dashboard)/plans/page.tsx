'use client';

import { Calendar, Plus } from 'lucide-react';

export default function PlansPage() {
  const planTypes = [
    { name: 'New Buyer', description: '5-day rapid follow-up sequence', leads: 0 },
    { name: 'New Seller', description: 'CMA + listing prep coaching', leads: 0 },
    { name: 'Nurture 30-day', description: 'Monthly market updates & value adds', leads: 0 },
    { name: 'Nurture 60-day', description: 'Deep engagement, education focus', leads: 0 },
    { name: 'Nurture 90-day', description: 'Quarterly check-in + relationship building', leads: 0 },
    { name: 'Post-Close', description: 'Follow-up, reviews, referral ask', leads: 0 },
  ];

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9] mb-2">Action Plans</h1>
        <p className="text-[#94A3B8]">Pre-built follow-up sequences for every lead stage</p>
      </div>

      {/* Plan Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {planTypes.map((plan, idx) => (
          <div
            key={idx}
            className="bg-[#111827] border border-[#1E293B] rounded-lg p-6 hover:border-[#D4A043] transition-colors cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-[#F1F5F9] mb-1">{plan.name}</h3>
                <p className="text-sm text-[#94A3B8]">{plan.description}</p>
              </div>
              <Calendar size={20} className="text-[#374151] group-hover:text-[#D4A043] transition-colors flex-shrink-0" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-[#64748B]">{plan.leads} active</span>
              <button className="px-3 py-1 bg-[#1E293B] hover:bg-[#374151] text-[#94A3B8] hover:text-[#F1F5F9] rounded text-sm font-medium transition-colors">
                Use Template
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Active Plans */}
      <div className="mt-12">
        <h3 className="text-lg font-semibold text-[#F1F5F9] mb-4 flex items-center gap-2">
          <Calendar size={20} />
          Active Plans
        </h3>

        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-12 text-center">
          <p className="text-[#94A3B8] mb-6">No active plans yet. Start by assigning a template to a lead.</p>
          <button className="px-6 py-2 bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] font-semibold rounded flex items-center gap-2 mx-auto">
            <Plus size={18} />
            Create Custom Plan
          </button>
        </div>
      </div>
    </div>
  );
}
