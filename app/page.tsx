'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Talent Connector (TSX minimal app) — v1
 * - Invitation-only login tabs: Admin / Recruiter / Client
 * - Seed fallback users so you’re never locked out
 * - Recruiter: add candidates (saved to localStorage for now)
 * - Client: read-only list with keyword search
 * - New fields: "Date Entered" + "Years in Most Recent Position"
 */

type User = {
  id: string;
  email: string;
  role: 'admin'|'recruiter'|'client';
  org?: string;
  password?: string;        // only for seed/local fallback
  amEmail?: string;         // optional salesperson email
  loginCount?: number;
  lastLoginAt?: number|null;
  totalMinutes?: number;
  sessions?: {start:number; end?:number}[];
};

type Candidate = {
  id: string;
  name: string;
  roles: string[];
  practiceAreas: string[];
  years: number;
  yearsInCurrent: number;        // NEW: years in most recent position
  dateEntered: string;           // NEW: YYYY-MM-DD
  city?: string;
  state?: string;
  salary?: number;
  contract?: boolean;
  hourly?: number;
  notes?: string;
};

const BUILD_TAG = 'supa-v3';

const seedUsers: User[] = [
  { id: 'u1', email: 'admin@youragency.com', role: 'admin', org: 'Your Agency', password: 'admin', loginCount: 0, lastLoginAt: null, totalMinutes: 0, sessions: [] },
  { id: 'u2', email: 'recruiter@youragency.com', role: 'recruiter', org: 'Your Agency', password: 'recruit', loginCount: 0, lastLoginAt: null, totalMinutes: 0, sessions: [] },
  { id: 'u3', email: 'client@samplefirm.com', role: 'client', org: 'Sample Firm', password: 'client', loginCount: 0, lastLoginAt: null, totalMinutes: 0, sessions: [] },
];

const seedCandidates: Candidate[] = [
  {
    id: 'c1', name: 'Alexis Chen',
    roles: ['Attorney', 'Contract Attorney'],
    practiceAreas: ['Securities Litigation', 'Internal Investigations'],
    years: 6, yearsInCurrent: 2, dateEntered: '2025-01-15',
    city: 'New York', state: 'NY', salary: 175000, contract: true, hourly: 95,
    notes: 'Strong writer. Securities litigation focus. Immediate.',
  },
  {
    id: 'c2', name: 'Diego Martinez',
    roles: ['Paralegal'],
    practiceAreas: ['Immigration', 'Global Mobility'],
    years: 8, yearsInCurrent: 4, dateEntered: '2025-02-03',
    city: 'Miami', state: 'FL', salary: 92000, contract: true, hourly: 48,
    notes: 'Immigration paralegal, Spanish bilingual. Remote ready.',
  },
];

/** Helpers */
const parseCSV = (s?: string) => String(s||'').split(',').map(x => x.trim()).filter(Boolean);
const todayISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
};
function localFindUser(users: User[], email: string, pwd: string) {
  const e = String(email || '').toLowerCase();
  return users.find(
    u => String(u.email || '').toLowerCase() === e && String(u.password || '') === String(pwd || '')
  ) || null;
}

/** Root */
export default function Page() {
  /** Users (local mirror) */
  const [users, setUsers] = useState<User[]>(() => {
    try { const s = localStorage.getItem('tc_users'); if (s) return JSON.parse(s); } catch {}
    return seedUsers;
  });
  useEffect(() => { try { localStorage.setItem('tc_users', JSON.stringify(users)); } catch {} }, [users]);

  /** Candidates (local) */
  const [cands, setCands] = useState<Candidate[]>(() => {
    try { const s = localStorage.getItem('tc_cands'); if (s) return JSON.parse(s); } catch {}
    return seedCandidates;
  });
  useEffect(() => { try { localStorage.setItem('tc_cands', JSON.stringify(cands)); } catch {} }, [cands]);

  /** Auth state */
  const [mode, setMode] = useState<'admin'|'recruiter'|'client'>('recruiter');
  const [email, setEmail] = useState(''); const [pwd, setPwd] = useState(''); const [err, setErr] = useState('');
  const [user, setUser] = useState<User|null>(null);

  async function login() {
    try {
      setErr('');
      const e = String(email).trim().toLowerCase();
      if (!e.includes('@')) { setErr('Enter a valid email'); return; }

      // Try Supabase first
      const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email: e, password: pwd });
      if (!authErr && auth?.user) {
        const { data: prof } = await supabase.from('profiles').select('id,email,role,org,account_manager_email').eq('id', auth.user.id).maybeSingle();
        if (prof) {
          if (mode !== prof.role) { setErr(`This account is a ${prof.role}. Switch to the ${prof.role} tab.`); return; }
          setUser({ id: prof.id, email: prof.email, role: prof.role, org: prof.org || '', amEmail: (prof as any).account_manager_email || '' });
          return;
        }
        // If signed in but no profile, fall through to local
      }

      // Fallback on seed/local so you can always log in
      const u = localFindUser(users, e, pwd);
      if (!u) { setErr('Invalid credentials'); return; }
      if (u.role !== mode) { setErr(`This account is a ${u.role}. Switch to the ${u.role} tab.`); return; }
      setUser({ id: u.id, email: u.email, role: u.role, org: u.org || '' });
    } catch (ex) {
      console.error(ex);
      setErr('Login error. Please try again.');
    }
  }
  async function logout() {
    try { await supabase.auth.signOut(); } catch {}
    setUser(null); setEmail(''); setPwd(''); setMode('recruiter');
  }

  /** Shared styles */
  const page = { minHeight:'100vh', background:'#0a0a0a', color:'#e5e5e5', fontFamily:'system-ui, Arial', display:'grid', placeItems:'center', padding:16 } as React.CSSProperties;
  const card = { width:'100%', maxWidth: 960, background:'#0b0b0b', border:'1px solid #1f2937', borderRadius:12, padding:16 } as React.CSSProperties;
  const input = { width:'100%', padding:8, background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:8 } as React.CSSProperties;
  const label = { display:'block', fontSize:12, marginTop:6, color:'#9ca3af' } as React.CSSProperties;

  /** Logged-in screens */
  if (user?.role === 'admin') {
    return (
      <div style={page}>
        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontWeight:700 }}>Admin — ({BUILD_TAG})</div>
            <button onClick={logout} style={{ fontSize:12 }}>Log out</button>
          </div>

          <div style={{ fontSize:12, color:'#9ca3af', marginTop:8 }}>
            Admin placeholder (we can wire invites/backoffice later). Use Supabase Auth UI to add users for now.
          </div>
        </div>
      </div>
    );
  }

  if (user?.role === 'recruiter') {
    return (
      <div style={page}>
        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontWeight:700 }}>Recruiter — ({BUILD_TAG})</div>
            <button onClick={logout} style={{ fontSize:12 }}>Log out</button>
          </div>

          <AddCandidate onAdd={(rec: Candidate) => setCands(prev => [rec, ...prev])} />

          <CandidateList
            cands={cands}
            canEdit
            onDelete={(id) => setCands(prev => prev.filter(x => x.id !== id))}
            onSave={(id, patch) => setCands(prev => prev.map(x => x.id===id ? { ...x, ...patch } : x))}
          />
        </div>
      </div>
    );
  }

  if (user?.role === 'client') {
    return (
      <div style={page}>
        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontWeight:700 }}>Client — ({BUILD_TAG})</div>
            <button onClick={logout} style={{ fontSize:12 }}>Log out</button>
          </div>
          <CandidateList cands={cands} />
        </div>
      </div>
    );
  }

  /** Login screen */
  return (
    <div style={page}>
      <div style={{ width: 380, background:'#0b0b0b', border:'1px solid #1f2937', borderRadius:12, padding:16 }}>
        <div style={{ textAlign:'center', fontWeight:700 }}>Talent Connector ({BUILD_TAG})</div>
        <div style={{ textAlign:'center', fontSize:12, color:'#9ca3af', marginBottom:8 }}>Invitation-only access</div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          <button onClick={() => setMode('recruiter')} style={{ padding:8, background: mode==='recruiter' ? '#1f2937' : '#111827', color:'#e5e5e5', borderRadius:8 }}>Recruiter</button>
          <button onClick={() => setMode('client')} style={{ padding:8, background: mode==='client' ? '#1f2937' : '#111827', color:'#e5e5e5', borderRadius:8 }}>Client</button>
          <button onClick={() => setMode('admin')} style={{ padding:8, background: mode==='admin' ? '#1f2937' : '#111827', color:'#e5e5e5', borderRadius:8 }}>Admin</button>
        </div>

        <div style={{ marginTop:12 }}>
          <label style={label}>
            Email
            <input style={input} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com" />
          </label>
          <label style={label}>
            Password
            <input style={input} type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="your password" />
          </label>
          <button onClick={login} style={{ width:'100%', padding:10, marginTop:8, background:'#4f46e5', color:'#fff', borderRadius:8 }}>
            Log in
          </button>
          {err ? <div style={{ color:'#f87171', fontSize:12, marginTop:8 }}>{err}</div> : null}
          <div style={{ fontSize:11, color:'#9ca3af', marginTop:6 }}>
            Seed admin: <strong>admin@youragency.com / admin</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Components */

function Field(props: {label: string; value: string; onChange: (v:string)=>void; type?: string; placeholder?: string}) {
  const {label, value, onChange, type='text', placeholder} = props;
  return (
    <label style={{ display:'block', fontSize:12, marginTop:6 }}>
      <div style={{ color:'#9ca3af', marginBottom:4 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e=>onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width:'100%', padding:8, background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:8 }}
      />
    </label>
  );
}
function Area(props: {label: string; value: string; onChange: (v:string)=>void; placeholder?: string}) {
  const {label, value, onChange, placeholder} = props;
  return (
    <label style={{ display:'block', fontSize:12, marginTop:6 }}>
      <div style={{ color:'#9ca3af', marginBottom:4 }}>{label}</div>
      <textarea
        value={value}
        onChange={e=>onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        style={{ width:'100%', padding:8, background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:8 }}
      />
    </label>
  );
}

function AddCandidate({ onAdd }: { onAdd: (c: Candidate)=>void }) {
  const [name, setName] = useState('');
  const [rolesCSV, setRolesCSV] = useState('');
  const [lawsCSV, setLawsCSV] = useState('');
  const [years, setYears] = useState('');
  const [yearsInCurrent, setYearsInCurrent] = useState(''); // NEW
  const [dateEntered, setDateEntered] = useState(todayISO()); // NEW
  const [city, setCity] = useState(''); const [state, setState] = useState('');
  const [salary, setSalary] = useState(''); const [contract, setContract] = useState(false); const [hourly, setHourly] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');

  function submit() {
    setErr(''); setOk('');
    if (!name.trim()) { setErr('Name is required'); return; }
    const rec: Candidate = {
      id: 'c'+Math.random().toString(36).slice(2,8),
      name: name.trim(),
      roles: parseCSV(rolesCSV).length ? parseCSV(rolesCSV) : ['Attorney'],
      practiceAreas: parseCSV(lawsCSV),
      years: Number(years)||0,
      yearsInCurrent: Number(yearsInCurrent)||0,     // NEW
      dateEntered: dateEntered || todayISO(),        // NEW
      city: city.trim(), state: state.trim(),
      salary: Number(salary)||0,
      contract: !!contract,
      hourly: contract ? (Number(hourly)||0) : 0,
      notes: String(notes||''),
    };
    onAdd(rec);
    setOk('Candidate added');
    setName(''); setRolesCSV(''); setLawsCSV(''); setYears(''); setYearsInCurrent(''); setDateEntered(todayISO());
    setCity(''); setState(''); setSalary(''); setContract(false); setHourly(''); setNotes('');
  }

  return (
    <div style={{ marginTop:12, padding:12, border:'1px solid #1f2937', borderRadius:12, background:'#0b0b0b' }}>
      <div style={{ fontWeight:700, marginBottom:8 }}>Add candidate</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:8 }}>
        <Field label="Full name" value={name} onChange={setName} />
        <Field label="Titles (CSV)" value={rolesCSV} onChange={setRolesCSV} placeholder="Attorney, Paralegal" />
        <Field label="Type of Law (CSV)" value={lawsCSV} onChange={setLawsCSV} placeholder="Litigation, Immigration" />
        <Field label="Years of experience" value={years} onChange={setYears} type="number" />
        <Field label="Years in most recent position" value={yearsInCurrent} onChange={setYearsInCurrent} type="number" /> {/* NEW */}
        <Field label="Date Entered" value={dateEntered} onChange={setDateEntered} type="date" /> {/* NEW */}
        <Field label="City" value={city} onChange={setCity} />
        <Field label="State" value={state} onChange={setState} />
        <Field label="Salary desired" value={salary} onChange={setSalary} type="number" />
        <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, marginTop:6 }}>
          <input type="checkbox" checked={contract} onChange={e=>setContract(e.target.checked)} />
          <span>Available for contract</span>
        </label>
        {contract ? <Field label="Hourly rate" value={hourly} onChange={setHourly} type="number" /> : null}
      </div>
      <Area label="Candidate Notes" value={notes} onChange={setNotes} placeholder="Short summary: strengths, availability, fit notes." />
      <div style={{ display:'flex', gap:8, marginTop:8, alignItems:'center' }}>
        <button onClick={submit} style={{ fontSize:12, padding:'6px 10px', border:'1px solid #1f2937', borderRadius:8 }}>Add candidate</button>
        {err ? <div style={{ color:'#f87171', fontSize:12 }}>{err}</div> : null}
        {ok ? <div style={{ color:'#a7f3d0', fontSize:12 }}>{ok}</div> : null}
      </div>
    </div>
  );
}

function CandidateList({
  cands,
  canEdit = false,
  onDelete,
  onSave
}: {
  cands: Candidate[];
  canEdit?: boolean;
  onDelete?: (id: string)=>void;
  onSave?: (id: string, patch: Partial<Candidate>)=>void;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return cands;
    return cands.filter(c => (
      [
        c.name,
        ...(c.roles||[]),
        ...(c.practiceAreas||[]),
        c.city||'',
        c.state||'',
        c.notes||'',
        c.dateEntered||'',
        String(c.yearsInCurrent||'')
      ].join(' ').toLowerCase().includes(s)
    ));
  }, [q, cands]);

  return (
    <div style={{ marginTop:12 }}>
      <label style={{ display:'block', fontSize:12 }}>
        <div style={{ color:'#9ca3af', marginBottom:4 }}>Keyword</div>
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="name, title, law, location, notes, date…"
          style={{ width:'100%', padding:8, background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:8 }}
        />
      </label>

      <div style={{ marginTop:8, display:'grid', gap:8 }}>
        {filtered.map(c => (
          <CandidateCard key={c.id} c={c} canEdit={canEdit} onDelete={onDelete} onSave={onSave} />
        ))}
        {filtered.length === 0 ? (
          <div style={{ fontSize:12, color:'#9ca3af' }}>No candidates match your search.</div>
        ) : null}
      </div>
    </div>
  );
}

function CandidateCard({
  c, canEdit, onDelete, onSave
}: {
  c: Candidate;
  canEdit?: boolean;
  onDelete?: (id: string)=>void;
  onSave?: (id: string, patch: Partial<Candidate>)=>void;
}) {
  const [edit, setEdit] = useState(false);

  const [name, setName] = useState(c.name);
  const [rolesCSV, setRolesCSV] = useState((c.roles||[]).join(', '));
  const [lawsCSV, setLawsCSV] = useState((c.practiceAreas||[]).join(', '));
  const [years, setYears] = useState(String(c.years||0));
  const [yearsInCurrent, setYearsInCurrent] = useState(String(c.yearsInCurrent||0));
  const [dateEntered, setDateEntered] = useState(c.dateEntered || todayISO());
  const [city, setCity] = useState(c.city||'');
  const [state, setState] = useState(c.state||'');
  const [salary, setSalary] = useState(String(c.salary||0));
  const [contract, setContract] = useState(!!c.contract);
  const [hourly, setHourly] = useState(String(c.hourly||0));
  const [notes, setNotes] = useState(c.notes||'');

  function save() {
    if (!onSave) return;
    const patch: Partial<Candidate> = {
      name: name.trim(),
      roles: parseCSV(rolesCSV).length ? parseCSV(rolesCSV) : ['Attorney'],
      practiceAreas: parseCSV(lawsCSV),
      years: Number(years)||0,
      yearsInCurrent: Number(yearsInCurrent)||0,
      dateEntered: dateEntered || todayISO(),
      city: city.trim(),
      state: state.trim(),
      salary: Number(salary)||0,
      contract: !!contract,
      hourly: contract ? (Number(hourly)||0) : 0,
      notes: String(notes||''),
    };
    onSave(c.id, patch);
    setEdit(false);
  }

  const pill = (t: string) => (
    <span key={t} style={{ display:'inline-block', fontSize:11, padding:'2px 8px', background:'#111827', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:999, marginRight:6, marginBottom:4 }}>{t}</span>
  );

  return (
    <div style={{ border:'1px solid #1f2937', borderRadius:12, padding:12, background:'#0b0b0b' }}>
      {!edit ? (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start' }}>
            <div>
              <div style={{ fontWeight:600 }}>{c.name}</div>
              <div style={{ fontSize:12, color:'#9ca3af' }}>
                {(c.city||'') + (c.state?`, ${c.state}`:'')} — {c.years} yrs • {c.yearsInCurrent} yrs in most recent role • Entered {c.dateEntered}
              </div>
            </div>
            {canEdit ? (
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>setEdit(true)} style={{ fontSize:12 }}>Edit</button>
                <button onClick={()=>onDelete && onDelete(c.id)} style={{ fontSize:12 }}>Delete</button>
              </div>
            ) : null}
          </div>
          {(c.roles||[]).length ? <div style={{ marginTop:6 }}>{(c.roles||[]).map(pill)}</div> : null}
          {(c.practiceAreas||[]).length ? (
            <div style={{ marginTop:6 }}>
              <div style={{ fontSize:12, color:'#9ca3af', marginBottom:4 }}>Type of law</div>
              {(c.practiceAreas||[]).map(pill)}
            </div>
          ) : null}
          {String(c.notes||'').trim() ? (
            <div style={{ fontSize:12, background:'#0d1b2a', color:'#e5e5e5', border:'1px solid #1e3a8a', borderRadius:8, padding:8, marginTop:8 }}>
              <div style={{ fontWeight:600, marginBottom:4 }}>Candidate Notes</div>
              <div>{c.notes}</div>
            </div>
          ) : null}
          <div style={{ fontSize:12, marginTop:6 }}>Salary: {c.salary ? `$${c.salary}` : '-'}</div>
          <div style={{ fontSize:12 }}>Contract: {c.contract ? (`Yes${c.hourly ? `, $${c.hourly}/hr` : ''}`) : 'No'}</div>
        </div>
      ) : (
        <div>
          <Field label="Full name" value={name} onChange={setName} />
          <Field label="Titles (CSV)" value={rolesCSV} onChange={setRolesCSV} placeholder="Attorney, Contract Attorney" />
          <Field label="Type of law (CSV)" value={lawsCSV} onChange={setLawsCSV} placeholder="Securities Litigation, Immigration" />
          <Field label="Years of experience" value={years} onChange={setYears} type="number" />
          <Field label="Years in most recent position" value={yearsInCurrent} onChange={setYearsInCurrent} type="number" />
          <Field label="Date Entered" value={dateEntered} onChange={setDateEntered} type="date" />
          <Field label="City" value={city} onChange={setCity} />
          <Field label="State" value={state} onChange={setState} />
          <Field label="Desired salary" value={salary} onChange={setSalary} type="number" />
          <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, marginTop:6 }}>
            <input type="checkbox" checked={contract} onChange={e=>setContract(e.target.checked)} />
            <span>Available for contract</span>
          </label>
          {contract ? <Field label="Hourly rate" value={hourly} onChange={setHourly} type="number" /> : null}
          <Area label="Candidate Notes" value={notes} onChange={setNotes} placeholder="Short summary: strengths, availability, fit notes." />
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button onClick={save} style={{ fontSize:12 }}>Save</button>
            <button onClick={()=>setEdit(false)} style={{ fontSize:12 }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
