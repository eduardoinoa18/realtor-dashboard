'use client';

import { useMemo, useState } from 'react';
import { TrendingUp, Filter, Plus } from 'lucide-react';
import { formatCurrency, calculateCommission } from '@/lib/utils';
import { useAppSettings } from '@/store/appSettings';
import { ClosingLog, PipelineLead, useEduStorage } from '@/hooks/useEduStorage';

export default function PipelinePage() {
  const [stage, setStage] = useState<string>('all');
  const { state: leads, setState: setLeads } = useEduStorage<PipelineLead[]>('edu_pipeline_leads_v1', []);
  const { state: closings, setState: setClosings } = useEduStorage<ClosingLog[]>('edu_closings_v1', []);
  const commissions = useAppSettings((state) => state.commissions);
  const [form, setForm] = useState({
    name: '',
    lead_source: 'own' as PipelineLead['lead_source'],
    stage: 'new' as PipelineLead['stage'],
    days_in_stage: '0',
    price_range_max: '',
    expectedCloseDate: '',
    notes: '',
  });

  const commissionOptions = {
    franchiseFeePct: commissions.franchiseFeePct,
    ownAgentPct: commissions.ownAgentPct,
    companyAgentPct: commissions.companyAgentPct,
    zillowReferralPct: commissions.zillowReferralPct,
    zillowAgentPct: commissions.zillowAgentPct,
  };

  const stages = ['All', 'New', 'Nurture', 'Active', 'UAG', 'Closed'];

  const filteredLeads = useMemo(() => {
    if (stage === 'all') return leads;
    return leads.filter((lead) => lead.stage === stage);
  }, [leads, stage]);

  const pipelineValue = leads.reduce((sum, lead) => {
    if (lead.price_range_max) {
      const commission = calculateCommission(lead.price_range_max, commissions.defaultCommissionPct, lead.lead_source, commissionOptions);
      return sum + commission.net;
    }
    return sum;
  }, 0);

  const hotLeads = useMemo(() => leads.filter((lead) => {
    if (lead.stage === 'uag') return true;
    if (lead.stage === 'active' && lead.days_in_stage <= 14) return true;
    return false;
  }), [leads]);

  const uags = leads.filter((l) => l.stage === 'uag');
  const uagAlertCount = uags.filter((lead) => {
    if (!lead.expectedCloseDate) return false;
    const close = new Date(lead.expectedCloseDate);
    const days = Math.ceil((close.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const staleNote = !lead.updatedAt || (Date.now() - new Date(lead.updatedAt).getTime()) > (7 * 24 * 60 * 60 * 1000);
    return days <= 14 && staleNote;
  }).length;

  const handleAddLead = () => {
    if (!form.name) return;
    setLeads((prev) => [
      {
        id: String(Date.now()),
        name: form.name,
        lead_source: form.lead_source,
        stage: form.stage,
        days_in_stage: Number(form.days_in_stage || 0),
        price_range_max: form.price_range_max ? Number(form.price_range_max) : undefined,
        expectedCloseDate: form.expectedCloseDate || undefined,
        notes: form.notes || undefined,
        updatedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setForm({
      name: '',
      lead_source: 'own',
      stage: 'new',
      days_in_stage: '0',
      price_range_max: '',
      expectedCloseDate: '',
      notes: '',
    });
  };

  const closedLeadSuggestions = useMemo(() => {
    return leads.filter((lead) => {
      if (lead.stage !== 'closed' || !lead.price_range_max) return false;
      return !closings.some((c) => c.id === `from-lead-${lead.id}`);
    });
  }, [closings, leads]);

  const handleAddClosingFromLead = (lead: PipelineLead) => {
    if (!lead.price_range_max) return;
    const salePrice = lead.price_range_max;
    const calc = calculateCommission(salePrice, commissions.defaultCommissionPct, lead.lead_source, commissionOptions);
    const closeDate = lead.expectedCloseDate || new Date().toISOString().slice(0, 10);
    const netPct = salePrice > 0 ? calc.net / salePrice : 0;

    setClosings((prev) => [
      {
        id: `from-lead-${lead.id}`,
        address: lead.name,
        salePrice,
        netCommission: calc.net,
        netPct,
        closeDate,
        source: lead.lead_source,
      },
      ...prev,
    ]);
  };

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
            <p className="text-2xl font-bold text-[#D4A043] mt-1">{hotLeads.length}</p>
          </div>
          <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
            <p className="text-xs text-[#64748B] uppercase font-semibold">Pipeline Value</p>
            <p className="text-lg font-bold text-[#10B981] mt-1">{formatCurrency(pipelineValue)}</p>
          </div>
          <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
            <p className="text-xs text-[#64748B] uppercase font-semibold">Est. Close</p>
            <p className="text-lg font-bold text-[#3B82F6] mt-1">{uags.length}</p>
          </div>
        </div>
        {uagAlertCount > 0 && (
          <p className="text-sm text-amber mt-3">{uagAlertCount} UAG lead(s) closing soon have stale or missing notes.</p>
        )}
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
        <button className="ml-auto px-4 py-2 bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] font-semibold rounded flex items-center gap-2" onClick={handleAddLead}>
          <Plus size={18} />
          <span className="hidden sm:inline">Add Lead</span>
        </button>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4 mb-6 grid md:grid-cols-3 gap-3">
        <input className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" placeholder="Lead name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
        <select title="Lead source" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" value={form.lead_source} onChange={(e) => setForm((prev) => ({ ...prev, lead_source: e.target.value as PipelineLead['lead_source'] }))}>
          <option value="own">Own</option>
          <option value="company">Company</option>
          <option value="zillow">Zillow</option>
        </select>
        <select title="Lead stage" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" value={form.stage} onChange={(e) => setForm((prev) => ({ ...prev, stage: e.target.value as PipelineLead['stage'] }))}>
          <option value="new">New</option>
          <option value="nurture">Nurture</option>
          <option value="active">Active</option>
          <option value="uag">UAG</option>
          <option value="closed">Closed</option>
        </select>
        <input className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" type="number" placeholder="Max price" value={form.price_range_max} onChange={(e) => setForm((prev) => ({ ...prev, price_range_max: e.target.value }))} />
        <input className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" type="date" placeholder="Expected close" value={form.expectedCloseDate} onChange={(e) => setForm((prev) => ({ ...prev, expectedCloseDate: e.target.value }))} />
        <input className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" type="number" placeholder="Days in stage" value={form.days_in_stage} onChange={(e) => setForm((prev) => ({ ...prev, days_in_stage: e.target.value }))} />
        <input className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9] md:col-span-3" placeholder="Notes" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
      </div>

      {closedLeadSuggestions.length > 0 && (
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4 mb-6 space-y-3">
          <p className="text-sm font-semibold text-[#F1F5F9]">Closed Deal Suggestions</p>
          {closedLeadSuggestions.slice(0, 5).map((lead) => (
            <div key={lead.id} className="flex items-center justify-between gap-3">
              <p className="text-sm text-[#94A3B8]">{lead.name} ({formatCurrency(lead.price_range_max || 0)})</p>
              <button onClick={() => handleAddClosingFromLead(lead)} className="px-3 py-1 bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] text-xs font-semibold rounded">
                Add to Closings
              </button>
            </div>
          ))}
        </div>
      )}

      {filteredLeads.length === 0 ? (
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-12 text-center">
          <TrendingUp size={48} className="text-[#374151] mx-auto mb-4" />
          <p className="text-[#94A3B8] mb-4">No leads in this stage.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredLeads.map((lead) => {
            const estNet = lead.price_range_max
              ? calculateCommission(lead.price_range_max, commissions.defaultCommissionPct, lead.lead_source, commissionOptions).net
              : 0;
            const daysToClose = lead.expectedCloseDate
              ? Math.ceil((new Date(lead.expectedCloseDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <div key={lead.id} className="bg-[#111827] border border-[#1E293B] rounded-lg p-4 space-y-2">
                <p className="text-[#F1F5F9] font-semibold">{lead.name}</p>
                <p className="text-sm text-[#94A3B8]">Stage: <span className="uppercase">{lead.stage}</span> • Source: {lead.lead_source}</p>
                <p className="text-sm text-[#94A3B8]">Est. Net: <span className="text-[#10B981] font-semibold">{formatCurrency(estNet)}</span></p>
                {lead.expectedCloseDate && (
                  <p className="text-sm text-[#94A3B8]">Expected close: {lead.expectedCloseDate} {daysToClose !== null ? `(${daysToClose}d)` : ''}</p>
                )}
                {lead.notes && <p className="text-xs text-[#94A3B8]">Notes: {lead.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
