'use client';
import React, { useState, useEffect, useMemo } from 'react';

/**
 * Minimal, self-contained app:
 * - Login tabs (admin / recruiter / client)
 * - Admin: add users + view directory (local persistence only)
 * - Recruiter: add candidates with "Date Entered" + "Years in current role"
 * - Client: read-only list
 *
 * Data persistence: localStorage (tc_users, tc_cands)
 * If you want this wired to Supabase again, I can provide the secure API + SQL.
 */

/* ---------------- Seed / Helpers ---------------- */

const seedUsers = [
  { id: 'u1', email: 'admin@youragency.com', role: 'admin', org: 'Your Agency', password: 'admin', amEmail: '', loginCount: 0, lastLoginAt: null, totalMinutes: 0, sessions: [] },
  { id: 'u2', email: 'recruiter@youragency.com', role: 'recruiter', org: 'Your Agency', password: 'recruit', amEmail: '', loginCount: 0, lastLoginAt: null, totalMinutes: 0, sessions: [] },
  { id: 'u3', email: 'client@samplefirm.com', role: 'client', org: 'Sample Firm', password: 'client', amEmail: '', loginCount: 0, lastLoginAt: null, totalMinutes: 0, sessions: [] },
];

const seedCands = [
  {
    id: 'c1',
    name: 'Alexis Chen',
    roles: ['Attorney', 'Contract Attorney'],
    practiceAreas: ['Securities Litigation', 'Internal Investigations'],
    years: 6,
    city: 'New York',
    state: 'NY',
    salary: 175000,
    contract: true,
    hourly: 95,
    notes: 'Strong writer. Securities litigation focus. Immediate.',
    dateEntered: new Date().toISOString().slice(0,10),
    yearsCurrentRole: 2
  }
];

function parseCSV(val) {
  return String(val || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

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

/* ---------------- App ---------------- */

export default function Page() {
  // users
  const [users, setUsers] = useState(() => {
    try { const s = localStorage.getItem('tc_users'); if (s) return JSON.parse(s); } catch {}
    return seedUsers;
  });
  useEffect(() => { try { localStorage.setItem('tc_users', JSON.stringify(users)); } catch {} }, [users]);

  // candidates
  const [cands, setCands] = useState(() => {
    try { const s = localStorage.getItem('tc_cands'); if (s) return JSON.parse(s); } catch {}
    return seedCands;
  });
  useEffect(() => { try { localStorage.setItem('tc_cands', JSON.stringify(cands)); } catch {} }, [cands]);

  // login
  const [mode, setMode] = useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [user, setUser] = useState(null);

  function startSession(u) {
    setUsers(prev => prev.map(x => {
      if (x.id !== u.id) return x;
      const now = Date.now();
      return { ...x, loginCount: (x.loginCount || 0) + 1, lastLoginAt: now, sessions: [...(x.sessions || []), { start: now }] };
    }));
  }
  function endSession(u) {
    if (!u) return;
    setUsers(prev => prev.map(x => {
      if (x.id !== u.id) return x;
      const sessions = Array.isArray(x.sessions) ? [...x.sessions] : [];
      if (!sessions.length) return x;
      const last = { ...sessions[sessions.length - 1] };
      if (!last.end) {
        last.end = Date.now();
        sessions[sessions.length - 1] = last;
        const mins = Math.max(0, Math.round((last.end - last.start) / 60000));
        return { ...x, sessions, totalMinutes: (x.totalMinutes || 0) + mins };
      }
      return x;
    }));
  }

  function login() {
    setErr('');
    const e = String(email).trim().toLowerCase();
    if (!e.includes('@')) { setErr('Enter a valid email'); return; }
    const u = localFindUser(users, e, pwd);
    if (!u) { setErr('Invalid credentials'); return; }
    if (u.role !== mode) { setErr(`This account is a ${u.role}. Switch to the ${u.role} tab.`); return; }
    setUser({ id: u.id, email: u.email, role: u.role, org: u.org || '', amEmail: u.amEmail || '' });
    startSession(u);
  }
  function logout() {
    endSession(user);
    setUser(null);
    setEmail(''); setPwd(''); setMode('recruiter');
  }

  /* ---------- Styles ---------- */
  const pageStyle = { minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'system-ui, Arial' };
  const shellStyle = { minHeight:'100vh', background:'#0a0a0a', color:'#e5e5e5', fontFamily:'system-ui, Arial', display:'flex', justifyContent:'center', padding:24 };
  const card = { width: '100%', maxWidth: 380, background: '#0b0b0b', border: '1px solid #1f2937', borderRadius: 12, padding: 16 };
  const panel = { width:'100%', maxWidth: 1000, background:'#0b0b0b', border:'1px solid #1f2937', borderRadius:12, padding:16 };

  /* ---------- Admin UI ---------- */
  if (user && user.role === 'admin') {
    return (
      <div style={shellStyle}>
        <div style={{ width:'100%', maxWidth:1000 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontWeight:700 }}>Talent Connector - Powered by Beacon Hill Legal</div>
            <button onClick={logout} style={{ fontSize:12 }}>Log out</button>
          </div>
          <div style={{ fontSize:12, color:'#9ca3af', marginBottom:8 }}>Admin workspace</div>

          <AdminPanel users={users} setUsers={setUsers} />
        </div>
      </div>
    );
  }

  /* ---------- Recruiter UI ---------- */
  if (user && user.role === 'recruiter') {
    return (
      <div style={shellStyle}>
        <div style={{ width:'100%', maxWidth:1000 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontWeight:700 }}>Talent Connector - Powered by Beacon Hill Legal</div>
            <button onClick={logout} style={{ fontSize:12 }}>Log out</button>
          </div>
          <div style={{ fontSize:12, color:'#9ca3af', marginBottom:8 }}>Recruiter workspace</div>

          <RecruiterAdd onAdd={rec => setCands(prev => [...prev, rec])} />
          <CandidateList cands={cands} canEdit onChange={(id, patch) => setCands(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))} onDelete={id => setCands(prev => prev.filter(c => c.id !== id))} />
        </div>
      </div>
    );
  }

  /* ---------- Client UI ---------- */
  if (user && user.role === 'client') {
    return (
      <div style={shellStyle}>
        <div style={{ width:'100%', maxWidth:1000 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontWeight:700 }}>Talent Connector - Powered by Beacon Hill Legal</div>
            <button onClick={logout} style={{ fontSize:12 }}>Log out</button>
          </div>
          <div style={{ fontSize:12, color:'#9ca3af', marginBottom:8 }}>Client workspace</div>

          <CandidateList cands={cands} />
        </div>
      </div>
    );
  }

  /* ---------- Login ---------- */
  return (
    <div style={pageStyle}>
      <LoginCard
        mode={mode} setMode={setMode}
        email={email} setEmail={setEmail}
        pwd={pwd} setPwd={setPwd}
        err={err}
        onLogin={login}
      />
    </div>
  );
}

/* ---------------- Components ---------------- */

function LoginCard({ mode, setMode, email, setEmail, pwd, setPwd, err, onLogin }) {
  const card = { width: '100%', maxWidth: 380, background: '#0b0b0b', border: '1px solid #1f2937', borderRadius: 12, padding: 16 };
  return (
    <div style={card}>
      <div style={{ textAlign: 'center', fontWeight: 700 }}>Talent Connector</div>
      <div style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>Invitation-only access</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <button onClick={() => setMode('recruiter')} style={{ padding: 8, background: mode==='recruiter' ? '#1f2937' : '#111827', color: '#e5e5e5', borderRadius: 8 }}>Recruiter</button>
        <button onClick={() => setMode('client')} style={{ padding: 8, background: mode==='client' ? '#1f2937' : '#111827', color: '#e5e5e5', borderRadius: 8 }}>Client</button>
        <button onClick={() => setMode('admin')} style={{ padding: 8, background: mode==='admin' ? '#1f2937' : '#111827', color: '#e5e5e5', borderRadius: 8 }}>Admin</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <LabeledInput label="Email" type="email" value={email} onChange={setEmail} placeholder="name@company.com" />
        <LabeledInput label="Password" type="password" value={pwd} onChange={setPwd} placeholder="your password" />
        <button onClick={onLogin} style={{ width: '100%', padding: 10, marginTop: 8, background: '#4f46e5', color: 'white', borderRadius: 8 }}>
          Log in
        </button>
        {err ? <div style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>{err}</div> : null}
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
          Try seed admin: <strong>admin@youragency.com / admin</strong>
        </div>
      </div>
    </div>
  );
}

function AdminPanel({ users, setUsers }) {
  // add user form (local-only)
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('client');
  const [org, setOrg] = useState('');
  const [amEmail, setAmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [flash, setFlash] = useState('');

  function addUser() {
    setErr(''); setFlash('');
    const e = String(email).trim().toLowerCase();
    if (!e.includes('@')) { setErr('Enter a valid email'); return; }
    if (!password) { setErr('Temp password is required'); return; }
    if (users.some(u => String(u.email || '').toLowerCase() === e)) { setErr('Email already exists'); return; }
    const id = 'u' + Math.random().toString(36).slice(2, 10);
    setUsers(prev => [...prev, { id, email: e, role, org, amEmail, password, loginCount: 0, lastLoginAt: null, totalMinutes: 0, sessions: [] }]);
    setFlash(`Added ${e} as ${role}`);
    setEmail(''); setRole('client'); setOrg(''); setAmEmail(''); setPassword('');
  }

  const panel = { width:'100%', background:'#0b0b0b', border:'1px solid #1f2937', borderRadius:12, padding:16, marginBottom:12 };

  return (
    <>
      <div style={panel}>
        <div style={{ fontWeight:700, marginBottom:8 }}>Users (invitation-only)</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:8 }}>
          <LabeledInput label="Email" type="email" value={email} onChange={setEmail} placeholder="name@company.com" />
          <LabeledSelect label="Role" value={role} onChange={setRole} options={[
            { value: 'client', label: 'Client' },
            { value: 'recruiter', label: 'Recruiter' },
            { value: 'admin', label: 'Admin' },
          ]} />
          <LabeledInput label="Organization (optional)" value={org} onChange={setOrg} placeholder="Firm / Dept" />
          <LabeledInput label="Sales contact (optional)" type="email" value={amEmail} onChange={setAmEmail} placeholder="sales@youragency.com" />
          <LabeledInput label="Temp password" type="password" value={password} onChange={setPassword} placeholder="set a password" />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
          <button onClick={addUser} style={{ fontSize:12, padding:'6px 10px', border:'1px solid #1f2937', borderRadius:8 }}>Add user</button>
          <div style={{ fontSize:12 }}>{err ? <span style={{ color:'#f87171' }}>{err}</span> : <span style={{ color:'#93e2b7' }}>{flash}</span>}</div>
        </div>
      </div>

      <div style={panel}>
        <div style={{ fontWeight:700, marginBottom:8 }}>Directory & activity</div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#9ca3af' }}>
                <th style={th}>Email</th>
                <th style={th}>Role</th>
                <th style={th}>Org</th>
                <th style={th}>Sales contact</th>
                <th style={th}>Logins</th>
                <th style={th}>Last login</th>
                <th style={th}>Total minutes</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={td}>{u.email}</td>
                  <td style={td}>{u.role}</td>
                  <td style={td}>{u.org || '—'}</td>
                  <td style={td}>{u.amEmail || '—'}</td>
                  <td style={td}>{u.loginCount || 0}</td>
                  <td style={td}>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}</td>
                  <td style={td}>{u.totalMinutes || 0}</td>
                </tr>
              ))}
              {!users.length && (
                <tr><td colSpan={7} style={{ padding:'10px 8px', color:'#9ca3af' }}>No users yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const th = { padding:'6px 8px', borderBottom:'1px solid #1f2937' };
const td = { padding:'6px 8px', borderBottom:'1px solid #1f2937' };

function RecruiterAdd({ onAdd }) {
  const panel = { width:'100%', background:'#0b0b0b', border:'1px solid #1f2937', borderRadius:12, padding:16, marginBottom:12 };

  const [name, setName] = useState('');
  const [rolesCSV, setRolesCSV] = useState('');
  const [lawCSV, setLawCSV] = useState('');
  const [years, setYears] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [salary, setSalary] = useState('');
  const [contract, setContract] = useState(false);
  const [hourly, setHourly] = useState('');
  const [notes, setNotes] = useState('');
  const [dateEntered, setDateEntered] = useState(() => new Date().toISOString().slice(0,10));
  const [yearsCurrentRole, setYearsCurrentRole] = useState('');

  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  function submit() {
    setErr(''); setOk('');
    if (!name.trim()) { setErr('Name is required'); return; }
    const rec = {
      id: 'c' + Math.random().toString(36).slice(2,10),
      name: name.trim(),
      roles: parseCSV(rolesCSV).length ? parseCSV(rolesCSV) : ['Attorney'],
      practiceAreas: parseCSV(lawCSV),
      years: Number(years) || 0,
      city: city.trim(),
      state: state.trim(),
      salary: Number(salary) || 0,
      contract: !!contract,
      hourly: contract ? (Number(hourly) || 0) : 0,
      notes: String(notes || ''),
      dateEntered: dateEntered || new Date().toISOString().slice(0,10),
      yearsCurrentRole: Number(yearsCurrentRole) || 0
    };
    onAdd(rec);
    setOk('Candidate added');
    setName(''); setRolesCSV(''); setLawCSV(''); setYears(''); setCity(''); setState(''); setSalary(''); setContract(false); setHourly(''); setNotes(''); setDateEntered(new Date().toISOString().slice(0,10)); setYearsCurrentRole('');
  }

  return (
    <div style={panel}>
      <div style={{ fontWeight:700, marginBottom:8 }}>Add candidate</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:8 }}>
        <LabeledInput label="Full name" value={name} onChange={setName} />
        <LabeledInput label="Titles (CSV)" value={rolesCSV} onChange={setRolesCSV} placeholder="Attorney, Paralegal" />
        <LabeledInput label="Type of Law (CSV)" value={lawCSV} onChange={setLawCSV} placeholder="Litigation, Immigration" />
        <LabeledInput label="Years of experience" type="number" value={years} onChange={setYears} />
        <LabeledInput label="City" value={city} onChange={setCity} />
        <LabeledInput label="State" value={state} onChange={setState} />
        <LabeledInput label="Salary desired" type="number" value={salary} onChange={setSalary} />
        <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, marginTop:6 }}>
          <input type="checkbox" checked={contract} onChange={e => setContract(e.target.checked)} />
          <span>Available for contract</span>
        </label>
        {contract ? <LabeledInput label="Hourly rate" type="number" value={hourly} onChange={setHourly} /> : null}
        <LabeledInput label="Date Entered" type="date" value={dateEntered} onChange={setDateEntered} />
        <LabeledInput label="Years in current role" type="number" value={yearsCurrentRole} onChange={setYearsCurrentRole} />
      </div>
      <LabeledTextarea label="Candidate Notes" value={notes} onChange={setNotes} placeholder="Short summary: strengths, availability, fit notes." />
      <div style={{ display:'flex', gap:8, marginTop:8 }}>
        <button onClick={submit} style={{ fontSize:12 }}>Add candidate</button>
        {err ? <div style={{ fontSize:12, color:'#f87171' }}>{err}</div> : null}
        {ok ? <div style={{ fontSize:12, color:'#a7f3d0' }}>{ok}</div> : null}
      </div>
    </div>
  );
}

function CandidateList({ cands, canEdit = false, onChange = () => {}, onDelete = () => {} }) {
  const panel = { width:'100%', background:'#0b0b0b', border:'1px solid #1f2937', borderRadius:12, padding:16, marginBottom:12 };

  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = String(q || '').trim().toLowerCase();
    if (!s) return cands;
    return cands.filter(c => {
      const blob = (
        (c.name || '') + ' ' +
        (c.roles || []).join(' ') + ' ' +
        (c.practiceAreas || []).join(' ') + ' ' +
        (c.city || '') + ' ' +
        (c.state || '') + ' ' +
        (c.notes || '')
      ).toLowerCase();
      return blob.includes(s);
    });
  }, [cands, q]);

  return (
    <div style={panel}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div style={{ fontWeight:700 }}>Candidates</div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" style={{ padding:6, borderRadius:8, background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937' }} />
      </div>

      {list.map(c => (
        <div key={c.id} style={{ border:'1px solid #1f2937', borderRadius:12, padding:12, marginBottom:8, background:'#0b0b0b' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontWeight:600 }}>{c.name}</div>
              <div style={{ fontSize:12, color:'#9ca3af' }}>
                {[c.city, c.state].filter(Boolean).join(', ')} · {c.years} yrs · Entered {c.dateEntered || '—'} · In-role {c.yearsCurrentRole ?? 0} yrs
              </div>
            </div>
            {canEdit ? (
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => onDelete(c.id)} style={{ fontSize:12 }}>Delete</button>
              </div>
            ) : null}
          </div>

          {(c.roles && c.roles.length) ? (
            <div style={{ marginTop:6 }}>
              {(c.roles || []).map(r => <Tag key={r} text={r} />)}
            </div>
          ) : null}

          {(c.practiceAreas && c.practiceAreas.length) ? (
            <div style={{ marginTop:6 }}>
              <div style={{ fontSize:12, color:'#9ca3af', marginBottom:4 }}>Type of law</div>
              {(c.practiceAreas || []).map(p => <Tag key={p} text={p} />)}
            </div>
          ) : null}

          {String(c.notes || '').trim() ? (
            <div style={{ fontSize:12, color:'#e5e5e5', background:'#0d1b2a', border:'1px solid #1e3a8a', borderRadius:8, padding:8, marginTop:8 }}>
              <div style={{ fontWeight:600, marginBottom:4 }}>Candidate Notes</div>
              <div>{c.notes}</div>
            </div>
          ) : null}
        </div>
      ))}

      {!list.length && <div style={{ fontSize:12, color:'#9ca3af' }}>No candidates found.</div>}
    </div>
  );
}

/* ---------------- Small UI bits ---------------- */

function LabeledInput({ label, value, onChange, placeholder, type='text' }) {
  return (
    <label style={{ display:'block', fontSize:12, marginTop:6 }}>
      <div style={{ color:'#9ca3af', marginBottom:4 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width:'100%', padding:8, background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:8 }}
      />
    </label>
  );
}

function LabeledTextarea({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display:'block', fontSize:12, marginTop:6 }}>
      <div style={{ color:'#9ca3af', marginBottom:4 }}>{label}</div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={4}
        placeholder={placeholder}
        style={{ width:'100%', padding:8, background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:8 }}
      />
    </label>
  );
}

function LabeledSelect({ label, value, onChange, options }) {
  return (
    <label style={{ display:'block', fontSize:12, marginTop:6 }}>
      <div style={{ color:'#9ca3af', marginBottom:4 }}>{label}</div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width:'100%', padding:8, background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:8 }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function Tag({ text }) {
  return (
    <span style={{ display:'inline-block', fontSize:11, padding:'2px 8px', background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:999, marginRight:6, marginBottom:4 }}>
      {text}
    </span>
  );
}
