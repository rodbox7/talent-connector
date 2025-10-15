'use client';

import React from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Login + role-routing page (pure JS)
 * - NYC background
 * - Centered login card
 * - Role tabs (Recruiter / Client / Admin)
 * - Supabase Auth sign-in + fetch profile from public.profiles
 * - Enforces selected tab matches profile.role
 * - Minimal shells for each workspace + Logout
 */

export default function Page() {
  const [mode, setMode] = React.useState('recruiter'); // 'recruiter' | 'client' | 'admin'
  const [email, setEmail] = React.useState('');
  const [pwd, setPwd] = React.useState('');
  const [err, setErr] = React.useState('');
  const [user, setUser] = React.useState(null); // { id, email, role, org, amEmail }

  // Try to restore an existing session
  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user;
      if (!sessionUser) return;

      const { data: prof } = await supabase
        .from('profiles')
        .select('id,email,role,org,account_manager_email')
        .eq('id', sessionUser.id)
        .single();

      if (prof && prof.id) {
        setUser({
          id: prof.id,
          email: prof.email,
          role: String(prof.role),
          org: prof.org ?? null,
          amEmail: prof.account_manager_email ?? null,
        });
      }
    })();
  }, []);

  async function login() {
    try {
      setErr('');
      const e = String(email || '').trim().toLowerCase();
      if (!e.includes('@')) {
        setErr('Enter a valid email.');
        return;
      }
      if (!pwd) {
        setErr('Enter your password.');
        return;
      }

      // 1) Supabase password sign-in
      const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: e,
        password: pwd,
      });
      if (authErr) {
        setErr(authErr.message || 'Login failed.');
        return;
      }
      if (!auth?.user?.id) {
        setErr('Login failed (no user).');
        return;
      }

      // 2) Fetch profile row by auth user id
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id,email,role,org,account_manager_email')
        .eq('id', auth.user.id)
        .single();

      if (profErr || !prof?.id) {
        setErr(
          'Login OK, but your profile was not found. Ask an admin to create/repair your profile.'
        );
        return;
      }

      // 3) Enforce role tab
      const profileRole = String(prof.role);
      if (profileRole !== mode) {
        setErr(
          `This account is a ${profileRole}. Switch to the "${profileRole}" tab or ask admin to change your role.`
        );
        return;
      }

      // 4) Success → stash user → render workspace
      setUser({
        id: prof.id,
        email: prof.email,
        role: profileRole,
        org: prof.org ?? null,
        amEmail: prof.account_manager_email ?? null,
      });
    } catch (e) {
      setErr(e?.message || 'Unexpected error logging in.');
    }
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setEmail('');
      setPwd('');
      setMode('recruiter');
      setErr('');
    }
  }

  // ---------- Shared styles ----------
  const wrap = {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    color: '#e5e5e5',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    position: 'relative',
    overflow: 'hidden',
  };

  const bg = {
    position: 'fixed',
    inset: 0,
    backgroundImage:
      'url(https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'grayscale(15%) brightness(45%)',
    zIndex: 0,
  };

  const glass = {
    width: '100%',
    maxWidth: 540,
    background: 'rgba(14, 17, 24, 0.82)',
    border: '1px solid rgba(148,163,184,0.16)',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
    zIndex: 1,
    backdropFilter: 'blur(3px)',
  };

  const pill = (active) => ({
    padding: '10px 16px',
    borderRadius: 10,
    border: '1px solid rgba(148,163,184,0.16)',
    background: active ? 'rgba(55,65,81,0.7)' : 'rgba(17,24,39,0.7)',
    color: '#e5e5e5',
    fontWeight: 600,
    cursor: 'pointer',
  });

  const input = {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    border: '1px solid rgba(148,163,184,0.16)',
    background: 'rgba(17,24,39,0.85)',
    color: '#e5e5e5',
    outline: 'none',
  };

  const btn = {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    border: '1px solid rgba(99,102,241,0.6)',
    background: 'linear-gradient(90deg, #6366f1, #4f46e5)',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  };

  // ---------- Role workspaces ----------
  if (user && user.role === 'recruiter') {
    return (
      <div style={wrap}>
        <div style={bg} />
        <Shell title="Recruiter workspace" onLogout={logout}>
          <p style={{ opacity: 0.8, marginTop: 6 }}>
            Minimal placeholder for <b>recruiter</b>. (Your add/list UI goes here.)
          </p>
        </Shell>
      </div>
    );
  }

  if (user && user.role === 'client') {
    return (
      <div style={wrap}>
        <div style={bg} />
        <Shell title="Client workspace" onLogout={logout}>
          <p style={{ opacity: 0.8, marginTop: 6 }}>
            Minimal placeholder for <b>client</b>. (Read-only search UI goes here.)
          </p>
        </Shell>
      </div>
    );
  }

  if (user && user.role === 'admin') {
    return (
      <div style={wrap}>
        <div style={bg} />
        <Shell title="Admin workspace" onLogout={logout}>
          <p style={{ opacity: 0.8, marginTop: 6 }}>
            Minimal placeholder for <b>admin</b>. (Users/invite UI goes here.)
          </p>
        </Shell>
      </div>
    );
  }

  // ---------- Login screen ----------
  return (
    <div style={wrap}>
      <div style={bg} />
      <div style={glass}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Talent Connector</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>Invitation-only access</div>

        {/* Role tabs */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button style={pill(mode === 'recruiter')} onClick={() => setMode('recruiter')}>
            Recruiter
          </button>
          <button style={pill(mode === 'client')} onClick={() => setMode('client')}>
            Client
          </button>
          <button style={pill(mode === 'admin')} onClick={() => setMode('admin')}>
            Admin
          </button>
        </div>

        <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
          Email
        </label>
        <input
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ ...input, marginBottom: 12 }}
          autoComplete="email"
        />

        <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
          Password
        </label>
        <input
          type="password"
          placeholder="your password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          style={{ ...input, marginBottom: 14 }}
          autoComplete="current-password"
        />

        <button style={btn} onClick={login}>
          Log in
        </button>

        {err ? (
          <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 10, lineHeight: 1.4 }}>{err}</div>
        ) : (
          <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 10 }}>
            Tip: make sure your email has a row in <code>public.profiles</code> with the correct role.
          </div>
        )}
      </div>
    </div>
  );
}

/** Simple “glass” shell for each role workspace */
function Shell({ title, onLogout, children }) {
  return (
    <div
      style={{
        width: 'min(1100px, 92vw)',
        background: 'rgba(14,17,24,0.82)',
        border: '1px solid rgba(148,163,184,0.16)',
        borderRadius: 16,
        padding: 18,
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(3px)',
        zIndex: 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 20 }}>{title}</div>
        <button
          onClick={onLogout}
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            border: '1px solid rgba(148,163,184,0.16)',
            background: 'rgba(31,41,55,0.7)',
            color: '#e5e5e5',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Log out
        </button>
      </div>
      {children}
    </div>
  );
}
