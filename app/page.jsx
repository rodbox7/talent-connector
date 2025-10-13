'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase as sb } from '../lib/supabaseClient';

// -------------- helpers -----------------
const csv = (s) =>
  String(s || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

const prettyDate = (ts) => {
  if (!ts) return '-';
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return String(ts);
  }
};

// -------------- page -----------------
export default function Page() {
  const [mode, setMode] = useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [me, setMe] = useState(null); // { id, email, role, org? }

  async function login() {
    setErr('');
    const e = String(email).trim().toLowerCase();
    if (!e.includes('@')) {
      setErr('Enter a valid email');
      return;
    }
    try {
      const { data: auth, error: aerr } = await sb.auth.signInWithPassword({
        email: e,
        password: pwd,
      });
      if (aerr || !auth?.user) {
        setErr('Invalid credentials');
        return;
      }
      // fetch profile for role
      const { data: prof, error: perr } = await sb
        .from('profiles')
        .select('id,email,role,org')
        .eq('id', auth.user.id)
        .single();

      if (perr || !prof) {
        setErr('Profile not found. Ask Admin to create your profile.');
        return;
      }
      if (prof.role !== mode) {
        setErr(`This account is a ${prof.role}. Switch to ${prof.role} tab.`);
        return;
      }
      setMe({ id: prof.id, email: prof.email, role: prof.role, org: prof.org || '' });
    } catch (ex) {
      console.error(ex);
      setErr('Login error. Please try again.');
    }
  }

  async function logout() {
    try {
      await sb.auth.signOut();
    } catch {}
    setMe(null);
    setEmail('');
    setPwd('');
    setMode('recruiter');
  }

  if (!me) return <AuthScreen {...{ mode, setMode, email, setEmail, pwd, setPwd, err, login }} />;

  if (me.role === 'recruiter') return <RecruiterScreen me={me} onLogout={logout} />;

  return (
    <Shell onLogout={logout} title={`${me.role[0].toUpperCase()}${me.role.slice(1)} workspace`}>
      <div style={{ fontSize: 13, color: '#9ca3af' }}>
        Minimal placeholder for <b>{me.role}</b>. (Recruiters have full add/list UI.)
      </div>
    </Shell>
  );
}

// -------------- auth ui -----------------
function AuthScreen({ mode, setMode, email, setEmail, pwd, setPwd, err, login }) {
  const page = {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    background: '#0a0a0a',
    color: '#e5e5e5',
    fontFamily: 'system-ui, Arial',
  };
  const card = {
    width: '100%',
    maxWidth: 420,
    background: '#0b0b0b',
    border: '1px solid #1f2937',
    borderRadius: 12,
    padding: 16,
  };

  return (
    <div style={page}>
      <div style={card}>
        <div style={{ textAlign: 'center', fontWeight: 700 }}>Talent Connector</div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>
          Invitation-only access
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          <Tab on={() => setMode('recruiter')} active={mode === 'recruiter'}>
            Recruiter
          </Tab>
          <Tab on={() => setMode('client')} active={mode === 'client'}>
            Client
          </Tab>
          <Tab on={() => setMode('admin')} active={mode === 'admin'}>
            Admin
          </Tab>
        </div>

        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            style={input}
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="your password"
            style={input}
          />
        </Field>
        <button onClick={login} style={cta}>
          Log in
        </button>
        {err ? (
          <div style={{ color: '#f87171', fontSize: 12, marginTop: 8, minHeight: 18 }}>{err}</div>
        ) : (
          <div style={{ minHeight: 18 }} />
        )}
      </div>
    </div>
  );
}

// -------------- recruiter -----------------
function RecruiterScreen({ me, onLogout }) {
  const [list, setList] = useState([]); // candidates
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');

  // form
  const [name, setName] = useState('');
  const [titles, setTitles] = useState('Attorney, Paralegal');
  const [laws, setLaws] = useState('Litigation, Immigration');
  const [years, setYears] = useState('');
  const [recentYears, setRecentYears] = useState(''); // NEW: years in most recent role
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [salary, setSalary] = useState('');
  const [contract, setContract] = useState(false);
  const [hourly, setHourly] = useState('');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // fetch list
  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadErr('');
      try {
        // Prefer v_candidates (if it exists). Otherwise assemble from base + joins.
        let rows = [];
        const { data: viewData, error: viewErr } = await sb.from('v_candidates').select('*').order('created_at', { ascending: false });
        if (!viewErr && Array.isArray(viewData)) {
          rows = viewData.map((r) => ({
            ...r,
            roles: r.roles || [],
            practice_areas: r.practice_areas || [],
          }));
        } else {
          // Fallback: assemble from tables
          const { data: base, error: baseErr } = await sb
            .from('candidates')
            .select('*')
            .order('created_at', { ascending: false });
          if (baseErr) throw baseErr;

          const ids = base.map((b) => b.id);
          let rolesMap = {};
          let areasMap = {};
          // roles
          try {
            const { data: rs, error: rErr } = await sb
              .from('candidate_roles')
              .select('candidate_id,role')
              .in('candidate_id', ids);
            if (!rErr && Array.isArray(rs)) {
              rolesMap = rs.reduce((acc, r) => {
                acc[r.candidate_id] = acc[r.candidate_id] || [];
                acc[r.candidate_id].push(r.role);
                return acc;
              }, {});
            }
          } catch {}
          // areas
          try {
            const { data: as, error: aErr } = await sb
              .from('candidate_practice_areas')
              .select('candidate_id,practice_area')
              .in('candidate_id', ids);
            if (!aErr && Array.isArray(as)) {
              areasMap = as.reduce((acc, r) => {
                acc[r.candidate_id] = acc[r.candidate_id] || [];
                acc[r.candidate_id].push(r.practice_area);
                return acc;
              }, {});
            }
          } catch {}
          rows = base.map((b) => ({
            ...b,
            roles: rolesMap[b.id] || [],
            practice_areas: areasMap[b.id] || [],
          }));
        }
        setList(rows);
      } catch (ex) {
        console.error(ex);
        setLoadErr('Failed to load candidates');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function addCandidate() {
    setErr('');
    setMsg('');
    if (!name.trim()) {
      setErr('Full name is required');
      return;
    }

    const payload = {
      name: name.trim(),
      years: Number(years) || 0,
      recent_role_years: Number(recentYears) || 0, // NEW
      city: city.trim(),
      state: state.trim(),
      salary: Number(salary) || 0,
      contract: !!contract,
      hourly: contract ? Number(hourly) || 0 : 0,
      notes: String(notes || ''),
      created_by: me.id,
      // date_entered is DEFAULT now(), so we omit it to let DB set it
    };

    try {
      // 1) insert candidate
      const { data: inserted, error: insErr } = await sb
        .from('candidates')
        .insert(payload)
        .select('*')
        .single();

      if (insErr) throw insErr;
      const candId = inserted.id;

      // 2) optional role/practice inserts (best-effort)
      const roleArr = csv(titles);
      const lawArr = csv(laws);

      if (roleArr.length) {
        try {
          await sb
            .from('candidate_roles')
            .insert(roleArr.map((r) => ({ candidate_id: candId, role: r })));
        } catch {}
      }

      if (lawArr.length) {
        try {
          await sb
            .from('candidate_practice_areas')
            .insert(lawArr.map((p) => ({ candidate_id: candId, practice_area: p })));
        } catch {}
      }

      // 3) push into list optimistically
      setList((prev) => [
        {
          ...inserted,
          roles: roleArr,
          practice_areas: lawArr,
        },
        ...prev,
      ]);

      setMsg('Candidate added');
      // reset form
      setName('');
      setTitles('Attorney, Paralegal');
      setLaws('Litigation, Immigration');
      setYears('');
      setRecentYears('');
      setCity('');
      setState('');
      setSalary('');
      setContract(false);
      setHourly('');
      setNotes('');
    } catch (ex) {
      console.error(ex);
      setErr('Failed to add candidate');
    }
  }

  return (
    <Shell onLogout={onLogout} title="Recruiter workspace">
      {/* add form */}
      <Card title="Add candidate">
        <div style={grid}>
          <Field label="Full name">
            <input value={name} onChange={(e) => setName(e.target.value)} style={input} />
          </Field>
          <Field label="Titles (CSV)">
            <input value={titles} onChange={(e) => setTitles(e.target.value)} style={input} />
          </Field>
          <Field label="Type of Law (CSV)">
            <input value={laws} onChange={(e) => setLaws(e.target.value)} style={input} />
          </Field>
          <Field label="Years of experience">
            <input
              type="number"
              value={years}
              onChange={(e) => setYears(e.target.value)}
              style={input}
            />
          </Field>
          <Field label="Years in most recent role (NEW)">
            <input
              type="number"
              value={recentYears}
              onChange={(e) => setRecentYears(e.target.value)}
              style={input}
            />
          </Field>
          <Field label="City">
            <input value={city} onChange={(e) => setCity(e.target.value)} style={input} />
          </Field>
          <Field label="State">
            <input value={state} onChange={(e) => setState(e.target.value)} style={input} />
          </Field>
          <Field label="Salary desired">
            <input
              type="number"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              style={input}
            />
          </Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginTop: 6 }}>
            <input
              type="checkbox"
              checked={contract}
              onChange={(e) => setContract(e.target.checked)}
            />
            <span>Available for contract</span>
          </label>
          {contract ? (
            <Field label="Hourly rate">
              <input
                type="number"
                value={hourly}
                onChange={(e) => setHourly(e.target.value)}
                style={input}
              />
            </Field>
          ) : null}
        </div>
        <Field label="Candidate Notes">
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Short summary: strengths, availability, fit notes."
            style={area}
          />
        </Field>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
          <button onClick={addCandidate} style={btn}>
            Add candidate
          </button>
          {err ? <div style={{ color: '#f87171', fontSize: 12 }}>{err}</div> : null}
          {msg ? <div style={{ color: '#a7f3d0', fontSize: 12 }}>{msg}</div> : null}
        </div>
      </Card>

      {/* list */}
      <Card title="Candidates">
        {loading ? (
          <div style={{ fontSize: 12, color: '#9ca3af' }}>Loading…</div>
        ) : loadErr ? (
          <div style={{ fontSize: 12, color: '#f87171' }}>{loadErr}</div>
        ) : list.length === 0 ? (
          <div style={{ fontSize: 12, color: '#9ca3af' }}>No candidates yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {list.map((c) => (
              <div
                key={c.id}
                style={{
                  border: '1px solid #1e3a8a',
                  background: '#0b1220',
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      {[c.city, c.state].filter(Boolean).join(', ')} • {c.years || 0} yrs total •{' '}
                      {c.recent_role_years || 0} yrs recent role
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>
                    Date Entered: <b>{prettyDate(c.date_entered || c.created_at)}</b>
                  </div>
                </div>

                {c.roles?.length ? (
                  <Row label="Titles">
                    {c.roles.map((r) => (
                      <Chip key={r}>{r}</Chip>
                    ))}
                  </Row>
                ) : null}

                {c.practice_areas?.length ? (
                  <Row label="Type of law">
                    {c.practice_areas.map((p) => (
                      <Chip key={p}>{p}</Chip>
                    ))}
                  </Row>
                ) : null}

                {String(c.notes || '').trim() ? (
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
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Notes</div>
                    <div>{c.notes}</div>
                  </div>
                ) : null}

                <div style={{ fontSize: 12, color: '#e5e5e5', marginTop: 6 }}>
                  Salary: {c.salary ? `$${c.salary}` : '-'}
                </div>
                <div style={{ fontSize: 12, color: '#e5e5e5' }}>
                  Contract: {c.contract ? `Yes${c.hourly ? `, $${c.hourly}/hr` : ''}` : 'No'}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Shell>
  );
}

// -------------- layout bits -----------------
function Shell({ onLogout, title, children }) {
  const wrap = {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#e5e5e5',
    fontFamily: 'system-ui, Arial',
    padding: 16,
  };
  return (
    <div style={wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700 }}>Talent Connector - Powered by Beacon Hill Legal</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>{title}</div>
        </div>
        <button onClick={onLogout} style={{ fontSize: 12 }}>
          Log out
        </button>
      </div>
      <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>{children}</div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div
      style={{
        border: '1px solid #1f2937',
        background: '#0b0b0b',
        borderRadius: 12,
        padding: 12,
      }}
    >
      {title ? <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div> : null}
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

function Chip({ children }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        padding: '2px 8px',
        background: '#111827',
        color: '#e5e5e5',
        border: '1px solid #1f2937',
        borderRadius: 999,
      }}
    >
      {children}
    </span>
  );
}

function Tab({ children, active, on }) {
  return (
    <button onClick={on} style={{ padding: 8, background: active ? '#1f2937' : '#111827', color: '#e5e5e5', borderRadius: 8 }}>
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
      <div style={{ color: '#9ca3af', marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}

// -------------- shared styles -----------------
const input = {
  width: '100%',
  padding: 8,
  background: '#111827',
  color: '#e5e5e5',
  border: '1px solid #1f2937',
  borderRadius: 8,
};
const area = { ...input, height: 'auto' };
const cta = { width: '100%', padding: 10, marginTop: 8, background: '#4f46e5', color: 'white', borderRadius: 8 };
const btn = { fontSize: 12, padding: '6px 10px', border: '1px solid #1f2937', borderRadius: 8 };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 };
