'use client';
import React from 'react';
import { supabase as sb } from '../lib/supabaseClient';

/** ====== Small helpers ====== */
const NYC_URL =
  'https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg';

const box = {
  background: 'rgba(12,12,14,0.9)',
  border: '1px solid #1f2937',
  borderRadius: 12,
  padding: 16,
};

const label = { fontSize: 12, color: '#9ca3af', marginBottom: 4 };
const input = {
  width: '100%',
  padding: 8,
  background: '#111827',
  color: '#e5e5e5',
  border: '1px solid #1f2937',
  borderRadius: 8,
};
const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 8,
};
const btn = {
  padding: '8px 12px',
  borderRadius: 8,
  background: '#4f46e5',
  color: '#fff',
  border: '1px solid #4338ca',
};
const btnGhost = {
  padding: '8px 12px',
  borderRadius: 8,
  background: 'transparent',
  color: '#e5e5e5',
  border: '1px solid #1f2937',
};
const danger = {
  padding: '8px 12px',
  borderRadius: 8,
  background: '#ef4444',
  color: '#fff',
  border: '1px solid #b91c1c',
};

function csvToArray(str) {
  return String(str || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
function arrayToCSV(arr) {
  return (arr || []).join(', ');
}

/** ====== Auth gate (client-only) ====== */
export default function Page() {
  const [mode, setMode] = React.useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = React.useState('');
  const [pwd, setPwd] = React.useState('');
  const [err, setErr] = React.useState('');
  const [user, setUser] = React.useState(null);

  const page = {
    minHeight: '100vh',
    color: '#e5e5e5',
    fontFamily: 'system-ui, Arial',
    position: 'relative',
  };

  async function login() {
    setErr('');
    const e = String(email).trim().toLowerCase();
    if (!e.includes('@')) {
      setErr('Enter a valid email');
      return;
    }
    try {
      const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
        email: e,
        password: pwd,
      });
      if (authErr || !auth?.user) {
        setErr('Invalid credentials');
        return;
      }
      const { data: prof, error: profErr } = await sb
        .from('profiles')
        .select('id,email,role,org,account_manager_email')
        .eq('id', auth.user.id)
        .single();
      if (profErr || !prof) {
        setErr('Profile not found for this account.');
        return;
      }
      if (mode !== prof.role) {
        setErr(
          `This account is a ${prof.role}. Switch to the ${prof.role} tab.`
        );
        return;
      }
      setUser({
        id: prof.id,
        email: prof.email,
        role: prof.role,
        org: prof.org || '',
        amEmail: prof.account_manager_email || '',
      });
    } catch (e) {
      console.error(e);
      setErr('Login error');
    }
  }

  async function logout() {
    try {
      await sb.auth.signOut();
    } catch {}
    setUser(null);
    setEmail('');
    setPwd('');
    setMode('recruiter');
  }

  // Background
  const bg = {
    position: 'fixed',
    inset: 0,
    zIndex: 0,
    overflow: 'hidden',
  };
  const overlay = {
    position: 'fixed',
    inset: 0,
    background:
      'radial-gradient(ellipse at top, rgba(0,0,0,0.1), rgba(0,0,0,0.65) 55%)',
    zIndex: 1,
  };
  const content = {
    position: 'relative',
    zIndex: 2,
    minHeight: '100vh',
    display: 'grid',
    alignContent: 'start',
    padding: 16,
  };

  if (!user) {
    // Login screen centered
    return (
      <div style={page}>
        <div style={bg} aria-hidden>
          <img
            src={NYC_URL}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'grayscale(0.15) contrast(1.1) brightness(0.95)',
              opacity: 0.95,
            }}
          />
        </div>
        <div style={overlay} aria-hidden />
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            padding: 16,
          }}
        >
          <div style={{ ...box, width: '100%', maxWidth: 420 }}>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>
              Talent Connector
            </div>
            <div
              style={{
                textAlign: 'center',
                fontSize: 12,
                color: '#9ca3af',
                marginBottom: 8,
              }}
            >
              Invitation-only access
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 8,
              }}
            >
              <button
                onClick={() => setMode('recruiter')}
                style={{
                  ...btnGhost,
                  background: mode === 'recruiter' ? '#1f2937' : 'transparent',
                }}
              >
                Recruiter
              </button>
              <button
                onClick={() => setMode('client')}
                style={{
                  ...btnGhost,
                  background: mode === 'client' ? '#1f2937' : 'transparent',
                }}
              >
                Client
              </button>
              <button
                onClick={() => setMode('admin')}
                style={{
                  ...btnGhost,
                  background: mode === 'admin' ? '#1f2937' : 'transparent',
                }}
              >
                Admin
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block' }}>
                <div style={label}>Email</div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  style={input}
                />
              </label>
              <label style={{ display: 'block', marginTop: 8 }}>
                <div style={label}>Password</div>
                <input
                  type="password"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  placeholder="your password"
                  style={input}
                />
              </label>
              <button onClick={login} style={{ ...btn, width: '100%', marginTop: 8 }}>
                Log in
              </button>
              {err ? (
                <div style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>
                  {err}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Route by role
  return (
    <div style={page}>
      <div style={bg} aria-hidden>
        <img
          src={NYC_URL}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'grayscale(0.15) contrast(1.1) brightness(0.95)',
            opacity: 0.85,
          }}
        />
      </div>
      <div style={overlay} aria-hidden />
      <div style={content}>
        <Header user={user} onLogout={logout} />
        {user.role === 'recruiter' && <RecruiterPanel />}
        {user.role === 'client' && <ClientPanel amEmail={user.amEmail} />}
        {user.role === 'admin' && <AdminPanel />}
      </div>
    </div>
  );
}

/** ====== Header ====== */
function Header({ user, onLogout }) {
  return (
    <div style={{ ...box, maxWidth: 1200, margin: '8px auto 0' }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
      >
        <div>
          <div style={{ fontWeight: 700 }}>Talent Connector</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>
            {user.role.toUpperCase()} workspace
          </div>
        </div>
        <button onClick={onLogout} style={btnGhost}>
          Log out
        </button>
      </div>
    </div>
  );
}

/** ====== Recruiter ====== */
function RecruiterPanel() {
  const [loading, setLoading] = React.useState(true);
  const [list, setList] = React.useState([]);
  const [flash, setFlash] = React.useState('');

  // form state
  const [name, setName] = React.useState('');
  const [titleCSV, setTitleCSV] = React.useState('Attorney');
  const [lawCSV, setLawCSV] = React.useState('');
  const [years, setYears] = React.useState('');
  const [yearsRecent, setYearsRecent] = React.useState('');
  const [city, setCity] = React.useState('');
  const [state, setState] = React.useState('');
  const [salary, setSalary] = React.useState('');
  const [contract, setContract] = React.useState(false);
  const [hourly, setHourly] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [dateEntered, setDateEntered] = React.useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [err, setErr] = React.useState('');

  async function load() {
    setLoading(true);
    const { data, error } = await sb
      .from('candidates')
      .select(
        'id,name,city,state,years,salary,contract,hourly,notes,date_entered,years_recent,roles,practice_areas'
      )
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) {
      console.error(error);
      setErr('Error loading candidates');
      return;
    }
    setList(data || []);
  }

  React.useEffect(() => {
    load();
  }, []);

  async function addCandidate() {
    setErr('');
    setFlash('');
    if (!name.trim()) {
      setErr('Name is required');
      return;
    }
    const rec = {
      name: name.trim(),
      city: city.trim(),
      state: state.trim(),
      years: years ? Number(years) : 0,
      years_recent: yearsRecent ? Number(yearsRecent) : 0,
      salary: salary ? Number(salary) : 0,
      contract: !!contract,
      hourly: contract ? Number(hourly || 0) : 0,
      notes: String(notes || ''),
      date_entered: dateEntered || null,
      roles: csvToArray(titleCSV),
      practice_areas: csvToArray(lawCSV),
    };
    const { data, error } = await sb.from('candidates').insert(rec).select().single();
    if (error) {
      console.error(error);
      setErr('Database error adding candidate');
      return;
    }
    setList((prev) => [data, ...prev]); // optimistic add without losing DB data
    setFlash('Candidate added');
    // reset some fields
    setName('');
    setTitleCSV('Attorney');
    setLawCSV('');
    setYears('');
    setYearsRecent('');
    setCity('');
    setState('');
    setSalary('');
    setContract(false);
    setHourly('');
    setNotes('');
    setDateEntered(new Date().toISOString().slice(0, 10));
  }

  async function deleteCandidate(id) {
    const ok = confirm('Delete this candidate? This cannot be undone.');
    if (!ok) return;
    const { error } = await sb.from('candidates').delete().eq('id', id);
    if (error) {
      console.error(error);
      alert('Database error deleting candidate');
      return;
    }
    setList((prev) => prev.filter((c) => c.id !== id));
  }

  async function updateCandidate(id, patch) {
    const { data, error } = await sb
      .from('candidates')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error(error);
      alert('Database error saving changes');
      return;
    }
    setList((prev) => prev.map((c) => (c.id === id ? data : c)));
  }

  return (
    <div style={{ maxWidth: 1200, margin: '16px auto', display: 'grid', gap: 12 }}>
      {/* Add form */}
      <div style={box}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Add candidate</div>
        <div style={grid}>
          <Field label="Full name" value={name} onChange={setName} />
          <Field
            label="Title(s) (CSV)"
            value={titleCSV}
            onChange={setTitleCSV}
            placeholder="Attorney, Paralegal"
          />
          <Field
            label="Type of Law (CSV)"
            value={lawCSV}
            onChange={setLawCSV}
            placeholder="Litigation, Immigration"
          />
          <Field label="City" value={city} onChange={setCity} />
          <Field label="State" value={state} onChange={setState} />
          <Field
            label="Years of experience"
            value={years}
            onChange={setYears}
            type="number"
          />
          <Field
            label="Years in most recent job"
            value={yearsRecent}
            onChange={setYearsRecent}
            type="number"
          />
          <Field
            label="Salary desired"
            value={salary}
            onChange={setSalary}
            type="number"
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input
              type="checkbox"
              checked={contract}
              onChange={(e) => setContract(e.target.checked)}
            />
            <span style={{ fontSize: 12, color: '#e5e5e5' }}>Available for contract</span>
          </label>
          {contract ? (
            <Field
              label="Hourly rate"
              value={hourly}
              onChange={setHourly}
              type="number"
            />
          ) : null}
          <Field
            label="Date entered"
            value={dateEntered}
            onChange={setDateEntered}
            type="date"
          />
        </div>
        <Area
          label="Candidate Notes"
          value={notes}
          onChange={setNotes}
          placeholder="Short summary: strengths, availability, fit notes."
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={addCandidate} style={btn}>
            Add candidate
          </button>
          {err ? <div style={{ color: '#f87171', fontSize: 12 }}>{err}</div> : null}
          {flash ? <div style={{ color: '#a7f3d0', fontSize: 12 }}>{flash}</div> : null}
        </div>
      </div>

      {/* List */}
      <div style={box}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          Candidates {loading ? '…' : `(${list.length})`}
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {list.map((c) => (
            <CandidateRow
              key={c.id}
              cand={c}
              onDelete={() => deleteCandidate(c.id)}
              onSave={(patch) => updateCandidate(c.id, patch)}
            />
          ))}
          {!loading && list.length === 0 ? (
            <div style={{ fontSize: 12, color: '#9ca3af' }}>No candidates yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Single row with Edit/Delete */
function CandidateRow({ cand, onDelete, onSave }) {
  const [edit, setEdit] = React.useState(false);
  const [name, setName] = React.useState(cand.name || '');
  const [city, setCity] = React.useState(cand.city || '');
  const [state, setState] = React.useState(cand.state || '');
  const [years, setYears] = React.useState(String(cand.years || ''));
  const [yearsRecent, setYearsRecent] = React.useState(String(cand.years_recent || ''));
  const [salary, setSalary] = React.useState(String(cand.salary || ''));
  const [contract, setContract] = React.useState(!!cand.contract);
  const [hourly, setHourly] = React.useState(String(cand.hourly || ''));
  const [notes, setNotes] = React.useState(cand.notes || '');
  const [rolesCSV, setRolesCSV] = React.useState(arrayToCSV(cand.roles || []));
  const [lawCSV, setLawCSV] = React.useState(arrayToCSV(cand.practice_areas || []));
  const [dateEntered, setDateEntered] = React.useState(
    cand.date_entered ? String(cand.date_entered).slice(0, 10) : ''
  );

  function save() {
    const patch = {
      name: name.trim(),
      city: city.trim(),
      state: state.trim(),
      years: years ? Number(years) : 0,
      years_recent: yearsRecent ? Number(yearsRecent) : 0,
      salary: salary ? Number(salary) : 0,
      contract: !!contract,
      hourly: contract ? Number(hourly || 0) : 0,
      notes: String(notes || ''),
      roles: csvToArray(rolesCSV),
      practice_areas: csvToArray(lawCSV),
      date_entered: dateEntered || null,
    };
    onSave(patch);
    setEdit(false);
  }

  return (
    <div style={{ border: '1px solid #1f2937', borderRadius: 8, padding: 12 }}>
      {!edit ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{cand.name}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                {[cand.city, cand.state].filter(Boolean).join(', ')} · {cand.years || 0} yrs
                {cand.years_recent ? ` (recent: ${cand.years_recent})` : ''}
                {cand.date_entered ? ` · Entered: ${String(cand.date_entered).slice(0, 10)}` : ''}
              </div>
              <div style={{ marginTop: 6, fontSize: 12 }}>
                <strong>Titles:</strong> {arrayToCSV(cand.roles || []) || '—'}
              </div>
              <div style={{ fontSize: 12 }}>
                <strong>Type of law:</strong> {arrayToCSV(cand.practice_areas || []) || '—'}
              </div>
              {cand.notes ? (
                <div
                  style={{
                    fontSize: 12,
                    color: '#e5e5e5',
                    background: '#0d1b2a',
                    border: '1px solid #1e3a8a',
                    borderRadius: 8,
                    padding: 8,
                    marginTop: 8,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Candidate Notes</div>
                  <div>{cand.notes}</div>
                </div>
              ) : null}
              <div style={{ fontSize: 12, marginTop: 6 }}>
                Salary: {cand.salary ? `$${cand.salary}` : '—'} · Contract:{' '}
                {cand.contract ? `Yes${cand.hourly ? ` ($${cand.hourly}/hr)` : ''}` : 'No'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'start' }}>
              <button onClick={() => setEdit(true)} style={btnGhost}>
                Edit
              </button>
              <button onClick={onDelete} style={danger}>
                Delete
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={grid}>
            <Field label="Full name" value={name} onChange={setName} />
            <Field label="City" value={city} onChange={setCity} />
            <Field label="State" value={state} onChange={setState} />
            <Field label="Years of experience" value={years} onChange={setYears} type="number" />
            <Field
              label="Years in most recent job"
              value={yearsRecent}
              onChange={setYearsRecent}
              type="number"
            />
            <Field label="Salary desired" value={salary} onChange={setSalary} type="number" />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <input
                type="checkbox"
                checked={contract}
                onChange={(e) => setContract(e.target.checked)}
              />
              <span style={{ fontSize: 12, color: '#e5e5e5' }}>Available for contract</span>
            </label>
            {contract ? (
              <Field label="Hourly rate" value={hourly} onChange={setHourly} type="number" />
            ) : null}
            <Field
              label="Title(s) (CSV)"
              value={rolesCSV}
              onChange={setRolesCSV}
              placeholder="Attorney, Paralegal"
            />
            <Field
              label="Type of Law (CSV)"
              value={lawCSV}
              onChange={setLawCSV}
              placeholder="Litigation, Immigration"
            />
            <Field
              label="Date entered"
              value={dateEntered}
              onChange={setDateEntered}
              type="date"
            />
          </div>
          <Area label="Candidate Notes" value={notes} onChange={setNotes} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={save} style={btn}>
              Save
            </button>
            <button onClick={() => setEdit(false)} style={btnGhost}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** ====== Client (unchanged data safety) ====== */
function ClientPanel({ amEmail }) {
  const [loading, setLoading] = React.useState(true);
  const [list, setList] = React.useState([]);
  const [q, setQ] = React.useState('');

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await sb
        .from('candidates')
        .select(
          'id,name,city,state,years,salary,contract,hourly,notes,date_entered,years_recent,roles,practice_areas'
        )
        .order('created_at', { ascending: false });
      setLoading(false);
      if (error) {
        console.error(error);
        return;
      }
      setList(data || []);
    })();
  }, []);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((c) => {
      const hay =
        [
          c.name,
          ...(c.roles || []),
          ...(c.practice_areas || []),
          c.city,
          c.state,
          c.notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
      return hay.includes(s);
    });
  }, [q, list]);

  return (
    <div style={{ maxWidth: 1200, margin: '16px auto', display: 'grid', gap: 12 }}>
      <div style={box}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Search candidates</div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Keyword: name, title, law, notes, city…"
          style={input}
        />
      </div>
      <div style={box}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          Results {loading ? '…' : `(${filtered.length})`}
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {filtered.map((c) => (
            <div key={c.id} style={{ border: '1px solid #1f2937', borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                {[c.city, c.state].filter(Boolean).join(', ')} · {c.years || 0} yrs
                {c.years_recent ? ` (recent: ${c.years_recent})` : ''}
                {c.date_entered ? ` · Entered: ${String(c.date_entered).slice(0, 10)}` : ''}
              </div>
              <div style={{ marginTop: 6, fontSize: 12 }}>
                <strong>Titles:</strong> {arrayToCSV(c.roles || []) || '—'}
              </div>
              <div style={{ fontSize: 12 }}>
                <strong>Type of law:</strong> {arrayToCSV(c.practice_areas || []) || '—'}
              </div>
              {c.notes ? (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: 'pointer' }}>Additional information</summary>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#e5e5e5',
                      background: '#0d1b2a',
                      border: '1px solid #1e3a8a',
                      borderRadius: 8,
                      padding: 8,
                      marginTop: 8,
                    }}
                  >
                    {c.notes}
                  </div>
                </details>
              ) : null}
              <div style={{ marginTop: 8 }}>
                <a
                  href={buildContactMailto(c, amEmail)}
                  style={{
                    ...btn,
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  Email for more information
                </a>
              </div>
            </div>
          ))}
          {!loading && filtered.length === 0 ? (
            <div style={{ fontSize: 12, color: '#9ca3af' }}>No results.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function buildContactMailto(c, amEmail) {
  const to = amEmail || 'info@youragency.com';
  const subj = `Talent Connector Candidate – ${c?.name || ''}`;
  const body = [
    `Hello,`,
    ``,
    `I'm interested in this candidate:`,
    `• Name: ${c?.name || ''}`,
    `• Title(s): ${(c?.roles || []).join(', ')}`,
    `• Practice Areas: ${(c?.practice_areas || []).join(', ')}`,
    `• Location: ${[c?.city, c?.state].filter(Boolean).join(', ')}`,
    `• Years: ${c?.years ?? ''}`,
    ``,
    `Sent from Talent Connector`,
  ].join('\n');
  return `mailto:${encodeURIComponent(
    to
  )}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
}

/** ====== Admin (kept simple and non-destructive) ====== */
function AdminPanel() {
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await sb
        .from('profiles')
        .select('email,role,org,account_manager_email,created_at')
        .order('created_at', { ascending: false });
      setLoading(false);
      if (error) {
        console.error(error);
        return;
      }
      setUsers(data || []);
    })();
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: '16px auto' }}>
      <div style={box}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Users</div>
        {loading ? (
          <div style={{ fontSize: 12, color: '#9ca3af' }}>Loading…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#9ca3af' }}>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #1f2937' }}>Email</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #1f2937' }}>Role</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #1f2937' }}>Org</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #1f2937' }}>
                    Sales contact
                  </th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #1f2937' }}>
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.email}>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #1f2937' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #1f2937' }}>
                      {u.role}
                    </td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #1f2937' }}>
                      {u.org || '—'}
                    </td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #1f2937' }}>
                      {u.account_manager_email || '—'}
                    </td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #1f2937' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '6px 8px', color: '#9ca3af' }}>
                      No users yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/** ====== Basic inputs ====== */
function Field({ label: l, value, onChange, placeholder, type = 'text' }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={label}>{l}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={input}
      />
    </label>
  );
}
function Area({ label: l, value, onChange, placeholder }) {
  return (
    <label style={{ display: 'block', marginTop: 8 }}>
      <div style={label}>{l}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        style={{ ...input, resize: 'vertical' }}
      />
    </label>
  );
}
