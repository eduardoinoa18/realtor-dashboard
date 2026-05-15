'use client';

import { Users, Phone, Mail, Globe, Plus, Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useEduStorage } from '@/hooks/useEduStorage';

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
  const { state: professionals, setState: setProfessionals } = useEduStorage<Professional[]>('edu_team_professionals_v1', []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: '',
    company: '',
    role: 'lender',
    phone: '',
    email: '',
    website: '',
    is_preferred: false,
    is_mlo_partner: false,
  });

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

  const source = professionals.length === 0 ? defaultProfessionals : professionals;

  const display = source.filter((pro) => {
    if (role === 'All') return true;
    if (role === 'Lenders') return pro.role === 'lender';
    if (role === 'Inspectors') return pro.role === 'inspector';
    if (role === 'Attorneys') return pro.role === 'attorney';
    if (role === 'Stagers') return pro.role === 'stager';
    if (role === 'Contractors') return pro.role === 'contractor';
    return true;
  });

  const clearDraft = () => {
    setDraft({
      name: '',
      company: '',
      role: 'lender',
      phone: '',
      email: '',
      website: '',
      is_preferred: false,
      is_mlo_partner: false,
    });
  };

  const saveProfessional = () => {
    if (!draft.name.trim() || !draft.company.trim()) return;
    if (editingId) {
      setProfessionals((prev) => prev.map((pro) => (
        pro.id === editingId
          ? {
              ...pro,
              name: draft.name.trim(),
              company: draft.company.trim(),
              role: draft.role.trim(),
              phone: draft.phone.trim(),
              email: draft.email.trim(),
              website: draft.website.trim(),
              is_preferred: draft.is_preferred,
              is_mlo_partner: draft.is_mlo_partner,
            }
          : pro
      )));
      setEditingId(null);
    } else {
      setProfessionals((prev) => [
        {
          id: `${Date.now()}`,
          name: draft.name.trim(),
          company: draft.company.trim(),
          role: draft.role.trim(),
          phone: draft.phone.trim(),
          email: draft.email.trim(),
          website: draft.website.trim(),
          is_preferred: draft.is_preferred,
          is_mlo_partner: draft.is_mlo_partner,
        },
        ...prev,
      ]);
    }
    clearDraft();
  };

  const beginEdit = (pro: Professional) => {
    setEditingId(pro.id);
    setDraft({
      name: pro.name,
      company: pro.company,
      role: pro.role,
      phone: pro.phone || '',
      email: pro.email || '',
      website: pro.website || '',
      is_preferred: pro.is_preferred,
      is_mlo_partner: pro.is_mlo_partner,
    });
  };

  const deletePro = (id: string) => {
    setProfessionals((prev) => prev.filter((pro) => pro.id !== id));
    if (editingId === id) {
      setEditingId(null);
      clearDraft();
    }
  };

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9]">Professionals Directory</h1>
          <button onClick={saveProfessional} className="px-4 py-2 bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] font-semibold rounded flex items-center gap-2">
            <Plus size={18} />
            {editingId ? 'Save Pro' : 'Add Pro'}
          </button>
        </div>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} placeholder="Name" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
          <input value={draft.company} onChange={(e) => setDraft((prev) => ({ ...prev, company: e.target.value }))} placeholder="Company" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
          <input value={draft.role} onChange={(e) => setDraft((prev) => ({ ...prev, role: e.target.value }))} placeholder="Role" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
          <input value={draft.phone} onChange={(e) => setDraft((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Phone" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
          <input value={draft.email} onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))} placeholder="Email" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
          <input value={draft.website} onChange={(e) => setDraft((prev) => ({ ...prev, website: e.target.value }))} placeholder="Website" className="px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
        </div>
        <div className="flex items-center gap-4 mt-3 text-sm text-[#94A3B8]">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={draft.is_preferred} onChange={(e) => setDraft((prev) => ({ ...prev, is_preferred: e.target.checked }))} /> Preferred
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={draft.is_mlo_partner} onChange={(e) => setDraft((prev) => ({ ...prev, is_mlo_partner: e.target.checked }))} /> MLO Partner
          </label>
          {editingId && (
            <button onClick={() => { setEditingId(null); clearDraft(); }} className="px-3 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-[#F1F5F9] text-xs">Cancel Edit</button>
          )}
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
                <button onClick={() => beginEdit(pro)} className="p-2 text-[#64748B] hover:text-[#F1F5F9] transition-colors" title="Edit professional" aria-label="Edit professional">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => deletePro(pro.id)} className="p-2 text-[#64748B] hover:text-red transition-colors" title="Delete professional" aria-label="Delete professional">
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
          <button onClick={() => setProfessionals(defaultProfessionals)} className="px-6 py-2 bg-[#D4A043] hover:bg-[#92400E] text-[#07090F] font-semibold rounded">
            Add Your First Pro
          </button>
        </div>
      )}
    </div>
  );
}
