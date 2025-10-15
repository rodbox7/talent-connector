'use client';

import React from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Full UI:
 * - NYC background, centered cards
 * - Login with role tabs
 * - Recruiter: add candidate (+ delete your own), list your 20 most recent
 * - Client: shows candidates added today, search, salary/years sliders,
 *           expandable notes, “Email for more info”
 * - Admin: minimal placeholder
 *
 * Table detection: checks for optional columns in `public.candidates`:
 *   titles_csv, law_csv, date_entered
 * Then uses those columns only if they exist (no schema errors).
 */

export default function Page() {
  const [mode, setMode] = React.useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = React.useState('');
  const [pwd, setPwd] = React.useState('');
  const [err, setErr] = React.useState('');
  const [user, setUser] = React.useState(null); // { id, email, role, org, amEmail }

  // Optional candidates columns we’ll auto-detect
  const [cols, setCols] = React.useState({
    titles_csv: false,
    law_csv: false,
    date_entered: false,
  });

  // Detect optional columns once (after we have a session)
  async function detectCandidateColumns() {
    try {
      const { data: colData } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'candidates');

      if (Array.isArray(colData)) {
        const names = new Set(colData.map((c) => c.column_name));
        setCols({
          titles_csv: names.has('titles_csv'),
          law_csv: names.has('law_csv'),
          date_entered: names.has('date_entered'),
        });
      }
    } catch {
      // ignore: we'll just default to false
    }
  }

  // Try to restore an existing session
  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user;
      if (!sessionUser) return;

      const { data: prof } = await supabase
        .from('profiles')
        .select('id,email,role,org,account_manager_email')
        .eq('id', sessionUser.id)
        .single();

      if (prof && prof.id) {
        setUser({
          id: prof.id,
          email: prof.email,
          role: String(prof.role),
          org: prof.org ?? null,
          amEmail: prof.account_manager_email ?? null,
        });
        await detectCandidateColumns();
      }
    })();
  }, []);

  async function login() {
    try {
      setErr('');
      const e = String(email || '').trim().toLowerCase();
      if (!e.includes('@')) {
        setErr('Enter a valid email.');
        return;
      }
      if (!pwd) {
        setErr('Enter your password.');
        return;
      }
      const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: e,
        password: pwd,
      });
      if (authErr) {
        setErr(authErr.message || 'Login failed.');
        return;
      }
      if (!auth?.user?.id) {
        setErr('Login failed (no user).');
        return;
      }

      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id,email,role,org,account_manager_email')
        .eq('id', auth.user.id)
        .single();

      if (profErr || !prof?.id) {
        setErr(
          'Login OK, but your profile was not found. Ask an admin to create/repair your profile.'
        );
        return;
      }

      const profileRole = String(prof.role);
      if (profileRole !== mode) {
        setErr(
          `This account is a ${profileRole}. Switch to the "${profileRole}" tab or ask admin to change your role.`
        );
        return;
      }

      setUser({
        id: prof.id,
        email: prof.email,
        role: profileRole,
        org: prof.org ?? null,
        amEmail: prof.account_manager_email ?? null,
      });

      await detectCandidateColumns();
    } catch (e) {
      setErr(e?.message || 'Unexpected error logging in.');
    }
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setEmail('');
      setPwd('');
      setMode('recruiter');
      setErr('');
    }
  }

  // ---------- Shared styles ----------
  const wrap = {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    color: '#e5e5e5',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    position: 'relative',
    overflow: 'hidden',
  };
  const bg = {
    position: 'fixed',
    inset: 0,
    backgroundImage:
      'url(https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'grayscale(15%) brightness(45%)',
    zIndex: 0,
  };
  const glass = {
    width: '100%',
    maxWidth: 1040,
    background: 'rgba(14, 17, 24, 0.86)',
    border: '1px solid rgba(148,163,184,0.16)',
    borderRadius: 16,
    padding: 18,
    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
    zIndex: 1,
    backdropFilter: 'blur(3px)',
  };
  const card = {
    width: '100%',
    maxWidth: 540,
    background: 'rgba(14, 17, 24, 0.86)',
    border: '1px solid rgba(148,163,184,0.16)',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
    zIndex: 1,
    backdropFilter: 'blur(3px)',
  };
  const pill = (active) => ({
    padding: '10px 16px',
    borderRadius: 10,
    border: '1px solid rgba(148,163,184,0.16)',
    background: active ? 'rgba(55,65,81,0.7)' : 'rgba(17,24,39,0.7)',
    color: '#e5e5e5',
    fontWeight: 600,
    cursor: 'pointer',
  });
  const input = {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    border: '1px solid rgba(148,163,184,0.16)',
    background: 'rgba(17,24,39,0.9)',
    color: '#e5e5e5',
    outline: 'none',
  };
  const btn = {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid rgba(99,102,241,0.6)',
    background: 'linear-gradient(90deg, #6366f1, #4f46e5)',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  };

  // ---------- Role workspaces ----------
  if (user && user.role === 'recruiter') {
    return (
      <div style={wrap}>
        <div style={bg} />
        <div style={glass}>
          <Header title="Recruiter workspace" onLogout={logout} />
          <RecruiterUI user={user} cols={cols} />
        </div>
      </div>
    );
  }

  if (user && user.role === 'client') {
    return (
      <div style={wrap}>
        <div style={bg} />
        <div style={glass}>
          <Header title="Client workspace" onLogout={logout} />
          <ClientUI user={user} cols={cols} />
        </div>
      </div>
    );
  }

  if (user && user.role === 'admin') {
    return (
      <div style={wrap}>
        <div style={bg} />
        <div style={glass}>
          <Header title="Admin workspace" onLogout={logout} />
          <p style={{ opacity: 0.8 }}>
            Minimal placeholder for <b>admin</b>. (User management can be re-added here.)
          </p>
        </div>
      </div>
    );
  }

  // ---------- Login screen ----------
  return (
    <div style={wrap}>
      <div style={bg} />
      <div style={card}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Talent Connector</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>Invitation-only access</div>

        {/* Role tabs */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button style={pill(mode === 'recruiter')} onClick={() => setMode('recruiter')}>
            Recruiter
          </button>
          <button style={pill(mode === 'client')} onClick={() => setMode('client')}>
            Client
          </button>
          <button style={pill(mode === 'admin')} onClick={() => setMode('admin')}>
            Admin
          </button>
        </div>

        <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
          Email
        </label>
        <input
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ ...input, marginBottom: 12 }}
          autoComplete="email"
        />

        <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
          Password
        </label>
        <input
          type="password"
          placeholder="your password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          style={{ ...input, marginBottom: 14 }}
          autoComplete="current-password"
        />

        <button style={{ ...btn, width: '100%' }} onClick={login}>
          Log in
        </button>

        {err ? (
          <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 10, lineHeight: 1.4 }}>{err}</div>
        ) : (
          <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 10 }}>
            Tip: make sure your email has a row in <code>public.profiles</code> with the correct role.
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================= Recruiter UI ========================= */
function RecruiterUI({ user, cols }) {
  const [form, setForm] = React.useState({
    name: '',
    titles_csv: '',
    law_csv: '',
    years: '',
    city: '',
    state: '',
    salary: '',
    contract: false,
    hourly: '',
    notes: '',
  });
  const [flash, setFlash] = React.useState('');
  const [err, setErr] = React.useState('');
  const [mine, setMine] = React.useState([]);

  function up(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function loadMine() {
    try {
      let q = supabase
        .from('candidates')
        .select('*')
        .eq('created_by', user.id)
        .order(cols.date_entered ? 'date_entered' : 'created_at', { ascending: false })
        .limit(20);

      const { data, error } = await q;
      if (!error && Array.isArray(data)) setMine(data);
    } catch {}
  }

  React.useEffect(() => {
    loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addCandidate() {
    try {
      setErr('');
      setFlash('');

      if (!form.name.trim()) {
        setErr('Name is required.');
        return;
      }

      // build payload with safe columns only
      const payload = {
        name: form.name.trim(),
        years: form.years ? Number(form.years) : null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        salary: form.salary ? Number(form.salary) : null,
        contract: !!form.contract,
        hourly: form.contract ? (form.hourly ? Number(form.hourly) : null) : null,
        notes: form.notes.trim() || null,
        created_by: user.id,
      };
      if (cols.titles_csv) payload.titles_csv = form.titles_csv.trim() || null;
      if (cols.law_csv) payload.law_csv = form.law_csv.trim() || null;
      if (cols.date_entered) payload.date_entered = new Date().toISOString();

      const { error } = await supabase.from('candidates').insert(payload);
      if (error) {
        setErr(`Database error adding candidate: ${error.message}`);
        return;
      }

      setFlash('Candidate added');
      setForm({
        name: '',
        titles_csv: '',
        law_csv: '',
        years: '',
        city: '',
        state: '',
        salary: '',
        contract: false,
        hourly: '',
        notes: '',
      });
      await loadMine();
    } catch (e) {
      setErr(e?.message || 'Unexpected error.');
    }
  }

  async function deleteCandidate(id) {
    try {
      const { error } = await supabase.from('candidates').delete().eq('id', id);
      if (error) {
        setErr(`Delete failed: ${error.message}`);
      } else {
        setMine((m) => m.filter((x) => x.id !== id));
      }
    } catch (e) {
      setErr(e?.message || 'Unexpected error.');
    }
  }

  const label = { display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 6 };
  const row = { display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 10 };

  return (
    <div>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Add candidate</div>

      <div style={{ ...row, marginBottom: 10 }}>
        <div style={{ gridColumn: 'span 4' }}>
          <label style={label}>Full name</label>
          <input style={input} value={form.name} onChange={(e) => up('name', e.target.value)} />
        </div>
        {cols.titles_csv && (
          <div style={{ gridColumn: 'span 4' }}>
            <label style={label}>Titles (CSV)</label>
            <input
              style={input}
              placeholder="Attorney, Paralegal"
              value={form.titles_csv}
              onChange={(e) => up('titles_csv', e.target.value)}
            />
          </div>
        )}
        {cols.law_csv && (
          <div style={{ gridColumn: 'span 4' }}>
            <label style={label}>Type of Law (CSV)</label>
            <input
              style={input}
              placeholder="Litigation, Immigration"
              value={form.law_csv}
              onChange={(e) => up('law_csv', e.target.value)}
            />
          </div>
        )}
      </div>

      <div style={{ ...row, marginBottom: 10 }}>
        <div style={{ gridColumn: 'span 3' }}>
          <label style={label}>Years of experience</label>
          <input
            style={input}
            type="number"
            value={form.years}
            onChange={(e) => up('years', e.target.value)}
          />
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <label style={label}>City</label>
          <input style={input} value={form.city} onChange={(e) => up('city', e.target.value)} />
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <label style={label}>State</label>
          <input style={input} value={form.state} onChange={(e) => up('state', e.target.value)} />
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <label style={label}>Salary desired</label>
          <input
            style={input}
            type="number"
            value={form.salary}
            onChange={(e) => up('salary', e.target.value)}
          />
        </div>
      </div>

      <div style={{ ...row, marginBottom: 10, alignItems: 'center' }}>
        <div style={{ gridColumn: 'span 3', display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            id="contract"
            type="checkbox"
            checked={form.contract}
            onChange={(e) => up('contract', e.target.checked)}
          />
          <label htmlFor="contract" style={{ fontSize: 14 }}>
            Available for contract
          </label>
        </div>
        {form.contract && (
          <div style={{ gridColumn: 'span 3' }}>
            <label style={label}>Hourly rate</label>
            <input
              style={input}
              type="number"
              value={form.hourly}
              onChange={(e) => up('hourly', e.target.value)}
            />
          </div>
        )}
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={label}>Candidate Notes</label>
        <textarea
          style={{ ...input, minHeight: 120 }}
          placeholder="Short summary: strengths, availability, fit notes."
          value={form.notes}
          onChange={(e) => up('notes', e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button style={btn} onClick={addCandidate}>
          Add candidate
        </button>
        <div style={{ fontSize: 12 }}>
          {flash && <span style={{ color: '#93e2b7' }}>{flash}</span>}{' '}
          {err && <span style={{ color: '#f87171' }}>{err}</span>}
        </div>
      </div>

      <hr style={{ borderColor: 'rgba(148,163,184,0.15)', margin: '16px 0' }} />

      <div style={{ fontWeight: 800, marginBottom: 8 }}>My recent candidates</div>
      {mine.length === 0 ? (
        <div style={{ fontSize: 13, color: '#9ca3af' }}>No candidates yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {mine.map((c) => (
            <div
              key={c.id}
              style={{
                border: '1px solid rgba(148,163,184,0.16)',
                borderRadius: 10,
                padding: 10,
                background: 'rgba(17,24,39,0.7)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {c.name}{' '}
                    <span style={{ color: '#9ca3af', fontWeight: 400 }}>
                      {cols.titles_csv && c.titles_csv ? ` · ${c.titles_csv}` : ''}
                      {cols.law_csv && c.law_csv ? ` · ${c.law_csv}` : ''}
                    </span>
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: 12 }}>
                    {c.city || '-'}, {c.state || '-'} · {c.years ?? 0} yrs · $
                    {c.salary ? c.salary.toLocaleString() : '—'}{' '}
                    {c.contract ? ` · $${c.hourly || '—'}/hr` : ''}
                  </div>
                </div>
                <button
                  onClick={() => deleteCandidate(c.id)}
                  style={{
                    ...btn,
                    background: 'rgba(220,38,38,0.9)',
                    border: '1px solid rgba(220,38,38,0.6)',
                  }}
                  title="Delete"
                >
                  Delete
                </button>
              </div>
              {c.notes && (
                <div style={{ marginTop: 8, color: '#e5e5e5', fontSize: 13 }}>{c.notes}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ========================= Client UI ========================= */
function ClientUI({ user, cols }) {
  const [search, setSearch] = React.useState('');
  const [minSalary, setMinSalary] = React.useState(0);
  const [maxSalary, setMaxSalary] = React.useState(400000);
  const [minYears, setMinYears] = React.useState(0);
  const [maxYears, setMaxYears] = React.useState(50);
  const [list, setList] = React.useState([]);
  const [todayCount, setTodayCount] = React.useState(0);
  const [err, setErr] = React.useState('');
  const [openId, setOpenId] = React.useState(null);

  function toggleOpen(id) {
    setOpenId((x) => (x === id ? null : id));
  }

  // compute start-of-day in UTC string
  function todayStartISO() {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    return start.toISOString();
  }

  async function loadTodayCount() {
    try {
      setErr('');
      const col = cols.date_entered ? 'date_entered' : 'created_at';
      const from = todayStartISO();
      const { count, error } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true })
        .gte(col, from);
      if (error) {
        setErr(error.message);
        return;
      }
      setTodayCount(count || 0);
    } catch (e) {
      setErr(e?.message || 'Error loading count.');
    }
  }

  async function loadList() {
    try {
      setErr('');
      let q = supabase.from('candidates').select('*');

      // Salary/years filters
      q = q.gte('salary', minSalary).lte('salary', maxSalary);
      q = q.gte('years', minYears).lte('years', maxYears);

      // Search across name/city/state and optional CSVs
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        const ors = [
          `name.ilike.${s}`,
          `city.ilike.${s}`,
          `state.ilike.${s}`,
        ];
        if (cols.titles_csv) ors.push(`titles_csv.ilike.${s}`);
        if (cols.law_csv) ors.push(`law_csv.ilike.${s}`);
        q = q.or(ors.join(','));
      }

      q = q.order(cols.date_entered ? 'date_entered' : 'created_at', { ascending: false }).limit(50);

      const { data, error } = await q;
      if (error) {
        setErr(error.message);
        return;
      }
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || 'Error loading candidates.');
    }
  }

  React.useEffect(() => {
    loadTodayCount();
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const infoCard = {
    border: '1px solid rgba(148,163,184,0.16)',
    borderRadius: 14,
    padding: 16,
    background: 'rgba(17,24,39,0.72)',
  };

  const topRow = { display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' };

  return (
    <div>
      <div style={topRow}>
        <div style={{ ...infoCard, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>Candidates added today</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{todayCount}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            style={{ ...input, width: 360 }}
            placeholder="Search name/city/state/title/type-of-law"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button style={btn} onClick={loadList}>
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          ...infoCard,
          marginTop: 12,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
            Salary range (${minSalary.toLocaleString()} – ${maxSalary.toLocaleString()})
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="range"
              min={0}
              max={400000}
              step={5000}
              value={minSalary}
              onChange={(e) => setMinSalary(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <input
              type="range"
              min={0}
              max={400000}
              step={5000}
              value={maxSalary}
              onChange={(e) => setMaxSalary(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
            Years of experience ({minYears} – {maxYears})
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={minYears}
              onChange={(e) => setMinYears(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={maxYears}
              onChange={(e) => setMaxYears(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {err && (
        <div style={{ color: '#f87171', fontSize: 12, marginTop: 10, lineHeight: 1.4 }}>{err}</div>
      )}

      {/* Results */}
      <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
        {list.length === 0 ? (
          <div style={{ fontSize: 13, color: '#9ca3af' }}>No candidates found.</div>
        ) : (
          list.map((c) => (
            <div
              key={c.id}
              style={{
                border: '1px solid rgba(148,163,184,0.16)',
                borderRadius: 12,
                padding: 12,
                background: 'rgba(17,24,39,0.7)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  {/* One line: Name · Title · Type of Law */}
                  <div style={{ fontWeight: 800 }}>
                    {c.name}
                    <span style={{ fontWeight: 500, color: '#9ca3af' }}>
                      {c.titles_csv ? ` · ${c.titles_csv}` : ''}
                      {c.law_csv ? ` · ${c.law_csv}` : ''}
                    </span>
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: 12 }}>
                    {c.city || '-'}, {c.state || '-'} · {c.years ?? 0} yrs · $
                    {c.salary ? c.salary.toLocaleString() : '—'}{' '}
                    {c.contract ? ` · $${c.hourly || '—'}/hr` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={btn} onClick={() => toggleOpen(c.id)}>
                    {openId === c.id ? 'Hide details' : 'Additional information'}
                  </button>
                  <a
                    style={{ ...btn, textDecoration: 'none', display: 'inline-block' }}
                    href={
                      user?.amEmail
                        ? `mailto:${user.amEmail}?subject=Candidate%20Inquiry:%20${encodeURIComponent(
                            c.name || 'Candidate'
                          )}`
                        : '#'
                    }
                  >
                    Email for more info
                  </a>
                </div>
              </div>

              {openId === c.id && c.notes && (
                <div style={{ marginTop: 10, color: '#e5e5e5', fontSize: 13 }}>{c.notes}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ========================= Shared Header ========================= */
function Header({ title, onLogout }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        justifyContent: 'space-between',
        marginBottom: 8,
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 20 }}>{title}</div>
      <button
        onClick={onLogout}
        style={{
          padding: '8px 14px',
          borderRadius: 10,
          border: '1px solid rgba(148,163,184,0.16)',
          background: 'rgba(31,41,55,0.7)',
          color: '#e5e5e5',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Log out
      </button>
    </div>
  );
}
