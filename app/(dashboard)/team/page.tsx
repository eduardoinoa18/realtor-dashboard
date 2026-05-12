'use client';

import { Users, Phone, Mail, Globe, Plus, Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Professional {
  id: string;
  name: string;
  company: string;
  role: string;
  phone: string;
  email: string;
  website: string;
  is_preferred: boolean;
  is_mlo_partner: boolean;
}

const roleTabs = ['All', 'Lenders', 'Inspectors', 'Attorneys', 'Stagers', 'Contractors'];

export default function TeamPage() {
  const [role, setRole] = useState('All');
  const [professionals] = useState<Professional[]>([]);

  const defaultProfessionals = [
    {
      id: '1',
      name: 'TBD',
      company: 'Newfed Mortgage',
      role: 'lender',
      phone: '',
      email: '',
      website: '',
      is_preferred: true,
      is_mlo_partner: true,
    },
  ];

  const display = professionals.length === 0 ? defaultProfessionals : professionals;

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9]">Professionals Directory</h1>
          <button className="px-4 py-2 bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] font-semibold rounded flex items-center gap-2">
            <Plus size={18} />
            Add Pro
          </button>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {roleTabs.map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`px-4 py-2 rounded transition-colors text-sm font-medium ${
              role === r
                ? 'bg-[#D4A043] text-[#07090F]'
                : 'bg-[#111827] text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {display.map((pro) => (
          <div
            key={pro.id}
            className="bg-[#111827] border border-[#1E293B] rounded-lg p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-[#F1F5F9] text-lg">{pro.name}</h3>
                <p className="text-sm text-[#94A3B8]">{pro.company}</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-[#64748B] hover:text-[#F1F5F9] transition-colors" title="Edit professional" aria-label="Edit professional">
                  <Edit2 size={18} />
                </button>
                <button className="p-2 text-[#64748B] hover:text-red transition-colors" title="Delete professional" aria-label="Delete professional">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2 py-1 bg-[#1E293B] text-[#94A3B8] rounded text-xs font-medium">
                {pro.role}
              </span>
              {pro.is_preferred && (
                <span className="px-2 py-1 bg-[#D4A043]/20 text-[#D4A043] rounded text-xs font-medium">
                  ⭐ Preferred
                </span>
              )}
              {pro.is_mlo_partner && (
                <span className="px-2 py-1 bg-green/20 text-green rounded text-xs font-medium">
                  MLO Partner
                </span>
              )}
            </div>

            {/* Contact Info */}
            <div className="space-y-2 text-sm">
              {pro.phone && (
                <a
                  href={`tel:${pro.phone}`}
                  className="flex items-center gap-2 text-[#94A3B8] hover:text-[#D4A043] transition-colors"
                >
                  <Phone size={16} />
                  {pro.phone}
                </a>
              )}
              {pro.email && (
                <a
                  href={`mailto:${pro.email}`}
                  className="flex items-center gap-2 text-[#94A3B8] hover:text-[#D4A043] transition-colors"
                >
                  <Mail size={16} />
                  {pro.email}
                </a>
              )}
              {pro.website && (
                <a
                  href={pro.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[#94A3B8] hover:text-[#D4A043] transition-colors"
                >
                  <Globe size={16} />
                  Website
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {professionals.length === 0 && (
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-12 text-center">
          <Users size={48} className="text-[#374151] mx-auto mb-4" />
          <p className="text-[#94A3B8] mb-4">No professionals added yet. Start building your team.</p>
          <button className="px-6 py-2 bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] font-semibold rounded">
            Add Your First Pro
          </button>
        </div>
      )}
    </div>
  );
}
