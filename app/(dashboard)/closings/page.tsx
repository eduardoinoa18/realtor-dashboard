'use client';

import { useMemo, useState } from 'react';
import { DollarSign, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAppSettings } from '@/store/appSettings';
import { ClosingLog, PipelineLead, getCurrentMonthClosings, useEduStorage } from '@/hooks/useEduStorage';

export default function ClosingsPage() {
  const { state: closings, setState: setClosings } = useEduStorage<ClosingLog[]>('edu_closings_v1', []);
  const { state: leads } = useEduStorage<PipelineLead[]>('edu_pipeline_leads_v1', []);
  const commissions = useAppSettings((state) => state.commissions);
  const targets = useAppSettings((state) => state.targets);
  const [form, setForm] = useState({
    address: '',
    salePrice: '',
    netPct: '',
    closeDate: '',
    source: 'own' as ClosingLog['source'],
  });

  const getDefaultNetPct = (source: ClosingLog['source']) => {
    const commPct = commissions.defaultCommissionPct;
    const refFee = commissions.franchiseFeePct;
    if (source === 'own') return commPct * commissions.ownAgentPct * (1 - refFee);
    if (source === 'company') return commPct * commissions.companyAgentPct * (1 - refFee);
    return commPct * commissions.zillowReferralPct * 0.5 * (1 - refFee);
  };

  const updateSource = (source: ClosingLog['source']) => {
    setForm((prev) => ({
      ...prev,
      source,
      netPct: String((getDefaultNetPct(source) * 100).toFixed(2)),
    }));
  };

  const monthClosings = useMemo(() => getCurrentMonthClosings(closings), [closings]);

  const monthNet = useMemo(() => monthClosings.reduce((sum, row) => sum + row.netCommission, 0), [monthClosings]);
  const monthVolume = useMemo(() => monthClosings.reduce((sum, row) => sum + row.salePrice, 0), [monthClosings]);
  const monthGrossCommission = useMemo(() => monthClosings.reduce((sum, row) => sum + (row.netPct > 0 ? row.netCommission / row.netPct : 0), 0), [monthClosings]);
  const monthPct = Math.min(100, targets.monthGoal > 0 ? Math.round((monthClosings.length / targets.monthGoal) * 100) : 0);

  const yearlyStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const previousYear = currentYear - 1;

    const summarize = (year: number) => {
      const rows = closings.filter((closing) => new Date(closing.closeDate).getFullYear() === year);
      const volume = rows.reduce((sum, row) => sum + row.salePrice, 0);
      const net = rows.reduce((sum, row) => sum + row.netCommission, 0);
      const gross = rows.reduce((sum, row) => sum + (row.netPct > 0 ? row.netCommission / row.netPct : 0), 0);
      return {
        year,
        closings: rows.length,
        volume,
        gross,
        net,
      };
    };

    const current = summarize(currentYear);
    const previous = summarize(previousYear);

    return {
      current,
      previous,
      yoyClosingsPct: previous.closings > 0 ? ((current.closings - previous.closings) / previous.closings) * 100 : null,
      yoyVolumePct: previous.volume > 0 ? ((current.volume - previous.volume) / previous.volume) * 100 : null,
      yoyNetPct: previous.net > 0 ? ((current.net - previous.net) / previous.net) * 100 : null,
    };
  }, [closings]);

  const overallConversion = useMemo(() => {
    return leads.length > 0 ? (closings.length / leads.length) * 100 : 0;
  }, [closings.length, leads.length]);

  const sourceRows = useMemo(() => {
    const sourceKeys: ClosingLog['source'][] = ['own', 'company', 'zillow'];
    return sourceKeys.map((source) => {
      const sourceLeads = leads.filter((lead) => lead.lead_source === source).length;
      const sourceClosings = closings.filter((closing) => closing.source === source);
      const sourceNet = sourceClosings.reduce((sum, row) => sum + row.netCommission, 0);

      const estimatedSpend = source === 'zillow'
        ? sourceClosings.reduce((sum, row) => sum + row.salePrice * commissions.defaultCommissionPct * commissions.zillowReferralPct, 0)
        : 0;

      const roi = estimatedSpend > 0 ? ((sourceNet - estimatedSpend) / estimatedSpend) * 100 : null;

      return {
        source,
        leads: sourceLeads,
        closings: sourceClosings.length,
        net: sourceNet,
        spend: estimatedSpend,
        roi,
      };
    });
  }, [closings, leads, commissions.defaultCommissionPct, commissions.zillowReferralPct]);

  const handleAdd = () => {
    if (!form.address || !form.salePrice || !form.netPct || !form.closeDate) return;
    const salePrice = Number(form.salePrice);
    const netPct = Number(form.netPct) / 100;
    setClosings((prev) => [
      {
        id: `${Date.now()}`,
        address: form.address,
        salePrice,
        netPct,
        netCommission: Math.round(salePrice * netPct),
        closeDate: form.closeDate,
        source: form.source,
      },
      ...prev,
    ]);
    setForm({
      address: '',
      salePrice: '',
      netPct: String((getDefaultNetPct(form.source) * 100).toFixed(2)),
      closeDate: '',
      source: form.source,
    });
  };

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9] mb-2">Closings</h1>
        <p className="text-[#94A3B8]">Track closed deals and monthly net production.</p>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
        <div className="flex justify-between text-sm text-[#94A3B8] mb-2">
          <span>{monthClosings.length} / {targets.monthGoal} this month</span>
          <span>{monthPct}%</span>
        </div>
        <progress className="h-2 w-full rounded-full overflow-hidden accent-green" max={100} value={monthPct} aria-label="Monthly goal progress" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Closings" value={`${monthClosings.length}`} />
        <StatCard label="Monthly Net" value={formatCurrency(monthNet)} highlight="text-[#10B981]" />
        <StatCard label="Monthly Volume" value={formatCurrency(monthVolume)} highlight="text-[#3B82F6]" />
        <StatCard label="Gross Comm." value={formatCurrency(Math.round(monthGrossCommission))} highlight="text-[#D4A043]" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Avg Net" value={formatCurrency(monthClosings.length ? monthNet / monthClosings.length : 0)} />
        <StatCard label="Goal Pace" value={monthClosings.length >= targets.monthGoal ? 'On Track' : 'Behind'} highlight={monthClosings.length >= targets.monthGoal ? 'text-[#10B981]' : 'text-[#F59E0B]'} />
        <StatCard label="Lead->Close Conv." value={`${overallConversion.toFixed(1)}%`} highlight="text-[#A78BFA]" />
        <StatCard label="Avg Sale Price" value={formatCurrency(monthClosings.length ? monthVolume / monthClosings.length : 0)} />
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#1E293B]">
          <h2 className="text-lg font-semibold text-[#F1F5F9]">Year Over Year Production</h2>
          <p className="text-xs text-[#94A3B8] mt-1">Compare this year against last year across closings, volume, gross, and net.</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[#0D1117] text-[#94A3B8]">
            <tr>
              <th className="text-left p-3">Year</th>
              <th className="text-right p-3">Closings</th>
              <th className="text-right p-3">Volume</th>
              <th className="text-right p-3">Gross</th>
              <th className="text-right p-3">Net</th>
            </tr>
          </thead>
          <tbody>
            {[yearlyStats.current, yearlyStats.previous].map((row) => (
              <tr key={row.year} className="border-t border-[#1E293B] text-[#F1F5F9]">
                <td className="p-3">{row.year}</td>
                <td className="p-3 text-right">{row.closings}</td>
                <td className="p-3 text-right">{formatCurrency(row.volume)}</td>
                <td className="p-3 text-right">{formatCurrency(Math.round(row.gross))}</td>
                <td className="p-3 text-right text-[#10B981]">{formatCurrency(row.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border-t border-[#1E293B] bg-[#0D1117]">
          <YoYTile label="Closings YoY" value={yearlyStats.yoyClosingsPct} />
          <YoYTile label="Volume YoY" value={yearlyStats.yoyVolumePct} />
          <YoYTile label="Net YoY" value={yearlyStats.yoyNetPct} />
        </div>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#1E293B]">
          <h2 className="text-lg font-semibold text-[#F1F5F9]">Source ROI Tracker</h2>
          <p className="text-xs text-[#94A3B8] mt-1">Tracks lead-to-closing conversion and estimated ROI by source.</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[#0D1117] text-[#94A3B8]">
            <tr>
              <th className="text-left p-3">Source</th>
              <th className="text-right p-3">Leads</th>
              <th className="text-right p-3">Closings</th>
              <th className="text-right p-3">Net</th>
              <th className="text-right p-3">Est. Spend</th>
              <th className="text-right p-3">ROI</th>
            </tr>
          </thead>
          <tbody>
            {sourceRows.map((row) => (
              <tr key={row.source} className="border-t border-[#1E293B] text-[#F1F5F9]">
                <td className="p-3 capitalize">{row.source}</td>
                <td className="p-3 text-right">{row.leads}</td>
                <td className="p-3 text-right">{row.closings}</td>
                <td className="p-3 text-right text-[#10B981]">{formatCurrency(row.net)}</td>
                <td className="p-3 text-right">{formatCurrency(row.spend)}</td>
                <td className={`p-3 text-right ${row.roi !== null && row.roi >= 0 ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                  {row.roi === null ? 'n/a' : `${row.roi.toFixed(0)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4 md:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#F1F5F9] flex items-center gap-2">
          <DollarSign size={18} className="text-[#D4A043]" />
          Add Closing
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <input className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" title="Closing address" placeholder="Address" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
          <input className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" title="Sale price" placeholder="Sale price" type="number" value={form.salePrice} onChange={(e) => setForm((p) => ({ ...p, salePrice: e.target.value }))} />
          <input className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" title="Net percentage" placeholder="Net %" type="number" value={form.netPct} onChange={(e) => setForm((p) => ({ ...p, netPct: e.target.value }))} />
          <input className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" title="Close date" placeholder="Close date" type="date" value={form.closeDate} onChange={(e) => setForm((p) => ({ ...p, closeDate: e.target.value }))} />
          <select title="Lead source" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" value={form.source} onChange={(e) => updateSource(e.target.value as ClosingLog['source'])}>
            <option value="own">Own</option>
            <option value="company">Company</option>
            <option value="zillow">Zillow</option>
          </select>
        </div>

        <button onClick={handleAdd} className="px-4 py-2 bg-[#D4A043] hover:bg-[#E8B84F] text-[#07090F] font-semibold rounded inline-flex items-center gap-2">
          <Plus size={16} />
          Add Closing
        </button>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0D1117] text-[#94A3B8]">
            <tr>
              <th className="text-left p-3">Address</th>
              <th className="text-left p-3">Date</th>
              <th className="text-right p-3">Sale Price</th>
              <th className="text-right p-3">Net</th>
              <th className="text-left p-3">Source</th>
            </tr>
          </thead>
          <tbody>
            {closings.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-[#64748B]">No closings yet.</td>
              </tr>
            ) : (
              closings.map((row) => (
                <tr key={row.id} className="border-t border-[#1E293B] text-[#F1F5F9]">
                  <td className="p-3">{row.address}</td>
                  <td className="p-3">{row.closeDate}</td>
                  <td className="p-3 text-right">{formatCurrency(row.salePrice)}</td>
                  <td className="p-3 text-right text-[#10B981]">{formatCurrency(row.netCommission)}</td>
                  <td className="p-3 capitalize">{row.source}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function YoYTile({ label, value }: { label: string; value: number | null }) {
  const tone = value === null ? 'text-[#94A3B8]' : value >= 0 ? 'text-[#10B981]' : 'text-red';
  return (
    <div className="bg-[#111827] border border-[#1E293B] rounded p-3">
      <p className="text-xs text-[#64748B] uppercase font-semibold">{label}</p>
      <p className={`text-lg font-bold mt-1 ${tone}`}>{value === null ? 'n/a' : `${value.toFixed(0)}%`}</p>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
      <p className="text-xs text-[#64748B] uppercase font-semibold">{label}</p>
      <p className={`text-xl font-bold mt-1 text-[#F1F5F9] ${highlight || ''}`}>{value}</p>
    </div>
  );
}
