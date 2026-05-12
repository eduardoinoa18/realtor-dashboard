'use client';

import { useMemo } from 'react';
import { CheckSquare } from 'lucide-react';
import { useEduStorage } from '@/hooks/useEduStorage';

const listingDefaults = [
  'Photo shoot booked',
  'Flyer created',
  'MLS posted',
  'Sign installed',
  'Open house scheduled',
];

const buyerDefaults = [
  'Pre-approval completed',
  'Search criteria locked',
  'First showing completed',
  'Inspection scheduled',
  'Closing date confirmed',
];

export default function ChecklistsPage() {
  const listingInitial = useMemo(() => Object.fromEntries(listingDefaults.map((item) => [item, false])), []);
  const buyerInitial = useMemo(() => Object.fromEntries(buyerDefaults.map((item) => [item, false])), []);
  const { state: listing, setState: setListing } = useEduStorage<Record<string, boolean>>('edu_listing_checklist_v1', listingInitial);
  const { state: buyer, setState: setBuyer } = useEduStorage<Record<string, boolean>>('edu_buyer_checklist_v1', buyerInitial);

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9] mb-2">Checklists</h1>
        <p className="text-[#94A3B8]">Listing and buyer workflows to prevent dropped steps.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChecklistCard
          title="Listing Checklist"
          items={listing}
          onToggle={(key) => setListing((prev) => ({ ...prev, [key]: !prev[key] }))}
          onReset={() => setListing(listingInitial)}
        />
        <ChecklistCard
          title="Buyer Checklist"
          items={buyer}
          onToggle={(key) => setBuyer((prev) => ({ ...prev, [key]: !prev[key] }))}
          onReset={() => setBuyer(buyerInitial)}
        />
      </div>
    </div>
  );
}

function ChecklistCard({
  title,
  items,
  onToggle,
  onReset,
}: {
  title: string;
  items: Record<string, boolean>;
  onToggle: (key: string) => void;
  onReset: () => void;
}) {
  const total = Object.keys(items).length;
  const done = Object.values(items).filter(Boolean).length;

  return (
    <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#F1F5F9] flex items-center gap-2">
          <CheckSquare size={18} className="text-[#D4A043]" />
          {title}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#94A3B8]">{done}/{total}</span>
          <button onClick={onReset} className="text-xs px-2 py-1 rounded bg-[#1E293B] text-[#F1F5F9] hover:bg-[#374151]">
            Reset
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {Object.entries(items).map(([label, checked]) => (
          <label key={label} className="flex items-center gap-3 p-2 rounded hover:bg-[#1E293B] cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(label)}
              className="h-4 w-4 accent-[#D4A043]"
            />
            <span className={`text-sm ${checked ? 'text-[#64748B] line-through' : 'text-[#F1F5F9]'}`}>{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
