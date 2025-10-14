'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { supabase as sb } from '../lib/supabaseClient';

/* ===================== Config ===================== */
const APP_NAME = 'Talent Connector - Powered by Beacon Hill Legal';
const NYC_URL =
  'https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg'; // CC BY 4.0

/* ===================== Helpers ===================== */
const parseCSV = (s) => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
const parseLower = (s) => String(s || '').trim().toLowerCase();

function SkylineBG() {
  const [failed, setFailed] = useState(false);
  const style = { position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' };
  if (failed || !NYC_URL) {
    return <div aria-hidden style={{...style, background:'radial-gradient(ellipse at top, #101827, #07070b 60%)'}}/>;
  }
  return (
    <div aria-hidden style={style}>
      <img src={NYC_URL} alt="" onError={() => setFailed(true)}
           style={{width:'100%',height:'100%',objectFit:'cover',filter:'grayscale(.1) contrast(1.1) brightness(.9)'}}/>
      <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.35)'}} />
    </div>
  );
}

/* ===================== Root ===================== */
export default function Page() {
  const [mode, setMode]   = useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = useState('');
  const [pwd, setPwd]     = useState('');
  const [err, setErr]     = useState('');
  const [user, setUser]   = useState(null);

  // login via Supabase Auth + profiles
  async function login() {
    try {
      setErr('');
      const e = parseLower(email);
      if (!e.includes('@')) { setErr('Enter a valid email'); return; }

      const { data: auth, error: authErr } = await sb.auth.signInWithPassword({ email: e, password: pwd });
      if (authErr || !auth?.user) { setErr('Invalid credentials'); return; }

      const { data: prof, error: profErr } = await sb
        .from('profiles')
        .select('id,email,role,org,account_manager_email')
        .eq('id', auth.user.id)
        .single();

      if (profErr || !prof) { setErr('Profile not found. Ask Admin.'); return; }
      if (prof.role !== mode) { setErr(`This account is a ${prof.role}. Switch to ${prof.role}.`); return; }

      setUser({ id: prof.id, email: prof.email, role: prof.role, org: prof.org || '', amEmail: prof.account_manager_email || '' });
    } catch (ex) {
      console.error(ex); setErr('Login error.');
    }
  }
  async function logout() {
    try { await sb.auth.signOut(); } catch {}
    setUser(null); setEmail(''); setPwd(''); setMode('recruiter');
  }

  /* ---------- Shared shell ---------- */
  const shell = (title, children) => (
    <div style={{minHeight:'100vh', padding:16, fontFamily:'system-ui, Arial', color:'#e5e5e5', position:'relative'}}>
      <SkylineBG/>
      <div style={{
        position:'relative', zIndex:1, maxWidth:1200, margin:'0 auto',
        border:'1px solid rgba(255,255,255,.08)', background:'rgba(0,0,0,.55)',
        borderRadius:16, padding:16, boxShadow:'0 8px 32px rgba(0,0,0,.35)'
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <div style={{fontWeight:700}}>{title}</div>
          {user ? <button onClick={logout} style={{fontSize:12, padding:'6px 10px', borderRadius:8, background:'#1f2937', color:'#fff'}}>Log out</button> : null}
        </div>
        {children}
      </div>
    </div>
  );

  /* ---------- Screens by role ---------- */
  if (!user) {
    return shell(`${APP_NAME}`, (
      <div style={{maxWidth:420}}>
        <div style={{textAlign:'center', fontSize:12, color:'#cbd5e1', marginBottom:12}}>Invitation-only access</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          <button onClick={()=>setMode('recruiter')} style={{padding:8,borderRadius:8, background:mode==='recruiter'?'#1f2937':'#111827', color:'#fff'}}>Recruiter</button>
          <button onClick={()=>setMode('client')}    style={{padding:8,borderRadius:8, background:mode==='client'   ?'#1f2937':'#111827', color:'#fff'}}>Client</button>
          <button onClick={()=>setMode('admin')}     style={{padding:8,borderRadius:8, background:mode==='admin'    ?'#1f2937':'#111827', color:'#fff'}}>Admin</button>
        </div>
        <label style={{display:'block',fontSize:12, marginTop:10, color:'#cbd5e1'}}>Email
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                 style={{width:'100%',padding:10, borderRadius:8, background:'#0b0b0b', border:'1px solid #1f2937', color:'#fff'}}/>
        </label>
        <label style={{display:'block',fontSize:12, marginTop:8, color:'#cbd5e1'}}>Password
          <input type="password" value={pwd} onChange={e=>setPwd(e.target.value)}
                 style={{width:'100%',padding:10, borderRadius:8, background:'#0b0b0b', border:'1px solid #1f2937', color:'#fff'}}/>
        </label>
        <button onClick={login}
                style={{width:'100%', marginTop:10, padding:10, borderRadius:8, background:'#4f46e5', color:'#fff', fontWeight:600}}>
          Log in
        </button>
        {err ? <div style={{color:'#fca5a5', fontSize:12, marginTop:8}}>{err}</div> : null}
      </div>
    ));
  }

  if (user.role === 'admin') {
    return shell('Admin workspace', (
      <div style={{color:'#cbd5e1', fontSize:14}}>
        Minimal placeholder for <b>admin</b>. (We’ll re-add invites next.)
      </div>
    ));
  }

  return <RoleWorkspaces user={user} shell={shell} />;
}

/* ===================== Role Workspaces ===================== */
function RoleWorkspaces({ user, shell }) {
  const isRecruiter = user.role === 'recruiter';

  const [loading, setLoading] = useState(true);
  const [cands, setCands]     = useState([]);

  async function load() {
    setLoading(true);
    const { data, error } = await sb.from('v_candidates')
      .select('*')
      .order('created_at', { ascending:false });
    if (!error) setCands(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function addCandidate(form) {
    // 1) Insert candidate
    const { data: inserted, error } = await sb.from('candidates').insert([{
      name: form.name,
      city: form.city, state: form.state,
      years: Number(form.years)||0,
      years_in_recent_role: Number(form.yearsRecent)||0,
      salary: Number(form.salary)||0,
      contract: !!form.contract,
      hourly: form.contract ? Number(form.hourly)||0 : 0,
      notes: form.notes || '',
      date_entered: form.dateEntered ? new Date(form.dateEntered).toISOString() : new Date().toISOString()
    }]).select('*').single();

    if (error) throw error;

    // 2) Join tables
    const roles = parseCSV(form.roles);
    const laws  = parseCSV(form.practice);
    if (roles.length) {
      await sb.from('candidate_roles').insert(roles.map(r => ({ candidate_id: inserted.id, role: r })));
    }
    if (laws.length) {
      await sb.from('candidate_practice_areas').insert(laws.map(p => ({ candidate_id: inserted.id, practice_area: p })));
    }

    await load();
  }

  const list = (
    <div style={{marginTop:12}}>
      {loading ? <div style={{color:'#cbd5e1'}}>Loading…</div> : null}
      {!loading && !cands.length ? <div style={{color:'#cbd5e1'}}>No candidates yet.</div> : null}
      {!loading && cands.map(c => (
        <div key={c.id} style={{
          background:'rgba(0,0,0,.45)', border:'1px solid rgba(255,255,255,.08)', borderRadius:12,
          padding:12, marginBottom:8
        }}>
          <div style={{display:'flex',justifyContent:'space-between', gap:12, flexWrap:'wrap'}}>
            <div>
              <div style={{fontWeight:700}}>{c.name}</div>
              <div style={{fontSize:12, color:'#cbd5e1'}}>
                {(c.city||'')}{c.state?`, ${c.state}`:''} • {c.years||0} yrs •
                {' '}recent role: {c.years_in_recent_role||0} yrs
              </div>
              <div style={{fontSize:12, color:'#cbd5e1'}}>Date entered: {new Date(c.date_entered || c.created_at).toLocaleDateString()}</div>
            </div>
            <div style={{fontSize:12, color:'#cbd5e1'}}>
              Salary: {c.salary ? `$${c.salary.toLocaleString()}` : '-'}<br/>
              Contract: {c.contract ? `Yes${c.hourly?`, $${c.hourly}/hr`:''}` : 'No'}
            </div>
          </div>
          {(c.roles && c.roles.length) ? (
            <div style={{marginTop:6}}>
              {(c.roles||[]).map(r => <Badge key={r} text={r}/>)}
            </div>
          ) : null}
          {(c.practice_areas && c.practice_areas.length) ? (
            <div style={{marginTop:6}}>
              <div style={{fontSize:12, color:'#cbd5e1', marginBottom:2}}>Type of law</div>
              {(c.practice_areas||[]).map(p => <Badge key={p} text={p}/>)}
            </div>
          ) : null}
          {c.notes ? (
            <div style={{marginTop:8, fontSize:12, color:'#e5e7eb',
                         background:'rgba(13,27,42,.65)', border:'1px solid rgba(30,58,138,.5)',
                         borderRadius:8, padding:8}}>
              <div style={{fontWeight:600, marginBottom:4}}>Candidate Notes</div>
              {c.notes}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );

  if (!isRecruiter) {
    return shell('Client workspace', (
      <>
        <div style={{color:'#cbd5e1'}}>Read-only list below.</div>
        {list}
      </>
    ));
  }

  return shell('Recruiter workspace', (
    <>
      <RecruiterAdd onAdd={addCandidate}/>
      {list}
    </>
  ));
}

/* ===================== UI bits ===================== */
function Badge({ text }) {
  return (
    <span style={{
      display:'inline-block', fontSize:11, padding:'2px 8px', marginRight:6, marginBottom:4,
      background:'rgba(0,0,0,.45)', color:'#e5e5e5', border:'1px solid rgba(255,255,255,.08)', borderRadius:999
    }}>{text}</span>
  );
}

function RecruiterAdd({ onAdd }) {
  const [name, setName]           = useState('');
  const [roles, setRoles]         = useState('');
  const [practice, setPractice]   = useState('');
  const [years, setYears]         = useState('');
  const [yearsRecent, setYearsRecent] = useState('');
  const [city, setCity]           = useState('');
  const [state, setState]         = useState('');
  const [salary, setSalary]       = useState('');
  const [contract, setContract]   = useState(false);
  const [hourly, setHourly]       = useState('');
  const [dateEntered, setDateEntered] = useState('');
  const [notes, setNotes]         = useState('');
  const [flash, setFlash]         = useState('');
  const [err, setErr]             = useState('');

  async function submit() {
    try {
      setErr(''); setFlash('');
      if (!name.trim()) { setErr('Name is required'); return; }
      await onAdd({
        name, roles, practice, years, yearsRecent, city, state, salary,
        contract, hourly, dateEntered, notes
      });
      setFlash('Candidate added');
      setName(''); setRoles(''); setPractice(''); setYears(''); setYearsRecent('');
      setCity(''); setState(''); setSalary(''); setContract(false); setHourly('');
      setDateEntered(''); setNotes('');
    } catch (e) {
      console.error(e); setErr('Add failed');
    }
  }

  const label = { display:'block', fontSize:12, color:'#cbd5e1', marginTop:6 };
  const input = { width:'100%', padding:8, background:'#0b0b0b', color:'#fff',
                  border:'1px solid #1f2937', borderRadius:8 };

  return (
    <div style={{
      marginTop:8, background:'rgba(0,0,0,.45)', border:'1px solid rgba(255,255,255,.08)',
      borderRadius:12, padding:12
    }}>
      <div style={{fontWeight:700, marginBottom:8}}>Add candidate</div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:8}}>
        <label style={label}>Full name<input style={input} value={name} onChange={e=>setName(e.target.value)}/></label>
        <label style={label}>Titles (CSV)<input style={input} value={roles} onChange={e=>setRoles(e.target.value)} placeholder="Attorney, Paralegal"/></label>
        <label style={label}>Type of Law (CSV)<input style={input} value={practice} onChange={e=>setPractice(e.target.value)} placeholder="Litigation, Immigration"/></label>
        <label style={label}>Years of experience<input type="number" style={input} value={years} onChange={e=>setYears(e.target.value)}/></label>
        <label style={label}>Years in most recent role<input type="number" style={input} value={yearsRecent} onChange={e=>setYearsRecent(e.target.value)}/></label>
        <label style={label}>City<input style={input} value={city} onChange={e=>setCity(e.target.value)}/></label>
        <label style={label}>State<input style={input} value={state} onChange={e=>setState(e.target.value)}/></label>
        <label style={label}>Salary desired<input type="number" style={input} value={salary} onChange={e=>setSalary(e.target.value)}/></label>
        <label style={{...label, display:'flex', alignItems:'center', gap:8}}>
          <input type="checkbox" checked={contract} onChange={e=>setContract(e.target.checked)}/> Available for contract
        </label>
        {contract ? (
          <label style={label}>Hourly rate<input type="number" style={input} value={hourly} onChange={e=>setHourly(e.target.value)}/></label>
        ) : null}
        <label style={label}>Date entered<input type="date" style={input} value={dateEntered} onChange={e=>setDateEntered(e.target.value)}/></label>
      </div>
      <label style={{...label, gridColumn:'1 / -1'}}>Candidate Notes
        <textarea rows={4} style={{...input, resize:'vertical'}} value={notes} onChange={e=>setNotes(e.target.value)}
                  placeholder="Short summary: strengths, availability, fit notes."/>
      </label>
      <div style={{display:'flex', gap:8, alignItems:'center', marginTop:8}}>
        <button onClick={submit} style={{fontSize:12, padding:'6px 10px', borderRadius:8, background:'#2563eb', color:'#fff'}}>Add candidate</button>
        {flash && <span style={{fontSize:12, color:'#93e2b7'}}>{flash}</span>}
        {err && <span style={{fontSize:12, color:'#fca5a5'}}>{err}</span>}
      </div>
    </div>
  );
}
