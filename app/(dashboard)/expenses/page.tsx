'use client';

import { useEffect, useMemo, useState } from 'react';
import { Receipt, Plus, Car } from 'lucide-react';
import { BusinessProfile, ExpenseEntry, MileageEntry, useEduStorage } from '@/hooks/useEduStorage';
import { formatCurrency } from '@/lib/utils';

const defaultExpense = {
  title: '',
  category: 'other' as ExpenseEntry['category'],
  amount: '',
  dueDate: '',
  vendor: '',
  notes: '',
  status: 'planned' as ExpenseEntry['status'],
  recurring: false,
};

const defaultMileage = {
  date: new Date().toISOString().slice(0, 10),
  miles: '',
  purpose: '',
  notes: '',
};

export default function ExpensesPage() {
  const { state: expenses, setState: setExpenses, loaded: expensesLoaded } = useEduStorage<ExpenseEntry[]>('edu_expenses_v1', []);
  const { state: mileage, setState: setMileage } = useEduStorage<MileageEntry[]>('edu_mileage_v1', []);
  const { state: profile } = useEduStorage<BusinessProfile>('edu_business_profile_v1', {
    fullName: 'Eduardo Inoa',
    brokerage: 'Century 21 NE',
    primaryEmail: '',
    primaryPhone: '',
    mileageRate: 0.67,
  });
  const [expenseForm, setExpenseForm] = useState(defaultExpense);
  const [mileageForm, setMileageForm] = useState(defaultMileage);

  // Recurring expense auto-rollover: when a paid recurring expense's due date has passed, auto-create next monthly cycle
  useEffect(() => {
    if (!expensesLoaded) return;
    const today = new Date().toISOString().slice(0, 10);
    setExpenses((prev) => {
      const toAdd: ExpenseEntry[] = [];
      for (const item of prev) {
        if (!item.recurring || !item.dueDate || item.status !== 'paid') continue;
        // Check if there's already a future unpaid instance of this recurring expense
        const hasFuture = prev.some(
          (other) =>
            other.id !== item.id &&
            other.title === item.title &&
            other.category === item.category &&
            other.recurring &&
            other.status !== 'paid' &&
            other.dueDate &&
            other.dueDate > today
        );
        if (hasFuture) continue;
        // Generate next monthly due date
        const dueDate = new Date(item.dueDate);
        const nextDue = new Date(dueDate);
        nextDue.setMonth(nextDue.getMonth() + 1);
        const nextDueStr = nextDue.toISOString().slice(0, 10);
        if (nextDueStr <= today) continue; // Next due is also past - skip (edge case)
        // Check if a future item with this next due date already exists
        const alreadyExists = prev.some(
          (other) => other.title === item.title && other.category === item.category && other.dueDate === nextDueStr && other.status !== 'paid'
        );
        if (alreadyExists) continue;
        toAdd.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: item.title,
          category: item.category,
          amount: item.amount,
          dueDate: nextDueStr,
          vendor: item.vendor,
          notes: item.notes,
          status: 'planned',
          recurring: true,
        });
      }
      if (toAdd.length === 0) return prev;
      return [...prev, ...toAdd];
    });
  // Run once when expenses are loaded from localStorage
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expensesLoaded]);

  const dueSoon = useMemo(() => {
    const now = new Date();
    const in14 = new Date();
    in14.setDate(in14.getDate() + 14);
    return expenses.filter((item) => item.dueDate && item.status !== 'paid' && new Date(item.dueDate) >= now && new Date(item.dueDate) <= in14);
  }, [expenses]);

  const totals = useMemo(() => {
    const year = new Date().getFullYear();
    const yearExpenses = expenses.filter((item) => {
      const date = item.paidDate || item.dueDate;
      return date ? new Date(date).getFullYear() === year : false;
    });
    const totalSpend = yearExpenses.reduce((sum, item) => sum + item.amount, 0);
    const totalMiles = mileage.filter((item) => new Date(item.date).getFullYear() === year).reduce((sum, item) => sum + item.miles, 0);
    const mileageValue = totalMiles * (profile.mileageRate || 0);
    return { totalSpend, totalMiles, mileageValue };
  }, [expenses, mileage, profile.mileageRate]);
  const monthlySummary = useMemo(() => {
    const now = new Date();
    const monthSpend = expenses.reduce((sum, item) => {
      const date = item.paidDate || item.dueDate;
      if (!date) return sum;
      const entryDate = new Date(date);
      if (entryDate.getFullYear() !== now.getFullYear() || entryDate.getMonth() !== now.getMonth()) return sum;
      return sum + item.amount;
    }, 0);
    const monthMiles = mileage.reduce((sum, item) => {
      const entryDate = new Date(item.date);
      if (entryDate.getFullYear() !== now.getFullYear() || entryDate.getMonth() !== now.getMonth()) return sum;
      return sum + item.miles;
    }, 0);
    return {
      monthSpend,
      monthMiles,
      monthMileageValue: monthMiles * (profile.mileageRate || 0),
    };
  }, [expenses, mileage, profile.mileageRate]);
  const categorySummary = useMemo(() => {
    const totalsByCategory = expenses.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount;
      return acc;
    }, {});
    return Object.entries(totalsByCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);
  const monthlyTrend = useMemo(() => {
    const buckets = new Map<string, { spend: number; miles: number }>();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, { spend: 0, miles: 0 });
    }
    expenses.forEach((item) => {
      const date = item.paidDate || item.dueDate;
      if (!date) return;
      const d = new Date(date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const bucket = buckets.get(key);
      if (bucket) bucket.spend += item.amount;
    });
    mileage.forEach((item) => {
      const d = new Date(item.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const bucket = buckets.get(key);
      if (bucket) bucket.miles += item.miles;
    });
    return Array.from(buckets.entries()).map(([label, value]) => ({ label, ...value }));
  }, [expenses, mileage]);

  const addExpense = () => {
    if (!expenseForm.title || !expenseForm.amount) return;
    setExpenses((prev) => [
      {
        id: `${Date.now()}`,
        title: expenseForm.title,
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        dueDate: expenseForm.dueDate || undefined,
        vendor: expenseForm.vendor || undefined,
        notes: expenseForm.notes || undefined,
        status: expenseForm.status,
        recurring: expenseForm.recurring,
      },
      ...prev,
    ]);
    setExpenseForm(defaultExpense);
  };

  const addMileage = () => {
    if (!mileageForm.date || !mileageForm.miles || !mileageForm.purpose) return;
    setMileage((prev) => [
      {
        id: `${Date.now()}`,
        date: mileageForm.date,
        miles: Number(mileageForm.miles),
        purpose: mileageForm.purpose,
        notes: mileageForm.notes || undefined,
      },
      ...prev,
    ]);
    setMileageForm(defaultMileage);
  };

  const markPaid = (id: string) => {
    setExpenses((prev) => prev.map((item) => item.id === id ? { ...item, status: 'paid', paidDate: new Date().toISOString().slice(0, 10) } : item));
  };

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9] mb-2">Expenses And Mileage</h1>
        <p className="text-[#94A3B8]">Track business spend, upcoming dues, and miles driven for appointments and work.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="YTD Spend" value={formatCurrency(totals.totalSpend)} tone="text-red" />
        <StatCard label="Due In 14 Days" value={`${dueSoon.length}`} tone="text-[#D4A043]" />
        <StatCard label="YTD Miles" value={totals.totalMiles.toFixed(0)} tone="text-[#3B82F6]" />
        <StatCard label="Mileage Value" value={formatCurrency(Math.round(totals.mileageValue))} tone="text-[#10B981]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[#F1F5F9] mb-4">Monthly Ops Snapshot</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0D1117] border border-[#1E293B] rounded p-3">
              <p className="text-xs text-[#64748B] uppercase">Spend</p>
              <p className="text-lg font-semibold text-red mt-1">{formatCurrency(monthlySummary.monthSpend)}</p>
            </div>
            <div className="bg-[#0D1117] border border-[#1E293B] rounded p-3">
              <p className="text-xs text-[#64748B] uppercase">Miles</p>
              <p className="text-lg font-semibold text-[#3B82F6] mt-1">{monthlySummary.monthMiles.toFixed(0)}</p>
            </div>
            <div className="bg-[#0D1117] border border-[#1E293B] rounded p-3">
              <p className="text-xs text-[#64748B] uppercase">Mileage Value</p>
              <p className="text-lg font-semibold text-[#10B981] mt-1">{formatCurrency(Math.round(monthlySummary.monthMileageValue))}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[#F1F5F9] mb-4">Top Expense Categories</h2>
          <div className="space-y-3">
            {categorySummary.length === 0 ? (
              <p className="text-sm text-[#94A3B8]">No expenses logged yet.</p>
            ) : categorySummary.slice(0, 5).map((item) => {
              const width = Math.max(12, Math.min(100, Math.round((item.amount / Math.max(categorySummary[0]?.amount || 1, 1)) * 100)));
              return (
                <div key={item.category}>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <p className="text-sm text-[#F1F5F9] capitalize">{item.category}</p>
                    <p className="text-sm text-[#94A3B8]">{formatCurrency(item.amount)}</p>
                  </div>
                  <div className="h-2 rounded-full bg-[#0D1117] overflow-hidden">
                    <div className="h-full rounded-full bg-[#D4A043]" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#F1F5F9] flex items-center gap-2"><Receipt size={18} className="text-[#D4A043]" />Add Expense</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={expenseForm.title} onChange={(e) => setExpenseForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Expense title" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
          <select value={expenseForm.category} onChange={(e) => setExpenseForm((prev) => ({ ...prev, category: e.target.value as ExpenseEntry['category'] }))} className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]">
            <option value="board">Board</option>
            <option value="mls">MLS</option>
            <option value="marketing">Marketing</option>
            <option value="recruiting">Recruiting</option>
            <option value="software">Software</option>
            <option value="vehicle">Vehicle</option>
            <option value="education">Education</option>
            <option value="other">Other</option>
          </select>
          <input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))} placeholder="Amount" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
          <input type="date" value={expenseForm.dueDate} onChange={(e) => setExpenseForm((prev) => ({ ...prev, dueDate: e.target.value }))} className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
          <input value={expenseForm.vendor} onChange={(e) => setExpenseForm((prev) => ({ ...prev, vendor: e.target.value }))} placeholder="Vendor" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
          <select value={expenseForm.status} onChange={(e) => setExpenseForm((prev) => ({ ...prev, status: e.target.value as ExpenseEntry['status'] }))} className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]">
            <option value="planned">Planned</option>
            <option value="due">Due</option>
            <option value="paid">Paid</option>
          </select>
          <input value={expenseForm.notes} onChange={(e) => setExpenseForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Notes" className="md:col-span-2 px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
          <label className="flex items-center gap-2 text-sm text-[#94A3B8] px-1">
            <input type="checkbox" checked={expenseForm.recurring} onChange={(e) => setExpenseForm((prev) => ({ ...prev, recurring: e.target.checked }))} />
            Recurring due
          </label>
        </div>
        <button onClick={addExpense} className="px-4 py-2 bg-[#D4A043] hover:bg-[#E8B84F] text-[#07090F] font-semibold rounded inline-flex items-center gap-2"><Plus size={16} />Add Expense</button>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#F1F5F9] flex items-center gap-2"><Car size={18} className="text-[#3B82F6]" />Mileage Tracker</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input type="date" value={mileageForm.date} onChange={(e) => setMileageForm((prev) => ({ ...prev, date: e.target.value }))} className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
          <input type="number" value={mileageForm.miles} onChange={(e) => setMileageForm((prev) => ({ ...prev, miles: e.target.value }))} placeholder="Miles driven" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
          <input value={mileageForm.purpose} onChange={(e) => setMileageForm((prev) => ({ ...prev, purpose: e.target.value }))} placeholder="Purpose / appointment" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
          <input value={mileageForm.notes} onChange={(e) => setMileageForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Notes" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
        </div>
        <button onClick={addMileage} className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold rounded inline-flex items-center gap-2"><Plus size={16} />Add Mileage</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
          <div className="p-4 border-b border-[#1E293B]"><h2 className="text-lg font-semibold text-[#F1F5F9]">Upcoming Dues</h2></div>
          <div className="divide-y divide-[#1E293B]">
            {dueSoon.length === 0 ? (
              <p className="p-4 text-sm text-[#94A3B8]">No dues due in the next 14 days.</p>
            ) : dueSoon.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-[#F1F5F9] font-semibold">{item.title}</p>
                  <p className="text-xs text-[#94A3B8]">{item.dueDate} • {item.vendor || item.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#D4A043] font-semibold">{formatCurrency(item.amount)}</span>
                  {item.status !== 'paid' && <button onClick={() => markPaid(item.id)} className="px-2 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-xs text-[#F1F5F9]">Mark Paid</button>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
          <div className="p-4 border-b border-[#1E293B]"><h2 className="text-lg font-semibold text-[#F1F5F9]">Recent Mileage</h2></div>
          <div className="divide-y divide-[#1E293B]">
            {mileage.length === 0 ? (
              <p className="p-4 text-sm text-[#94A3B8]">No mileage logged yet.</p>
            ) : mileage.slice(0, 10).map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-[#F1F5F9] font-semibold">{item.purpose}</p>
                  <p className="text-xs text-[#94A3B8]">{item.date}{item.notes ? ` • ${item.notes}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#3B82F6] font-semibold">{item.miles.toFixed(1)} mi</p>
                  <p className="text-xs text-[#94A3B8]">{formatCurrency(Math.round(item.miles * (profile.mileageRate || 0)))}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-[#F1F5F9] mb-4">Six-Month Trend</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {monthlyTrend.map((row) => (
            <div key={row.label} className="bg-[#0D1117] border border-[#1E293B] rounded p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#F1F5F9]">{row.label}</p>
                <p className="text-xs text-[#94A3B8] mt-1">Spend {formatCurrency(row.spend)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[#3B82F6]">{row.miles.toFixed(0)} mi</p>
                <p className="text-xs text-[#94A3B8]">{formatCurrency(Math.round(row.miles * (profile.mileageRate || 0)))}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
      <p className="text-xs text-[#64748B] uppercase font-semibold">{label}</p>
      <p className={`text-xl font-bold mt-1 ${tone}`}>{value}</p>
    </div>
  );
}