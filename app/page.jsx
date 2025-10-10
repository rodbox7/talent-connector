const BUILD_TAG = 'supa-v2';

'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { supabase as sb } from '../lib/supabaseClient';

// ---------- Config ----------
const APP_NAME = 'Talent Connector';
const NYC_URL = 'https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg';

// ---------- Local fallback users so you’re never locked out ----------
const seedUsers = [
  { id: 'u1', email: 'admin@youragency.com', role: 'admin', org: 'Your Agency', password: 'admin' },
  { id: 'u2', email: 'recruiter@youragency.com', role: 'recruiter', org: 'Your Agency', password: 'recruit' },
  { id: 'u3', email: 'client@samplefirm.com', role: 'client', org: 'Sample Firm', password: 'client' },
];
function localFindUser(users, email, pwd){
  const e = String(email||'').toLowerCase();
  return users.find(u => String(u.email||'').toLowerCase() === e && String(u.password||'') === String(pwd||'')) || null;
}

// ---------- Helpers ----------
function parseCSV(s){ return String(s||'').split(',').map(x=>x.trim()).filter(Boolean); }
function yyyymmdd(str){
  if (!str) return null;
  const m = String(str).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? Number(m[1]+m[2]+m[3]) : null;
}
function buildContactMailto(c, user){
  const to = user?.amEmail || 'info@youragency.com';
  const subj = `Talent Connector Candidate – ${c?.name || ''}`;
  const body = [
    `Hello,`,
    ``,
    `I'm interested in this candidate:`,
    `• Name: ${c?.name || ''}`,
    `• Title(s): ${(c?.roles || []).join(', ')}`,
    `• Practice Areas: ${(c?.practice_areas || c?.practiceAreas || []).join(', ')}`,
    `• Location: ${[c?.city, c?.state].filter(Boolean).join(', ')}`,
    `• Years: ${c?.years ?? ''}`,
    `• Years in Most Recent Position: ${c?.years_in_most_recent ?? c?.yearsInMostRecent ?? ''}`,
    `• Date Entered: ${c?.date_entered || c?.dateEntered || ''}`,
    ``,
    `My email: ${user?.email || ''}`,
    ``,
    `Sent from Talent Connector`,
  ].join('\n');
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
}

function SkylineBG(){
  const [failed, setFailed] = useState(false);
  const style = { position:'fixed', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:0, opacity:0.25 };
  if (failed || !NYC_URL) return <div aria-hidden style={{ ...style, background:'radial-gradient(ellipse at top, #101827, #07070b 60%)' }} />;
  return (
    <div aria-hidden style={style}>
      <img alt="" src={NYC_URL} onError={()=>setFailed(true)} style={{ width:'100%', height:'100%', objectFit:'cover', filter:'grayscale(.18) contrast(1.08) brightness(.95)' }} />
    </div>
  );
}

// ---------- Data access (Supabase) ----------
async function fetchCandidates(){
  return sb.from('candidates')
    .select('*')
    .order('date_entered', { ascending: false })
    .order('created_at', { ascending: false });
}
async function insertCandidate(rec){
  return sb.from('candidates').insert(rec).select('*').single();
}
async function updateCandidateRow(id, patch){
  return sb.from('candidates').update(patch).eq('id', id).select('*').single();
}
async function deleteCandidateRow(id){
  return sb.from('candidates').delete().eq('id', id);
}

// ---------- Page ----------
export default function Page(){
  // users mirror for local fallback login
  const [users, setUsers] = useState(() => {
    try{ const s = localStorage.getItem('tc_users'); if (s) return JSON.parse(s); }catch{}
    return seedUsers;
  });
  useEffect(()=>{ try{ localStorage.setItem('tc_users', JSON.stringify(users)); }catch{} }, [users]);

  // auth
  const [mode, setMode] = useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [user, setUser] = useState(null);

  // candidates
  const [cands, setCands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataErr, setDataErr] = useState('');

  // filters
  const [q, setQ] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minRecentYears, setMinRecentYears] = useState('');
  const [maxRecentYears, setMaxRecentYears] = useState('');

  // load candidates from supabase after login (client/recruiter/admin)
  useEffect(()=>{
    async function go(){
      if (!user) return;
      setLoading(true); setDataErr('');
      const { data, error } = await fetchCandidates();
      if (error){ setDataErr(error.message || 'Load error'); setLoading(false); return; }
      setCands(data || []);
      setLoading(false);
    }
    go();
  }, [user]);

  async function login(){
    try{
      setErr('');
      const e = String(email).trim().toLowerCase();
      if (!e.includes('@')){ setErr('Enter a valid email'); return; }

      // Supabase-first
      const { data: auth, error: authErr } = await sb.auth.signInWithPassword({ email: e, password: pwd });
      if (!authErr && auth?.user){
        const { data: prof, error: profErr } = await sb
          .from('profiles')
          .select('id,email,role,org,account_manager_email')
          .eq('id', auth.user.id)
          .single();

        if (profErr || !prof){ setErr('Login ok, but profile missing. Ask Admin to add your profile.'); return; }
        if (mode !== prof.role){ setErr(`This account is a ${prof.role}. Switch to the ${prof.role} tab.`); return; }

        setUser({ id: prof.id, email: prof.email, role: prof.role, org: prof.org || '', amEmail: prof.account_manager_email || '' });
        return;
      }

      // fallback local
      const u = localFindUser(users, e, pwd);
      if (!u){ setErr('Invalid credentials'); return; }
      if (u.role !== mode){ setErr(`This account is a ${u.role}. Switch to the ${u.role} tab.`); return; }
      setUser({ id: u.id, email: u.email, role: u.role, org: u.org || '' });
    }catch(ex){
      console.error(ex);
      setErr('Login error. Please try again.');
    }
  }
  async function logout(){
    try{ await sb.auth.signOut(); }catch{}
    setUser(null); setEmail(''); setPwd(''); setMode('recruiter'); setCands([]);
  }

  // filter & sort (server already sorts by date, but we keep client safety)
  const filtered = useMemo(()=>{
    const s = String(q||'').toLowerCase().trim();
    const fromN = yyyymmdd(dateFrom);
    const toN   = yyyymmdd(dateTo);
    const minRY = Number(minRecentYears||0);
    const maxRY = Number(maxRecentYears||0);

    const out = (cands||[]).filter(c=>{
      if (s){
        const blob = (
          (c.name||'') + ' ' +
          (c.roles||[]).join(' ') + ' ' +
          (c.practice_areas||[]).join(' ') + ' ' +
          (c.city||'') + ' ' + (c.state||'') + ' ' +
          (c.notes||'') + ' ' +
          (c.date_entered||'') + ' ' +
          String(c.years_in_most_recent ?? '')
        ).toLowerCase();
        if (!blob.includes(s)) return false;
      }
      if (fromN || toN){
        const n = yyyymmdd(c.date_entered);
        if (!n) return false;
        if (fromN && n < fromN) return false;
        if (toN && n > toN) return false;
      }
      const yrs = Number(c.years_in_most_recent || 0);
      if (minRY && yrs < minRY) return false;
      if (maxRY && yrs > maxRY) return false;
      return true;
    });

    return out.sort((a,b)=> (yyyymmdd(b.date_entered)||0) - (yyyymmdd(a.date_entered)||0));
  }, [cands, q, dateFrom, dateTo, minRecentYears, maxRecentYears]);

  // recruiter actions
  async function addCandidate(rec){
    // ensure date format yyyy-mm-dd
    const toInsert = {
      name: rec.name,
      roles: rec.roles || [],
      practice_areas: rec.practiceAreas || [],
      city: rec.city || null,
      state: rec.state || null,
      years: Number(rec.years)||0,
      years_in_most_recent: Number(rec.yearsInMostRecent)||0,
      salary: Number(rec.salary)||0,
      contract: !!rec.contract,
      hourly: Number(rec.hourly)||0,
      notes: rec.notes || '',
      date_entered: rec.dateEntered || null,
      created_by: (await sb.auth.getUser()).data.user?.id || null,
    };

    const { data, error } = await insertCandidate(toInsert);
    if (error){ alert('Add failed: ' + error.message); return; }
    setCands(prev => [data, ...prev]);
  }

  async function updateCandidate(id, patch){
    const p = {
      name: patch.name,
      roles: patch.roles,
      practice_areas: patch.practiceAreas,
      city: patch.city, state: patch.state,
      years: Number(patch.years)||0,
      years_in_most_recent: Number(patch.yearsInMostRecent)||0,
      salary: Number(patch.salary)||0,
      contract: !!patch.contract,
      hourly: Number(patch.hourly)||0,
      notes: patch.notes,
      date_entered: patch.dateEntered || null
    };
    const { data, error } = await updateCandidateRow(id, p);
    if (error){ alert('Update failed: ' + error.message); return; }
    setCands(prev => prev.map(x => x.id===id ? data : x));
  }

  async function removeCandidate(id){
    const { error } = await deleteCandidateRow(id);
    if (error){ alert('Delete failed: ' + error.message); return; }
    setCands(prev => prev.filter(x => x.id !== id));
  }

  // ---------- Screens ----------
  const pageStyle = { minHeight:'100vh', display:'grid', placeItems:'center', background:'#0a0a0a', color:'#e5e5e5', fontFamily:'system-ui, Arial' };
  const card = { width:'100%', maxWidth: 380, background:'#0b0b0b', border:'1px solid #1f2937', borderRadius:12, padding:16 };
  const bodyStyle = { fontFamily:'system-ui, Arial', background:'#0a0a0a', color:'#e5e5e5', minHeight:'100vh', padding:16, position:'relative', zIndex:1 };

  // Admin placeholder (users managed in Supabase)
  if (user && user.role === 'admin'){
    return (
      <div style={{ ...pageStyle, alignItems:'start' }}>
        <SkylineBG />
        <div style={{ ...card, marginTop:40 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>Admin (signed in as {user.email})</div>
            <button onClick={logout} style={{ fontSize:12 }}>Log out</button>
          </div>
          <div style={{ fontSize:12, color:'#9ca3af', marginTop:8 }}>
            Manage users in <strong>Supabase → Auth → Users</strong> and matching rows in <strong>public.profiles</strong>.
          </div>
        </div>
      </div>
    );
  }

  // Client (read-only)
  if (user && user.role === 'client'){
    return (
      <div style={bodyStyle}>
        <SkylineBG />
        <div style={{ width:'100%', maxWidth:1000, margin:'0 auto' }}>
          <Header title="Client" onLogout={logout} />
          <Filters
            q={q} setQ={setQ}
            dateFrom={dateFrom} setDateFrom={setDateFrom}
            dateTo={dateTo} setDateTo={setDateTo}
            minRecentYears={minRecentYears} setMinRecentYears={setMinRecentYears}
            maxRecentYears={maxRecentYears} setMaxRecentYears={setMaxRecentYears}
            onClear={()=>{ setQ(''); setDateFrom(''); setDateTo(''); setMinRecentYears(''); setMaxRecentYears(''); }}
          />
          {loading ? <Hint>Loading…</Hint> : null}
          {dataErr ? <ErrorHint>{dataErr}</ErrorHint> : null}
          <List
            items={filtered}
            canEdit={false}
            onDelete={()=>{}}
            onUpdate={()=>{}}
            userRole={user.role}
            clientInfo={{ email: user.email, amEmail: user.amEmail || '' }}
          />
        </div>
      </div>
    );
  }

  // Recruiter (full CRUD)
  if (user && user.role === 'recruiter'){
    return (
      <div style={bodyStyle}>
        <SkylineBG />
        <div style={{ width:'100%', maxWidth:1000, margin:'0 auto' }}>
          <Header title="Recruiter" onLogout={logout} />
          <RecruiterAddForm onAdd={addCandidate} />
          <Filters
            q={q} setQ={setQ}
            dateFrom={dateFrom} setDateFrom={setDateFrom}
            dateTo={dateTo} setDateTo={setDateTo}
            minRecentYears={minRecentYears} setMinRecentYears={setMinRecentYears}
            maxRecentYears={maxRecentYears} setMaxRecentYears={setMaxRecentYears}
            onClear={()=>{ setQ(''); setDateFrom(''); setDateTo(''); setMinRecentYears(''); setMaxRecentYears(''); }}
          />
          {loading ? <Hint>Loading…</Hint> : null}
          {dataErr ? <ErrorHint>{dataErr}</ErrorHint> : null}
          <List
            items={filtered}
            canEdit={true}
            onDelete={removeCandidate}
            onUpdate={updateCandidate}
            userRole={user.role}
            clientInfo={{ email: user.email, amEmail: user.amEmail || '' }}
          />
        </div>
      </div>
    );
  }

  // Login
  return (
    <div style={pageStyle}>
      <SkylineBG />
      <div style={card}>
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

// ---------- UI bits ----------
function Header({ title, onLogout }){
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <div style={{ fontWeight:700, fontSize:18 }}>{title}</div>
      <button onClick={onLogout} style={{ fontSize:12 }}>Log out</button>
    </div>
  );
}
function Hint({ children }){ return <div style={{ fontSize:12, color:'#9ca3af', marginTop:8 }}>{children}</div>; }
function ErrorHint({ children }){ return <div style={{ fontSize:12, color:'#f87171', marginTop:8 }}>{children}</div>; }

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

function Filters({
  q, setQ,
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  minRecentYears, setMinRecentYears,
  maxRecentYears, setMaxRecentYears,
  onClear
}){
  return (
    <div style={{ marginTop:12, border:'1px solid #1f2937', borderRadius:12, padding:12, background:'#0b0b0b' }}>
      <div style={{ fontWeight:600, marginBottom:8 }}>Filters</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:8 }}>
        <Field label='Keyword' value={q} onChange={setQ} placeholder='name, law, notes, city, date...' />
        <label style={{ display:'block', fontSize:12, marginTop:6 }}>
          <div style={{ color:'#9ca3af', marginBottom:4 }}>Date Entered (From)</div>
          <input type='date' value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{ width:'100%', padding:8, background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:8 }} />
        </label>
        <label style={{ display:'block', fontSize:12, marginTop:6 }}>
          <div style={{ color:'#9ca3af', marginBottom:4 }}>Date Entered (To)</div>
          <input type='date' value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{ width:'100%', padding:8, background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:8 }} />
        </label>
        <Num label='Min Years in Most Recent' value={minRecentYears} onChange={setMinRecentYears} />
        <Num label='Max Years in Most Recent' value={maxRecentYears} onChange={setMaxRecentYears} />
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
        <button onClick={onClear} style={{ fontSize:12, padding:'6px 10px', border:'1px solid #1f2937', borderRadius:8 }}>Clear filters</button>
      </div>
    </div>
  );
}

function RecruiterAddForm({ onAdd }){
  const [name, setName] = useState('');
  const [roles, setRoles] = useState('');
  const [practice, setPractice] = useState('');
  const [years, setYears] = useState('');
  const [yearsInMostRecent, setYearsInMostRecent] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [salary, setSalary] = useState('');
  const [contract, setContract] = useState(false);
  const [hourly, setHourly] = useState('');
  const [notes, setNotes] = useState('');
  const [dateEntered, setDateEntered] = useState(()=>{
    const d = new Date(); const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  });

  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  async function submit(){
    setErr(''); setOk('');
    if (!name.trim()){ setErr('Name is required'); return; }
    const rec = {
      name: name.trim(),
      roles: roles ? parseCSV(roles) : ['Attorney'],
      practiceAreas: practice ? parseCSV(practice) : [],
      years: Number(years)||0,
      yearsInMostRecent: Number(yearsInMostRecent)||0,
      city: city.trim() || null,
      state: state.trim() || null,
      salary: Number(salary)||0,
      contract: !!contract,
      hourly: contract ? (Number(hourly)||0) : 0,
      notes: String(notes||''),
      dateEntered: dateEntered || null
    };
    await onAdd(rec);
    setOk('Candidate added');

    setName(''); setRoles(''); setPractice(''); setYears(''); setYearsInMostRecent('');
    setCity(''); setState(''); setSalary(''); setContract(false); setHourly(''); setNotes('');
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
        <Num label='Years in Most Recent Position' value={yearsInMostRecent} onChange={setYearsInMostRecent} />
        <Field label='City' value={city} onChange={setCity} />
        <Field label='State' value={state} onChange={setState} />
        <Num label='Salary desired' value={salary} onChange={setSalary} />
        <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, marginTop:6 }}>
          <input type='checkbox' checked={contract} onChange={e=>setContract(e.target.checked)} />
          <span>Available for contract</span>
        </label>
        {contract ? <Num label='Hourly rate' value={hourly} onChange={setHourly} /> : null}
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

function List({ items, canEdit, onDelete, onUpdate, userRole, clientInfo }){
  return (
    <div style={{ marginTop:8 }}>
      {items.map(c => (
        <Card
          key={c.id}
          c={c}
          canEdit={canEdit}
          onDelete={onDelete}
          onUpdate={onUpdate}
          userRole={userRole}
          clientInfo={clientInfo}
        />
      ))}
      {items.length===0 ? <div style={{ color:'#9ca3af', fontSize:12, marginTop:8 }}>No results.</div> : null}
    </div>
  );
}

function Card({ c, canEdit, onDelete, onUpdate, userRole, clientInfo }){
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(c.name);
  const [rolesCSV, setRolesCSV] = useState((c.roles||[]).join(', '));
  const [lawCSV, setLawCSV] = useState((c.practice_areas||[]).join(', '));
  const [salary, setSalary] = useState(String(c.salary||''));
  const [contract, setContract] = useState(!!c.contract);
  const [hourly, setHourly] = useState(String(c.hourly||''));
  const [notes, setNotes] = useState(c.notes||'');
  const [dateEntered, setDateEntered] = useState(c.date_entered || '');
  const [yearsInMostRecent, setYearsInMostRecent] = useState(String(c.years_in_most_recent || ''));

  async function save(){
    const rolesArr = parseCSV(rolesCSV).length ? parseCSV(rolesCSV) : ['Attorney'];
    const lawArr = parseCSV(lawCSV);
    await onUpdate(c.id, {
      name: String(name||''),
      roles: rolesArr,
      practiceAreas: lawArr,
      salary: Number(salary)||0,
      contract: !!contract,
      hourly: contract ? Number(hourly)||0 : 0,
      notes: String(notes||''),
      city: c.city, state: c.state, years: c.years,
      yearsInMostRecent: Number(yearsInMostRecent)||0,
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
              {(c.years_in_most_recent !== undefined) ? (
                <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>Most Recent Position: {c.years_in_most_recent} yrs</div>
              ) : null}
              {c.date_entered ? (
                <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>Date Entered: {c.date_entered}</div>
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
          {(c.practice_areas&&c.practice_areas.length) ? (
            <div style={{ marginTop:6 }}>
              <div style={{ fontSize:12, color:'#9ca3af', marginBottom:4 }}>Type of law</div>
              {(c.practice_areas||[]).map(p=>badge(p))}
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
              <a href={buildContactMailto(c, clientInfo)} style={{ display:'inline-block', padding:'8px 12px', borderRadius:8, background:'#2563eb', color:'#fff', textDecoration:'none' }}>
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

          <label style={{ display:'block', fontSize:12, marginTop:6 }}>
            <div style={{ color:'#9ca3af', marginBottom:4 }}>Date Entered</div>
            <input type='date' value={dateEntered || ''} onChange={e=>setDateEntered(e.target.value)} style={{ width:'100%', padding:8, background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:8 }} />
          </label>
          <Num label='Years in Most Recent Position' value={yearsInMostRecent} onChange={setYearsInMostRecent} />

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
