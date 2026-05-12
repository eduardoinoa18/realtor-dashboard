'use client';

import { BookOpen, CheckCircle, Zap } from 'lucide-react';
import { useState } from 'react';

export default function MLOPage() {
  const [steps] = useState([
    { name: 'Complete 20-hour NMLS pre-licensing course', category: 'licensing', hours: 20, done: false },
    { name: 'Pass NMLS national exam (75% required)', category: 'licensing', hours: 4, done: false },
    { name: 'Pass Massachusetts state exam', category: 'licensing', hours: 2, done: false },
    { name: 'Apply for MA MLO license via NMLS system', category: 'licensing', hours: 1, done: false },
    { name: 'Background check + credit report submitted', category: 'licensing', hours: 0.5, done: false },
    { name: 'Surety bond obtained ($25k for MA)', category: 'licensing', hours: 1, done: false },
    { name: 'Sponsor agreement with Newfed Mortgage signed', category: 'business', hours: 2, done: false },
    { name: 'Set up MLO referral tracking system', category: 'business', hours: 1, done: false },
    { name: 'Create referral agreement template', category: 'business', hours: 1, done: false },
    { name: 'Send intro email to top 10 buyer leads about Newfed', category: 'business', hours: 0.5, done: false },
  ]);

  const licensingDone = steps.filter(s => s.category === 'licensing' && s.done).length;
  const licensingTotal = steps.filter(s => s.category === 'licensing').length;
  const businessDone = steps.filter(s => s.category === 'business' && s.done).length;
  const businessTotal = steps.filter(s => s.category === 'business').length;

  const totalHours = steps.reduce((sum, s) => sum + s.hours, 0);
  const hoursCompleted = steps.filter(s => s.done).reduce((sum, s) => sum + s.hours, 0);

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
            <p className="text-3xl font-bold text-[#06B6D4]">$500–$1,200/month</p>
            <p className="text-xs text-[#94A3B8] mt-2">At 3 closings/month, 60% buyers = ~$300/month referrals (0.5% of $400k loans)</p>
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

        <div className="space-y-3">
          {steps.map((step, idx) => (
            <label
              key={idx}
              className="flex items-start gap-3 p-3 rounded hover:bg-[#161D2A] cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={step.done}
                className="mt-0.5 w-4 h-4 rounded border-[#374151] accent-[#D4A043]"
                disabled
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
            </label>
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
