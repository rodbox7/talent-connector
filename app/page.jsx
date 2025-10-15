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
const logLine = (ok) => ({
  fontSize: 12,
  padding: '6px 8px',
  borderRadius: 8,
  background: ok ? 'rgba(16,185,129,.08)' : 'rgba(248,113,113,.08)',
  color: ok ? '#93e2b7' : '#fca5a5',
  border: `1px solid ${ok ? 'rgba(16,185,129,.25)' : 'rgba(248,113,113,.25)'}`,
});

export default function Page() {
  const [mode, setMode] = useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');

  const [steps, setSteps] = useState([]);
  const [who, setWho] = useState(null);

  function push(ok, msg, extra) {
    setSteps((s) => [...s, { ok, msg, extra }]);
  }

  async function login() {
    setSteps([]);
    setWho(null);

    try {
      const e = email.trim().toLowerCase();
      push(true, `Starting login for ${e} as ${mode}`);

      // 0) quick env sanity
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      push(!!url && hasKey, `Env check: url ok=${!!url}, key ok=${hasKey}`);

      // 1) Auth
      const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
        email: e,
        password: pwd,
      });
      if (authErr) {
        push(false, `Auth error: ${authErr.message}`);
        return;
      }
      push(true, `Auth OK: user ${auth.user.id}`);

      // 2) Profile by id
      let { data: prof, error: pErr } = await sb
        .from('profiles')
        .select('id,email,role,org,account_manager_email')
        .eq('id', auth.user.id)
        .single();

      if (pErr || !prof) {
        push(false, `Profile by id failed, trying by email: ${pErr?.message || 'not found'}`);

        // 3) Fallback profile by email
        const { data: byEmail, error: e2 } = await sb
          .from('profiles')
          .select('id,email,role,org,account_manager_email')
          .eq('email', e)
          .single();

        if (e2 || !byEmail) {
          push(false, `Profile by email failed: ${e2?.message || 'not found'}`);
          push(false, 'Fix: create profile row for this email or align profiles.id to auth.users.id');
          return;
        }
        prof = byEmail;
        push(true, `Profile by email OK: id ${prof.id}`);
      } else {
        push(true, `Profile by id OK: id ${prof.id}`);
      }

      if (mode !== prof.role) {
        push(false, `Role mismatch. Account role is ${prof.role}. Use the ${prof.role} tab.`);
        return;
      }

      setWho(prof);
      push(true, 'Login complete ✔');
    } catch (err) {
      push(false, `Unexpected error: ${String(err?.message || err)}`);
      console.error(err);
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

          {steps.length ? (
            <div style={{ display: 'grid', gap: 6 }}>
              {steps.map((s, i) => (
                <div key={i} style={logLine(s.ok)}>
                  {s.ok ? '✔ ' : '✖ '} {s.msg}
                  {s.extra ? <pre style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{s.extra}</pre> : null}
                </div>
              ))}
            </div>
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
