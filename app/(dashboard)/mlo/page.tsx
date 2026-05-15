'use client';

import { BookOpen, CheckCircle, Zap } from 'lucide-react';
import { useState } from 'react';
import { useAppSettings } from '@/store/appSettings';
import { useEduStorage } from '@/hooks/useEduStorage';

interface MloStep {
  id: string;
  name: string;
  category: 'licensing' | 'business';
  hours: number;
  done: boolean;
}

export default function MLOPage() {
  const targets = useAppSettings((state) => state.targets);
  const defaultSteps: MloStep[] = [
    { id: 'mlo-1', name: 'Complete 20-hour NMLS pre-licensing course', category: 'licensing', hours: 20, done: false },
    { id: 'mlo-2', name: 'Pass NMLS national exam (75% required)', category: 'licensing', hours: 4, done: false },
    { id: 'mlo-3', name: 'Pass Massachusetts state exam', category: 'licensing', hours: 2, done: false },
    { id: 'mlo-4', name: 'Apply for MA MLO license via NMLS system', category: 'licensing', hours: 1, done: false },
    { id: 'mlo-5', name: 'Background check + credit report submitted', category: 'licensing', hours: 0.5, done: false },
    { id: 'mlo-6', name: 'Surety bond obtained ($25k for MA)', category: 'licensing', hours: 1, done: false },
    { id: 'mlo-7', name: 'Sponsor agreement with Newfed Mortgage signed', category: 'business', hours: 2, done: false },
    { id: 'mlo-8', name: 'Set up MLO referral tracking system', category: 'business', hours: 1, done: false },
    { id: 'mlo-9', name: 'Create referral agreement template', category: 'business', hours: 1, done: false },
    { id: 'mlo-10', name: 'Send intro email to top 10 buyer leads about Newfed', category: 'business', hours: 0.5, done: false },
  ];
  const { state: steps, setState: setSteps } = useEduStorage<MloStep[]>('edu_mlo_steps_v1', defaultSteps);
  const [newStepName, setNewStepName] = useState('');
  const [newStepHours, setNewStepHours] = useState('1');
  const [newStepCategory, setNewStepCategory] = useState<MloStep['category']>('business');

  const licensingDone = steps.filter(s => s.category === 'licensing' && s.done).length;
  const licensingTotal = steps.filter(s => s.category === 'licensing').length;
  const businessDone = steps.filter(s => s.category === 'business' && s.done).length;
  const businessTotal = steps.filter(s => s.category === 'business').length;

  const totalHours = steps.reduce((sum, s) => sum + s.hours, 0);
  const hoursCompleted = steps.filter(s => s.done).reduce((sum, s) => sum + s.hours, 0);

  const estimatedBuyerClosings = Math.round(targets.monthGoal * 0.6);
  const estimatedMonthlyReferral = estimatedBuyerClosings * 400000 * 0.005;

  const toggleStep = (id: string) => {
    setSteps((prev) => prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  };

  const addStep = () => {
    if (!newStepName.trim()) return;
    const hours = Number(newStepHours);
    setSteps((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: newStepName.trim(),
        category: newStepCategory,
        hours: Number.isFinite(hours) && hours > 0 ? hours : 1,
        done: false,
      },
      ...prev,
    ]);
    setNewStepName('');
    setNewStepHours('1');
    setNewStepCategory('business');
  };

  const editStep = (id: string) => {
    const current = steps.find((item) => item.id === id);
    if (!current) return;
    const name = window.prompt('Edit step name', current.name);
    if (name === null) return;
    const hoursInput = window.prompt('Edit estimated hours', String(current.hours));
    if (hoursInput === null) return;
    const parsedHours = Number(hoursInput);
    setSteps((prev) => prev.map((item) => (
      item.id === id
        ? {
            ...item,
            name: name.trim() || item.name,
            hours: Number.isFinite(parsedHours) && parsedHours > 0 ? parsedHours : item.hours,
          }
        : item
    )));
  };

  const deleteStep = (id: string) => {
    setSteps((prev) => prev.filter((item) => item.id !== id));
  };

  const resetSteps = () => {
    setSteps(defaultSteps);
  };

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9] mb-2">MLO Income Tracker</h1>
        <p className="text-[#94A3B8]">Track your licensing progress and MLO referral income</p>
      </div>

      {/* Status Banner */}
      <div className="bg-gradient-to-r from-[#3B82F6]/20 to-[#06B6D4]/20 border border-[#3B82F6]/50 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#F1F5F9] mb-2">Estimated MLO Income Potential</p>
            <p className="text-3xl font-bold text-[#06B6D4]">${estimatedMonthlyReferral.toLocaleString()}/month</p>
            <p className="text-xs text-[#94A3B8] mt-2">At {targets.monthGoal} closings/month, ~60% buyers = {estimatedBuyerClosings} referral loans (0.5% of $400k avg loan size).</p>
          </div>
          <Zap size={40} className="text-[#3B82F6] opacity-50" />
        </div>
      </div>

      {/* Progress Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Licensing */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <h3 className="font-semibold text-[#F1F5F9] mb-4">Licensing Track</h3>
          <p className="text-sm text-[#94A3B8] mb-3">{licensingDone} / {licensingTotal} completed</p>
          <progress
            className="h-2 w-full rounded-full overflow-hidden mb-4 accent-[#3B82F6]"
            max={100}
            value={(licensingDone / licensingTotal) * 100}
            aria-label="Licensing progress"
          />
          <p className="text-xs text-[#64748B]">{hoursCompleted} / {totalHours.toFixed(1)} hours completed</p>
        </div>

        {/* Business Setup */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <h3 className="font-semibold text-[#F1F5F9] mb-4">Business Setup</h3>
          <p className="text-sm text-[#94A3B8] mb-3">{businessDone} / {businessTotal} completed</p>
          <progress
            className="h-2 w-full rounded-full overflow-hidden mb-4 accent-[#10B981]"
            max={100}
            value={(businessDone / businessTotal) * 100}
            aria-label="Business setup progress"
          />
          <p className="text-xs text-[#64748B]">Keep your partner agreements in order</p>
        </div>
      </div>

      {/* Study Checklist */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
        <h3 className="font-semibold text-[#F1F5F9] mb-4 flex items-center gap-2">
          <BookOpen size={20} />
          Study Checklist
        </h3>

        <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            value={newStepName}
            onChange={(e) => setNewStepName(e.target.value)}
            placeholder="New checklist step"
            className="md:col-span-2 px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
          />
          <input
            type="number"
            value={newStepHours}
            onChange={(e) => setNewStepHours(e.target.value)}
            placeholder="Hours"
            title="Step hours"
            className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
          />
          <select
            value={newStepCategory}
            onChange={(e) => setNewStepCategory(e.target.value as MloStep['category'])}
            title="Step category"
            className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
          >
            <option value="licensing">Licensing</option>
            <option value="business">Business</option>
          </select>
        </div>
        <div className="mb-4 flex items-center gap-2">
          <button onClick={addStep} className="px-3 py-1.5 rounded bg-[#D4A043] hover:bg-[#E8B84F] text-[#07090F] text-sm font-semibold">Add Step</button>
          <button onClick={resetSteps} className="px-3 py-1.5 rounded bg-[#1E293B] hover:bg-[#334155] text-[#F1F5F9] text-sm">Reset Defaults</button>
        </div>

        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="flex items-start gap-3 p-3 rounded hover:bg-[#161D2A] transition-colors">
              <input
                type="checkbox"
                checked={step.done}
                onChange={() => toggleStep(step.id)}
                className="mt-0.5 w-4 h-4 rounded border-[#374151] accent-[#D4A043]"
                title={`Mark ${step.name} complete`}
              />
              <div className="flex-1">
                <p className={`text-sm font-medium ${step.done ? 'line-through text-[#64748B]' : 'text-[#F1F5F9]'}`}>
                  {step.name}
                </p>
                <div className="flex items-center gap-4 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    step.category === 'licensing'
                      ? 'bg-[#3B82F6]/20 text-[#3B82F6]'
                      : 'bg-[#10B981]/20 text-[#10B981]'
                  }`}>
                    {step.category}
                  </span>
                  <span className="text-xs text-[#64748B]">{step.hours}h</span>
                </div>
              </div>
              {step.done && <CheckCircle size={20} className="text-[#10B981] flex-shrink-0" />}
              <div className="flex items-center gap-2">
                <button onClick={() => editStep(step.id)} className="text-xs px-2 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-[#F1F5F9]">Edit</button>
                <button onClick={() => deleteStep(step.id)} className="text-xs px-2 py-1 rounded bg-red/20 hover:bg-red/30 text-red">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why MLO Info */}
      <div className="mt-8 bg-[#111827] border border-[#1E293B] rounded-lg p-6">
        <h3 className="font-semibold text-[#F1F5F9] mb-4">Why Get Your MLO License?</h3>
        <ul className="space-y-3 text-sm text-[#94A3B8]">
          <li className="flex gap-3">
            <span className="text-[#D4A043] font-bold">1.</span>
            <span>Extra income: 0.5% referral points from Newfed on buyer loans = $500–$1,200/month</span>
          </li>
          <li className="flex gap-3">
            <span className="text-[#D4A043] font-bold">2.</span>
            <span>Client trust: Clients see you as more knowledgeable and connected</span>
          </li>
          <li className="flex gap-3">
            <span className="text-[#D4A043] font-bold">3.</span>
            <span>Deal velocity: You control the financing, speed up closes, get better rates</span>
          </li>
          <li className="flex gap-3">
            <span className="text-[#D4A043] font-bold">4.</span>
            <span>Independence: Step toward owning your own business with Real Brokerage</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
