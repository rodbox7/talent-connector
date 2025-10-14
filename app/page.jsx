'use client';
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Page() {
  const [mode, setMode] = useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [me, setMe] = useState(null); // { id, email, role, org }

  async function login() {
    try {
      setErr('');
      const e = String(email).trim().toLowerCase();
      if (!e.includes('@')) {
        setErr('Enter a valid email');
        return;
      }

      // 1) Supabase Auth
      const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: e,
        password: pwd,
      });

      if (authErr || !auth?.user) {
        setErr('Invalid credentials or user not found.');
        return;
      }

      // 2) Get role from profiles
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id,email,role,org')
        .eq('id', auth.user.id)
        .single();

      if (profErr || !prof) {
        setErr('Signed in, but no profile row found. Ask Admin to create/repair your profile.');
        return;
      }

      // 3) Enforce tab matches stored role
      if (prof.role !== mode) {
        setErr(`This account is a ${prof.role}. Switch to the ${prof.role} tab.`);
        return;
      }

      setMe({ id: prof.id, email: prof.email, role: prof.role, org: prof.org || '' });
    } catch (ex) {
      console.error(ex);
      setErr('Login error. Please try again.');
    }
  }

  async function logout() {
    try { await supabase.auth.signOut(); } catch {}
    setMe(null);
    setEmail('');
    setPwd('');
    setMode('recruiter');
  }

  // ---- Logged-in placeholders (one per role) ----
  if (me) {
    return (
      <div style={wrap}>
        <div style={cardWide}>
          <div style={rowBetween}>
            <div style={{ fontWeight: 700 }}>
              {me.role === 'admin' ? 'Admin' : me.role === 'recruiter' ? 'Recruiter' : 'Client'} workspace
            </div>
            <button onClick={logout} style={btnSm}>Log out</button>
          </div>

          {me.role === 'admin' && (
            <div style={muted}>
              Minimal placeholder for <b>admin</b>. (We’ll bring back the full admin panel next.)
            </div>
          )}
          {me.role === 'recruiter' && (
            <div style={muted}>
              Minimal placeholder for <b>recruiter</b>. (We’ll add your add/list UI next.)
            </div>
          )}
          {me.role === 'client' && (
            <div style={muted}>
              Minimal placeholder for <b>client</b>. (Read-only search UI coming next.)
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- Login screen ----
  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ textAlign: 'center', fontWeight: 700, marginBottom: 6 }}>
          Talent Connector
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>
          Invitation-only access
        </div>

        <div style={tabs}>
          <button onClick={() => setMode('recruiter')} style={tab(mode === 'recruiter')}>Recruiter</button>
          <button onClick={() => setMode('client')} style={tab(mode === 'client')}>Client</button>
          <button onClick={() => setMode('admin')} style={tab(mode === 'admin')}>Admin</button>
        </div>

        <label style={label}>
          <div style={labelText}>Email</div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@company.com"
            style={input}
          />
        </label>

        <label style={label}>
          <div style={labelText}>Password</div>
          <input
            type="password"
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            placeholder="your password"
            style={input}
          />
        </label>

        <button onClick={login} style={btnPrimary}>Log in</button>

        {err ? <div style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>{err}</div> : null}
      </div>
    </div>
  );
}

/* ---------------- styles ---------------- */

const wrap = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: 16,
};

const card = {
  width: '100%',
  maxWidth: 380,
  background: 'rgba(0,0,0,0.65)',
  border: '1px solid #1f2937',
  borderRadius: 12,
  padding: 16,
  backdropFilter: 'blur(4px)',
};

const cardWide = {
  width: '100%',
  maxWidth: 900,
  background: 'rgba(0,0,0,0.65)',
  border: '1px solid #1f2937',
  borderRadius: 12,
  padding: 16,
  backdropFilter: 'blur(4px)',
};

const rowBetween = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
};

const tabs = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: 8,
  marginBottom: 10,
};

const tab = (active) => ({
  padding: 8,
  background: active ? '#1f2937' : '#111827',
  color: '#e5e5e5',
  borderRadius: 8,
  border: '1px solid #1f2937',
});

const label = { display: 'block', fontSize: 12, marginTop: 6 };
const labelText = { color: '#9ca3af', marginBottom: 4 };
const input = {
  width: '100%',
  padding: 8,
  background: '#111827',
  color: '#e5e5e5',
  border: '1px solid #1f2937',
  borderRadius: 8,
};

const btnPrimary = {
  width: '100%',
  padding: 10,
  marginTop: 10,
  background: '#4f46e5',
  color: 'white',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
};

const btnSm = {
  fontSize: 12,
  padding: '6px 10px',
  borderRadius: 8,
  background: '#1f2937',
  color: '#e5e5e5',
  border: '1px solid #334155',
  cursor: 'pointer',
};

const muted = { fontSize: 12, color: '#9ca3af', marginTop: 6 };
