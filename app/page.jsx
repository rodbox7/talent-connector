'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { supabase as sb } from '../lib/supabaseClient';

/**
 * Fresh, stable build:
 * - No header/title on login box. No border. Full-bleed NYC image.
 * - Old/classic Admin panel restored.
 * - Recruiter can add/edit/delete candidates. Client is read-only.
 * - Keyword search hits notes/titles/areas/city/state.
 * - Years range slider 0–50.
 */

/* ===== Config ===== */
const NYC_URL =
  'https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg';

/* ===== Local fallback demo users/candidates (for preview) ===== */
const seedUsers = [
  { id: 'u1', email: 'admin@youragency.com', role: 'admin', org: 'Your Agency', password: 'admin', loginCount: 0, lastLoginAt: null, totalMinutes: 0, sessions: [] },
  { id: 'u2', email: 'recruiter@youragency.com', role: 'recruiter', org: 'Your Agency', password: 'recruit', loginCount: 0, lastLoginAt: null, totalMinutes: 0, sessions: [] },
  { id: 'u3', email: 'client@samplefirm.com', role: 'client', org: 'Sample Firm', password: 'client', loginCount: 0, lastLoginAt: null, totalMinutes: 0, sessions: [] },
];

const seedCandidates = [
  { id: '1', name: 'Alexis Chen', roles: ['Attorney', 'Contract Attorney'], practiceAreas: ['Securities Litigation', 'Internal Investigations'], city: 'New York', state: 'NY', years: 6, contract: true, hourly: 95, salary: 175000, notes: 'Strong writer. Securities litigation focus. Immediate.' },
  { id: '2', name: 'Diego Martinez', roles: ['Paralegal'], practiceAreas: ['Immigration', 'Global Mobility'], city: 'Miami', state: 'FL', years: 8, contract: true, hourly: 48, salary: 92000, notes: 'Immigration paralegal, Spanish bilingual. Remote ready.' },
  { id: '3', name: 'Priya Raman', roles: ['eDiscovery Reviewer', 'Litigation Support'], practiceAreas: ['Antitrust', 'Class Actions'], city: 'Boston', state: 'MA', years: 4, contract: false, hourly: 0, salary: 0, notes: '' },
];

/* ===== Utilities ===== */
function parseCSVLower(s){ return String(s||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean); }
function parseCSV(s){ return String(s||'').split(',').map(x=>x.trim()).filter(Boolean); }
function localFindUser(users, email, pwd){
  const e = String(email||'').toLowerCase();
  return users.find(u => String(u.email||'').toLowerCase() === e && String(u.password||'') === String(pwd||'')) || null;
}
function filterCandidates(cands, params){
  const { q, titlesFilter, lawFilter, cityFilter, stateFilter, minYears, maxYears, minSalary, maxSalary, contractOnly, minHourly, maxHourly } = params;
  const s = String(q||'').trim().toLowerCase();
  const titleTokens = parseCSVLower(titlesFilter);
  const lawTokens = parseCSVLower(lawFilter);
  const cityTok = String(cityFilter||'').trim().toLowerCase();
  const stateTok = String(stateFilter||'').trim().toLowerCase();
  const minY = Number(minYears)||0; const maxY = Number(maxYears)||0;
  const minS = Number(minSalary)||0; const maxS = Number(maxSalary)||0;
  const minH = Number(minHourly)||0; const maxH = Number(maxHourly)||0;

  return cands.filter(c => {
    let pass = true;
    if (s){
      const blob = (String(c.name||'') + ' ' + (c.roles||[]).join(' ') + ' ' + (c.practiceAreas||[]).join(' ') + ' ' + (c.city||'') + ' ' + (c.state||'') + ' ' + (c.notes||'')).toLowerCase();
      if (!blob.includes(s)) pass = false;
    }
    if (pass && titleTokens.length){
      const roleMatches = (c.roles||[]).some(r => titleTokens.some(t => String(r||'').toLowerCase().includes(t)));
      if (!roleMatches) pass = false;
    }
    if (pass && lawTokens.length){
      const lawMatches = (c.practiceAreas||[]).some(p => lawTokens.some(t => String(p||'').toLowerCase().includes(t)));
      if (!lawMatches) pass = false;
    }
    if (pass && cityTok && !String(c.city||'').toLowerCase().includes(cityTok)) pass = false;
    if (pass && stateTok && !String(c.state||'').toLowerCase().includes(stateTok)) pass = false;
    if (pass && minY && (c.years||0) < minY) pass = false;
    if (pass && maxY && (c.years||0) > maxY) pass = false;
    if (pass && minS && (c.salary||0) < minS) pass = false;
    if (pass && maxS && (c.salary||0) > maxS) pass = false;
    if (pass && contractOnly && !c.contract) pass = false;
    if (pass && minH && (!c.contract || (c.hourly||0) < minH)) pass = false;
    if (pass && maxH && (!c.contract || (c.hourly||0) > maxH)) pass = false;
    return pass;
  });
}

/* ===== App Root ===== */
export default function App(){
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState(() => { try { const s = localStorage.getItem('tc_users'); if (s) return JSON.parse(s); } catch {} return seedUsers; });
  const [cands, setCands] = useState(() => { try { const s = localStorage.getItem('tc_cands'); if (s) return JSON.parse(s); } catch {} return seedCandidates; });

  useEffect(() => { try { localStorage.setItem('tc_users', JSON.stringify(users)); } catch {} }, [users]);
  useEffect(() => { try { localStorage.setItem('tc_cands', JSON.stringify(cands)); } catch {} }, [cands]);

  function startSession(u){
    setUsers(prev => prev.map(x => {
      if (x.id !== u.id) return x;
      const now = Date.now();
      return { ...x, loginCount: (x.loginCount||0)+1, lastLoginAt: now, sessions: [...(x.sessions||[]), { start: now }] };
    }));
  }
  function endSession(u){
    if (!u) return;
    setUsers(prev => prev.map(x => {
      if ((u.id && x.id === u.id) || x.email === u.email){
        const sessions = Array.isArray(x.sessions) ? [...x.sessions] : [];
        if (sessions.length){
          const last = { ...sessions[sessions.length - 1] };
          if (!last.end){
            last.end = Date.now();
            sessions[sessions.length - 1] = last;
            const mins = Math.max(0, Math.round((last.end - last.start) / 60000));
            return { ...x, sessions, totalMinutes: (x.totalMinutes || 0) + mins };
          }
        }
      }
      return x;
    }));
  }

  function handleLogin(found){ setUser({ role: found.role, email: found.email, org: found.org, id: found.id, amEmail: found.amEmail }); startSession(found); }
  function handleLogout(){ endSession(user); setUser(null); }

  function addUser(rec){
    setUsers(prev => {
      if (prev.some(x => x.email.toLowerCase() === String(rec.email||'').toLowerCase())) return prev;
      const id = 'u' + Math.random().toString(36).slice(2,8);
      const u = { id, loginCount: 0, lastLoginAt: null, totalMinutes: 0, sessions: [], ...rec };
      return [...prev, u];
    });
  }
  function deleteUser(id){ setUsers(prev => prev.filter(x => x.id !== id)); }
  function updateUser(id, patch){ setUsers(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x)); }

  if (!user) {
    return (
      <Auth users={users} onLogin={handleLogin} onAddRecruiterViaCode={() => {}} />
    );
  }

  return (
    <Shell
      user={user}
      onLogout={handleLogout}
      cands={cands}
      setCands={setCands}
      users={users}
      addUser={addUser}
      deleteUser={deleteUser}
      updateUser={updateUser}
    />
  );
}

/* ===== Shell (role routing) ===== */
function Shell({ user, onLogout, cands, setCands, users, addUser, deleteUser, updateUser }){
  const [q, setQ] = useState('');
  const [titlesFilter, setTitlesFilter] = useState('');
  const [lawFilter, setLawFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [minYears, setMinYears] = useState('');
  const [maxYears, setMaxYears] = useState('');
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const [contractOnly, setContractOnly] = useState(false);
  const [minHourly, setMinHourly] = useState('');
  const [maxHourly, setMaxHourly] = useState('');

  function clearFilters(){
    setTitlesFilter(''); setLawFilter(''); setCityFilter(''); setStateFilter('');
    setMinYears(''); setMaxYears(''); setMinSalary(''); setMaxSalary('');
    setContractOnly(false); setMinHourly(''); setMaxHourly('');
  }

  const filtered = useMemo(() => {
    return filterCandidates(cands, {
      q, titlesFilter, lawFilter, cityFilter, stateFilter,
      minYears, maxYears, minSalary, maxSalary, contractOnly, minHourly, maxHourly
    });
  }, [cands, q, titlesFilter, lawFilter, cityFilter, stateFilter, minYears, maxYears, minSalary, maxSalary, contractOnly, minHourly, maxHourly]);

  function remove(id){ setCands(cands.filter(x => x.id !== id)); }
  function update(id, patch){ setCands(cands.map(x => x.id === id ? { ...x, ...patch } : x)); }
  function addCandidate(rec){ setCands(prev => [...prev, rec]); }

  const bodyStyle = { fontFamily: 'system-ui, Arial', background: '#0a0a0a', color: '#e5e5e5', minHeight: '100vh', padding: 16 };
  const styles = (<RangeStyles/>);

  if (user.role === 'admin'){
    return (
      <div style={bodyStyle}>
        {styles}
        {/* No header/title */}
        <button onClick={onLogout} style={{ fontSize: 12, marginBottom: 8 }}>Log out</button>
        <AdminPanel users={users} meId={user.id||''} addUser={addUser} deleteUser={deleteUser} updateUser={updateUser} />
      </div>
    );
  }

  const filtersUI = (
    <div style={{ marginTop: 12, border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0b0b0b' }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Filters</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
        <Field label='Titles (CSV)' value={titlesFilter} onChange={setTitlesFilter} placeholder='Attorney, Paralegal' />
        <Field label='Type of Law (CSV)' value={lawFilter} onChange={setLawFilter} placeholder='Litigation, Immigration' />
        <Field label='City' value={cityFilter} onChange={setCityFilter} placeholder='e.g., New York' />
        <Field label='State' value={stateFilter} onChange={setStateFilter} placeholder='e.g., NY' />
        <YearsRange
          min={0}
          max={50}
          low={Number(minYears) || 0}
          high={Number(maxYears) || 50}
          onChange={(lo, hi) => { setMinYears(String(lo)); setMaxYears(String(hi)); }}
        />
        <Num label='Min Salary' value={minSalary} onChange={setMinSalary} />
        <Num label='Max Salary' value={maxSalary} onChange={setMaxSalary} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <input type='checkbox' checked={contractOnly} onChange={e => setContractOnly(e.target.checked)} />
          <span>Contract only</span>
        </label>
        <Num label='Min Hourly' value={minHourly} onChange={setMinHourly} />
        <Num label='Max Hourly' value={maxHourly} onChange={setMaxHourly} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button onClick={clearFilters} style={{ fontSize: 12, padding: '6px 10px', border: '1px solid #1f2937', borderRadius: 8 }}>Clear filters</button>
      </div>
    </div>
  );

  const searchBox = (
    <div style={{ marginTop: 16 }}>
      <label style={{ fontSize: 12, color: '#9ca3af' }}>Keyword (name, title, law, location, notes)</label>
      <input value={q} onChange={e => setQ(e.target.value)} style={{ width: '100%', padding: 8, background: '#111827', color: '#e5e5e5', border: '1px solid #1f2937', borderRadius: 8 }} />
    </div>
  );

  const list = (
    <div style={{ marginTop: 8 }}>
      {filtered.map(c => (
        <Card
          key={c.id}
          c={c}
          canEdit={user.role === 'recruiter'}
          onDelete={remove}
          onUpdate={update}
          userRole={user.role}
          clientInfo={{ email: user.email, amEmail: user.amEmail || '' }}
        />
      ))}
    </div>
  );

  if (user.role === 'client'){
    return (
      <div style={bodyStyle}>
        {styles}
        <button onClick={onLogout} style={{ fontSize: 12, marginBottom: 8 }}>Log out</button>
        {searchBox}
        {filtersUI}
        {list}
      </div>
    );
  }

  // Recruiter
  return (
    <div style={bodyStyle}>
      {styles}
      <button onClick={onLogout} style={{ fontSize: 12, marginBottom: 8 }}>Log out</button>
      <RecruiterAddForm onAdd={addCandidate} />
      {searchBox}
      {list}
    </div>
  );
}

/* ===== Admin Panel (classic) ===== */
function AdminPanel({ users, meId, addUser, deleteUser, updateUser }){
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('client');
  const [org, setOrg] = useState('');
  const [am, setAm] = useState(''); // salesperson email
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [flash, setFlash] = useState('');
  const [passEdits, setPassEdits] = useState({});
  const [amEdits, setAmEdits] = useState({});

  function add(){
    setErr(''); setFlash('');
    const e = String(email).trim().toLowerCase();
    if (!e.includes('@')){ setErr('Enter a valid email'); return; }
    if (!password){ setErr('Set a temporary password'); return; }
    if (users.some(u => String(u.email||'').toLowerCase() === e)){ setErr('That email already exists'); return; }
    addUser({ email: e, role, org, password, amEmail: am });
    setFlash(`Added ${email} as ${role}`);
    setEmail(''); setOrg(''); setAm(''); setPassword(''); setRole('client');
  }
  function fmt(ts){ if (!ts) return '—'; try { return new Date(ts).toLocaleString(); } catch { return '—'; } }

  const card = { border: '1px solid #22304a', background: '#0d1626', borderRadius: 12, padding: 12 };
  const subtle = { color: '#9fb3ce' };

  return (
    <div style={{ display:'grid', gap: 12, marginTop: 12 }}>
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Users (invitation-only)</div>
        <div style={{ ...subtle, fontSize: 12, marginBottom: 8 }}>
          Only users listed here can sign in. Create an Auth account plus a matching profile row.
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
          <Field label="Email" value={email} onChange={setEmail} placeholder="name@company.com" />
          <Select label="Role" value={role} onChange={setRole} options={[
            {label:'Client',value:'client'},
            {label:'Recruiter',value:'recruiter'},
            {label:'Admin',value:'admin'}
          ]} />
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
                    <SalesContactCell u={u} amEdits={amEdits} setAmEdits={setAmEdits} updateUser={updateUser} setFlash={setFlash} />
                  </td>
                  <td style={{ padding:'6px 8px', borderBottom:'1px solid #1a2438' }}>{u.loginCount || 0}</td>
                  <td style={{ padding:'6px 8px', borderBottom:'1px solid #1a2438' }}>{fmt(u.lastLoginAt)}</td>
                  <td style={{ padding:'6px 8px', borderBottom:'1px solid #1a2438' }}>{u.totalMinutes || 0}</td>
                  <td style={{ padding:'6px 8px', borderBottom:'1px solid #1a2438' }}>
                    <PasswordCell u={u} passEdits={passEdits} setPassEdits={setPassEdits} updateUser={updateUser} setFlash={setFlash} />
                  </td>
                  <td style={{ padding:'6px 8px', borderBottom:'1px solid #1a2438' }}>
                    <button disabled={u.id===meId} onClick={() => deleteUser(u.id)} style={{ fontSize:12, opacity:u.id===meId?0.5:1 }}>Delete</button>
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (<tr><td colSpan={9} style={{ padding:'10px 8px', color:'#9fb3ce' }}>No users yet.</td></tr>) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SalesContactCell({ u, amEdits, setAmEdits, updateUser, setFlash }){
  return (
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
  );
}
function PasswordCell({ u, passEdits, setPassEdits, updateUser, setFlash }){
  return (
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
  );
}

/* ===== Recruiter Add Form ===== */
function RecruiterAddForm({ onAdd }){
  const [name, setName] = useState('');
  const [roles, setRoles] = useState('');
  const [practice, setPractice] = useState('');
  const [years, setYears] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [salary, setSalary] = useState('');
  const [contract, setContract] = useState(false);
  const [hourly, setHourly] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  function submit(){
    setErr(''); setOk('');
    if (!name.trim()) { setErr('Name is required'); return; }
    const rec = {
      id: 'c'+Math.random().toString(36).slice(2,8),
      name: name.trim(),
      roles: (function(){ const a = parseCSV(roles); return a.length ? a : ['Attorney']; })(),
      practiceAreas: parseCSV(practice),
      years: Number(years)||0,
      city: city.trim(),
      state: state.trim(),
      salary: Number(salary)||0,
      contract: !!contract,
      hourly: contract ? (Number(hourly)||0) : 0,
      notes: String(notes||'')
    };
    onAdd(rec);
    setOk('Candidate added');
    setName(''); setRoles(''); setPractice(''); setYears(''); setCity(''); setState(''); setSalary(''); setContract(false); setHourly(''); setNotes('');
  }

  return (
    <div style={{ marginTop: 12, border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0b0b0b' }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Add candidate</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
        <Field label='Full name' value={name} onChange={setName} />
        <Field label='Titles (CSV)' value={roles} onChange={setRoles} placeholder='Attorney, Paralegal' />
        <Field label='Type of Law (CSV)' value={practice} onChange={setPractice} placeholder='Litigation, Immigration' />
        <Num label='Years of experience' value={years} onChange={setYears} />
        <Field label='City' value={city} onChange={setCity} />
        <Field label='State' value={state} onChange={setState} />
        <Num label='Salary desired' value={salary} onChange={setSalary} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginTop: 6 }}>
          <input type='checkbox' checked={contract} onChange={e => setContract(e.target.checked)} />
          <span>Available for contract</span>
        </label>
        {contract ? <Num label='Hourly rate' value={hourly} onChange={setHourly} /> : null}
      </div>
      <Area label='Candidate Notes' value={notes} onChange={setNotes} placeholder='Short summary: strengths, availability, fit notes.' />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={submit} style={{ fontSize: 12 }}>Add candidate</button>
        {err ? <div style={{ fontSize: 12, color: '#f87171' }}>{err}</div> : null}
        {ok ? <div style={{ fontSize: 12, color: '#a7f3d0' }}>{ok}</div> : null}
      </div>
    </div>
  );
}

/* ===== Candidate Card ===== */
function buildContactMailto(c, user){
  const to = user?.amEmail || 'info@youragency.com';
  const subj = `Talent Connector Candidate – ${c?.name || ''}`;
  const body = [
    `Hello,`,
    ``,
    `I'm interested in this candidate:`,
    `• Name: ${c?.name || ''}`,
    `• Title(s): ${(c?.roles || []).join(', ')}`,
    `• Practice Areas: ${(c?.practiceAreas || []).join(', ')}`,
    `• Location: ${[c?.city, c?.state].filter(Boolean).join(', ')}`,
    `• Years: ${c?.years ?? ''}`,
    ``,
    `My email: ${user?.email || ''}`,
    ``,
    `Sent from Talent Connector`
  ].join('\n');

  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
}
function Card({ c, canEdit, onDelete, onUpdate, userRole, clientInfo }){
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(c.name);
  const [rolesCSV, setRolesCSV] = useState((c.roles||[]).join(', '));
  const [lawCSV, setLawCSV] = useState((c.practiceAreas||[]).join(', '));
  const [salary, setSalary] = useState(String(c.salary||''));
  const [contract, setContract] = useState(!!c.contract);
  const [hourly, setHourly] = useState(String(c.hourly||''));
  const [notes, setNotes] = useState(c.notes||'');

  function save(){
    if (contract && (!hourly || Number(hourly) <= 0)) return;
    let rolesArr = parseCSV(rolesCSV); if (!rolesArr.length) rolesArr = ['Attorney'];
    const lawArr = parseCSV(lawCSV);
    onUpdate(c.id, { name: String(name||''), roles: rolesArr, practiceAreas: lawArr, salary: Number(salary)||0, contract: !!contract, hourly: contract ? Number(hourly)||0 : 0, notes: String(notes||''), city: c.city, state: c.state, years: c.years });
    setEdit(false);
  }
  function badge(text){ return (<span key={text} style={{ display: 'inline-block', fontSize: 11, padding: '2px 8px', background: '#111827', color: '#e5e5e5', border: '1px solid #1f2937', borderRadius: 999, marginRight: 6, marginBottom: 4 }}>{text}</span>); }

  return (
    <div style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, marginBottom: 8, background: '#0b0b0b' }}>
      {!edit ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>{(c.city||'') + (c.state ? ', ' + c.state : '')} - {c.years} yrs</div>
            </div>
          </div>
          {(c.roles&&c.roles.length) ? (<div style={{ marginTop: 6 }}>{(c.roles||[]).map(r => badge(r))}</div>) : null}
          {(c.practiceAreas&&c.practiceAreas.length) ? (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Type of law</div>
              {(c.practiceAreas||[]).map(p => badge(p))}
            </div>
          ) : null}
          {(String(c.notes||'').trim()) ? (
            <div style={{ fontSize: 12, color: '#e5e5e5', background: '#0d1b2a', border: '1px solid #1e3a8a', borderRadius: 8, padding: 8, marginTop: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Candidate Notes</div>
              <div>{c.notes}</div>
            </div>
          ) : null}
          <div style={{ fontSize: 12, color: '#e5e5e5', marginTop: 6 }}>Salary: {c.salary ? ('$' + c.salary) : '-'}</div>
          <div style={{ fontSize: 12, color: '#e5e5e5' }}>Contract: {c.contract ? ('Yes' + (c.hourly ? ', $' + c.hourly + '/hr' : '')) : 'No'}</div>

          {userRole === 'client' && (
            <div style={{ marginTop: 8 }}>
              <a
                href={buildContactMailto(c, clientInfo)}
                style={{ display:'inline-block', padding:'8px 12px', borderRadius:8, background:'#2563eb', color:'#fff', textDecoration:'none', boxShadow:'0 2px 4px rgba(0,0,0,.25)' }}
              >
                Contact
              </a>
              <span style={{ marginLeft: 8, fontSize: 12, color: '#9ca3af' }}>
                {clientInfo?.amEmail ? `Sales contact: ${clientInfo.amEmail}` : 'No salesperson assigned yet'}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {canEdit ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEdit(true)} style={{ fontSize: 12 }}>Edit</button>
                <button onClick={() => onDelete(c.id)} style={{ fontSize: 12 }}>Delete</button>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div>
          <Field label='Full name' value={name} onChange={setName} />
          <Field label='Titles (comma separated)' value={rolesCSV} onChange={setRolesCSV} placeholder='Attorney, Contract Attorney' />
          <Field label='Type of law (comma separated)' value={lawCSV} onChange={setLawCSV} placeholder='Securities Litigation, Immigration' />
          <Field label='Desired salary' value={salary} onChange={setSalary} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginTop: 6 }}>
            <input type='checkbox' checked={contract} onChange={e => setContract(e.target.checked)} />
            <span>Available for contract</span>
          </label>
          {contract ? <Field label='Hourly rate' value={hourly} onChange={setHourly} /> : null}
          <Area label='Candidate Notes' value={notes} onChange={setNotes} placeholder='Short summary: strengths, availability, fit notes.' />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={save} style={{ fontSize: 12 }}>Save</button>
            <button onClick={() => setEdit(false)} style={{ fontSize: 12 }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Inputs & Slider ===== */
function Field({ label, value, onChange, placeholder, type='text' }){
  return (
    <label style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
      <div style={{ color: '#9ca3af', marginBottom: 4 }}>{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: '100%', padding: 8, background: '#111827', color: '#e5e5e5', border: '1px solid #1f2937', borderRadius: 8 }} />
    </label>
  );
}
function Num({ label, value, onChange }){
  return (
    <label style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
      <div style={{ color: '#9ca3af', marginBottom: 4 }}>{label}</div>
      <input type='number' value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: 8, background: '#111827', color: '#e5e5e5', border: '1px solid #1f2937', borderRadius: 8 }} />
    </label>
  );
}
function Area({ label, value, onChange, placeholder }){
  return (
    <label style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
      <div style={{ color: '#9ca3af', marginBottom: 4 }}>{label}</div>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={4} style={{ width: '100%', padding: 8, background: '#111827', color: '#e5e5e5', border: '1px solid #1f2937', borderRadius: 8 }} />
    </label>
  );
}
function Select({ label, value, onChange, options }){
  return (
    <label style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
      <div style={{ color: '#9ca3af', marginBottom: 4 }}>{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: 8, background: '#111827', color: '#e5e5e5', border: '1px solid #1f2937', borderRadius: 8 }}>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </label>
  );
}
function RangeStyles(){
  return (
    <style>{`
      .tc-range{ -webkit-appearance:none; appearance:none; background:transparent; position:absolute; left:0; right:0; top:0; width:100%; height:28px; margin:0; }
      .tc-range:focus{ outline:none; }
      .tc-range::-webkit-slider-runnable-track{ background:transparent; }
      .tc-range::-moz-range-track{ background:transparent; border:none; }
      .tc-range.low{ z-index:4; }
      .tc-range.high{ z-index:5; pointer-events:none; }
      .tc-range.high::-webkit-slider-thumb{ pointer-events:all; }
      .tc-range.high::-moz-range-thumb{ pointer-events:all; }
      .tc-range::-webkit-slider-thumb{
        -webkit-appearance:none; width:18px; height:18px; border-radius:50%;
        background:#22d3ee; border:2px solid #0b0b0b;
        box-shadow: 0 2px 3px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.35);
      }
      .tc-range::-moz-range-thumb{
        width:18px; height:18px; border-radius:50%;
        background:#22d3ee; border:2px solid #0b0b0b;
        box-shadow: 0 2px 3px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.35);
      }
    `}</style>
  );
}
function YearsRange({ min, max, low, high, onChange }){
  const lo = Math.max(min, Math.min(high, Number.isFinite(low) ? low : min));
  const hi = Math.min(max, Math.max(lo, Number.isFinite(high) ? high : max));
  const pct = (v) => ((v - min) / (max - min)) * 100;
  const leftPct = pct(lo);
  const rightPct = pct(hi);

  const trackStyle = { position: 'absolute', top: 12, left: 0, right: 0, height: 4, background: '#1f2937', borderRadius: 999, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 1px 2px rgba(0,0,0,.6)' };
  const selectionStyle = { position: 'absolute', top: 12, left: (leftPct + '%'), right: ((100 - rightPct) + '%'), height: 4, background: '#4f46e5', borderRadius: 999, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.15), 0 1px 2px rgba(0,0,0,.7)' };
  const inputStyle = { position: 'absolute', left: 0, right: 0, top: 0, width: '100%', height: 28, background: 'transparent' };

  function handleLow(e){ const next = Math.min(Number(e.target.value), hi); onChange(next, hi); }
  function handleHigh(e){ const next = Math.max(Number(e.target.value), lo); onChange(lo, next); }

  return (
    <div style={{ gridColumn: '1 / -1' }}>
      <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 6 }}>Years of experience</div>
      <div style={{ position: 'relative', height: 28 }}>
        <div style={trackStyle} />
        <div style={selectionStyle} />
        <input className='tc-range low' type='range' min={min} max={max} step={1} value={lo} onChange={handleLow} onInput={handleLow} style={inputStyle} />
        <input className='tc-range high' type='range' min={min} max={max} step={1} value={hi} onChange={handleHigh} onInput={handleHigh} style={inputStyle} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12 }}>
        <span>{lo} yrs</span>
        <span>{hi} yrs</span>
      </div>
    </div>
  );
}

/* ===== Auth (no title/border, full-bleed background) ===== */
function Auth({ users, onLogin }){
  const [mode, setMode] = useState('recruiter');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');

  async function login(){
    try{
      setErr('');
      const e = String(email).trim().toLowerCase();
      if (!e.includes('@')){ setErr('Enter a valid email'); return; }

      // Supabase first
      const { data: auth, error: authErr } = await sb.auth.signInWithPassword({ email: e, password: pwd });
      if (!authErr && auth?.user){
        const { data: prof, error: profErr } = await sb.from('profiles').select('*').eq('id', auth.user.id).single();
        if (!profErr && prof){
          if (mode !== prof.role){ setErr(`This account is a ${prof.role}. Switch to the ${prof.role} tab or ask Admin to change the role.`); return; }
          onLogin({ id: prof.id, email: prof.email, role: prof.role, org: prof.org || '', amEmail: prof.account_manager_email || prof.am_email || '' });
          return;
        }
      }

      // Local fallback
      const local = localFindUser(users, e, pwd);
      if (local){
        if (mode !== local.role){ setErr(`This account is a ${local.role}. Switch to the ${local.role} tab.`); return; }
        onLogin(local);
        return;
      }
      setErr('Invalid credentials or profile not found.');
    } catch(ex){
      setErr('Login error. Please try again.');
      console.error(ex);
    }
  }

  return (
    <div style={{
      fontFamily:'system-ui, Arial', background:'#0a0a0a', color:'#e5e5e5',
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      padding:0, position:'relative', overflow:'hidden'
    }}>
      <SkylineBG />
      <div style={{
        width:'100%', maxWidth:380,
        background:'transparent', border:'none', borderRadius:0, padding:16, position:'relative'
      }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          <button onClick={() => setMode('recruiter')} style={{ padding:8, background: mode==='recruiter' ? '#1f2937' : '#111827', color:'#e5e5e5', borderRadius:8 }}>Recruiter</button>
          <button onClick={() => setMode('client')}    style={{ padding:8, background: mode==='client'    ? '#1f2937' : '#111827', color:'#e5e5e5', borderRadius:8 }}>Client</button>
          <button onClick={() => setMode('admin')}     style={{ padding:8, background: mode==='admin'     ? '#1f2937' : '#111827', color:'#e5e5e5', borderRadius:8 }}>Admin</button>
        </div>
        <div style={{ marginTop: 12 }}>
          <Field label='Email' value={email} onChange={setEmail} placeholder='name@company.com' type='email' />
          <Field label='Password' value={pwd} onChange={setPwd} placeholder='your password' type='password' />
          <button onClick={login} style={{ width:'100%', padding:10, marginTop:8, background:'#4f46e5', color:'#fff', borderRadius:8 }}>Log in</button>
          {err ? <div style={{ color:'#f87171', fontSize: 12, marginTop: 8 }}>{err}</div> : null}
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>No self-serve signup. Ask an Admin to add your account.</div>
        </div>
      </div>
    </div>
  );
}

/* ===== Background (full-bleed, no border) ===== */
function SkylineBG(){
  const [failed, setFailed] = useState(false);
  const cover = { position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' };
  if (failed || !NYC_URL){
    return <div aria-hidden='true' style={{ ...cover, background: 'radial-gradient(ellipse at top, #101827, #07070b 60%)' }} />;
  }
  return (
    <div aria-hidden='true' style={cover}>
      <img
        alt=''
        src={NYC_URL}
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.15) contrast(1.1) brightness(0.95)', opacity: 0.95 }}
      />
    </div>
  );
}
