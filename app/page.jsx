
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const APP_NAME = 'Talent Connector';

function parseCSV(str) {
  return String(str || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function formatDate(iso) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '-';
  }
}

export default function Page() {
  const [mode, setMode] = useState('recruiter');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [user, setUser] = useState(null);
  const [cands, setCands] = useState([]);
  const [loading, setLoading] = useState(false);

  async function login() {
    try {
      setErr('');
      const e = String(email).trim().toLowerCase();
      if (!e.includes('@')) {
        setErr('Enter a valid email');
        return;
      }

      const { data: signIn, error: signErr } = await supabase.auth.signInWithPassword({
        email: e,
        password: pwd,
      });
      if (signErr || !signIn?.user) {
        setErr('Invalid credentials');
        return;
      }

      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id,email,role,org')
        .eq('id', signIn.user.id)
        .single();

      if (profErr || !prof) {
        setErr('Login succeeded, but profile is missing. Ask Admin to create your profile.');
        return;
      }

      if (prof.role !== mode) {
        setErr(`This account is a ${prof.role}. Switch to the ${prof.role} tab.`);
        return;
      }

      setUser(prof);
    } catch (ex) {
      console.error(ex);
      setErr('Login error. Please try again.');
    }
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
    } catch {}
    setUser(null);
    setEmail('');
    setPwd('');
    setMode('recruiter');
    setCands([]);
  }

  async function loadCandidates() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('v_candidates')
        .select('id,name,city,state,years,salary,contract,hourly,notes,roles,practice_areas,created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        return;
      }
      setCands(data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && (user.role === 'recruiter' || user.role === 'client')) {
      loadCandidates();
    }
  }, [user]);

  async function addCandidate(form) {
    if (!form.name.trim()) return;

    const { data: cand, error: insErr } = await supabase
      .from('candidates')
      .insert({
        name: form.name.trim(),
        years: Number(form.years) || 0,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        salary: Number(form.salary) || 0,
        contract: !!form.contract,
        hourly: form.contract ? Number(form.hourly) || 0 : 0,
        notes: form.notes || '',
      })
      .select('id')
      .single();

    if (insErr || !cand?.id) {
      console.error(insErr);
      alert('Error adding candidate.');
      return;
    }

    const candidate_id = cand.id;

    const roles = parseCSV(form.rolesCSV);
    if (roles.length) {
      await supabase.from('candidate_roles').insert(roles.map(r => ({ candidate_id, role: r })));
    }

    const areas = parseCSV(form.lawCSV);
    if (areas.length) {
      await supabase.from('candidate_practice_areas').insert(areas.map(p => ({ candidate_id, practice_area: p })));
    }

    await loadCandidates();
  }

  const shell = (children) => (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'system-ui', padding: 16 }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>{APP_NAME}</div>
          {user ? <button onClick={logout}>Log out</button> : null}
        </div>
        {children}
      </div>
    </div>
  );

  if (user && user.role === 'admin') {
    return shell(<div>Admin view: Signed in as {user.email}</div>);
  }

  if (user && user.role === 'recruiter') {
    return shell(
      <>
        <RecruiterAddForm onAdd={addCandidate} />
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700 }}>Candidates {loading ? '(loading...)' : ''}</div>
          {cands.length === 0 ? <div>No candidates yet.</div> : cands.map(c => <CandidateCard key={c.id} c={c} />)}
        </div>
      </>
    );
  }

  if (user && user.role === 'client') {
    return shell(
      <div>
        <div style={{ fontWeight: 700 }}>Candidates {loading ? '(loading...)' : ''}</div>
        {cands.length === 0 ? <div>No candidates available.</div> : cands.map(c => <CandidateCard key={c.id} c={c} />)}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0a0a0a', color: '#e5e5e5' }}>
      <div style={{ maxWidth: 380, background: '#0b0b0b', padding: 16, borderRadius: 12 }}>
        <div style={{ textAlign: 'center', fontWeight: 700 }}>{APP_NAME}</div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>Invitation-only access</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <button onClick={() => setMode('recruiter')} style={{ background: mode === 'recruiter' ? '#1f2937' : '#111827' }}>Recruiter</button>
          <button onClick={() => setMode('client')} style={{ background: mode === 'client' ? '#1f2937' : '#111827' }}>Client</button>
          <button onClick={() => setMode('admin')} style={{ background: mode === 'admin' ? '#1f2937' : '#111827' }}>Admin</button>
        </div>
        <div style={{ marginTop: 12 }}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={{ width: '100%', marginBottom: 8 }} />
          <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Password" style={{ width: '100%', marginBottom: 8 }} />
          <button onClick={login} style={{ width: '100%', background: '#4f46e5', color: 'white' }}>Log in</button>
          {err && <div style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>{err}</div>}
        </div>
      </div>
    </div>
  );
}

function RecruiterAddForm({ onAdd }) {
  const [form, setForm] = useState({ name: '', rolesCSV: '', lawCSV: '', years: '', city: '', state: '', salary: '', contract: false, hourly: '', notes: '' });
  const [msg, setMsg] = useState('');

  async function submit() {
    setMsg('');
    if (!form.name.trim()) {
      setMsg('Name is required.');
      return;
    }
    await onAdd(form);
    setForm({ name: '', rolesCSV: '', lawCSV: '', years: '', city: '', state: '', salary: '', contract: false, hourly: '', notes: '' });
    setMsg('Candidate added.');
  }

  return (
    <div style={{ background: '#0b0b0b', padding: 12, borderRadius: 12 }}>
      <div style={{ fontWeight: 700 }}>Add candidate</div>
      <input placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      <input placeholder="Titles (CSV)" value={form.rolesCSV} onChange={e => setForm({ ...form, rolesCSV: e.target.value })} />
      <input placeholder="Type of Law (CSV)" value={form.lawCSV} onChange={e => setForm({ ...form, lawCSV: e.target.value })} />
      <input placeholder="Years" value={form.years} onChange={e => setForm({ ...form, years: e.target.value })} />
      <input placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
      <input placeholder="State" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
      <input placeholder="Salary" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} />
      <label>
        <input type="checkbox" checked={form.contract} onChange={e => setForm({ ...form, contract: e.target.checked })} /> Contract?
      </label>
      {form.contract && <input placeholder="Hourly rate" value={form.hourly} onChange={e => setForm({ ...form, hourly: e.target.value })} />}
      <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}></textarea>
      <button onClick={submit}>Add candidate</button>
      {msg && <div>{msg}</div>}
    </div>
  );
}

function CandidateCard({ c }) {
  return (
    <div style={{ background: '#0b0b0b', padding: 12, borderRadius: 12, marginBottom: 8 }}>
      <div style={{ fontWeight: 600 }}>{c.name}</div>
      <div>{(c.city || '') + (c.state ? ', ' + c.state : '')} — {c.years ?? 0} yrs</div>
      <div>Date added: {formatDate(c.created_at)}</div>
      <div>Roles: {c.roles?.join(', ')}</div>
      <div>Type of law: {c.practice_areas?.join(', ')}</div>
      <div>Salary: {c.salary ? `$${c.salary}` : '-'}</div>
      <div>Contract: {c.contract ? `Yes${c.hourly ? `, $${c.hourly}/hr` : ''}` : 'No'}</div>
      {c.notes && <div style={{ marginTop: 8 }}>{c.notes}</div>}
    </div>
  );
}
