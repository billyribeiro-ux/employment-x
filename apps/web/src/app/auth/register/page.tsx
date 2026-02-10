'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { getApiClient, setApiToken } from '@/lib/api';
import { useAppDispatch } from '@/lib/hooks';
import { setTokens } from '@/store/slices/auth';

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'candidate' as 'candidate' | 'employer' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const client = getApiClient();
      const result = await client.auth.register({
        email: form.email,
        password: form.password,
        first_name: form.firstName,
        last_name: form.lastName,
        role: form.role,
      });
      dispatch(setTokens({ accessToken: result.access_token, refreshToken: result.refresh_token }));
      setApiToken(result.access_token);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">Get started with EmploymentX</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-sm font-medium">First name</label>
              <input id="firstName" type="text" required value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" autoComplete="given-name" />
            </div>
            <div className="space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium">Last name</label>
              <input id="lastName" type="text" required value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" autoComplete="family-name" />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="reg-email" className="text-sm font-medium">Email</label>
            <input id="reg-email" type="email" required value={form.email} onChange={(e) => updateField('email', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="you@example.com" autoComplete="email" />
          </div>
          <div className="space-y-2">
            <label htmlFor="reg-password" className="text-sm font-medium">Password</label>
            <input id="reg-password" type="password" required minLength={12} value={form.password} onChange={(e) => updateField('password', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Min 12 characters" autoComplete="new-password" />
          </div>
          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium">I am a</label>
            <select id="role" value={form.role} onChange={(e) => updateField('role', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="candidate">Job Seeker</option>
              <option value="employer">Employer</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-primary underline-offset-4 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
