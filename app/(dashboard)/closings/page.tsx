'use client';

import { useMemo, useState } from 'react';
import { DollarSign, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Closing {
  id: string;
  address: string;
  salePrice: number;
  netCommission: number;
  closeDate: string;
  source: 'own' | 'company' | 'zillow';
}

export default function ClosingsPage() {
  const [closings, setClosings] = useState<Closing[]>([]);
  const [form, setForm] = useState({
    address: '',
    salePrice: '',
    netCommission: '',
    closeDate: '',
    source: 'own' as Closing['source'],
  });

  const monthNet = useMemo(
    () => closings.reduce((sum, row) => sum + row.netCommission, 0),
    [closings]
  );

  const handleAdd = () => {
    if (!form.address || !form.salePrice || !form.netCommission || !form.closeDate) return;
    setClosings((prev) => [
      {
        id: `${Date.now()}`,
        address: form.address,
        salePrice: Number(form.salePrice),
        netCommission: Number(form.netCommission),
        closeDate: form.closeDate,
        source: form.source,
      },
      ...prev,
    ]);
    setForm({ address: '', salePrice: '', netCommission: '', closeDate: '', source: 'own' });
  };

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9] mb-2">Closings</h1>
        <p className="text-[#94A3B8]">Track closed deals and monthly net production.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Closings" value={`${closings.length}`} />
        <StatCard label="Monthly Net" value={formatCurrency(monthNet)} highlight="text-[#10B981]" />
        <StatCard label="Avg Net" value={formatCurrency(closings.length ? monthNet / closings.length : 0)} />
        <StatCard label="Goal Pace" value={closings.length >= 3 ? 'On Track' : 'Behind'} highlight={closings.length >= 3 ? 'text-[#10B981]' : 'text-[#F59E0B]'} />
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4 md:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#F1F5F9] flex items-center gap-2">
          <DollarSign size={18} className="text-[#D4A043]" />
          Add Closing
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <input className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" title="Closing address" placeholder="Address" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
          <input className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" title="Sale price" placeholder="Sale price" type="number" value={form.salePrice} onChange={(e) => setForm((p) => ({ ...p, salePrice: e.target.value }))} />
          <input className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" title="Net commission" placeholder="Net commission" type="number" value={form.netCommission} onChange={(e) => setForm((p) => ({ ...p, netCommission: e.target.value }))} />
          <input className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" title="Close date" placeholder="Close date" type="date" value={form.closeDate} onChange={(e) => setForm((p) => ({ ...p, closeDate: e.target.value }))} />
          <select title="Lead source" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" value={form.source} onChange={(e) => setForm((p) => ({ ...p, source: e.target.value as Closing['source'] }))}>
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

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
      <p className="text-xs text-[#64748B] uppercase font-semibold">{label}</p>
      <p className={`text-xl font-bold mt-1 text-[#F1F5F9] ${highlight || ''}`}>{value}</p>
    </div>
  );
}
