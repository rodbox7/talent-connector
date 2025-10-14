'use client';
import React, { useState } from 'react';

// Tell Next: do NOT try to statically export this page.
// This avoids the "Export encountered errors on /page" build error.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  const [mode, setMode] = useState<'recruiter' | 'client' | 'admin'>('recruiter');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');

  function login() {
    setErr('');
    if (!email.includes('@')) { setErr('Enter a valid email'); return; }
    // Placeholder login for now — focus of this change is to fix the build/export step
    setErr('Background fix is live; we’ll wire Supabase login next.');
  }

  // Keep the page background transparent so the NYC image from layout shows
  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: 16
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'rgba(11,11,11,0.92)',
        border: '1px solid rgba(31,41,55,0.75)',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 10px 30px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.04)',
        color: '#e5e5e5',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
      }}>
        <div style={{ textAlign: 'center', fontWeight: 700 }}>Talent Connector</div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
          Invitation-only access
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <button onClick={() => setMode('recruiter')}
            style={{ padding: 8, background: mode==='recruiter' ? 'rgba(31,41,55,.9)' : 'rgba(17,24,39,.85)', color: '#e5e5e5', borderRadius: 8, border: '1px solid rgba(31,41,55,.9)' }}>
            Recruiter
          </button>
          <button onClick={() => setMode('client')}
            style={{ padding: 8, background: mode==='client' ? 'rgba(31,41,55,.9)' : 'rgba(17,24,39,.85)', color: '#e5e5e5', borderRadius: 8, border: '1px solid rgba(31,41,55,.9)' }}>
            Client
          </button>
          <button onClick={() => setMode('admin')}
            style={{ padding: 8, background: mode==='admin' ? 'rgba(31,41,55,.9)' : 'rgba(17,24,39,.85)', color: '#e5e5e5', borderRadius: 8, border: '1px solid rgba(31,41,55,.9)' }}>
            Admin
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
            <div style={{ color: '#9ca3af', marginBottom: 4 }}>Email</div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@company.com"
              style={{
                width: '100%', padding: 10,
                background: 'rgba(17,24,39,.9)', color: '#e5e5e5',
                border: '1px solid rgba(31,41,55,.9)', borderRadius: 8
              }}
            />
          </label>
          <label style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
            <div style={{ color: '#9ca3af', marginBottom: 4 }}>Password</div>
            <input
              type="password"
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              placeholder="your password"
              style={{
                width: '100%', padding: 10,
                background: 'rgba(17,24,39,.9)', color: '#e5e5e5',
                border: '1px solid rgba(31,41,55,.9)', borderRadius: 8
              }}
            />
          </label>
          <button onClick={login} style={{
            width: '100%', padding: 12, marginTop: 10,
            background: '#4f46e5', color: 'white', borderRadius: 8,
            boxShadow: '0 6px 18px rgba(79,70,229,.35)'
          }}>
            Log in
          </button>
          {err ? <div style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>{err}</div> : null}
        </div>
      </div>
    </div>
  );
}
