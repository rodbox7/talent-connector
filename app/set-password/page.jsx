'use client';

import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const LOGIN_PATH = '/'; // root = your existing login screen

export default function SetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const emailFromUrl = searchParams.get('email') || '';

  const [email, setEmail] = React.useState(emailFromUrl);
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const em = (email || '').trim().toLowerCase();

    if (!em) {
      setError('Email is required.');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setBusy(true);
      const res = await fetch('/api/admin/manual-set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em, password }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error || 'Failed to set password.');
      }

      setSuccess('Password set successfully. Redirecting you to login…');

      // Redirect to main login (root)
      setTimeout(() => {
        router.push(LOGIN_PATH);
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to set password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#020617',
        color: 'white',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'rgba(15,23,42,0.95)',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 18px 45px rgba(0,0,0,0.45)',
          border: '1px solid rgba(148,163,184,0.35)',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}>
          Set your password
        </div>
        <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>
          This link was sent to you by Beacon Hill Legal to activate your
          Talent Connector account.
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                marginBottom: 4,
                color: '#E5E7EB',
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #374151',
                background: '#020617',
                color: 'white',
                fontSize: 14,
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                marginBottom: 4,
                color: '#E5E7EB',
              }}
            >
              New password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #374151',
                background: '#020617',
                color: 'white',
                fontSize: 14,
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                marginBottom: 4,
                color: '#E5E7EB',
              }}
            >
              Confirm password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #374151',
                background: '#020617',
                color: 'white',
                fontSize: 14,
              }}
            />
          </div>

          {error && (
            <div style={{ color: '#F97373', fontSize: 12 }}>{error}</div>
          )}
          {success && (
            <div style={{ color: '#6EE7B7', fontSize: 12 }}>{success}</div>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{
              marginTop: 8,
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: 'none',
              background: busy ? '#1F2937' : '#2563EB',
              color: 'white',
              fontWeight: 700,
              fontSize: 14,
              cursor: busy ? 'default' : 'pointer',
            }}
          >
            {busy ? 'Saving…' : 'Set password'}
          </button>

          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: '#9CA3AF',
              textAlign: 'center',
            }}
          >
            Already set a password?{' '}
            <a
              href={LOGIN_PATH}
              style={{ color: '#93C5FD', textDecoration: 'none' }}
            >
              Go to login
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
