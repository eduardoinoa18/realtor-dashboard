'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { BusinessProfile, useEduStorage } from '@/hooks/useEduStorage';

interface LicenseItem {
  id: string;
  label: string;
  expiresOn: string;
  state: string;
  reference?: string;
}

export default function LicensePage() {
  const { state: profile } = useEduStorage<BusinessProfile>('edu_business_profile_v1', {
    fullName: 'Eduardo Inoa',
    brokerage: 'Century 21 NE',
    primaryEmail: '',
    primaryPhone: '',
    mileageRate: 0.67,
  });
  const items = useMemo<LicenseItem[]>(() => {
    const rows: LicenseItem[] = [];
    if (profile.licenseNumber || profile.licenseExpiryDate) {
      rows.push({
        id: 're-license',
        label: 'Real Estate License',
        expiresOn: profile.licenseExpiryDate || '',
        state: profile.licenseState || 'N/A',
        reference: profile.licenseNumber || undefined,
      });
    }
    if (profile.mlsId || profile.mlsExpiryDate) {
      rows.push({
        id: 'mls-license',
        label: profile.boardName ? `${profile.boardName} MLS` : 'MLS Membership',
        expiresOn: profile.mlsExpiryDate || '',
        state: profile.licenseState || 'N/A',
        reference: profile.mlsId || undefined,
      });
    }
    if (profile.nmlsId || profile.nmlsExpiryDate) {
      rows.push({
        id: 'nmls-license',
        label: 'NMLS License',
        expiresOn: profile.nmlsExpiryDate || '',
        state: profile.licenseState || 'N/A',
        reference: profile.nmlsId || undefined,
      });
    }
    return rows;
  }, [profile.boardName, profile.licenseExpiryDate, profile.licenseNumber, profile.licenseState, profile.mlsExpiryDate, profile.mlsId, profile.nmlsExpiryDate, profile.nmlsId]);
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
      if (!item.expiresOn) {
        return { ...item, daysLeft: null as number | null };
      }
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
        {rows.length === 0 ? (
          <div className="p-6">
            <p className="text-[#94A3B8] text-sm">No licenses configured yet. Add your license fields in Profile and they will appear here automatically.</p>
          </div>
        ) : (
        <table className="w-full text-sm">
          <thead className="bg-[#0D1117] text-[#94A3B8]">
            <tr>
              <th className="text-left p-3">License</th>
              <th className="text-left p-3">ID</th>
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
                  <td className="p-3 text-[#94A3B8]">{row.reference || 'N/A'}</td>
                  <td className="p-3 text-[#94A3B8]">{row.state}</td>
                  <td className="p-3 text-[#94A3B8]">{row.expiresOn || 'Not set'}</td>
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
                      {row.daysLeft === null ? 'Set renewal date' : `${row.daysLeft} days left`}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}
