'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase as sb } from '../../lib/supabaseClient';

const box = { border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: '#fff' };
const input = { border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', width: '100%' };
const btn = { padding: '10px 14px', borderRadius: 10, border: '1px solid #111', background: '#111', color: '#fff', cursor: 'pointer' };
const btnGhost = { padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' };
const row = { display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.4fr 1fr', gap: 12, alignItems: 'center' };

export default function AdminPage() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('client');
  const [org, setOrg] = useState('');
  const [password, setPassword] = useState('Temp#12345');
  const [amEmail, setAmEmail] = useState('');
  const [err, setErr] = useState('');
  const [flash, setFlash] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);

  async function fetchUsers() {
    setLoading(true);
    setErr('');
    const { data, error } = await sb
      .from('profiles')
      .select('id, email, role, org, account_manager_email')
      .order('email', { ascending: true });
    if (error) setErr(error.message);
    else setUsers(data || []);
    setLoading(false);
  }
  useEffect(() => { fetchUsers(); }, []);

  async function handleAddUser(e) {
    e.preventDefault();
    setErr(''); setFlash('');
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, role, org, password, amEmail })
    });
    const j = await res.json();
    if (!res.ok) { setErr(j.error || 'Failed to add user'); return; }
    setFlash(`Added ${email} as ${role}`);
    setEmail(''); setOrg(''); setPassword(''); setAmEmail(''); setRole('client');
    await fetchUsers();
  }

  async function updateUser(u, patch) {
    setErr(''); setFlash('');
    const { error } = await sb.from('profiles').update(patch).eq('id', u.id);
    if (error) { setErr(error.message); return; }
    setFlash('Saved changes'); await fetchUsers();
  }

  async function removeUser(u) {
    if (!confirm(`Delete user ${u.email}? This removes their profile (not Auth account).`)) return;
    const { error } = await sb.from('profiles').delete().eq('id', u.id);
    if (error) { setErr(error.message); return; }
    setFlash('Deleted profile'); await fetchUsers();
  }

  const header = useMemo(() => (
    <div style={{ ...row, fontWeight: 600, color: '#111' }}>
      <div>Email</div><div>Role</div><div>Org</div><div>Sales contact (clients)</div><div>Actions</div>
    </div>
  ), []);

  return (
    <div style={{ maxWidth: 1100, margin: '40px auto', padding: '0 16px', fontFamily: 'Inter, system-ui, Arial' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Admin · Users (invitation only)</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Create users with one click. This creates a Supabase Auth account and a matching profile with role & optional salesperson email.
      </p>

      <form onSubmit={handleAddUser} style={{ ...box, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.4fr 1fr', gap: 12 }}>
          <input style={input} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <select style={input} value={role} onChange={e => setRole(e.target.value)}>
            <option value="client">Client</option>
            <option value="recruiter">Recruiter</option>
            <option value="admin">Admin</option>
          </select>
          <input style={input} placeholder="Organization (optional)" value={org} onChange={e => setOrg(e.target.value)} />
          <input style={input} placeholder="Sales contact email (clients)" value={amEmail} onChange={e => setAmEmail(e.target.value)} />
          <input style={input} placeholder="Temp password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <button type="submit" style={btn}>Add user</button>
          <button type="button" style={btnGhost} onClick={fetchUsers}>Refresh</button>
        </div>
        {err && <div style={{ color: '#dc2626', marginTop: 10 }}>{err}</div>}
        {flash && <div style={{ color: '#16a34a', marginTop: 10 }}>{flash}</div>}
      </form>

      <div style={{ ...box }}>
        <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700 }}>Registered users</div>
          {loading && <div style={{ color: '#6b7280' }}>Loading…</div>}
        </div>
        {header}
        <div style={{ height: 8 }} />
        {(users || []).map(u => (
          <div key={u.id} style={row}>
            <div>{u.email}</div>
            <div>
              <select value={u.role} onChange={(e) => updateUser(u, { role: e.target.value })} style={input}>
                <option value="client">Client</option>
                <option value="recruiter">Recruiter</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <input style={input} defaultValue={u.org || ''} onBlur={(e) => (e.target.value !== (u.org || '')) && updateUser(u, { org: e.target.value || null })} placeholder="Org" />
            </div>
            <div>
              <input style={input} defaultValue={u.account_manager_email || ''} onBlur={(e) => (e.target.value !== (u.account_manager_email || '')) && updateUser(u, { account_manager_email: e.target.value || null })} placeholder="Sales contact (clients)" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnGhost} onClick={() => updateUser(u, { role: u.role, org: u.org || null, account_manager_email: u.account_manager_email || null })}>Save</button>
              <button style={{ ...btnGhost, borderColor: '#ef4444', color: '#ef4444' }} onClick={() => removeUser(u)}>Delete</button>
            </div>
          </div>
        ))}
        {(!users || users.length === 0) && !loading && <div style={{ color: '#6b7280', padding: '16px 0' }}>No users yet.</div>}
      </div>
    </div>
  );
}
