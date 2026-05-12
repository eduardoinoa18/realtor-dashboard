'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface LicenseItem {
  id: string;
  label: string;
  expiresOn: string;
  state: string;
}

const initial: LicenseItem[] = [
  { id: 'ma-re', label: 'MA Real Estate', expiresOn: '2026-11-15', state: 'MA' },
  { id: 'nh-re', label: 'NH Real Estate', expiresOn: '2026-10-01', state: 'NH' },
  { id: 'mlo', label: 'MLO License', expiresOn: '2027-01-10', state: 'MA' },
];

export default function LicensePage() {
  const [items] = useState<LicenseItem[]>(initial);
  const [nowTs, setNowTs] = useState<number | null>(null);

  useEffect(() => {
    setNowTs(Date.now());
  }, []);

  const rows = useMemo(() => {
    if (nowTs === null) {
      return items.map((item) => ({ ...item, daysLeft: null as number | null }));
    }
    const now = new Date(nowTs);
    return items.map((item) => {
      const exp = new Date(item.expiresOn);
      const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { ...item, daysLeft: diff };
    });
  }, [items, nowTs]);

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9] mb-2">License Tracker</h1>
        <p className="text-[#94A3B8]">Monitor state license expiry windows and renewal urgency.</p>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0D1117] text-[#94A3B8]">
            <tr>
              <th className="text-left p-3">License</th>
              <th className="text-left p-3">State</th>
              <th className="text-left p-3">Expires</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const urgent = row.daysLeft !== null && row.daysLeft <= 60;
              const warning = row.daysLeft !== null && row.daysLeft > 60 && row.daysLeft <= 120;
              return (
                <tr key={row.id} className="border-t border-[#1E293B]">
                  <td className="p-3 text-[#F1F5F9] font-medium">{row.label}</td>
                  <td className="p-3 text-[#94A3B8]">{row.state}</td>
                  <td className="p-3 text-[#94A3B8]">{row.expiresOn}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-2 px-2 py-1 rounded text-xs ${
                      row.daysLeft === null
                        ? 'bg-slate-500/20 text-slate-300'
                        :
                      urgent
                        ? 'bg-red-500/20 text-red-400'
                        : warning
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-green-500/20 text-green-400'
                    }`}>
                      <ShieldCheck size={14} />
                      {row.daysLeft === null ? 'Calculating...' : `${row.daysLeft} days left`}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
