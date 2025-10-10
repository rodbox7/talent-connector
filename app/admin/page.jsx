'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase as sb } from '../../lib/supabaseClient';

// ========= Admin Panel (classic / restored) =========
function AdminPanel({ users, meId, addUser, deleteUser, updateUser }){
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('client');
  const [org, setOrg]   = useState('');
  const [am, setAm]     = useState('');   // salesperson email (account manager)
  const [password, setPassword] = useState('');

  const [err, setErr]   = useState('');
  const [flash, setFlash] = useState('');
  const [passEdits, setPassEdits] = useState({});
  const [amEdits, setAmEdits]     = useState({});

  function add(){
    setErr(''); setFlash('');
    const e = String(email).trim().toLowerCase();
    if (!e.includes('@')){ setErr('Enter a valid email'); return; }
    if (!password){ setErr('Set a temporary password'); return; }
    if (users.some(u => String(u.email||'').toLowerCase() === e)){
      setErr('That email already exists'); return;
    }
    addUser({ email: e, role, org, password, amEmail: am });
    setFlash(`Added ${email} as ${role}`);
    setEmail(''); setOrg(''); setAm(''); setPassword(''); setRole('client');
  }

  function fmt(ts){ if (!ts) return '—'; try { return new Date(ts).toLocaleString(); } catch { return '—'; } }

  // Classic, light-but-readable surfaces
  const card = { border: '1px solid #22304a', background: '#0d1626', borderRadius: 12, padding: 12 };
  const subtle = { color: '#9fb3ce' };

  return (
    <div style={{ display:'grid', gap: 12, marginTop: 12 }}>
      {/* Add user */}
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Users (invitation-only)</div>
        <div style={{ ...subtle, fontSize: 12, marginBottom: 8 }}>
          Only users listed here can sign in. Create an Auth account plus a matching profile row.
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
          <Field label="Email" value={email} onChange={setEmail} placeholder="name@company.com" />
          <Select
            label="Role"
            value={role}
            onChange={setRole}
            options={[{label:'Client',value:'client'},{label:'Recruiter',value:'recruiter'},{label:'Admin',value:'admin'}]}
          />
          <Field label="Organization (optional)" value={org} onChange={setOrg} placeholder="Firm / Dept" />
          <Field label="Sales contact email (clients)" value={am} onChange={setAm} placeholder="sales@youragency.com" />
          <Field label="Temp password" value={password} onChange={setPassword} type="password" placeholder="set a password" />
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: 8 }}>
          <button onClick={add} style={{ fontSize: 12, padding:'6px 10px', border:'1px solid #22304a', borderRadius:8 }}>
            Add user
          </button>
          <div style={{ fontSize: 12 }}>
            {err ? <span style={{ color:'#f87171' }}>{err}</span> : <span style={{ color:'#93e2b7' }}>{flash}</span>}
          </div>
        </div>
      </div>

      {/* Directory */}
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Directory & activity</div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ textAlign:'left', ...subtle }}>
                <th style={{ padding:'6px 8px', borderBottom:'1px solid #22304a' }}>Email</th>
                <th style={{ padding:'6px 8px', borderBottom:'1px solid #22304a' }}>Role</th>
                <th style={{ padding:'6px 8px', borderBottom:'1px solid #22304a' }}>Org</th>
                <th style={{ padding:'6px 8px', borderBottom:'1px solid #22304a' }}>Sales contact</th>
                <th style={{ padding:'6px 8px', borderBottom:'1px solid #22304a' }}>Logins</th>
                <th style={{ padding:'6px 8px', borderBottom:'1px solid #22304a' }}>Last login</th>
                <th style={{ padding:'6px 8px', borderBottom:'1px solid #22304a' }}>Total minutes</th>
                <th style={{ padding:'6px 8px', borderBottom:'1px solid #22304a' }}>Password</th>
                <th style={{ padding:'6px 8px', borderBottom:'1px solid #22304a' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ padding:'6px 8px', borderBottom:'1px solid #1a2438' }}>{u.email}</td>
                  <td style={{ padding:'6px 8px', borderBottom:'1px solid #1a2438' }}>{u.role}</td>
                  <td style={{ padding:'6px 8px', borderBottom:'1px solid #1a2438' }}>{u.org || '—'}</td>
                  <td style={{ padding:'6px 8px', borderBottom:'1px solid #1a2438', minWidth:240 }}>
                    <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                      <input
                        type="email"
                        value={(amEdits[u.id] !== undefined ? amEdits[u.id] : (u.amEmail || ''))}
                        onChange={e => setAmEdits({ ...amEdits, [u.id]: e.target.value })}
                        placeholder="sales@youragency.com"
                        style={{ width:200, padding:6, background:'#0f1a2c', color:'#e5e5e5', border:'1px solid #22304a', borderRadius:6 }}
                      />
                      <button
                        onClick={() => { const v = amEdits[u.id] ?? u.amEmail ?? ''; updateUser(u.id, { amEmail: v }); setFlash(`Sales contact set for ${u.email}`); }}
                        style={{ fontSize:12 }}
                      >
                        Set
                      </button>
                    </div>
                  </td>
                  <td style={{ padding:'6px 8px', borderBottom:'1px solid #1a2438' }}>{u.loginCount || 0}</td>
                  <td style={{ padding:'6px 8px', borderBottom:'1px solid #1a2438' }}>{fmt(u.lastLoginAt)}</td>
                  <td style={{ padding:'6px 8px', borderBottom:'1px solid #1a2438' }}>{u.totalMinutes || 0}</td>
                  <td style={{ padding:'6px 8px', borderBottom:'1px solid #1a2438' }}>
                    <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                      <input
                        type="text"
                        value={passEdits[u.id] || ''}
                        onChange={e => setPassEdits({ ...passEdits, [u.id]: e.target.value })}
                        placeholder="new pw"
                        style={{ width:120, padding:6, background:'#0f1a2c', color:'#e5e5e5', border:'1px solid #22304a', borderRadius:6 }}
                      />
                      <button
                        onClick={() => {
                          const v = passEdits[u.id] || '';
                          if (!v) return;
                          updateUser(u.id, { password: v });
                          setFlash(`Password set for ${u.email}`);
                          setPassEdits({ ...passEdits, [u.id]: '' });
                        }}
                        style={{ fontSize:12 }}
                      >
                        Set
                      </button>
                      <button
                        onClick={() => {
                          const np = Math.random().toString(36).slice(2,8);
                          updateUser(u.id, { password: np });
                          setPassEdits({ ...passEdits, [u.id]: np });
                          setFlash(`Temp password for ${u.email}: ${np}`);
                        }}
                        style={{ fontSize:12 }}
                      >
                        Generate
                      </button>
                    </div>
                  </td>
                  <td style={{ padding:'6px 8px', borderBottom:'1px solid #1a2438' }}>
                    <button
                      disabled={u.id === meId}
                      onClick={() => deleteUser(u.id)}
                      style={{ fontSize:12, opacity: u.id===meId ? 0.5 : 1 }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr><td colSpan={9} style={{ padding:'10px 8px', color:'#9fb3ce' }}>No users yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
