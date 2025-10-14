'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { supabase as sb } from '../lib/supabaseClient';

/* -------------------------------------------------------
   Small helpers
------------------------------------------------------- */
const clamp = (n, lo, hi) => Math.max(lo, Math.min(Number(n) || 0, hi));
const startOfTodayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};
const endOfTodayISO = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};
const box = {
  background: 'rgba(0,0,0,.82)',
  border: '1px solid rgba(255,255,255,.08)',
  borderRadius: 12,
  padding: 16,
};

/* -------------------------------------------------------
   Page (role-aware)
------------------------------------------------------- */
export default function Page() {
  const [mode, setMode] = useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [user, setUser] = useState(null); // { id, email, role, org, amEmail? }

  // attempt session restore (SSR-safe)
  useEffect(() => {
    sb.auth.getSession().then(async ({ data }) => {
      const u = data?.session?.user;
      if (!u) return;
      // get role and AM email from profiles
      const { data: p } = await sb.from('profiles')
        .select('id,email,role,org,account_manager_email')
        .eq('id', u.id)
        .single();
      if (p) {
        setUser({
          id: p.id, email: p.email, role: p.role,
          org: p.org || '', amEmail: p.account_manager_email || ''
        });
        setMode(p.role || 'recruiter');
      }
    });
  }, []);

  async function login() {
    try {
      setErr('');
      const e = String(email).trim().toLowerCase();
      if (!e.includes('@')) { setErr('Enter a valid email'); return; }

      const { data: auth, error: authErr } =
        await sb.auth.signInWithPassword({ email: e, password: pwd });

      if (authErr) { setErr(authErr.message || 'Invalid credentials'); return; }

      // pull profile to enforce role
      const { data: p, error: pErr } = await sb.from('profiles')
        .select('id,email,role,org,account_manager_email')
        .eq('id', auth.user.id)
        .single();
      if (pErr || !p) { setErr('Profile not found. Ask Admin.'); return; }
      if (mode !== p.role) { setErr(`This account is a ${p.role}. Switch to the ${p.role} tab.`); return; }

      setUser({
        id: p.id, email: p.email, role: p.role,
        org: p.org || '', amEmail: p.account_manager_email || ''
      });
    } catch (ex) {
      console.error(ex);
      setErr('Login error.');
    }
  }

  async function logout() {
    try { await sb.auth.signOut(); } catch {}
    setUser(null); setEmail(''); setPwd(''); setMode('recruiter');
  }

  // ---------- Role routing ----------
  if (!user) return (
    <AuthCard
      mode={mode} setMode={setMode}
      email={email} setEmail={setEmail}
      pwd={pwd} setPwd={setPwd}
      onLogin={login} err={err}
    />
  );

  if (user.role === 'admin') {
    return (
      <div style={{ minHeight: '100vh', padding: 16 }}>
        <div style={{ ...box, maxWidth: 980, margin: '0 auto' }}>
          <Header title="Admin workspace" onLogout={logout} />
          <p style={{ color: '#a3a3a3', marginTop: 8 }}>
            Minimal placeholder for <b>admin</b>. (Recruiters have full add/list UI.)
          </p>
        </div>
      </div>
    );
  }

  if (user.role === 'recruiter') {
    return <RecruiterUI user={user} onLogout={logout} />;
  }

  // client
  return <ClientUI user={user} onLogout={logout} />;
}

/* -------------------------------------------------------
   Auth Card
------------------------------------------------------- */
function AuthCard({ mode, setMode, email, setEmail, pwd, setPwd, onLogin, err }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center',
      padding: 16, fontFamily: 'system-ui, Arial'
    }}>
      <div style={{ ...box, width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', fontWeight: 700 }}>
          Talent Connector - Powered by Beacon Hill Legal
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#a1a1aa', marginTop: 4 }}>
          Invitation-only access
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 10
        }}>
          <button
            onClick={() => setMode('recruiter')}
            style={{ padding: 8, borderRadius: 8, background: mode === 'recruiter' ? '#1f2937' : '#111827', color: '#e5e5e5' }}>
            Recruiter
          </button>
          <button
            onClick={() => setMode('client')}
            style={{ padding: 8, borderRadius: 8, background: mode === 'client' ? '#1f2937' : '#111827', color: '#e5e5e5' }}>
            Client
          </button>
          <button
            onClick={() => setMode('admin')}
            style={{ padding: 8, borderRadius: 8, background: mode === 'admin' ? '#1f2937' : '#111827', color: '#e5e5e5' }}>
            Admin
          </button>
        </div>

        <label style={{ display: 'block', fontSize: 12, marginTop: 12, color: '#a1a1aa' }}>
          Email
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                 placeholder="name@company.com"
                 style={{
                   width: '100%', padding: 10, borderRadius: 8,
                   background: '#111827', color: '#e5e5e5',
                   border: '1px solid #1f2937', marginTop: 6
                 }}/>
        </label>
        <label style={{ display: 'block', fontSize: 12, marginTop: 8, color: '#a1a1aa' }}>
          Password
          <input type="password" value={pwd} onChange={e => setPwd(e.target.value)}
                 placeholder="your password"
                 style={{
                   width: '100%', padding: 10, borderRadius: 8,
                   background: '#111827', color: '#e5e5e5',
                   border: '1px solid #1f2937', marginTop: 6
                 }}/>
        </label>
        <button onClick={onLogin}
                style={{
                  width: '100%', marginTop: 10, padding: 12,
                  background: '#4f46e5', color: '#fff', borderRadius: 8
                }}>
          Log in
        </button>
        {err ? <div style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>{err}</div> : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------
// ========= Recruiter Add Form (clean layout) =========
function RecruiterAddForm({ onAdd }) {
  const [name, setName] = React.useState('');
  const [titles, setTitles] = React.useState('');               // CSV
  const [law, setLaw] = React.useState('');                     // CSV
  const [years, setYears] = React.useState('');
  const [city, setCity] = React.useState('');
  const [state, setState] = React.useState('');
  const [salary, setSalary] = React.useState('');
  const [contract, setContract] = React.useState(false);
  const [notes, setNotes] = React.useState('');
  const [flash, setFlash] = React.useState('');
  const [err, setErr] = React.useState('');

  // Shared styles
  const panel = {
    border: '1px solid rgba(255,255,255,.10)',
    borderRadius: 14,
    padding: 16,
    background: 'rgba(8, 10, 16, .88)',     // <-- a bit less transparent
    boxShadow: '0 8px 24px rgba(0,0,0,.35)',
  };
  const label = { fontSize: 12, color: '#9ca3af', marginBottom: 6 };
  const input = {
    width: '100%',
    padding: 10,
    borderRadius: 10,
    background: '#0f172a',
    color: '#e5e7eb',
    border: '1px solid #1f2937',
  };
  const grid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, minmax(0,1fr))',
    gap: 12,
  };

  async function submit() {
    setFlash('');
    setErr('');

    const yearsNum  = Number(years)  || 0;
    const salaryNum = Number(salary) || 0;

    if (!name.trim()) { setErr('Please enter a full name.'); return; }

    try {
      await onAdd({
        name: name.trim(),
        titles,               // CSV string (handled server-side)
        law,                  // CSV string (handled server-side)
        years: yearsNum,
        city: city.trim(),
        state: state.trim(),
        salary: salaryNum,
        contract: !!contract,
        notes: String(notes || '').trim(),
      });

      setName(''); setTitles(''); setLaw('');
      setYears(''); setCity(''); setState('');
      setSalary(''); setContract(false); setNotes('');
      setFlash('Candidate added');
    } catch (e) {
      console.error(e);
      setErr('Database error adding candidate.');
    }
  }

  return (
    <div style={panel}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>Add candidate</div>

      {/* GRID */}
      <div style={grid}>
        {/* Row 1 */}
        <div style={{ gridColumn: 'span 4' }}>
          <div style={label}>Full name</div>
          <input value={name} onChange={e=>setName(e.target.value)} style={input} />
        </div>

        <div style={{ gridColumn: 'span 4' }}>
          <div style={label}>Titles (e.g., Attorney, Paralegal)</div>
          <input
            value={titles}
            onChange={e=>setTitles(e.target.value)}
            placeholder="Attorney, Paralegal"
            style={input}
          />
        </div>

        <div style={{ gridColumn: 'span 4' }}>
          <div style={label}>Type of Law (e.g., Litigation, Immigration)</div>
          <input
            value={law}
            onChange={e=>setLaw(e.target.value)}
            placeholder="Litigation, Immigration"
            style={input}
          />
        </div>

        {/* Row 2 */}
        <div style={{ gridColumn: 'span 3' }}>
          <div style={label}>Years of experience</div>
          <input
            type="number"
            value={years}
            onChange={e=>setYears(e.target.value)}
            style={input}
          />
        </div>

        <div style={{ gridColumn: 'span 5' }}>
          <div style={label}>City</div>
          <input value={city} onChange={e=>setCity(e.target.value)} style={input} />
        </div>

        <div style={{ gridColumn: 'span 4' }}>
          <div style={label}>State</div>
          <input value={state} onChange={e=>setState(e.target.value)} style={input} />
        </div>

        {/* Row 3 */}
        <div style={{ gridColumn: 'span 4' }}>
          <div style={label}>Salary desired</div>
          <input
            type="number"
            value={salary}
            onChange={e=>setSalary(e.target.value)}
            style={input}
            placeholder="e.g., 120000"
          />
        </div>

        <div style={{ gridColumn: 'span 4', display: 'flex', alignItems: 'end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#e5e7eb' }}>
            <input
              type="checkbox"
              checked={contract}
              onChange={e=>setContract(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            Available for contract
          </label>
        </div>

        {/* Spacer to balance row */}
        <div style={{ gridColumn: 'span 4' }} />

        {/* Notes block spans full width */}
        <div style={{ gridColumn: '1 / -1', marginTop: 6 }}>
          <div style={label}>Candidate Notes</div>
          <textarea
            rows={5}
            value={notes}
            onChange={e=>setNotes(e.target.value)}
            placeholder="Short summary: strengths, availability, fit notes."
            style={{ ...input, resize: 'vertical' }}
          />
        </div>
      </div>

      {/* Actions / feedback */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
        <button
          onClick={submit}
          style={{
            padding: '10px 14px',
            fontSize: 13,
            borderRadius: 10,
            background: '#4f46e5',
            color: 'white',
            border: '1px solid rgba(255,255,255,.08)',
            boxShadow: '0 6px 18px rgba(79,70,229,.35)',
          }}
        >
          Add candidate
        </button>

        {flash ? <div style={{ fontSize: 13, color: '#a7f3d0' }}>{flash}</div> : null}
        {err ? <div style={{ fontSize: 13, color: '#fca5a5' }}>{err}</div> : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   Client UI (count today + filters + list w/ expand + email)
------------------------------------------------------- */
function ClientUI({ user, onLogout }) {
  const [amEmail, setAmEmail] = useState(user.amEmail || '');
  useEffect(() => {
    if (amEmail) return;
    sb.from('profiles').select('account_manager_email').eq('id', user.id).single()
      .then(({ data }) => setAmEmail(data?.account_manager_email || ''));
  }, []);

  const [q, setQ] = useState('');
  const [minYears, setMinYears] = useState(0);
  const [maxYears, setMaxYears] = useState(50);
  const [minSalary, setMinSalary] = useState(0);
  const [maxSalary, setMaxSalary] = useState(500000);
  const [rows, setRows] = useState([]);
  const [countToday, setCountToday] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function refresh() {
    try {
      setLoading(true); setErr('');
      // fetch recent — we’ll filter client-side so we don’t depend on specific DB columns beyond the basics
      const { data, error } = await sb.from('candidates')
        .select('id,name,titles,law,years,city,state,salary,contract,hourly,notes,date_entered,created_at')
        .order('date_entered', { ascending: false })
        .limit(500);
      if (error) { setErr('Error loading candidates'); return; }
      setRows(data || []);

      // count today
      const { count } = await sb.from('candidates')
        .select('id', { count:'exact', head:true })
        .gte('date_entered', startOfTodayISO())
        .lte('date_entered', endOfTodayISO());
      setCountToday(count || 0);
    } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    const loY = clamp(minYears, 0, 50);
    const hiY = clamp(maxYears, 0, 50);
    const loS = clamp(minSalary, 0, 1_000_000);
    const hiS = clamp(maxSalary, 0, 1_000_000);

    return rows.filter(c => {
      // text
      if (text) {
        const blob = [
          c.name, c.titles, c.law, c.city, c.state, c.notes
        ].map(x => String(x || '').toLowerCase()).join(' ');
        if (!blob.includes(text)) return false;
      }
      // ranges
      if (loY && (c.years || 0) < loY) return false;
      if (hiY && (c.years || 0) > hiY) return false;
      if (loS && (c.salary || 0) < loS) return false;
      if (hiS && (c.salary || 0) > hiS) return false;
      return true;
    });
  }, [rows, q, minYears, maxYears, minSalary, maxSalary]);

  return (
    <div style={{ minHeight: '100vh', padding: 16 }}>
      <div style={{ ...box, maxWidth: 1200, margin: '0 auto' }}>
        <Header title="Client workspace" onLogout={onLogout} />

        {/* Top: count & search */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap: 8, alignItems:'center', marginTop: 8 }}>
          <div style={{ ...box }}>
            <div style={{ color:'#a1a1aa', fontSize:12 }}>Candidates added today</div>
            <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{countToday}</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input
              placeholder="Search name/city/state/title/law/notes"
              value={q} onChange={e => setQ(e.target.value)}
              style={{
                width: 340, padding: 10, borderRadius: 8,
                background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937'
              }}
            />
            <button onClick={refresh}>Refresh</button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ ...box, marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Filters</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
            <div>
              <div style={{ color:'#a1a1aa', fontSize:12, marginBottom:6 }}>Years of experience</div>
              <Slider min={0} max={50} valueLow={minYears} valueHigh={maxYears}
                      onChange={(lo,hi)=>{ setMinYears(lo); setMaxYears(hi); }} />
            </div>
            <div>
              <div style={{ color:'#a1a1aa', fontSize:12, marginBottom:6 }}>Salary</div>
              <Slider min={0} max={500000} step={1000} valueLow={minSalary} valueHigh={maxSalary}
                      onChange={(lo,hi)=>{ setMinSalary(lo); setMaxSalary(hi); }} format={v=>`$${v.toLocaleString()}`} />
            </div>
          </div>
        </div>

        {/* List */}
        <div style={{ ...box, marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Recent candidates (read-only)</div>
          {err ? <div style={{ color:'#f87171', fontSize:12, marginBottom:8 }}>{err}</div> : null}
          {loading ? <div style={{ color:'#a1a1aa' }}>Loading…</div> : null}
          {filtered.length === 0 ? (
            <div style={{ color:'#a1a1aa', fontSize: 13 }}>No candidates found.</div>
          ) : (
            <div style={{ display:'grid', gap:8 }}>
              {filtered.map(c => <ClientCard key={c.id} c={c} amEmail={amEmail} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientCard({ c, amEmail }) {
  const [open, setOpen] = useState(false);
  const line = [
    c.titles, c.law
  ].filter(Boolean).join(' · ');
  const loc = [c.city, c.state].filter(Boolean).join(', ');

  const mailto = (() => {
    const to = amEmail || 'info@youragency.com';
    const subj = `Request candidate details – ${c.name || ''}`;
    const body = [
      `Hello,`,
      ``,
      `I'm interested in this candidate:`,
      `• Name: ${c.name || ''}`,
      `• Title(s): ${c.titles || ''}`,
      `• Type of law: ${c.law || ''}`,
      `• Location: ${loc || ''}`,
      `• Years: ${c.years ?? ''}`,
      ``,
      `Sent from Talent Connector`
    ].join('\n');
    return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
  })();

  return (
    <div style={{ ...box }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
        <div>
          <div style={{ fontWeight: 600 }}>{c.name}</div>
          <div style={{ color:'#a1a1aa', fontSize: 12, marginTop: 2 }}>
            {[line, loc, `${c.years||0} yrs`].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setOpen(v => !v)} style={{ fontSize: 12 }}>
            {open ? 'Hide info' : 'Additional information'}
          </button>
          <a href={mailto} style={{
            display:'inline-block', padding:'8px 12px', fontSize:12,
            borderRadius:8, background:'#2563eb', color:'#fff', textDecoration:'none'
          }}>Email for more information</a>
        </div>
      </div>

      {open ? (
        <div style={{
          marginTop: 8, padding: 10, borderRadius: 8,
          background: '#0e1726', border: '1px solid #233262', fontSize: 13
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Notes</div>
          <div>{c.notes || '—'}</div>
          <div style={{ marginTop: 6, color:'#a1a1aa' }}>
            Salary: {c.salary ? `$${c.salary.toLocaleString()}` : '—'} ·
            {' '}Contract: {c.contract ? (`Yes${c.hourly ? `, $${c.hourly}/hr` : ''}`) : 'No'}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------
   Little UI atoms
------------------------------------------------------- */
function Header({ title, onLogout }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <div style={{ fontWeight: 800, fontSize: 20 }}>{title}</div>
      <button onClick={onLogout}>Log out</button>
    </div>
  );
}
function Field({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display:'block', fontSize:12, color:'#a1a1aa', marginTop:6 }}>
      {label}
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
             style={{ width:'100%', padding:10, borderRadius:8, background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', marginTop:6 }}/>
    </label>
  );
}
function Num({ label, value, onChange }) {
  return (
    <label style={{ display:'block', fontSize:12, color:'#a1a1aa', marginTop:6 }}>
      {label}
      <input type="number" value={value} onChange={e => onChange(e.target.value)}
             style={{ width:'100%', padding:10, borderRadius:8, background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', marginTop:6 }}/>
    </label>
  );
}
function Area({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display:'block', fontSize:12, color:'#a1a1aa', marginTop:10 }}>
      {label}
      <textarea rows={4} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                style={{ width:'100%', padding:10, borderRadius:8, background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', marginTop:6 }}/>
    </label>
  );
}

/* Dual-thumb slider (no external deps) */
function Slider({ min, max, step=1, valueLow, valueHigh, onChange, format }) {
  const lo = clamp(valueLow, min, max);
  const hi = clamp(valueHigh, min, max);
  const pct = v => ((v - min) / (max - min)) * 100;

  return (
    <div>
      <div style={{ position:'relative', height: 28 }}>
        <div style={{
          position:'absolute', left:0, right:0, top:12, height:4,
          background:'#1f2937', borderRadius: 999
        }}/>
        <div style={{
          position:'absolute', left:`${pct(lo)}%`, right:`${100 - pct(hi)}%`, top:12, height:4,
          background:'#4f46e5', borderRadius: 999
        }}/>
        <input type="range" min={min} max={max} step={step} value={lo}
               onChange={e => onChange(Math.min(Number(e.target.value), hi), hi)}
               style={{ position:'absolute', left:0, right:0, top:0, width:'100%', height:28, appearance:'none', background:'transparent' }}/>
        <input type="range" min={min} max={max} step={step} value={hi}
               onChange={e => onChange(lo, Math.max(Number(e.target.value), lo))}
               style={{ position:'absolute', left:0, right:0, top:0, width:'100%', height:28, appearance:'none', background:'transparent' }}/>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:12 }}>
        <span>{format ? format(lo) : lo}</span>
        <span>{format ? format(hi) : hi}</span>
      </div>
    </div>
  );
}
