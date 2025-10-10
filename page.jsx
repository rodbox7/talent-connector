'use client';
import React, { useState, useEffect } from 'react';
import { supabase as sb } from '../lib/supabaseClient';

// --------------------------------------------
// 1) Fallback users so you can always log in
//    (stored in localStorage on this device)
// --------------------------------------------
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
  // --------------------------------------------
  // Users state (local mirror) + persistence
  // --------------------------------------------
  const [users, setUsers] = useState(() => {
    try {
      const s = localStorage.getItem('tc_users');
      if (s) return JSON.parse(s);
    } catch {}
    return seedUsers;
  });
  useEffect(() => {
    try {
      localStorage.setItem('tc_users', JSON.stringify(users));
    } catch {}
  }, [users]);

  // --------------------------------------------
  // Login state
  // --------------------------------------------
  const [mode, setMode] = useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [user, setUser] = useState(null);

  // Supabase-first login; fallback to local seed
  async function login() {
    try {
      setErr('');
      const e = String(email).trim().toLowerCase();
      if (!e.includes('@')) { setErr('Enter a valid email'); return; }

      // 1) Try Supabase Auth
      const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
        email: e,
        password: pwd
      });

      if (!authErr && auth?.user) {
        // Fetch profile by auth user id
        const { data: prof, error: profErr } = await sb
          .from('profiles')
          .select('id,email,role,org,account_manager_email')
          .eq('id', auth.user.id)
          .single();

        if (profErr || !prof) {
          setErr('Login succeeded, but profile not found. Ask Admin to create/repair your profile.');
          return;
        }

        // Enforce role matches selected tab
        if (mode !== prof.role) {
          setErr(`This account is a ${prof.role}. Switch to the ${prof.role} tab or ask Admin to change the role.`);
          return;
        }

        setUser({
          id: prof.id,
          email: prof.email,
          role: prof.role,
          org: prof.org || '',
          amEmail: prof.account_manager_email || ''
        });
        return;
      }

      // 2) Fallback: local seed users (so you're never locked out)
      const u = localFindUser(users, e, pwd);
      if (!u) { setErr('Invalid credentials'); return; }
      if (u.role !== mode) {
        setErr(`This account is a ${u.role}. Switch to the ${u.role} tab.`);
        return;
      }
      setUser({ id: u.id, email: u.email, role: u.role, org: u.org || '' });
    } catch (ex) {
      console.error(ex);
      setErr('Login error. Please try again.');
    }
  }

  async function logout() {
    try { await sb.auth.signOut(); } catch {}
    setUser(null);
    setEmail('');
    setPwd('');
    setMode('recruiter');
  }

  // --------------------------------------------
  // Admin: invite (creates user in Supabase via API)
  // --------------------------------------------
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole]   = useState('client');
  const [newOrg, setNewOrg]     = useState('');
  const [newAm, setNewAm]       = useState('');
  const [newPw, setNewPw]       = useState('');
  const [inviteErr, setInviteErr] = useState('');
  const [inviteFlash, setInviteFlash] = useState('');

  async function adminInvite() {
    try {
      setInviteErr('');
      setInviteFlash('');
      if (!newEmail || !newPw) {
        setInviteErr('Email and temp password are required.');
        return;
      }
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail.trim(),
          role: newRole,
          org: newOrg.trim(),
          amEmail: newAm.trim(),
          password: newPw
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setInviteErr(data?.error || 'Invite failed');
        return;
      }
      // Add to local mirror so you see it immediately
      setUsers(prev => [
        ...prev,
        {
          id: data.id || ('u' + Math.random().toString(36).slice(2,8)),
          email: newEmail.trim(),
          role: newRole,
          org: newOrg.trim(),
          amEmail: newAm.trim(),
          password: newPw,
          loginCount: 0, lastLoginAt: null, totalMinutes: 0, sessions: []
        }
      ]);
      setInviteFlash(`Added ${newEmail} as ${newRole}`);
      setNewEmail(''); setNewRole('client'); setNewOrg(''); setNewAm(''); setNewPw('');
    } catch (e) {
      setInviteErr('Server error inviting user');
      console.error(e);
    }
  }

  // --------------------------------------------
  // Simple UI
  // --------------------------------------------
  const pageStyle = { minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'system-ui, Arial' };
  const card = { width: '100%', maxWidth: 380, background: '#0b0b0b', border: '1px solid '#1f2937', borderRadius: 12, padding: 16 };

  // Admin screen (full)
  if (user && user.role === 'admin') {
    const bigCard = { width:'100%', maxWidth: 1000, background:'#0b0b0b', border:'1px solid #1f2937', borderRadius:12, padding:16 };
    const label = { display:'block', fontSize:12, marginTop:6, color:'#9ca3af' };
    const input = { width:'100%', padding:8, background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:8 };

    return (
      <div style={{ minHeight:'100vh', background:'#0a0a0a', color:'#e5e5e5', fontFamily:'system-ui, Arial', display:'flex', justifyContent:'center', padding:24 }}>
        <div style={{ width:'100%', maxWidth:1000 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontWeight:700 }}>Admin (signed in as {user.email})</div>
            <button onClick={logout} style={{ fontSize:12 }}>Log out</button>
          </div>

          {/* Invite new user (writes to Supabase via /api/admin/invite) */}
          <div style={bigCard}>
            <div style={{ fontWeight:700, marginBottom:8 }}>Users (invitation-only)</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:8 }}>
              <label style={label}>
                Email
                <input style={input} type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="name@company.com" />
              </label>
              <label style={label}>
                Role
                <select style={input} value={newRole} onChange={e=>setNewRole(e.target.value)}>
                  <option value="client">Client</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label style={label}>
                Organization (optional)
                <input style={input} value={newOrg} onChange={e=>setNewOrg(e.target.value)} placeholder="Firm / Dept" />
              </label>
              <label style={label}>
                Sales contact (clients)
                <input style={input} type="email" value={newAm} onChange={e=>setNewAm(e.target.value)} placeholder="sales@youragency.com" />
              </label>
              <label style={label}>
                Temp password
                <input style={input} type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="set a password" />
              </label>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
              <button onClick={adminInvite} style={{ fontSize:12, padding:'6px 10px', border:'1px solid #1f2937', borderRadius:8 }}>Add user</button>
              <div style={{ fontSize:12 }}>
                {inviteErr ? <span style={{ color:'#f87171' }}>{inviteErr}</span> : <span style={{ color:'#93e2b7' }}>{inviteFlash}</span>}
              </div>
            </div>
          </div>

          {/* Directory (local mirror so you see changes instantly) */}
          <div style={{ ...bigCard, marginTop:12 }}>
            <div style={{ fontWeight:700, marginBottom:8 }}>Directory (local mirror)</div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ textAlign:'left', color:'#9ca3af' }}>
                    <th style={{ padding:'6px 8px', borderBottom:'1px solid #1f2937' }}>Email</th>
                    <th style={{ padding:'6px 8px', borderBottom:'1px solid #1f2937' }}>Role</th>
                    <th style={{ padding:'6px 8px', borderBottom:'1px solid #1f2937' }}>Org</th>
                    <th style={{ padding:'6px 8px', borderBottom:'1px solid #1f2937' }}>Sales contact</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ padding:'6px 8px', borderBottom:'1px solid #1f2937' }}>{u.email}</td>
                      <td style={{ padding:'6px 8px', borderBottom:'1px solid #1f2937' }}>{u.role}</td>
                      <td style={{ padding:'6px 8px', borderBottom:'1px solid #1f2937' }}>{u.org || '—'}</td>
                      <td style={{ padding:'6px 8px', borderBottom:'1px solid #1f2937' }}>{u.amEmail || '—'}</td>
                    </tr>
                  ))}
                  {users.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding:'10px 8px', color:'#9ca3af' }}>No users yet.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Recruiter / Client placeholders (kept minimal)
  if (user && (user.role === 'recruiter' || user.role === 'client')) {
    return (
      <div style={{ ...pageStyle, alignItems: 'start' }}>
        <div style={{ ...card, marginTop: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>{user.role === 'recruiter' ? 'Recruiter' : 'Client'} (signed in as {user.email})</div>
            <button onClick={logout} style={{ fontSize: 12 }}>Log out</button>
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
            Placeholder screen. We’ll reattach your full UI after Admin is done.
          </div>
        </div>
      </div>
    );
  }

  // Login screen
  return (
    <div style={pageStyle}>
      <div style={{ width: '100%', maxWidth: 380, background: '#0b0b0b', border: '1px solid #1f2937', borderRadius: 12, padding: 16 }}>
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
