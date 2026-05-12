'use client';

import { Settings, Key, Download, Link as LinkIcon, Trash2, Plus } from 'lucide-react';
import { useState } from 'react';
import { useAppSettings } from '@/store/appSettings';

export default function SettingsPage() {
  const [fubKey, setFubKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [theme, setTheme] = useState('dark');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [saved, setSaved] = useState(false);

  const quickLinks = useAppSettings((state) => state.quickLinks);
  const addQuickLink = useAppSettings((state) => state.addQuickLink);
  const removeQuickLink = useAppSettings((state) => state.removeQuickLink);
  const commissions = useAppSettings((state) => state.commissions);
  const targets = useAppSettings((state) => state.targets);
  const updateCommission = useAppSettings((state) => state.updateCommission);
  const updateTarget = useAppSettings((state) => state.updateTarget);

  const handleSave = async () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleAddQuickLink = () => {
    addQuickLink(newLinkLabel, newLinkUrl);
    setNewLinkLabel('');
    setNewLinkUrl('');
  };

  const handleResetLocalData = () => {
    localStorage.removeItem('realtor-hq-settings');
    window.location.reload();
  };

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings size={32} className="text-[#D4A043]" />
          <h1 className="text-3xl font-bold text-[#F1F5F9]">Settings</h1>
        </div>
      </div>

      <div className="space-y-6">
        {/* API Keys Section */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <h3 className="font-semibold text-[#F1F5F9] mb-4 flex items-center gap-2">
            <Key size={20} />
            API Keys
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Follow Boss API Key</label>
              <input
                type="password"
                value={fubKey}
                onChange={(e) => setFubKey(e.target.value)}
                placeholder="Paste your FUB API key here"
                className="w-full px-4 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#D4A043]"
              />
              <p className="text-xs text-[#64748B] mt-2">
                Get this from Follow Boss → Admin → API Keys
              </p>
            </div>

            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Claude API Key</label>
              <input
                type="password"
                value={claudeKey}
                onChange={(e) => setClaudeKey(e.target.value)}
                placeholder="Paste your Anthropic API key here"
                className="w-full px-4 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#D4A043]"
              />
              <p className="text-xs text-[#64748B] mt-2">
                Get this from console.anthropic.com → API Keys
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <h3 className="font-semibold text-[#F1F5F9] mb-4 flex items-center gap-2">
            <LinkIcon size={20} />
            Quick Links
          </h3>

          <div className="space-y-3 mb-4">
            {quickLinks.map((link) => (
              <div key={link.id} className="flex items-center gap-2 bg-[#0D1117] border border-[#374151] rounded px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#F1F5F9] truncate">{link.label}</p>
                  <p className="text-xs text-[#64748B] truncate">{link.url}</p>
                </div>
                <button
                  onClick={() => removeQuickLink(link.id)}
                  className="p-1 text-[#64748B] hover:text-red transition-colors"
                  title="Remove quick link"
                  aria-label="Remove quick link"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={newLinkLabel}
              onChange={(e) => setNewLinkLabel(e.target.value)}
              placeholder="Label (e.g., MLS)"
              className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9] placeholder-[#64748B]"
            />
            <input
              type="text"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="URL (e.g., mls.example.com)"
              className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9] placeholder-[#64748B]"
            />
          </div>
          <button
            onClick={handleAddQuickLink}
            className="mt-3 px-4 py-2 bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] rounded font-semibold text-sm flex items-center gap-2"
          >
            <Plus size={16} />
            Add Quick Link
          </button>
        </div>

        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <h3 className="font-semibold text-[#F1F5F9] mb-4">Financial Model</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Default Commission %</label>
              <input
                type="number"
                value={commissions.defaultCommissionPct * 100}
                onChange={(e) => updateCommission('defaultCommissionPct', Number(e.target.value) / 100)}
                title="Default commission percentage"
                aria-label="Default commission percentage"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Franchise Fee %</label>
              <input
                type="number"
                value={commissions.franchiseFeePct * 100}
                onChange={(e) => updateCommission('franchiseFeePct', Number(e.target.value) / 100)}
                title="Franchise fee percentage"
                aria-label="Franchise fee percentage"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Own Lead Agent Split %</label>
              <input
                type="number"
                value={commissions.ownAgentPct * 100}
                onChange={(e) => updateCommission('ownAgentPct', Number(e.target.value) / 100)}
                title="Own lead agent split percentage"
                aria-label="Own lead agent split percentage"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Company Lead Agent Split %</label>
              <input
                type="number"
                value={commissions.companyAgentPct * 100}
                onChange={(e) => updateCommission('companyAgentPct', Number(e.target.value) / 100)}
                title="Company lead agent split percentage"
                aria-label="Company lead agent split percentage"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Zillow Referral %</label>
              <input
                type="number"
                value={commissions.zillowReferralPct * 100}
                onChange={(e) => updateCommission('zillowReferralPct', Number(e.target.value) / 100)}
                title="Zillow referral percentage"
                aria-label="Zillow referral percentage"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Zillow Agent Split %</label>
              <input
                type="number"
                value={commissions.zillowAgentPct * 100}
                onChange={(e) => updateCommission('zillowAgentPct', Number(e.target.value) / 100)}
                title="Zillow agent split percentage"
                aria-label="Zillow agent split percentage"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Monthly Net Goal ($)</label>
              <input
                type="number"
                value={targets.netMonthlyTarget}
                onChange={(e) => updateTarget('netMonthlyTarget', Number(e.target.value))}
                title="Monthly net goal"
                aria-label="Monthly net goal"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Survival Minimum ($)</label>
              <input
                type="number"
                value={targets.survivalMinimum}
                onChange={(e) => updateTarget('survivalMinimum', Number(e.target.value))}
                title="Survival minimum"
                aria-label="Survival minimum"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Average Sale Price ($)</label>
              <input
                type="number"
                value={targets.avgSalePrice}
                onChange={(e) => updateTarget('avgSalePrice', Number(e.target.value))}
                title="Average sale price"
                aria-label="Average sale price"
                className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <h3 className="font-semibold text-[#F1F5F9] mb-4">Preferences</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                title="Theme"
                aria-label="Theme"
                className="w-full px-4 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
              >
                <option value="dark">Dark (Default)</option>
                <option value="light">Light</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded border-[#374151]"
              />
              <span className="text-sm text-[#94A3B8]">Enable notifications</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded border-[#374151]"
              />
              <span className="text-sm text-[#94A3B8]">Auto-sync FUB daily at 1pm</span>
            </label>
          </div>
        </div>

        {/* Profile Section */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <h3 className="font-semibold text-[#F1F5F9] mb-4">Profile</h3>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-[#64748B] uppercase mb-1">Name</p>
              <p className="text-[#F1F5F9]">Eduardo Inoa</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B] uppercase mb-1">Email</p>
              <p className="text-[#F1F5F9]">eduardoinoa18@gmail.com</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B] uppercase mb-1">Team</p>
              <p className="text-[#F1F5F9]">Century 21 NE – Fermin Group</p>
            </div>
          </div>
        </div>

        {/* Data Section */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <h3 className="font-semibold text-[#F1F5F9] mb-4 flex items-center gap-2">
            <Download size={20} />
            Data
          </h3>

          <div className="space-y-3">
            <button className="w-full px-4 py-2 bg-[#1E293B] hover:bg-[#374151] text-[#F1F5F9] rounded font-medium text-sm transition-colors">
              Export Data as JSON
            </button>
            <button
              onClick={handleResetLocalData}
              className="w-full px-4 py-2 bg-red/20 hover:bg-red/30 text-red rounded font-medium text-sm transition-colors"
            >
              Clear All Local Data
            </button>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full px-6 py-3 bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] font-semibold rounded transition-colors"
        >
          {saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
