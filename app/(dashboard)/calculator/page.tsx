'use client';

import { useMemo, useState } from 'react';
import { calculateCommission, formatCurrency } from '@/lib/utils';
import { useAppSettings } from '@/store/appSettings';
import { ClosingLog, getCurrentMonthClosings, useEduStorage } from '@/hooks/useEduStorage';

export default function CalculatorPage() {
  const commissions = useAppSettings((state) => state.commissions);
  const targets = useAppSettings((state) => state.targets);
  const { state: closings } = useEduStorage<ClosingLog[]>('edu_closings_v1', []);

  const [salePrice, setSalePrice] = useState(targets.avgSalePrice);
  const [commissionPct, setCommissionPct] = useState(commissions.defaultCommissionPct);
  const [leadSource, setLeadSource] = useState<'own' | 'company' | 'realtor_com' | 'zillow'>('own');
  const [ownCount, setOwnCount] = useState(1);
  const [companyCount, setCompanyCount] = useState(1);
  const [zillowCount, setZillowCount] = useState(1);

  const commissionOptions = {
    franchiseFeePct: commissions.franchiseFeePct,
    ownAgentPct: commissions.ownAgentPct,
    companyAgentPct: commissions.companyAgentPct,
    zillowReferralPct: commissions.zillowReferralPct,
    zillowAgentPct: commissions.zillowAgentPct,
  };

  const singleDeal = calculateCommission(salePrice, commissionPct, leadSource, commissionOptions);

  const projectedIncome = {
    own: calculateCommission(salePrice, commissionPct, 'own', commissionOptions).net * ownCount,
    company: calculateCommission(salePrice, commissionPct, 'company', commissionOptions).net * companyCount,
    zillow: calculateCommission(salePrice, commissionPct, 'zillow', commissionOptions).net * zillowCount,
  };

  const totalMonthly = projectedIncome.own + projectedIncome.company + projectedIncome.zillow;
  const monthClosings = useMemo(() => getCurrentMonthClosings(closings), [closings]);
  const monthNetActual = useMemo(() => monthClosings.reduce((sum, c) => sum + c.netCommission, 0), [monthClosings]);
  const avgProjectedDealNet = useMemo(() => {
    const totalDeals = ownCount + companyCount + zillowCount;
    if (totalDeals <= 0) return singleDeal.net;
    return Math.round(totalMonthly / totalDeals);
  }, [companyCount, ownCount, singleDeal.net, totalMonthly, zillowCount]);
  const remainingToGoal = Math.max(0, targets.netMonthlyTarget - monthNetActual);
  const remainingToSurvival = Math.max(0, targets.survivalMinimum - monthNetActual);
  const closingsNeededForGoal = avgProjectedDealNet > 0 ? Math.ceil(remainingToGoal / avgProjectedDealNet) : 0;
  const closingsNeededForSurvival = avgProjectedDealNet > 0 ? Math.ceil(remainingToSurvival / avgProjectedDealNet) : 0;

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9] mb-2">Commission Calculator</h1>
        <p className="text-[#94A3B8]">Plan your income based on deal mix and pricing</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Single Deal Calculator */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deal Inputs */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
            <h3 className="font-semibold text-[#F1F5F9] mb-4">Single Deal Breakdown</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#94A3B8] mb-2">Sale Price</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="100000"
                    max="1000000"
                    step="50000"
                    value={salePrice}
                    onChange={(e) => setSalePrice(Number(e.target.value))}
                    title="Sale price slider"
                    aria-label="Sale price slider"
                    className="flex-1"
                  />
                  <input
                    type="number"
                    value={salePrice}
                    onChange={(e) => setSalePrice(Number(e.target.value))}
                    title="Sale price"
                    placeholder="Sale price"
                    aria-label="Sale price"
                    className="w-32 px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#94A3B8] mb-2">Commission %</label>
                <select
                  value={commissionPct}
                  onChange={(e) => setCommissionPct(Number(e.target.value))}
                  title="Commission percentage"
                  aria-label="Commission percentage"
                  className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
                >
                  <option value={0.02}>2%</option>
                  <option value={0.025}>2.5%</option>
                  <option value={0.03}>3%</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#94A3B8] mb-2">Lead Source</label>
                <select
                  value={leadSource}
                  onChange={(e) => setLeadSource(e.target.value as 'own' | 'company' | 'realtor_com' | 'zillow')}
                  title="Lead source"
                  aria-label="Lead source"
                  className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
                >
                  <option value="own">Own Lead (70/30)</option>
                  <option value="company">Company Lead (50/50)</option>
                  <option value="realtor_com">Realtor.com (Company Split)</option>
                  <option value="zillow">Zillow Flex</option>
                </select>
              </div>
            </div>

            {/* Commission Breakdown */}
            <div className="mt-6 pt-6 border-t border-[#1E293B] space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#94A3B8]">Gross Commission</span>
                <span className="text-[#F1F5F9] font-semibold">{formatCurrency(singleDeal.gross)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#94A3B8]">Franchise Fee ({(commissions.franchiseFeePct * 100).toFixed(0)}%)</span>
                <span className="text-red">{formatCurrency(singleDeal.franchiseFee)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-3 border-t border-[#1E293B]">
                <span className="text-[#F1F5F9]">Your Net</span>
                <span className="text-[#D4A043]">{formatCurrency(singleDeal.net)}</span>
              </div>
              <p className="text-xs text-[#64748B] mt-2">
                {leadSource === 'own' && `Own lead: ${(commissions.ownAgentPct * 100).toFixed(0)}% agent split, ${(commissions.franchiseFeePct * 100).toFixed(0)}% franchise`}
                {leadSource === 'company' && `Company lead: ${(commissions.companyAgentPct * 100).toFixed(0)}% agent split, ${(commissions.franchiseFeePct * 100).toFixed(0)}% franchise`}
                {leadSource === 'zillow' && `Zillow: ${(commissions.zillowReferralPct * 100).toFixed(0)}% referral, ${(commissions.zillowAgentPct * 100).toFixed(0)}% agent split, ${(commissions.franchiseFeePct * 100).toFixed(0)}% franchise`}
              </p>
            </div>
          </div>

          {/* Monthly Projector */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
            <h3 className="font-semibold text-[#F1F5F9] mb-4">Monthly Deal Mix Projector</h3>

            <div className="space-y-4">
              {[
                { label: 'Own Leads', key: 'ownCount', value: ownCount, setValue: setOwnCount, net: projectedIncome.own },
                { label: 'Company Leads', key: 'companyCount', value: companyCount, setValue: setCompanyCount, net: projectedIncome.company },
                { label: 'Zillow Flex', key: 'zillowCount', value: zillowCount, setValue: setZillowCount, net: projectedIncome.zillow },
              ].map((item) => (
                <div key={item.key}>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm text-[#94A3B8]">{item.label}</label>
                    <span className="text-sm font-semibold text-[#F1F5F9]">{formatCurrency(item.net)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => item.setValue(Math.max(0, item.value - 1))}
                      className="px-3 py-1 bg-[#1E293B] hover:bg-[#374151] text-[#94A3B8] rounded text-sm"
                    >
                      −
                    </button>
                    <span className="text-[#F1F5F9] font-semibold text-center w-12">{item.value}</span>
                    <button
                      onClick={() => item.setValue(item.value + 1)}
                      className="px-3 py-1 bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] rounded text-sm font-semibold"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Summary & Goal Tracker */}
        <div className="space-y-6">
          <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
            <p className="text-xs text-[#64748B] uppercase font-semibold mb-2">Month-To-Date Actual</p>
            <p className="text-3xl font-bold text-[#10B981]">{formatCurrency(monthNetActual)}</p>
            <p className="text-xs text-[#94A3B8] mt-2">{monthClosings.length} closing(s) logged this month</p>
          </div>

          {/* Monthly Total */}
          <div className="bg-gradient-to-br from-[#D4A043]/20 to-[#92400E]/20 border border-[#D4A043]/50 rounded-lg p-6">
            <p className="text-xs text-[#D4A043] uppercase font-semibold mb-2">Projected Monthly Net</p>
            <p className="text-4xl font-bold text-[#D4A043] mb-2">{formatCurrency(totalMonthly)}</p>
            <div className={`inline-block px-3 py-1 rounded text-xs font-semibold ${
              totalMonthly >= targets.netMonthlyTarget
                ? 'bg-green/20 text-green'
                : 'bg-amber/20 text-amber'
            }`}>
              {totalMonthly >= targets.netMonthlyTarget ? '✓ Goal Hit' : `$${formatCurrency(targets.netMonthlyTarget - totalMonthly).slice(1)} to goal`}
            </div>
          </div>

          {/* Target Breakdown */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
            <p className="text-xs text-[#64748B] uppercase font-semibold mb-4">To Hit {formatCurrency(targets.netMonthlyTarget)}/mo</p>
            <div className="space-y-3">
              {[
                { label: 'Own leads needed', count: Math.ceil(targets.netMonthlyTarget / calculateCommission(salePrice, commissionPct, 'own', commissionOptions).net) },
                { label: 'Company leads needed', count: Math.ceil(targets.netMonthlyTarget / calculateCommission(salePrice, commissionPct, 'company', commissionOptions).net) },
                { label: 'Zillow deals needed', count: Math.ceil(targets.netMonthlyTarget / calculateCommission(salePrice, commissionPct, 'zillow', commissionOptions).net) },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs text-[#94A3B8]">{item.label}</span>
                  <span className="font-bold text-[#D4A043]">{item.count}</span>
                </div>
              ))}
              <div className="border-t border-[#1E293B] pt-3 mt-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#94A3B8]">Remaining to Goal (actual month)</span>
                  <span className="font-bold text-[#D4A043]">{closingsNeededForGoal} closes</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-[#94A3B8]">Remaining to Survival Minimum</span>
                  <span className="font-bold text-amber">{closingsNeededForSurvival} closes</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-[#64748B] mt-4 italic">Key insight: 1 own lead = {Math.round(calculateCommission(salePrice, commissionPct, 'own', commissionOptions).net / calculateCommission(salePrice, commissionPct, 'zillow', commissionOptions).net)}+ Zillow deals</p>
          </div>
        </div>
      </div>
    </div>
  );
}
