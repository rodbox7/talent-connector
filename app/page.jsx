'use client';
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const APP_NAME = 'Talent Connector - Powered by Beacon Hill Legal';

export default function Page() {
  const [mode, setMode] = useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [user, setUser] = useState(null); // { id, email, role, org? }

  async function login() {
    try {
      setErr('');
      const e = String(email).trim().toLowerCase();
      if (!e.includes('@')) {
        setErr('Enter a valid email');
        return;
      }

      // Supabase Auth
      const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: e,
        password: pwd,
      });
      if (authErr || !auth?.user) {
        setErr('Invalid credentials');
        return;
      }

      // Get profile to confirm role
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id, email, role, org')
        .eq('id', auth.user.id)
        .single();

      if (profErr || !prof) {
        setErr('Login succeeded, but profile not found.');
        return;
      }
      if (prof.role !== mode) {
        setErr(`This account is a ${prof.role}. Switch to the ${prof.role} tab.`);
        return;
      }

      setUser({ id: prof.id, email: prof.email, role: prof.role, org: prof.org || '' });
    } catch (ex) {
      console.error(ex);
      setErr('Login error. Please try again.');
    }
  }

  async function logout() {
    try { await supabase.auth.signOut(); } catch {}
    setUser(null);
    setEmail('');
    setPwd('');
    setMode('recruiter');
  }

  // ---------- Shared styles ----------
  const page = {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',           // <- centers the card vertically & horizontally
    padding: 16,
    color: '#e5e5e5',
    fontFamily: 'system-ui, Arial',
  };
  const card = {
    width: '100%',
    maxWidth: 520,                  // tighter card
    background: 'rgba(12,12,12,.78)',
    border: '1px solid rgba(255,255,255,.08)',
    borderRadius: 14,
    padding: 18,
    boxShadow: '0 8px 24px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.06)',
    backdropFilter: 'blur(2px)',
  };
  const subtle = { fontSize: 12, color: '#9ca3af' };
  const input = {
    width: '100%',
    padding: 10,
    background: 'rgba(17,17,27,.9)',
    color: '#e5e5e5',
    border: '1px solid #1f2937',
    borderRadius: 8,
  };
  const btn = {
    padding: '10px 16px',
    background: '#4f46e5',
    color: '#fff',
    borderRadius: 8,
    border: 'none',
  };
  const tab = (active) => ({
    padding: 10,
    borderRadius: 8,
    background: active ? '#1f2937' : 'rgba(17,17,27,.85)',
    color: '#e5e5e5',
    border: '1px solid #1f2937',
  });

  // ---------- Logged-in placeholders (unchanged) ----------
  if (user) {
    return (
      <div style={page}>
        <div style={{ ...card, maxWidth: 980 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700 }}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)} workspace
            </div>
            <button onClick={logout} style={tab(true)}>Log out</button>
          </div>

          {user.role === 'admin' && (
            <div style={{ marginTop: 10, ...subtle }}>
              Minimal placeholder for <b>admin</b>. (Recruiters have full add/list UI next.)
            </div>
          )}

          {user.role === 'recruiter' && (
            <div style={{ marginTop: 10, ...subtle }}>
              Minimal placeholder for <b>recruiter</b>. (We’ll add your add/list UI next.)
            </div>
          )}

          {user.role === 'client' && (
            <div style={{ marginTop: 10, ...subtle }}>
              Minimal placeholder for <b>client</b>. (Read-only search UI coming next.)
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- Login (centered) ----------
  return (
    <div style={page}>
      <div style={card}>
        <div style={{ textAlign: 'center', fontWeight: 700 }}>{APP_NAME}</div>
        <div style={{ textAlign: 'center', ...subtle, marginBottom: 10 }}>Invitation-only access</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <button style={tab(mode === 'recruiter')} onClick={() => setMode('recruiter')}>Recruiter</button>
          <button style={tab(mode === 'client')} onClick={() => setMode('client')}>Client</button>
          <button style={tab(mode === 'admin')} onClick={() => setMode('admin')}>Admin</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: '#9ca3af' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            style={input}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: '#9ca3af' }}>Password</label>
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="your password"
            style={input}
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <button onClick={login} style={{ ...btn, width: '100%' }}>Log in</button>
        </div>

        {err ? <div style={{ color: '#f87171', fontSize: 12, marginTop: 10 }}>{err}</div> : null}
      </div>
    </div>
  );
}
