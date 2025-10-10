'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { supabase as sb } from '../lib/supabaseClient';

/*********************************
 * Talent Connector – minimal app w/ Date Entered
 * - Auth with Admin / Recruiter / Client (Supabase-first + local fallback)
 * - Recruiter: add/edit/delete candidates + Candidate Notes + Date Entered
 * - Client: read-only list + keyword filter
 * - Admin: simple placeholder (kept minimal per your request)
 * - No top header or white borders
 *********************************/

// ========= Config =========
const APP_NAME = 'Talent Connector';
const NYC_URL =
  'https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg'; // CC BY 4.0

// ========= Utilities =========
function parseCSV(s) { return String(s||'').split(',').map(x=>x.trim()).filter(Boolean); }
function parseCSVLower(s){ return String(s||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean); }

function buildContactMailto(c, user) {
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
    `• Date Entered: ${c?.dateEntered || ''}`,
    ``,
    `My email: ${user?.email || ''}`,
    ``,
    `Sent from Talent Connector`
  ].join('\n');

  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
}

function filterCandidates(cands, q){
  const s = String(q||'').trim().toLowerCase();
  if (!s) return cands;
  return cands.filter(c => {
    const blob = (
      (c.name||'') + ' ' +
      (c.roles||[]).join(' ') + ' ' +
      (c.practiceAreas||[]).join(' ') + ' ' +
      (c.city||'') + ' ' + (c.state||'') + ' ' +
      (c.notes||'') + ' ' + (c.dateEntered||'')
    ).toLowerCase();
    return blob.includes(s);
  });
}

// ========= Demo seed data =========
const seedCandidates = [
  {
    id: '1',
    name: 'Alexis Chen',
    roles: ['Attorney', 'Contract Attorney'],
    practiceAreas: ['Securities Litigation', 'Internal Investigations'],
    city: 'New York',
    state: 'NY',
    years: 6,
    contract: true,
    hourly: 95,
    salary: 175000,
    notes: 'Strong writer. Securities litigation focus. Immediate.',
    dateEntered: '2025-10-01'
  },
  {
    id: '2',
    name: 'Diego Martinez',
    roles: ['Paralegal'],
    practiceAreas: ['Immigration', 'Global Mobility'],
    city: 'Miami',
    state: 'FL',
    years: 8,
    contract: true,
    hourly: 48,
    salary: 92000,
    notes: 'Immigration paralegal, Spanish bilingual. Remote ready.',
    dateEntered: '2025-09-28'
  }
];

const seedUsers = [
  { id: 'u1', email: 'admin@youragency.com', role: 'admin', org: 'Your Agency', password: 'admin', loginCount: 0, lastLoginAt: null, totalMinutes: 0, sessions: [] },
  { id: 'u2', email: 'recruiter@youragency.com', role: 'recruiter', org: 'Your Agency', password: 'recruit', loginCount: 0, lastLoginAt: null, totalMinutes: 0, sessions: [] },
  { id: 'u3', email: 'client@samplefirm.com', role: 'client', org: 'Sample Firm', password: 'client', loginCount: 0, lastLoginAt: null, totalMinutes: 0, sessions: [] },
];

// ========= Local auth fallback =========
function localFindUser(users, email, pwd){
  const e = String(email||'').toLowerCase();
  return users.find(u => String(u.email||'').toLowerCase() === e && String(u.password||'') === String(pwd||'')) || null;
}

// ========= Page =========
export default function Page(){
  // Users (local mirror to ensure you’re never locked out)
  const [users, setUsers] = useState(() => {
    try { const s = localStorage.getItem('tc_users'); if (s) return JSON.parse(s); } catch {}
    return seedUsers;
  });
  useEffect(() => { try { localStorage.setItem('tc_users', JSON.stringify(users)); } catch {} }, [users]);

  // Candidates
  const [cands, setCands] = useState(() => {
    try { const s = localStorage.getItem('tc_cands'); if (s) return JSON.parse(s); } catch {}
    return seedCandidates;
  });
  useEffect(() => { try { localStorage.setItem('tc_cands', JSON.stringify(cands)); } catch {} }, [cands]);

  // Login state
  const [mode, setMode] = useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [user, setUser] = useState(null);

  async function login(){
    try{
      setErr('');
      const e = String(email).trim().toLowerCase();
      if (!e.includes('@')){ setErr('Enter a valid email'); return; }

      // Supabase-first
      try {
        const { data: auth, error: authErr } = await sb.auth.signInWithPassword({ email: e, password: pwd });
        if (!authErr && auth?.user){
          const { data: prof, error: profErr } = await sb
            .from('profiles')
            .select('id,email,role,org,account_manager_email')
            .eq('id', auth.user.id)
            .single();
          if (!profErr && prof){
            if (mode !== prof.role){ setErr(`This account is a ${prof.role}. Switch to the ${prof.role} tab.`); return; }
            setUser({ id: prof.id, email: prof.email, role: prof.role, org: prof.org || '', amEmail: prof.account_manager_email || '' });
            return;
          }
        }
      } catch {}

      // Fallback: local
      const u = localFindUser(users, e, pwd);
      if (!u){ setErr('Invalid credentials'); return; }
      if (u.role !== mode){ setErr(`This account is a ${u.role}. Switch to the ${u.role} tab.`); return; }
      setUser({ id: u.id, email: u.email, role: u.role, org: u.org || '' });
    } catch(ex){
      console.error(ex);
      setErr('Login error. Please try again.');
    }
  }
  async function logout(){ try{ await sb.auth.signOut(); }catch{} setUser(null); setEmail(''); setPwd(''); setMode('recruiter'); }

  // Styles
  const pageStyle = { minHeight:'100vh', display:'grid', placeItems:'center', background:'#0a0a0a', color:'#e5e5e5', fontFamily:'system-ui, Arial' };
  const card = { width:'100%', maxWidth: 380, background:'#0b0b0b', border:'1px solid #1f2937', borderRadius:12, padding:16 };
  const bodyStyle = { fontFamily:'system-ui, Arial', background:'#0a0a0a', color:'#e5e5e5', minHeight:'100vh', padding:16 };

  // ===== Admin: simple placeholder (no API invite) =====
  if (user && user.role === 'admin'){
    return (
      <div style={{ ...pageStyle, alignItems:'start' }}>
        <div style={{ ...card, marginTop:40 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>Admin (signed in as {user.email})</div>
            <button onClick={logout} style={{ fontSize:12 }}>Log out</button>
          </div>
          <div style={{ fontSize:12, color:'#9ca3af', marginTop:8 }}>
            Admin placeholder. You can add real users in <strong>Supabase → Auth → Users</strong> + matching row in <strong>public.profiles</strong>.
          </div>
        </div>
      </div>
    );
  }

  // ===== Client screen (read-only list + keyword) =====
  if (user && user.role === 'client'){
    const [q, setQ] = useState('');
    const filtered = useMemo(() => filterCandidates(cands, q), [cands, q]);
    return (
      <div style={bodyStyle}>
        <SkylineBG />
        <div style={{ width:'100%', maxWidth:900, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontWeight:700, fontSize:18 }}>Client</div>
            <button onClick={logout} style={{ fontSize:12 }}>Log out</button>
          </div>
          <div style={{ marginTop:12 }}>
            <label style={{ fontSize:12, color:'#9ca3af' }}>Keyword (name, title, law, location, notes, date)</label>
            <input value={q} onChange={e=>setQ(e.target.value)} style={{ width:'100%', padding:8, background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:8 }} />
          </div>
          <div style={{ marginTop:8 }}>
            {filtered.map(c => (
              <Card
                key={c.id}
                c={c}
                canEdit={false}
                onDelete={()=>{}}
                onUpdate={()=>{}}
                userRole={user.role}
                clientInfo={{ email: user.email, amEmail: user.amEmail || '' }}
              />
            ))}
            {filtered.length===0 ? <div style={{ color:'#9ca3af', fontSize:12, marginTop:8 }}>No results.</div> : null}
          </div>
        </div>
      </div>
    );
  }

  // ===== Recruiter screen (add/edit/delete + Date Entered) =====
  if (user && user.role === 'recruiter'){
    const [q, setQ] = useState('');
    const filtered = useMemo(() => filterCandidates(cands, q), [cands, q]);
    function addCandidate(rec){ setCands(prev => [...prev, rec]); }
    function updateCandidate(id, patch){ setCands(prev => prev.map(x => x.id===id ? { ...x, ...patch } : x)); }
    function removeCandidate(id){ setCands(prev => prev.filter(x => x.id!==id)); }

    return (
      <div style={bodyStyle}>
        <SkylineBG />
        <div style={{ width:'100%', maxWidth:900, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontWeight:700, fontSize:18 }}>Recruiter</div>
            <button onClick={logout} style={{ fontSize:12 }}>Log out</button>
          </div>

          <RecruiterAddForm onAdd={addCandidate} />

          <div style={{ marginTop:12 }}>
            <label style={{ fontSize:12, color:'#9ca3af' }}>Keyword (name, title, law, location, notes, date)</label>
            <input value={q} onChange={e=>setQ(e.target.value)} style={{ width:'100%', padding:8, background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:8 }} />
          </div>

          <div style={{ marginTop:8 }}>
            {filtered.map(c => (
              <Card
                key={c.id}
                c={c}
                canEdit={true}
                onDelete={removeCandidate}
                onUpdate={updateCandidate}
                userRole={user.role}
                clientInfo={{ email: user.email, amEmail: user.amEmail || '' }}
              />
            ))}
            {filtered.length===0 ? <div style={{ color:'#9ca3af', fontSize:12, marginTop:8 }}>No results.</div> : null}
          </div>
        </div>
      </div>
    );
  }

  // ===== Login screen =====
  return (
    <div style={pageStyle}>
      <SkylineBG />
      <div style={{ ...card }}>
        <div style={{ textAlign:'center', fontWeight:700 }}>{APP_NAME}</div>
        <div style={{ textAlign:'center', fontSize:12, color:'#9ca3af', marginBottom:8 }}>Invitation-only access</div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          <button onClick={()=>setMode('recruiter')} style={{ padding:8, background: mode==='recruiter' ? '#1f2937' : '#111827', color:'#e5e5e5', borderRadius:8 }}>Recruiter</button>
          <button onClick={()=>setMode('client')} style={{ padding:8, background: mode==='client' ? '#1f2937' : '#111827', color:'#e5e5e5', borderRadius:8 }}>Client</button>
          <button onClick={()=>setMode('admin')} style={{ padding:8, background: mode==='admin' ? '#1f2937' : '#111827', color:'#e5e5e5', borderRadius:8 }}>Admin</button>
        </div>

        <div style={{ marginTop:12 }}>
          <Field label='Email' value={email} onChange={setEmail} placeholder='name@company.com' type='email' />
          <Field label='Password' value={pwd} onChange={setPwd} placeholder='your password' type='password' />
          <button onClick={login} style={{ width:'100%', padding:10, marginTop:8, background:'#4f46e5', color:'white', borderRadius:8 }}>Log in</button>
          {err ? <div style={{ color:'#f87171', fontSize:12, marginTop:8 }}>{err}</div> : null}
          <div style={{ fontSize:11, color:'#9ca3af', marginTop:6 }}>
            Seed admin available: <strong>admin@youragency.com / admin</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========= Inputs =========
function Field({ label, value, onChange, placeholder, type='text' }){
  return (
    <label style={{ display:'block', fontSize:12, marginTop:6 }}>
      <div style={{ color:'#9ca3af', marginBottom:4 }}>{label}</div>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{ width:'100%', padding:8, background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:8 }} />
    </label>
  );
}
function Num({ label, value, onChange }){
  return (
    <label style={{ display:'block', fontSize:12, marginTop:6 }}>
      <div style={{ color:'#9ca3af', marginBottom:4 }}>{label}</div>
      <input type='number' value={value} onChange={e=>onChange(e.target.value)} style={{ width:'100%', padding:8, background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:8 }} />
    </label>
  );
}
function Area({ label, value, onChange, placeholder }){
  return (
    <label style={{ display:'block', fontSize:12, marginTop:6 }}>
      <div style={{ color:'#9ca3af', marginBottom:4 }}>{label}</div>
      <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={4} style={{ width:'100%', padding:8, background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:8 }} />
    </label>
  );
}

// ========= Recruiter Add Form (includes Date Entered) =========
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
  const [dateEntered, setDateEntered] = useState(() => {
    const d = new Date();
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  });

  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  function submit(){
    setErr(''); setOk('');
    if (!name.trim()){ setErr('Name is required'); return; }
    const rec = {
      id: 'c'+Math.random().toString(36).slice(2,8),
      name: name.trim(),
      roles: (roles ? parseCSV(roles) : ['Attorney']),
      practiceAreas: (practice ? parseCSV(practice) : []),
      years: Number(years)||0,
      city: city.trim(),
      state: state.trim(),
      salary: Number(salary)||0,
      contract: !!contract,
      hourly: contract ? (Number(hourly)||0) : 0,
      notes: String(notes||''),
      dateEntered: dateEntered || null
    };
    onAdd(rec);
    setOk('Candidate added');
    setName(''); setRoles(''); setPractice(''); setYears('');
    setCity(''); setState(''); setSalary(''); setContract(false);
    setHourly(''); setNotes('');
    const d = new Date(); const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0');
    setDateEntered(`${d.getFullYear()}-${mm}-${dd}`);
  }

  return (
    <div style={{ marginTop:12, border:'1px solid #1f2937', borderRadius:12, padding:12, background:'#0b0b0b' }}>
      <div style={{ fontWeight:700, marginBottom:8 }}>Add candidate</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:8 }}>
        <Field label='Full name' value={name} onChange={setName} />
        <Field label='Titles (CSV)' value={roles} onChange={setRoles} placeholder='Attorney, Paralegal' />
        <Field label='Type of Law (CSV)' value={practice} onChange={setPractice} placeholder='Litigation, Immigration' />
        <Num label='Years of experience' value={years} onChange={setYears} />
        <Field label='City' value={city} onChange={setCity} />
        <Field label='State' value={state} onChange={setState} />
        <Num label='Salary desired' value={salary} onChange={setSalary} />
        <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, marginTop:6 }}>
          <input type='checkbox' checked={contract} onChange={e=>setContract(e.target.checked)} />
          <span>Available for contract</span>
        </label>
        {contract ? <Num label='Hourly rate' value={hourly} onChange={setHourly} /> : null}

        {/* Date Entered */}
        <label style={{ display:'block', fontSize:12, marginTop:6 }}>
          <div style={{ color:'#9ca3af', marginBottom:4 }}>Date Entered</div>
          <input type='date' value={dateEntered || ''} onChange={e=>setDateEntered(e.target.value)} style={{ width:'100%', padding:8, background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:8 }} />
        </label>
      </div>
      <Area label='Candidate Notes' value={notes} onChange={setNotes} placeholder='Short summary: strengths, availability, fit notes.' />
      <div style={{ display:'flex', gap:8, marginTop:8 }}>
        <button onClick={submit} style={{ fontSize:12 }}>Add candidate</button>
        {err ? <div style={{ fontSize:12, color:'#f87171' }}>{err}</div> : null}
        {ok ? <div style={{ fontSize:12, color:'#a7f3d0' }}>{ok}</div> : null}
      </div>
    </div>
  );
}

// ========= Candidate Card (shows & edits Date Entered) =========
function Card({ c, canEdit, onDelete, onUpdate, userRole, clientInfo }){
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(c.name);
  const [rolesCSV, setRolesCSV] = useState((c.roles||[]).join(', '));
  const [lawCSV, setLawCSV] = useState((c.practiceAreas||[]).join(', '));
  const [salary, setSalary] = useState(String(c.salary||''));
  const [contract, setContract] = useState(!!c.contract);
  const [hourly, setHourly] = useState(String(c.hourly||''));
  const [notes, setNotes] = useState(c.notes||'');
  const [dateEntered, setDateEntered] = useState(c.dateEntered || '');

  function save(){
    if (contract && (!hourly || Number(hourly) <= 0)) return;
    const rolesArr = parseCSV(rolesCSV).length ? parseCSV(rolesCSV) : ['Attorney'];
    const lawArr = parseCSV(lawCSV);
    onUpdate(c.id, {
      name: String(name||''),
      roles: rolesArr,
      practiceAreas: lawArr,
      salary: Number(salary)||0,
      contract: !!contract,
      hourly: contract ? Number(hourly)||0 : 0,
      notes: String(notes||''),
      city: c.city,
      state: c.state,
      years: c.years,
      dateEntered: dateEntered || null
    });
    setEdit(false);
  }
  function badge(text){ return (<span key={text} style={{ display:'inline-block', fontSize:11, padding:'2px 8px', background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:999, marginRight:6, marginBottom:4 }}>{text}</span>); }

  return (
    <div style={{ border:'1px solid #1f2937', borderRadius:12, padding:12, marginBottom:8, background:'#0b0b0b' }}>
      {!edit ? (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontWeight:600 }}>{c.name}</div>
              <div style={{ fontSize:12, color:'#9ca3af' }}>
                {(c.city||'') + (c.state ? ', ' + c.state : '')} - {c.years} yrs
              </div>
              {c.dateEntered ? (
                <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>
                  Date Entered: {c.dateEntered}
                </div>
              ) : null}
            </div>
            {canEdit ? (
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>setEdit(true)} style={{ fontSize:12 }}>Edit</button>
                <button onClick={()=>onDelete(c.id)} style={{ fontSize:12 }}>Delete</button>
              </div>
            ) : null}
          </div>

          {(c.roles&&c.roles.length) ? (<div style={{ marginTop:6 }}>{(c.roles||[]).map(r=>badge(r))}</div>) : null}
          {(c.practiceAreas&&c.practiceAreas.length) ? (
            <div style={{ marginTop:6 }}>
              <div style={{ fontSize:12, color:'#9ca3af', marginBottom:4 }}>Type of law</div>
              {(c.practiceAreas||[]).map(p=>badge(p))}
            </div>
          ) : null}

          {(String(c.notes||'').trim()) ? (
            <div style={{ fontSize:12, color:'#e5e5e5', background:'#0d1b2a', border:'1px solid #1e3a8a', borderRadius:8, padding:8, marginTop:8 }}>
              <div style={{ fontWeight:600, marginBottom:4 }}>Candidate Notes</div>
              <div>{c.notes}</div>
            </div>
          ) : null}

          <div style={{ fontSize:12, color:'#e5e5e5', marginTop:6 }}>Salary: {c.salary ? ('$' + c.salary) : '-'}</div>
          <div style={{ fontSize:12, color:'#e5e5e5' }}>Contract: {c.contract ? ('Yes' + (c.hourly ? ', $' + c.hourly + '/hr' : '')) : 'No'}</div>

          {userRole === 'client' && (
            <div style={{ marginTop:8 }}>
              <a
                href={buildContactMailto(c, clientInfo)}
                style={{ display:'inline-block', padding:'8px 12px', borderRadius:8, background:'#2563eb', color:'#fff', textDecoration:'none', boxShadow:'0 2px 4px rgba(0,0,0,.25)' }}
              >
                Contact
              </a>
              <span style={{ marginLeft:8, fontSize:12, color:'#9ca3af' }}>
                {clientInfo?.amEmail ? `Sales contact: ${clientInfo.amEmail}` : 'No salesperson assigned yet'}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div>
          <Field label='Full name' value={name} onChange={setName} />
          <Field label='Titles (comma separated)' value={rolesCSV} onChange={setRolesCSV} placeholder='Attorney, Contract Attorney' />
          <Field label='Type of law (comma separated)' value={lawCSV} onChange={setLawCSV} placeholder='Securities Litigation, Immigration' />
          <Field label='Desired salary' value={salary} onChange={setSalary} />
          <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, marginTop:6 }}>
            <input type='checkbox' checked={contract} onChange={e=>setContract(e.target.checked)} />
            <span>Available for contract</span>
          </label>
          {contract ? <Field label='Hourly rate' value={hourly} onChange={setHourly} /> : null}

          {/* Editable Date Entered */}
          <label style={{ display:'block', fontSize:12, marginTop:6 }}>
            <div style={{ color:'#9ca3af', marginBottom:4 }}>Date Entered</div>
            <input
              type='date'
              value={dateEntered || ''}
              onChange={e=>setDateEntered(e.target.value)}
              style={{ width:'100%', padding:8, background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:8 }}
            />
          </label>

          <Area label='Candidate Notes' value={notes} onChange={setNotes} placeholder='Short summary: strengths, availability, fit notes.' />
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button onClick={save} style={{ fontSize:12 }}>Save</button>
            <button onClick={()=>setEdit(false)} style={{ fontSize:12 }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ========= Background (single-root, safe) =========
function SkylineBG(){
  const [failed, setFailed] = useState(false);
  const style = { position:'fixed', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:0, opacity:0.25 };
  if (failed || !NYC_URL){
    return (<div aria-hidden='true' style={{ ...style, background:'radial-gradient(ellipse at top, #101827, #07070b 60%)' }} />);
  }
  return (
    <div aria-hidden='true' style={style}>
      <img alt='' src={NYC_URL} onError={()=>setFailed(true)} style={{ width:'100%', height:'100%', objectFit:'cover', filter:'grayscale(0.18) contrast(1.08) brightness(0.95)' }} />
    </div>
  );
}
