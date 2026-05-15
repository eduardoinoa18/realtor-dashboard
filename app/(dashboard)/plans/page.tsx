'use client';

import { useState } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { useEduStorage } from '@/hooks/useEduStorage';

interface ActivePlan {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed';
  leadName?: string;
  createdAt: string;
}

export default function PlansPage() {
  const { state: activePlans, setState: setActivePlans } = useEduStorage<ActivePlan[]>('edu_action_plans_v1', []);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDescription, setNewPlanDescription] = useState('');
  const [newPlanLead, setNewPlanLead] = useState('');
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingPlanName, setEditingPlanName] = useState('');
  const [editingPlanDescription, setEditingPlanDescription] = useState('');

  const planTypes = [
    { name: 'New Buyer', description: '5-day rapid follow-up sequence', leads: 0 },
    { name: 'New Seller', description: 'CMA + listing prep coaching', leads: 0 },
    { name: 'Nurture 30-day', description: 'Monthly market updates & value adds', leads: 0 },
    { name: 'Nurture 60-day', description: 'Deep engagement, education focus', leads: 0 },
    { name: 'Nurture 90-day', description: 'Quarterly check-in + relationship building', leads: 0 },
    { name: 'Post-Close', description: 'Follow-up, reviews, referral ask', leads: 0 },
  ];

  const addPlanFromTemplate = (name: string, description: string) => {
    setActivePlans((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        description,
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const addCustomPlan = () => {
    if (!newPlanName.trim()) return;
    setActivePlans((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: newPlanName.trim(),
        description: newPlanDescription.trim() || 'Custom action plan',
        leadName: newPlanLead.trim() || undefined,
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setNewPlanName('');
    setNewPlanDescription('');
    setNewPlanLead('');
  };

  const startEditPlan = (plan: ActivePlan) => {
    setEditingPlanId(plan.id);
    setEditingPlanName(plan.name);
    setEditingPlanDescription(plan.description);
  };

  const saveEditPlan = () => {
    if (!editingPlanId || !editingPlanName.trim()) return;
    setActivePlans((prev) => prev.map((item) => (
      item.id === editingPlanId
        ? { ...item, name: editingPlanName.trim(), description: editingPlanDescription.trim() }
        : item
    )));
    setEditingPlanId(null);
    setEditingPlanName('');
    setEditingPlanDescription('');
  };

  const updatePlanStatus = (id: string, status: ActivePlan['status']) => {
    setActivePlans((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  const deletePlan = (id: string) => {
    setActivePlans((prev) => prev.filter((item) => item.id !== id));
    if (editingPlanId === id) {
      setEditingPlanId(null);
    }
  };

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
              <button onClick={() => addPlanFromTemplate(plan.name, plan.description)} className="px-3 py-1 bg-[#1E293B] hover:bg-[#374151] text-[#94A3B8] hover:text-[#F1F5F9] rounded text-sm font-medium transition-colors">
                Use Template
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-[#111827] border border-[#1E293B] rounded-lg p-6 space-y-3">
        <h3 className="text-lg font-semibold text-[#F1F5F9]">Create Custom Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={newPlanName} onChange={(e) => setNewPlanName(e.target.value)} placeholder="Plan name" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
          <input value={newPlanLead} onChange={(e) => setNewPlanLead(e.target.value)} placeholder="Lead name (optional)" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
          <button onClick={addCustomPlan} className="px-4 py-2 bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] font-semibold rounded flex items-center justify-center gap-2">
            <Plus size={16} />
            Add Plan
          </button>
        </div>
        <textarea value={newPlanDescription} onChange={(e) => setNewPlanDescription(e.target.value)} placeholder="Plan description" className="w-full min-h-[90px] px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
      </div>

      {/* Active Plans */}
      <div className="mt-12">
        <h3 className="text-lg font-semibold text-[#F1F5F9] mb-4 flex items-center gap-2">
          <Calendar size={20} />
          Active Plans
        </h3>

        {activePlans.length === 0 ? (
          <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-12 text-center">
            <p className="text-[#94A3B8] mb-6">No active plans yet. Start by assigning a template to a lead.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activePlans.map((plan) => (
              <div key={plan.id} className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
                {editingPlanId === plan.id ? (
                  <div className="space-y-2">
                    <input
                      value={editingPlanName}
                      onChange={(e) => setEditingPlanName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
                      placeholder="Plan name"
                      title="Edit plan name"
                    />
                    <textarea
                      value={editingPlanDescription}
                      onChange={(e) => setEditingPlanDescription(e.target.value)}
                      className="w-full min-h-[80px] px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
                      placeholder="Plan description"
                      title="Edit plan description"
                    />
                    <div className="flex gap-2">
                      <button onClick={saveEditPlan} className="text-xs px-3 py-1.5 rounded bg-[#D4A043] hover:bg-[#E8B84F] text-[#07090F]">Save</button>
                      <button onClick={() => setEditingPlanId(null)} className="text-xs px-3 py-1.5 rounded bg-[#1E293B] hover:bg-[#334155] text-[#F1F5F9]">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#F1F5F9]">{plan.name}</p>
                        <p className="text-xs text-[#94A3B8] mt-1">{plan.description}</p>
                        <p className="text-[11px] text-[#64748B] mt-1">{plan.leadName ? `Lead: ${plan.leadName} • ` : ''}Created {new Date(plan.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={plan.status}
                          onChange={(e) => updatePlanStatus(plan.id, e.target.value as ActivePlan['status'])}
                          className="text-xs px-2 py-1 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
                          title="Plan status"
                        >
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="completed">Completed</option>
                        </select>
                        <button onClick={() => startEditPlan(plan)} className="text-xs px-2 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-[#F1F5F9]">Edit</button>
                        <button onClick={() => deletePlan(plan.id)} className="text-xs px-2 py-1 rounded bg-red/20 hover:bg-red/30 text-red">Delete</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
