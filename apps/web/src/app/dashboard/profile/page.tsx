'use client';

import { useState } from 'react';
import { User, Building2, MapPin, Briefcase, DollarSign, Save, Loader2 } from 'lucide-react';

type ProfileTab = 'personal' | 'company';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">Manage your personal and company information</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
        {(['personal', 'company'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'personal' ? 'Personal Info' : 'Company Info'}
          </button>
        ))}
      </div>

      {activeTab === 'personal' ? <PersonalInfoForm /> : <CompanyInfoForm />}
    </div>
  );
}

function PersonalInfoForm() {
  return (
    <div className="space-y-6">
      <FormSection title="Basic Information" icon={<User className="h-5 w-5" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="First Name" placeholder="Jane" />
          <FormField label="Last Name" placeholder="Doe" />
          <FormField label="Email" placeholder="jane@example.com" type="email" className="sm:col-span-2" />
          <FormField label="Phone" placeholder="+1 (555) 000-0000" />
          <FormField label="Headline" placeholder="Senior Software Engineer" />
        </div>
      </FormSection>

      <FormSection title="Location" icon={<MapPin className="h-5 w-5" />}>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="City" placeholder="San Francisco" />
          <FormField label="State" placeholder="CA" />
          <FormField label="Country" placeholder="United States" />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" className="rounded border-input" />
          <span>Open to remote work only</span>
        </label>
      </FormSection>

      <FormSection title="Experience" icon={<Briefcase className="h-5 w-5" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Years of Experience" placeholder="5" type="number" />
          <FormField label="Available From" type="date" />
        </div>
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium">Skills</label>
          <input
            type="text"
            placeholder="React, TypeScript, Node.js (comma-separated)"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </FormSection>

      <FormSection title="Compensation" icon={<DollarSign className="h-5 w-5" />}>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Minimum Salary" placeholder="120000" type="number" />
          <FormField label="Maximum Salary" placeholder="180000" type="number" />
          <div>
            <label className="mb-1.5 block text-sm font-medium">Currency</label>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm">
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
            </select>
          </div>
        </div>
      </FormSection>

      <FormSection title="Summary">
        <textarea
          rows={4}
          placeholder="Tell employers about yourself..."
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </FormSection>
    </div>
  );
}

function CompanyInfoForm() {
  return (
    <div className="space-y-6">
      <FormSection title="Company Details" icon={<Building2 className="h-5 w-5" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Company Name" placeholder="Acme Inc." />
          <FormField label="Industry" placeholder="Technology" />
          <FormField label="Company Size" placeholder="50-200" />
          <FormField label="Founded Year" placeholder="2020" type="number" />
          <FormField label="Website" placeholder="https://acme.com" className="sm:col-span-2" />
          <FormField label="LinkedIn" placeholder="https://linkedin.com/company/acme" className="sm:col-span-2" />
        </div>
      </FormSection>

      <FormSection title="Location" icon={<MapPin className="h-5 w-5" />}>
        <FormField label="Headquarters" placeholder="San Francisco, CA" />
      </FormSection>

      <FormSection title="About">
        <textarea
          rows={4}
          placeholder="Describe your company culture and mission..."
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </FormSection>

      <FormSection title="Tech Stack">
        <input
          type="text"
          placeholder="React, Node.js, PostgreSQL (comma-separated)"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </FormSection>

      <FormSection title="Benefits">
        <input
          type="text"
          placeholder="Health insurance, 401k, Remote work (comma-separated)"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </FormSection>
    </div>
  );
}

function FormSection({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function FormField({ label, placeholder, type = 'text', className = '' }: { label: string; placeholder?: string; type?: string; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}
