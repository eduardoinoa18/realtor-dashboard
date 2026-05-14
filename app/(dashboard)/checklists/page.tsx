'use client';

import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
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

interface CustomChecklistItem {
  id: string;
  label: string;
  dueDate?: string;
  completed: boolean;
}

export default function ChecklistsPage() {
  const listingInitial = useMemo(() => Object.fromEntries(listingDefaults.map((item) => [item, false])), []);
  const buyerInitial = useMemo(() => Object.fromEntries(buyerDefaults.map((item) => [item, false])), []);
  const { state: listing, setState: setListing } = useEduStorage<Record<string, boolean>>('edu_listing_checklist_v1', listingInitial);
  const { state: buyer, setState: setBuyer } = useEduStorage<Record<string, boolean>>('edu_buyer_checklist_v1', buyerInitial);
  const { state: listingCustom, setState: setListingCustom } = useEduStorage<CustomChecklistItem[]>('edu_listing_custom_checklist_v1', []);
  const { state: buyerCustom, setState: setBuyerCustom } = useEduStorage<CustomChecklistItem[]>('edu_buyer_custom_checklist_v1', []);
  const [newListingTask, setNewListingTask] = useState({ label: '', dueDate: '' });
  const [newBuyerTask, setNewBuyerTask] = useState({ label: '', dueDate: '' });

  const addCustomTask = (type: 'listing' | 'buyer') => {
    const form = type === 'listing' ? newListingTask : newBuyerTask;
    if (!form.label.trim()) return;
    const task: CustomChecklistItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: form.label.trim(),
      dueDate: form.dueDate || undefined,
      completed: false,
    };

    if (type === 'listing') {
      setListingCustom((prev) => [task, ...prev]);
      setNewListingTask({ label: '', dueDate: '' });
      return;
    }

    setBuyerCustom((prev) => [task, ...prev]);
    setNewBuyerTask({ label: '', dueDate: '' });
  };

  const toggleCustomTask = (type: 'listing' | 'buyer', id: string) => {
    const setter = type === 'listing' ? setListingCustom : setBuyerCustom;
    setter((prev) => prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)));
  };

  const resetCustomTasks = (type: 'listing' | 'buyer') => {
    const setter = type === 'listing' ? setListingCustom : setBuyerCustom;
    setter([]);
  };

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
          customItems={listingCustom}
          customDraft={newListingTask}
          setCustomDraft={setNewListingTask}
          onToggle={(key) => setListing((prev) => ({ ...prev, [key]: !prev[key] }))}
          onToggleCustom={(id) => toggleCustomTask('listing', id)}
          onAddCustom={() => addCustomTask('listing')}
          onReset={() => setListing(listingInitial)}
          onResetCustom={() => resetCustomTasks('listing')}
        />
        <ChecklistCard
          title="Buyer Checklist"
          items={buyer}
          customItems={buyerCustom}
          customDraft={newBuyerTask}
          setCustomDraft={setNewBuyerTask}
          onToggle={(key) => setBuyer((prev) => ({ ...prev, [key]: !prev[key] }))}
          onToggleCustom={(id) => toggleCustomTask('buyer', id)}
          onAddCustom={() => addCustomTask('buyer')}
          onReset={() => setBuyer(buyerInitial)}
          onResetCustom={() => resetCustomTasks('buyer')}
        />
      </div>
    </div>
  );
}

function ChecklistCard({
  title,
  items,
  customItems,
  customDraft,
  setCustomDraft,
  onToggle,
  onReset,
  onAddCustom,
  onToggleCustom,
  onResetCustom,
}: {
  title: string;
  items: Record<string, boolean>;
  customItems: CustomChecklistItem[];
  customDraft: { label: string; dueDate: string };
  setCustomDraft: Dispatch<SetStateAction<{ label: string; dueDate: string }>>;
  onToggle: (key: string) => void;
  onReset: () => void;
  onAddCustom: () => void;
  onToggleCustom: (id: string) => void;
  onResetCustom: () => void;
}) {
  const total = Object.keys(items).length;
  const done = Object.values(items).filter(Boolean).length;
  const customTotal = customItems.length;
  const customDone = customItems.filter((item) => item.completed).length;
  const overallTotal = total + customTotal;
  const overallDone = done + customDone;
  const progressPct = overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0;
  const progressWidthClass =
    progressPct >= 95
      ? 'w-full'
      : progressPct >= 80
        ? 'w-4/5'
        : progressPct >= 65
          ? 'w-3/4'
          : progressPct >= 50
            ? 'w-2/3'
            : progressPct >= 35
              ? 'w-1/2'
              : progressPct >= 20
                ? 'w-1/3'
                : 'w-1/6';

  return (
    <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#F1F5F9] flex items-center gap-2">
          <CheckSquare size={18} className="text-[#D4A043]" />
          {title}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#94A3B8]">{overallDone}/{overallTotal}</span>
          <button onClick={onReset} className="text-xs px-2 py-1 rounded bg-[#1E293B] text-[#F1F5F9] hover:bg-[#374151]">
            Reset Defaults
          </button>
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <div className="h-2 rounded-full bg-[#0D1117] overflow-hidden">
          <div className={`h-full bg-[#D4A043] rounded-full ${progressWidthClass}`} />
        </div>
        <div className="flex items-center justify-between text-xs text-[#94A3B8]">
          <span>{overallDone}/{overallTotal} complete</span>
          <span>{progressPct}%</span>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-[#1E293B] bg-[#0D1117] p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            value={customDraft.label}
            onChange={(e) => setCustomDraft((prev) => ({ ...prev, label: e.target.value }))}
            placeholder="Add a custom task"
            className="px-3 py-2 bg-[#111827] border border-[#374151] rounded text-[#F1F5F9]"
          />
          <input
            type="date"
            value={customDraft.dueDate}
            onChange={(e) => setCustomDraft((prev) => ({ ...prev, dueDate: e.target.value }))}
            className="px-3 py-2 bg-[#111827] border border-[#374151] rounded text-[#F1F5F9]"
            title="Due Date"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <button onClick={onAddCustom} className="px-3 py-2 rounded bg-[#D4A043] text-[#07090F] font-semibold text-sm">
            Add Task
          </button>
          <button onClick={onResetCustom} className="text-xs px-2 py-1 rounded bg-[#1E293B] text-[#F1F5F9] hover:bg-[#374151]">
            Clear Custom
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

        {customItems.map((item) => (
          <label key={item.id} className="flex items-center gap-3 p-2 rounded hover:bg-[#1E293B] cursor-pointer">
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => onToggleCustom(item.id)}
              className="h-4 w-4 accent-[#D4A043]"
            />
            <span className={`text-sm flex-1 ${item.completed ? 'text-[#64748B] line-through' : 'text-[#F1F5F9]'}`}>
              {item.label}
            </span>
            {item.dueDate && <span className="text-[11px] text-[#94A3B8]">Due {item.dueDate}</span>}
          </label>
        ))}
      </div>
    </div>
  );
}
