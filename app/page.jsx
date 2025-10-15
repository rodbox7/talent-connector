'use client';
import React, { useState } from 'react';
import { supabase as sb } from '../lib/supabaseClient';

const NYC =
  'https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg';

const shell = {
  minHeight: '100vh',
  width: '100%',
  backgroundImage: `url("${NYC}")`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
  display: 'grid',
  placeItems: 'center',
  padding: 16,
};
const card = {
  width: '100%',
  maxWidth: 520,
  background: 'rgba(0,0,0,.78)',
  color: '#e5e7eb',
  border: '1px solid rgba(255,255,255,.1)',
  borderRadius: 14,
  padding: 18,
  boxShadow: '0 8px 28px rgba(0,0,0,.45)',
};
const h1 = { fontSize: 20, fontWeight: 800, marginBottom: 4 };
const sub = { fontSize: 12, color: '#9ca3af', marginBottom: 12 };
const label = { fontSize: 12, color: '#9ca3af', marginBottom: 4 };
const input = {
  width: '100%',
  padding: '10px 12px',
  background: 'rgba(17,24,39,.9)',
  border: '1px solid rgba(255,255,255,.08)',
  color: '#e5e7eb',
  borderRadius: 10,
  outline: 'none',
};
const tabs = { display: 'grid', gridTemplateColumns: 'repeat(3,120px)', gap: 10, marginTop: 2 };
const tab = (active) => ({
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,.08)',
  background: active ? 'rgba(31,41,55,.9)' : 'rgba(17,24,39,.85)',
  color: '#e5e7eb',
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'center',
});
const btn = {
  padding: '10px 14px',
  borderRadius: 10,
  background: '#4f46e5',
  color: 'white',
  border: '1px solid rgba(255,255,255,.1)',
  fontWeight: 700,
  cursor: 'pointer',
};

export default function Page() {
  const [mode, setMode] = useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [msg, setMsg] = useState('');
  const [who, setWho] = useState(null);

  async function login() {
    try {
      setMsg('');
      setWho(null);

      const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: pwd,
      });
      if (authErr) {
        setMsg(authErr.message || 'Invalid credentials');
        return;
      }

      // 1) try by auth id
      let { data: prof, error: pErr } = await sb
        .from('profiles')
        .select('id,email,role,org,account_manager_email')
        .eq('id', auth.user.id)
        .single();

      // 2) fallback by email (in case id mismatch)
      if (pErr || !prof) {
        const { data: byEmail, error: e2 } = await sb
          .from('profiles')
          .select('id,email,role,org,account_manager_email')
          .eq('email', email.trim().toLowerCase())
          .single();

        if (e2 || !byEmail) {
          setMsg('Login ok, but profile not found. Ask Admin to add your profile.');
          return;
        }
        prof = byEmail;
      }

      if (mode !== prof.role) {
        setMsg(`This account is a ${prof.role}. Switch to the ${prof.role} tab.`);
        return;
      }

      setWho(prof);
      setMsg('Logged in ✔');
    } catch (e) {
      console.error(e);
      setMsg('Login error.');
    }
  }

  return (
    <div style={shell}>
      <div style={card}>
        <div style={h1}>Talent Connector</div>
        <div style={sub}>Invitation-only access</div>

        <div style={tabs}>
          <button style={tab(mode === 'recruiter')} onClick={() => setMode('recruiter')}>
            Recruiter
          </button>
          <button style={tab(mode === 'client')} onClick={() => setMode('client')}>
            Client
          </button>
          <button style={tab(mode === 'admin')} onClick={() => setMode('admin')}>
            Admin
          </button>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          <div>
            <div style={label}>Email</div>
            <input
              style={input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
            />
          </div>
          <div>
            <div style={label}>Password</div>
            <input
              style={input}
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Your password"
            />
          </div>
          <div>
            <button style={btn} onClick={login}>
              Log in
            </button>
          </div>

          {msg ? (
            <div style={{ fontSize: 12, color: msg.includes('✔') ? '#93e2b7' : '#f87171' }}>{msg}</div>
          ) : null}

          {who ? (
            <pre
              style={{
                marginTop: 6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 12,
                background: 'rgba(17,24,39,.9)',
                border: '1px solid rgba(255,255,255,.08)',
                borderRadius: 10,
                padding: 10,
              }}
            >
{JSON.stringify(who, null, 2)}
            </pre>
          ) : null}
        </div>
      </div>
    </div>
  );
}
