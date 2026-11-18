'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
export function AuthForm() {
  const router = useRouter();
  const [register, setRegister] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <section className="mx-auto max-w-md rounded-2xl border bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold">
        {register ? 'Create your learning account' : 'Sign in to Welspun LMS'}
      </h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError('');
          const form = new FormData(event.currentTarget);
          try {
            await api(register ? '/auth/register' : '/auth/login', {
              email: String(form.get('email')),
              password: String(form.get('password')),
              ...(register ? { name: String(form.get('name')) } : {}),
            });
            router.push('/dashboard');
            router.refresh();
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Sign in failed');
          } finally {
            setBusy(false);
          }
        }}
      >
        {register && (
          <label className="block">
            Full name
            <input
              required
              name="name"
              autoComplete="name"
              minLength={2}
              maxLength={100}
              className="mt-1 block w-full rounded border p-2"
            />
          </label>
        )}
        <label className="block">
          Email
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            className="mt-1 block w-full rounded border p-2"
          />
        </label>
        <label className="block">
          Password
          <input
            required
            type="password"
            aria-label="Password"
            aria-describedby="password-hint"
            name="password"
            minLength={12}
            maxLength={128}
            autoComplete={register ? 'new-password' : 'current-password'}
            className="mt-1 block w-full rounded border p-2"
          />
          <span id="password-hint" className="text-xs text-slate-500">
            At least 12 characters
          </span>
        </label>
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
        <button
          disabled={busy}
          className="w-full rounded bg-blue-950 px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
        </button>
      </form>
      <button
        className="mt-5 underline"
        onClick={() => {
          setRegister(!register);
          setError('');
        }}
      >
        {register ? 'Already have an account? Sign in' : 'Create an account'}
      </button>
    </section>
  );
}
