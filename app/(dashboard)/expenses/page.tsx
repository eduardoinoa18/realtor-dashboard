'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExpenseBar } from './ExpenseBar';
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
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingMileageId, setEditingMileageId] = useState<string | null>(null);
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<'all' | ExpenseEntry['category']>('all');
  const [expenseStatusFilter, setExpenseStatusFilter] = useState<'all' | ExpenseEntry['status']>('all');

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

  const overdue = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return expenses.filter((item) => item.dueDate && item.status !== 'paid' && new Date(item.dueDate) < now);
  }, [expenses]);

  const upcoming = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const in7 = new Date(now);
    in7.setDate(in7.getDate() + 7);
    return expenses.filter((item) => item.dueDate && item.status !== 'paid' && new Date(item.dueDate) >= now && new Date(item.dueDate) <= in7);
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

  const filteredDueSoon = useMemo(() => {
    return dueSoon.filter((item) => {
      if (expenseCategoryFilter !== 'all' && item.category !== expenseCategoryFilter) return false;
      if (expenseStatusFilter !== 'all' && item.status !== expenseStatusFilter) return false;
      return true;
    });
  }, [dueSoon, expenseCategoryFilter, expenseStatusFilter]);

  const exportCsv = (rows: Record<string, string | number | undefined>[], filename: string) => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const escape = (value: string | number | undefined) => {
      if (value === undefined || value === null) return '';
      const text = String(value).replaceAll('"', '""');
      return /[",\n]/.test(text) ? `"${text}"` : text;
    };
    const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportExpensesCsv = () => {
    exportCsv(
      expenses.map((item) => ({
        title: item.title,
        category: item.category,
        amount: item.amount,
        dueDate: item.dueDate || '',
        paidDate: item.paidDate || '',
        vendor: item.vendor || '',
        status: item.status,
        recurring: item.recurring ? 'yes' : 'no',
        notes: item.notes || '',
      })),
      'expenses-export.csv'
    );
  };

  const exportMileageCsv = () => {
    exportCsv(
      mileage.map((item) => ({
        date: item.date,
        miles: item.miles,
        purpose: item.purpose,
        notes: item.notes || '',
      })),
      'mileage-export.csv'
    );
  };

  const addExpense = () => {
    if (!expenseForm.title || !expenseForm.amount) return;
    if (editingExpenseId) {
      setExpenses((prev) => prev.map((item) => (
        item.id === editingExpenseId
          ? {
              ...item,
              title: expenseForm.title,
              category: expenseForm.category,
              amount: Number(expenseForm.amount),
              dueDate: expenseForm.dueDate || undefined,
              vendor: expenseForm.vendor || undefined,
              notes: expenseForm.notes || undefined,
              status: expenseForm.status,
              recurring: expenseForm.recurring,
            }
          : item
      )));
      setEditingExpenseId(null);
    } else {
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
    }
    setExpenseForm(defaultExpense);
  };

  const addMileage = () => {
    if (!mileageForm.date || !mileageForm.miles || !mileageForm.purpose) return;
    if (editingMileageId) {
      setMileage((prev) => prev.map((item) => (
        item.id === editingMileageId
          ? {
              ...item,
              date: mileageForm.date,
              miles: Number(mileageForm.miles),
              purpose: mileageForm.purpose,
              notes: mileageForm.notes || undefined,
            }
          : item
      )));
      setEditingMileageId(null);
    } else {
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
    }
    setMileageForm(defaultMileage);
  };

  const markPaid = (id: string) => {
    setExpenses((prev) => prev.map((item) => item.id === id ? { ...item, status: 'paid', paidDate: new Date().toISOString().slice(0, 10) } : item));
  };

  const startEditExpense = (item: ExpenseEntry) => {
    setEditingExpenseId(item.id);
    setExpenseForm({
      title: item.title,
      category: item.category,
      amount: String(item.amount),
      dueDate: item.dueDate || '',
      vendor: item.vendor || '',
      notes: item.notes || '',
      status: item.status,
      recurring: item.recurring,
    });
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((item) => item.id !== id));
    if (editingExpenseId === id) {
      setEditingExpenseId(null);
      setExpenseForm(defaultExpense);
    }
  };

  const startEditMileage = (item: MileageEntry) => {
    setEditingMileageId(item.id);
    setMileageForm({
      date: item.date,
      miles: String(item.miles),
      purpose: item.purpose,
      notes: item.notes || '',
    });
  };

  const deleteMileage = (id: string) => {
    setMileage((prev) => prev.filter((item) => item.id !== id));
    if (editingMileageId === id) {
      setEditingMileageId(null);
      setMileageForm(defaultMileage);
    }
  };

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-7xl space-y-6">
      {/* Monthly/Annual Summary */}
      <div className="flex flex-wrap gap-6 mb-4">
        <div className="bg-[#1E293B] rounded p-4 flex flex-col items-center min-w-[160px]">
          <div className="text-[#F1F5F9] text-lg font-semibold">This Month</div>
          <div className="text-[#D4A043] text-2xl font-bold">{formatCurrency(monthlySummary.monthSpend)}</div>
        </div>
        <div className="bg-[#1E293B] rounded p-4 flex flex-col items-center min-w-[160px]">
          <div className="text-[#F1F5F9] text-lg font-semibold">This Year</div>
          <div className="text-[#D4A043] text-2xl font-bold">{formatCurrency(totals.totalSpend)}</div>
        </div>
      </div>
      {/* Overdue/Upcoming Cues */}
      {(overdue.length > 0 || upcoming.length > 0) && (
        <div className="mb-6">
          {overdue.length > 0 && (
            <div className="bg-red-500/20 border-l-4 border-red-500 rounded p-3 mb-2 text-red-200 font-semibold">
              Overdue Expenses: {overdue.length}
            </div>
          )}
          {upcoming.length > 0 && (
            <div className="bg-amber-500/20 border-l-4 border-amber-500 rounded p-3 text-amber-200 font-semibold">
              Upcoming (7d) Expenses: {upcoming.length}
            </div>
          )}
        </div>
      )}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9] mb-2">Expenses And Mileage</h1>
        <p className="text-[#94A3B8]">Track business spend, upcoming dues, and miles driven for appointments and work.</p>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
          <label className="space-y-1 text-sm text-[#94A3B8]">
            <span className="block">Category Filter</span>
            <select value={expenseCategoryFilter} onChange={(e) => setExpenseCategoryFilter(e.target.value as ExpenseEntry['category'] | 'all')} className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]">
              <option value="all">All Categories</option>
              <option value="board">Board</option>
              <option value="mls">MLS</option>
              <option value="marketing">Marketing</option>
              <option value="recruiting">Recruiting</option>
              <option value="software">Software</option>
              <option value="vehicle">Vehicle</option>
              <option value="education">Education</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="space-y-1 text-sm text-[#94A3B8]">
            <span className="block">Status Filter</span>
            <select value={expenseStatusFilter} onChange={(e) => setExpenseStatusFilter(e.target.value as ExpenseEntry['status'] | 'all')} className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]">
              <option value="all">All Statuses</option>
              <option value="planned">Planned</option>
              <option value="due">Due</option>
              <option value="paid">Paid</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportExpensesCsv} className="px-4 py-2 bg-[#1E293B] hover:bg-[#334155] text-[#F1F5F9] font-semibold rounded">Export Expenses CSV</button>
          <button onClick={exportMileageCsv} className="px-4 py-2 bg-[#1E293B] hover:bg-[#334155] text-[#F1F5F9] font-semibold rounded">Export Mileage CSV</button>
        </div>
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
                    <ExpenseBar width={width} label={item.category} />
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
          <label className="sr-only" htmlFor="expense-title">Expense Title</label>
          <input id="expense-title" value={expenseForm.title} onChange={(e) => setExpenseForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Expense title" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
          <label className="sr-only" htmlFor="expense-category">Category</label>
          <select id="expense-category" title="Expense Category" value={expenseForm.category} onChange={(e) => setExpenseForm((prev) => ({ ...prev, category: e.target.value as ExpenseEntry['category'] }))} className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]">
            <option value="board">Board</option>
            <option value="mls">MLS</option>
            <option value="marketing">Marketing</option>
            <option value="recruiting">Recruiting</option>
            <option value="software">Software</option>
            <option value="vehicle">Vehicle</option>
            <option value="education">Education</option>
            <option value="other">Other</option>
          </select>
          <label className="sr-only" htmlFor="expense-amount">Amount</label>
          <input id="expense-amount" type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))} placeholder="Amount" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
          <label className="sr-only" htmlFor="expense-due-date">Due Date</label>
          <input id="expense-due-date" type="date" value={expenseForm.dueDate} onChange={(e) => setExpenseForm((prev) => ({ ...prev, dueDate: e.target.value }))} className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" title="Due Date" placeholder="Due date" />
          <label className="sr-only" htmlFor="expense-vendor">Vendor</label>
          <input id="expense-vendor" value={expenseForm.vendor} onChange={(e) => setExpenseForm((prev) => ({ ...prev, vendor: e.target.value }))} placeholder="Vendor" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
          <label className="sr-only" htmlFor="expense-status">Status</label>
          <select id="expense-status" title="Expense Status" value={expenseForm.status} onChange={(e) => setExpenseForm((prev) => ({ ...prev, status: e.target.value as ExpenseEntry['status'] }))} className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]">
            <option value="planned">Planned</option>
            <option value="due">Due</option>
            <option value="paid">Paid</option>
          </select>
          <label className="sr-only" htmlFor="expense-notes">Notes</label>
          <input id="expense-notes" value={expenseForm.notes} onChange={(e) => setExpenseForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Notes" className="md:col-span-2 px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
          <label className="flex items-center gap-2 text-sm text-[#94A3B8] px-1">
            <input type="checkbox" checked={expenseForm.recurring} onChange={(e) => setExpenseForm((prev) => ({ ...prev, recurring: e.target.checked }))} />
            Recurring due
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={addExpense} className="px-4 py-2 bg-[#D4A043] hover:bg-[#E8B84F] text-[#07090F] font-semibold rounded inline-flex items-center gap-2"><Plus size={16} />{editingExpenseId ? 'Save Expense' : 'Add Expense'}</button>
          {editingExpenseId && (
            <button onClick={() => { setEditingExpenseId(null); setExpenseForm(defaultExpense); }} className="px-4 py-2 bg-[#1E293B] hover:bg-[#334155] text-[#F1F5F9] font-semibold rounded">Cancel Edit</button>
          )}
        </div>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#F1F5F9] flex items-center gap-2"><Car size={18} className="text-[#3B82F6]" />Mileage Tracker</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="sr-only" htmlFor="mileage-date">Mileage Date</label>
          <input id="mileage-date" type="date" value={mileageForm.date} onChange={(e) => setMileageForm((prev) => ({ ...prev, date: e.target.value }))} className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" title="Mileage Date" placeholder="Date" />
          <input type="number" value={mileageForm.miles} onChange={(e) => setMileageForm((prev) => ({ ...prev, miles: e.target.value }))} placeholder="Miles driven" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
          <input value={mileageForm.purpose} onChange={(e) => setMileageForm((prev) => ({ ...prev, purpose: e.target.value }))} placeholder="Purpose / appointment" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
          <input value={mileageForm.notes} onChange={(e) => setMileageForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Notes" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={addMileage} className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold rounded inline-flex items-center gap-2"><Plus size={16} />{editingMileageId ? 'Save Mileage' : 'Add Mileage'}</button>
          {editingMileageId && (
            <button onClick={() => { setEditingMileageId(null); setMileageForm(defaultMileage); }} className="px-4 py-2 bg-[#1E293B] hover:bg-[#334155] text-[#F1F5F9] font-semibold rounded">Cancel Edit</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
          <div className="p-4 border-b border-[#1E293B]"><h2 className="text-lg font-semibold text-[#F1F5F9]">Upcoming Dues</h2></div>
          <div className="divide-y divide-[#1E293B]">
            {filteredDueSoon.length === 0 ? (
              <p className="p-4 text-sm text-[#94A3B8]">No dues due in the next 14 days.</p>
            ) : filteredDueSoon.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-[#F1F5F9] font-semibold">{item.title}</p>
                  <p className="text-xs text-[#94A3B8]">{item.dueDate} • {item.vendor || item.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#D4A043] font-semibold">{formatCurrency(item.amount)}</span>
                  {item.status !== 'paid' && <button onClick={() => markPaid(item.id)} className="px-2 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-xs text-[#F1F5F9]">Mark Paid</button>}
                  <button onClick={() => startEditExpense(item)} className="px-2 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-xs text-[#F1F5F9]">Edit</button>
                  <button onClick={() => deleteExpense(item.id)} className="px-2 py-1 rounded bg-red/20 hover:bg-red/30 text-xs text-red">Delete</button>
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
                <div className="flex items-center gap-2">
                  <button onClick={() => startEditMileage(item)} className="px-2 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-xs text-[#F1F5F9]">Edit</button>
                  <button onClick={() => deleteMileage(item.id)} className="px-2 py-1 rounded bg-red/20 hover:bg-red/30 text-xs text-red">Delete</button>
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