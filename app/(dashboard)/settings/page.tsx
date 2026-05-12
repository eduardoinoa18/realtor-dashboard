'use client';

import { Settings, Key, Download } from 'lucide-react';
import { useState } from 'react';

export default function SettingsPage() {
  const [fubKey, setFubKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [theme, setTheme] = useState('dark');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    // Save to database
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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

        {/* Preferences */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
          <h3 className="font-semibold text-[#F1F5F9] mb-4">Preferences</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
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
            <button className="w-full px-4 py-2 bg-red/20 hover:bg-red/30 text-red rounded font-medium text-sm transition-colors">
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
