'use client';

import { useState, type ChangeEvent } from 'react';
import { UserCircle2, Car, BadgeInfo } from 'lucide-react';
import { BusinessProfile, useEduStorage } from '@/hooks/useEduStorage';

const defaultProfile: BusinessProfile = {
  fullName: 'Eduardo Inoa',
  brokerage: 'Century 21 NE',
  primaryEmail: '',
  primaryPhone: '',
  mileageRate: 0.67,
};

export default function ProfilePage() {
  const { state: profile, setState: setProfile } = useEduStorage<BusinessProfile>('edu_business_profile_v1', defaultProfile);

  const updateField = <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const applyPrimaryEmailCalendar = () => {
    if (!profile.primaryEmail) return;
    updateField('googleCalendarId', profile.primaryEmail.trim());
    if (!profile.googleCalendarLabel) {
      updateField('googleCalendarLabel', 'Primary Calendar');
    }
  };

  const updateCalendarInput = (raw: string) => {
    const normalized = normalizeCalendarInput(raw);
    if (normalized.mode === 'calendarId') {
      updateField('googleCalendarId', normalized.value);
      if (profile.googleCalendarIcsUrl) updateField('googleCalendarIcsUrl', '');
      return;
    }
    if (normalized.mode === 'icsUrl') {
      updateField('googleCalendarIcsUrl', normalized.value);
      return;
    }
    updateField('googleCalendarId', raw);
  };

  // Profile completeness calculation
  const requiredFields = ['fullName', 'brokerage', 'primaryEmail', 'primaryPhone', 'licenseNumber', 'licenseExpiryDate'];
  const filled = requiredFields.filter((f) => profile[f as keyof typeof profile]);
  const completeness = Math.round((filled.length / requiredFields.length) * 100);
  const completenessWidthClass = completeness >= 95 ? 'w-full' : completeness >= 80 ? 'w-4/5' : completeness >= 65 ? 'w-3/4' : completeness >= 50 ? 'w-2/3' : completeness >= 35 ? 'w-1/2' : completeness >= 20 ? 'w-1/3' : 'w-1/6';
  const [photo, setPhoto] = useState<string | null>(null);
  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-5xl space-y-6">
      {/* Profile completeness bar */}
      <div className="mb-4">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-[#222] flex items-center justify-center overflow-hidden border-2 border-[#D4A043]">
            {photo ? (
              <img src={photo} alt="Profile" className="object-cover w-full h-full" />
            ) : (
              <span className="text-[#D4A043] text-4xl font-bold">{profile.fullName?.[0] || 'E'}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="text-[#F1F5F9] font-semibold mb-1">Profile Completeness</div>
            <div className="w-full bg-[#222] rounded h-3 overflow-hidden">
              <div className={`bg-[#D4A043] h-3 rounded ${completenessWidthClass}`} />
            </div>
            <div className="text-xs text-[#94A3B8] mt-1">{completeness}% complete</div>
          </div>
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1">Upload Photo</label>
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="text-xs" title="Upload profile photo" />
          </div>
        </div>
      </div>
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9] mb-2">Profile</h1>
        <p className="text-[#94A3B8]">Manage your business identity, contact info, licenses, and vehicle setup.</p>
      </div>

      <section className="bg-[#111827] border border-[#1E293B] rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#F1F5F9] flex items-center gap-2"><UserCircle2 size={18} className="text-[#D4A043]" />Business Identity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full Name" value={profile.fullName} onChange={(value) => updateField('fullName', value)} />
          <Field label="Brokerage" value={profile.brokerage} onChange={(value) => updateField('brokerage', value)} />
          <Field label="Primary Email" value={profile.primaryEmail} onChange={(value) => updateField('primaryEmail', value)} />
          <Field label="Secondary Email" value={profile.secondaryEmail || ''} onChange={(value) => updateField('secondaryEmail', value)} />
          <Field label="Primary Phone" value={profile.primaryPhone} onChange={(value) => updateField('primaryPhone', value)} />
          <Field label="Business Phone" value={profile.businessPhone || ''} onChange={(value) => updateField('businessPhone', value)} />
          <Field label="Website" value={profile.website || ''} onChange={(value) => updateField('website', value)} />
          <Field label="Office Address" value={profile.officeAddress || ''} onChange={(value) => updateField('officeAddress', value)} />
        </div>
      </section>

      <section className="bg-[#111827] border border-[#1E293B] rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#F1F5F9] flex items-center gap-2"><BadgeInfo size={18} className="text-[#3B82F6]" />Licenses And IDs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="License Number" value={profile.licenseNumber || ''} onChange={(value) => updateField('licenseNumber', value)} />
          <Field label="License State" value={profile.licenseState || ''} onChange={(value) => updateField('licenseState', value)} />
          <Field label="License Expiry Date" value={profile.licenseExpiryDate || ''} onChange={(value) => updateField('licenseExpiryDate', value)} type="date" />
          <Field label="MLS ID" value={profile.mlsId || ''} onChange={(value) => updateField('mlsId', value)} />
          <Field label="Board Name" value={profile.boardName || ''} onChange={(value) => updateField('boardName', value)} />
          <Field label="MLS Renewal Date" value={profile.mlsExpiryDate || ''} onChange={(value) => updateField('mlsExpiryDate', value)} type="date" />
          <Field label="NMLS ID" value={profile.nmlsId || ''} onChange={(value) => updateField('nmlsId', value)} />
          <Field label="NMLS Renewal Date" value={profile.nmlsExpiryDate || ''} onChange={(value) => updateField('nmlsExpiryDate', value)} type="date" />
        </div>
      </section>

      <section className="bg-[#111827] border border-[#1E293B] rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#F1F5F9] flex items-center gap-2"><Car size={18} className="text-[#10B981]" />Vehicle And Mileage Setup</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Vehicle Year" value={profile.vehicleYear || ''} onChange={(value) => updateField('vehicleYear', value)} />
          <Field label="Vehicle Make" value={profile.vehicleMake || ''} onChange={(value) => updateField('vehicleMake', value)} />
          <Field label="Vehicle Model" value={profile.vehicleModel || ''} onChange={(value) => updateField('vehicleModel', value)} />
          <NumberField label="Mileage Rate ($/mile)" value={profile.mileageRate || 0} onChange={(value) => updateField('mileageRate', value)} />
        </div>
      </section>

      <section className="bg-[#111827] border border-[#1E293B] rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#F1F5F9] flex items-center gap-2"><BadgeInfo size={18} className="text-[#D4A043]" />Calendar Integration</h2>
        <p className="text-xs text-[#94A3B8]">Simplest setup: enter your Google Calendar ID (or email) and Today will sync it directly with FUB appointments.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Google Calendar Label" value={profile.googleCalendarLabel || ''} onChange={(value) => updateField('googleCalendarLabel', value)} />
          <Field
            label="Google Calendar ID or Email"
            value={profile.googleCalendarId || profile.googleCalendarIcsUrl || ''}
            onChange={updateCalendarInput}
            placeholder="example@gmail.com or your_calendar@group.calendar.google.com"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={applyPrimaryEmailCalendar}
            className="px-3 py-1.5 rounded bg-[#1E293B] hover:bg-[#334155] text-[#F1F5F9] text-sm"
          >
            Use Primary Email Calendar
          </button>
          {profile.googleCalendarIcsUrl && (
            <p className="text-[11px] text-[#94A3B8] self-center">Advanced ICS URL is saved as fallback.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-sm text-[#94A3B8] mb-2">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]"
      />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="block text-sm text-[#94A3B8] mb-2">{label}</span>
      <input type="number" step="0.01" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} className="w-full px-3 py-2 bg-[#0D1117] border border-[#374151] rounded text-[#F1F5F9]" />
    </label>
  );
}

function normalizeCalendarInput(raw: string): { mode: 'calendarId' | 'icsUrl' | 'unknown'; value: string } {
  const value = raw.trim();
  if (!value) return { mode: 'unknown', value: '' };

  try {
    const url = new URL(value);
    const pathname = decodeURIComponent(url.pathname);
    const icalMatch = pathname.match(/\/calendar\/ical\/([^/]+)\/public\/basic\.ics/i);
    if (icalMatch?.[1]) {
      return { mode: 'calendarId', value: icalMatch[1] };
    }
    if (/\.ics$/i.test(pathname)) {
      return { mode: 'icsUrl', value };
    }
  } catch {
    // Continue with non-URL parsing.
  }

  if (value.includes('@')) {
    return { mode: 'calendarId', value };
  }

  return { mode: 'unknown', value };
}