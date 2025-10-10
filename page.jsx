'use client';
import React, { useState, useEffect } from 'react';

// 1) Fallback users so you can always log in (stored in localStorage)
const seedUsers = [
  { id: 'u1', email: 'admin@youragency.com', role: 'admin', org: 'Your Agency', password: 'admin', loginCount: 0, lastLoginAt: null, totalMinutes: 0, sessions: [] },
  // optional convenience accounts (can remove later)
  { id: 'u2', email: 'recruiter@youragency.com', role: 'recruiter', org: 'Your Agency', password: 'recruit', loginCount: 0, lastLoginAt: null, totalMinutes: 0, sessions: [] },
  { id: 'u3', email: 'client@samplefirm.com', role: 'client', org: 'Sample Firm', password: 'client', loginCount: 0, lastLoginAt: null, totalMinutes: 0, sessions: [] },
];

// helper: local fallback auth
function localFindUser(users, email, pwd) {
  const e = String(email || '').toLowerCase();
  return (
    users.find(
      u =>
        String(u.email || '').toLowerCase() === e &&
        String(u.password || '') === String(pwd || '')
    ) || null
  );
}

export default function Page() {
  // 2) Users state: load from localStorage, fall back to seedUsers
  const [users, setUsers] = useState(() => {
    try {
      const s = localStorage.getItem('tc_users');
      if (s) return JSON.parse(s);
    } catch {}
    return seedUsers;
  });

  // 3) Persist any changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tc_users', JSON.stringify(users));
    } catch {}
  }, [users]);

  // --- New: basic login state ---
  const [mode, setMode] = useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [user, setUser] = useState(null);

  function login() {
    setErr('');
    const e = String(email).trim().toLowerCase();
    if (!e.includes('@')) { setErr('Enter a valid email'); return; }

    // local fallback auth
    const u = localFindUser(users, e, pwd);
    if (!u) { setErr('Invalid credentials'); return; }
    if (u.role !== mode) {
      setErr(`This account is a ${u.role}. Switch to the ${u.role} tab.`);
      return;
    }
    setUser({ id: u.id, email: u.email, role: u.role, org: u.org || '' });
  }

  function logout() {
    setUser(null);
    setEmail('');
    setPwd('');
    setMode('recruiter');
  }

  // --- UI ---
  const pageStyle = { minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'system-ui, Arial' };
  const card = { width: '100%', maxWidth: 380, background: '#0b0b0b', border: '1px solid #1f2937', borderRadius: 12, padding: 16 };

  // If logged in as admin, show a simple placeholder (we’ll add full admin next)
  if (user && user.role === 'admin') {
    return (
      <div style={{ ...pageStyle, alignItems: 'start' }}>
        <div style={{ ...card, marginTop: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>Admin (signed in as {user.email})</div>
            <button onClick={logout} style={{ fontSize: 12 }}>Log out</button>
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
            Admin area placeholder. Next step: we’ll add the full Admin panel (add/delete users, set passwords, salesperson email).
          </div>
        </div>
      </div>
    );
  }

  // If logged in as recruiter/client, show a placeholder too (we’ll wire later)
  if (user && (user.role === 'recruiter' || user.role === 'client')) {
    return (
      <div style={{ ...pageStyle, alignItems: 'start' }}>
        <div style={{ ...card, marginTop: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>{user.role === 'recruiter' ? 'Recruiter' : 'Client'} (signed in as {user.email})</div>
            <button onClick={logout} style={{ fontSize: 12 }}>Log out</button>
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
            Placeholder screen. We’ll reattach your full UI after Admin is back.
          </div>
        </div>
      </div>
    );
  }

  // Login screen
  return (
    <div style={pageStyle}>
      <div style={card}>
        <div style={{ textAlign: 'center', fontWeight: 700 }}>Talent Connector</div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>Invitation-only access</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <button onClick={() => setMode('recruiter')} style={{ padding: 8, background: mode==='recruiter' ? '#1f2937' : '#111827', color: '#e5e5e5', borderRadius: 8 }}>Recruiter</button>
          <button onClick={() => setMode('client')} style={{ padding: 8, background: mode==='client' ? '#1f2937' : '#111827', color: '#e5e5e5', borderRadius: 8 }}>Client</button>
          <button onClick={() => setMode('admin')} style={{ padding: 8, background: mode==='admin' ? '#1f2937' : '#111827', color: '#e5e5e5', borderRadius: 8 }}>Admin</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
            <div style={{ color: '#9ca3af', marginBottom: 4 }}>Email</div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@company.com"
              style={{ width: '100%', padding: 8, background: '#111827', color: '#e5e5e5', border: '1px solid #1f2937', borderRadius: 8 }}
            />
          </label>
          <label style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
            <div style={{ color: '#9ca3af', marginBottom: 4 }}>Password</div>
            <input
              type="password"
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              placeholder="your password"
              style={{ width: '100%', padding: 8, background: '#111827', color: '#e5e5e5', border: '1px solid #1f2937', borderRadius: 8 }}
            />
          </label>
          <button onClick={login} style={{ width: '100%', padding: 10, marginTop: 8, background: '#4f46e5', color: 'white', borderRadius: 8 }}>
            Log in
          </button>
          {err ? <div style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>{err}</div> : null}
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
            Use the seed admin to get started: <strong>admin@youragency.com / admin</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
