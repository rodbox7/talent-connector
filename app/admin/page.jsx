'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase as sb } from '../../lib/supabaseClient';

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
    setLoading(true); setErr('');
    const { data, error } = await sb
      .from('profiles')
      .select('id, email, role, org, account_manager_email')
      .order('email', { ascending: true });
    if (error) setErr(error.message); else setUsers(data || []);
    setLoading(false);
  }
  useEffect(() => { fetchUsers(); }, []);

  async function handleAddUser(e) {
    e.preventDefault(); setErr(''); setFlash('');
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, role, org, password, amEmail })
    });
    const j = await res.json();
    if (!res.ok) { setErr(j.error || 'Database error creating new user'); return; }
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
    if (!confirm(`Delete profile for ${u.email}?`)) return;
    const { error } = await sb.from('profiles').delete().eq('id', u.id);
    if (error) { setErr(error.message); return; }
    setFlash('Deleted'); await fetchUsers();
  }

  const header = useMemo(() => (
    <div className="table-row header grid-5">
      <div>Email</div><div>Role</div><div>Org</div><div>Sales contact (clients)</div><div>Actions</div>
    </div>
  ), []);

  return (
    <div className="container" style={{paddingTop:24}}>
      <div className="panel" style={{marginBottom:20}}>
        <h1 className="panel-title" style={{fontSize:24, marginBottom:8}}>Admin · Users (invitation only)</h1>
        <div className="panel-sub" style={{marginBottom:16}}>
          Create users with one click. This creates a Supabase Auth account and a matching profile with role & optional salesperson email.
        </div>

        <form onSubmit={handleAddUser} className="grid grid-5" style={{alignItems:'center'}}>
          <input className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <select className="input" value={role} onChange={e => setRole(e.target.value)}>
            <option value="client">Client</option>
            <option value="recruiter">Recruiter</option>
            <option value="admin">Admin</option>
          </select>
          <input className="input" placeholder="Organization (optional)" value={org} onChange={e => setOrg(e.target.value)} />
          <input className="input" placeholder="Sales contact email (clients)" value={amEmail} onChange={e => setAmEmail(e.target.value)} />
          <input className="input" placeholder="Temp password" value={password} onChange={e => setPassword(e.target.value)} required />
          <div style={{gridColumn:'1 / -1', display:'flex', gap:10, marginTop:12}}>
            <button type="submit" className="btn btn-primary">Add user</button>
            <button type="button" className="btn" onClick={fetchUsers}>Refresh</button>
            {loading && <span className="badge">Loading…</span>}
          </div>
          {(err || flash) && (
            <div style={{gridColumn:'1 / -1', marginTop:10}}>
              {err && <div style={{color:'#ef4444'}}>{err}</div>}
              {flash && <div style={{color:'#22c55e'}}>{flash}</div>}
            </div>
          )}
        </form>
      </div>

      <div className="panel">
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:8}}>
          <div className="panel-title" style={{fontSize:18}}>Registered users</div>
          <span className="badge">{users?.length || 0} total</span>
        </div>
        {header}
        {(users || []).map(u => (
          <div key={u.id} className="table-row grid-5">
            <div>{u.email}</div>
            <div>
              <select className="input" value={u.role} onChange={(e)=>updateUser(u,{role:e.target.value})}>
                <option value="client">Client</option>
                <option value="recruiter">Recruiter</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <input className="input" defaultValue={u.org || ''} onBlur={(e)=> (e.target.value !== (u.org||'')) && updateUser(u,{org:e.target.value||null})}/>
            </div>
            <div>
              <input className="input" defaultValue={u.account_manager_email || ''} onBlur={(e)=> (e.target.value !== (u.account_manager_email||'')) && updateUser(u,{account_manager_email:e.target.value||null})}/>
            </div>
            <div style={{display:'flex', gap:8}}>
              <button className="btn" onClick={()=>updateUser(u,{role:u.role, org:u.org||null, account_manager_email:u.account_manager_email||null})}>Save</button>
              <button className="btn btn-danger" onClick={()=>removeUser(u)}>Delete</button>
            </div>
          </div>
        ))}
        {(!users || users.length===0) && <div className="panel-sub" style={{padding:'16px 0'}}>No users yet.</div>}
      </div>
    </div>
  );
}
