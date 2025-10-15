'use client';

import React from 'react';
import { supabase } from '../lib/supabaseClient';

/* ---------- shared look ---------- */
const ST = {
  wrap: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    color: '#e5e5e5',
    fontFamily:
      'system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, sans-serif',
    position: 'relative',
    overflow: 'hidden',
  },
  bg: {
    position: 'fixed',
    inset: 0,
    backgroundImage:
      'url(https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'grayscale(15%) brightness(45%)',
    zIndex: 0,
  },
  shell: {
    width: '100%',
    maxWidth: 1100,
    background: 'rgba(14,17,24,0.86)',
    border: '1px solid rgba(148,163,184,0.16)',
    borderRadius: 16,
    padding: 18,
    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
    zIndex: 1,
    backdropFilter: 'blur(3px)',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    background: 'rgba(14,17,24,0.86)',
    border: '1px solid rgba(148,163,184,0.16)',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
    zIndex: 1,
    backdropFilter: 'blur(3px)',
  },
  pill(active) {
    return {
      padding: '10px 16px',
      borderRadius: 10,
      border: '1px solid rgba(148,163,184,0.16)',
      background: active ? 'rgba(55,65,81,0.7)' : 'rgba(17,24,39,0.7)',
      color: '#e5e5e5',
      fontWeight: 700,
      cursor: 'pointer',
    };
  },
  input: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    border: '1px solid rgba(148,163,184,0.16)',
    background: 'rgba(17,24,39,0.9)',
    color: '#e5e5e5',
    outline: 'none',
  },
  btn: {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid rgba(99,102,241,0.6)',
    background: 'linear-gradient(90deg, #6366f1, #4f46e5)',
    color: '#fff',
    fontWeight: 800,
    cursor: 'pointer',
  },
  chip: {
    padding: '4px 8px',
    borderRadius: 999,
    border: '1px solid rgba(148,163,184,0.16)',
    background: 'rgba(31,41,55,0.7)',
    color: '#e5e5e5',
    fontSize: 12,
  },
};

/* ---------- page ---------- */
export default function Page() {
  const [tab, setTab] = React.useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = React.useState('');
  const [pwd, setPwd] = React.useState('');
  const [user, setUser] = React.useState(null); // { id,email,role,org,amEmail }
  const [err, setErr] = React.useState('');

  // detect optional candidate columns
  const [candCols, setCandCols] = React.useState({
    titles_csv: true, // show fields regardless; insert will omit missing cols
    law_csv: true,
    date_entered: true,
  });

  React.useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_schema', 'public')
          .eq('table_name', 'candidates');
        const names = new Set((data || []).map((c) => c.column_name));
        setCandCols({
          titles_csv: names.has('titles_csv'),
          law_csv: names.has('law_csv'),
          date_entered: names.has('date_entered'),
        });
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function login() {
    try {
      setErr('');
      const e = String(email || '').trim().toLowerCase();
      if (!e.includes('@')) return setErr('Enter a valid email.');
      if (!pwd) return setErr('Enter your password.');

      const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: e,
        password: pwd,
      });
      if (authErr) return setErr(authErr.message || 'Login failed.');

      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id,email,role,org,account_manager_email')
        .eq('id', auth.user.id)
        .single();
      if (profErr || !prof) return setErr('Login OK, but profile not found.');

      if (prof.role !== tab)
        return setErr(`This account is a ${prof.role}. Switch to the "${prof.role}" tab.`);

      setUser({
        id: prof.id,
        email: prof.email,
        role: prof.role,
        org: prof.org ?? null,
        amEmail: prof.account_manager_email ?? null,
      });
    } catch (e) {
      setErr(e?.message || 'Unexpected login error.');
    }
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setEmail('');
      setPwd('');
      setTab('recruiter');
      setErr('');
    }
  }

  if (user?.role === 'recruiter') {
    return (
      <Frame title="Recruiter workspace" onLogout={logout}>
        <Recruiter user={user} cols={candCols} />
      </Frame>
    );
  }
  if (user?.role === 'client') {
    return (
      <Frame title="Client workspace" onLogout={logout}>
        <Client user={user} cols={candCols} />
      </Frame>
    );
  }
  if (user?.role === 'admin') {
    return (
      <Frame title="Admin workspace" onLogout={logout}>
        <Admin />
      </Frame>
    );
  }

  return (
    <div style={ST.wrap}>
      <div style={ST.bg} />
      <div style={ST.card}>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>Talent Connector</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>Invitation-only access</div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <button style={ST.pill(tab === 'recruiter')} onClick={() => setTab('recruiter')}>
            Recruiter
          </button>
          <button style={ST.pill(tab === 'client')} onClick={() => setTab('client')}>
            Client
          </button>
          <button style={ST.pill(tab === 'admin')} onClick={() => setTab('admin')}>
            Admin
          </button>
        </div>

        <label style={label}>Email</label>
        <input
          style={{ ...ST.input, marginBottom: 10 }}
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label style={label}>Password</label>
        <input
          style={{ ...ST.input, marginBottom: 12 }}
          type="password"
          placeholder="your password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
        />
        <button style={{ ...ST.btn, width: '100%' }} onClick={login}>
          Log in
        </button>
        {err && <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 10 }}>{err}</div>}
      </div>
    </div>
  );
}

/* ---------- recruiter ---------- */
function Recruiter({ user, cols }) {
  const todayISO = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  };

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
    date_entered: todayISO(),
  });
  const [mine, setMine] = React.useState([]);
  const [msg, setMsg] = React.useState('');
  const [err, setErr] = React.useState('');

  function up(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function loadMine() {
    const orderCol = cols.date_entered ? 'date_entered' : 'created_at';
    const { data } = await supabase
      .from('candidates')
      .select('*')
      .eq('created_by', user.id)
      .order(orderCol, { ascending: false })
      .limit(30);
    setMine(Array.isArray(data) ? data : []);
  }

  React.useEffect(() => {
    loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addCandidate() {
    try {
      setErr('');
      setMsg('');
      if (!form.name.trim()) return setErr('Name is required.');

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
      if (cols.date_entered && form.date_entered)
        payload.date_entered = new Date(`${form.date_entered}T00:00:00.000Z`).toISOString();

      const { error } = await supabase.from('candidates').insert(payload);
      if (error) return setErr(`Database error adding candidate: ${error.message}`);

      setMsg('Candidate added');
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
        date_entered: todayISO(),
      });
      await loadMine();
    } catch (e) {
      setErr(e?.message || 'Unexpected error.');
    }
  }

  async function del(id) {
    const { error } = await supabase.from('candidates').delete().eq('id', id);
    if (!error) setMine((m) => m.filter((x) => x.id !== id));
  }

  const row = { display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 10 };
  return (
    <>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>Add candidate</div>

      {/* Row 1 */}
      <div style={{ ...row, marginBottom: 10 }}>
        <div style={{ gridColumn: 'span 4' }}>
          <label style={label}>Full name</label>
          <input style={ST.input} value={form.name} onChange={(e) => up('name', e.target.value)} />
        </div>
        <div style={{ gridColumn: 'span 4' }}>
          <label style={label}>Title(s) (CSV)</label>
          <input
            style={ST.input}
            placeholder="Attorney, Paralegal"
            value={form.titles_csv}
            onChange={(e) => up('titles_csv', e.target.value)}
          />
        </div>
        <div style={{ gridColumn: 'span 4' }}>
          <label style={label}>Type of Law (CSV)</label>
          <input
            style={ST.input}
            placeholder="Litigation, Immigration"
            value={form.law_csv}
            onChange={(e) => up('law_csv', e.target.value)}
          />
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ ...row, marginBottom: 10 }}>
        <div style={{ gridColumn: 'span 3' }}>
          <label style={label}>Years of experience</label>
          <input
            style={ST.input}
            type="number"
            value={form.years}
            onChange={(e) => up('years', e.target.value)}
          />
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <label style={label}>City</label>
          <input style={ST.input} value={form.city} onChange={(e) => up('city', e.target.value)} />
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <label style={label}>State</label>
          <input style={ST.input} value={form.state} onChange={(e) => up('state', e.target.value)} />
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <label style={label}>Salary desired</label>
          <input
            style={ST.input}
            type="number"
            value={form.salary}
            onChange={(e) => up('salary', e.target.value)}
          />
        </div>
      </div>

      {/* Row 3 */}
      <div style={{ ...row, marginBottom: 10, alignItems: 'center' }}>
        <div style={{ gridColumn: 'span 3', display: 'flex', gap: 8, alignItems: 'center' }}>
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
              style={ST.input}
              type="number"
              value={form.hourly}
              onChange={(e) => up('hourly', e.target.value)}
            />
          </div>
        )}
        <div style={{ gridColumn: 'span 3' }}>
          <label style={label}>Date entered</label>
          <input
            style={ST.input}
            type="date"
            value={form.date_entered}
            onChange={(e) => up('date_entered', e.target.value)}
          />
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={label}>Candidate notes</label>
        <textarea
          style={{ ...ST.input, minHeight: 110 }}
          placeholder="Short summary: strengths, availability, fit notes."
          value={form.notes}
          onChange={(e) => up('notes', e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button style={ST.btn} onClick={addCandidate}>
          Add candidate
        </button>
        <div style={{ fontSize: 12 }}>
          {msg && <span style={{ color: '#93e2b7' }}>{msg}</span>}
          {err && <span style={{ color: '#f87171' }}>{err}</span>}
        </div>
      </div>

      <hr style={{ borderColor: 'rgba(148,163,184,0.15)', margin: '16px 0' }} />

      <div style={{ fontWeight: 900, marginBottom: 8 }}>My recent candidates</div>
      {mine.length === 0 ? (
        <div style={{ color: '#9ca3af', fontSize: 13 }}>No candidates yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {mine.map((c) => (
            <div
              key={c.id}
              style={{
                border: '1px solid rgba(148,163,184,0.16)',
                borderRadius: 10,
                padding: 10,
                background: 'rgba(17,24,39,0.72)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 800 }}>
                    {c.name}
                    <span style={{ color: '#9ca3af', fontWeight: 500 }}>
                      {c.titles_csv ? ` · ${c.titles_csv}` : ''}
                      {c.law_csv ? ` · ${c.law_csv}` : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>
                    {c.city || '-'}, {c.state || '-'} · {c.years ?? 0} yrs · $
                    {c.salary ? c.salary.toLocaleString() : '—'}{' '}
                    {c.contract ? ` · $${c.hourly || '—'}/hr` : ''}
                  </div>
                </div>
                <button
                  onClick={() => del(c.id)}
                  style={{
                    ...ST.btn,
                    background: 'rgba(220,38,38,0.9)',
                    border: '1px solid rgba(220,38,38,0.6)',
                  }}
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
    </>
  );
}

/* ---------- client ---------- */
function Client({ user, cols }) {
  // individual filters
  const [nameQ, setNameQ] = React.useState('');
  const [titleQ, setTitleQ] = React.useState('');
  const [lawQ, setLawQ] = React.useState('');
  const [cityQ, setCityQ] = React.useState('');
  const [stateQ, setStateQ] = React.useState('');
  const [onlyContract, setOnlyContract] = React.useState(false);

  // two-thumb sliders
  const [minSalary, setMinSalary] = React.useState(0);
  const [maxSalary, setMaxSalary] = React.useState(400000);
  const [minYears, setMinYears] = React.useState(0);
  const [maxYears, setMaxYears] = React.useState(50);

  // sorting
  const orderableCols = [
    cols.date_entered ? 'date_entered' : 'created_at',
    'salary',
    'years',
    'name',
  ];
  const [sortBy, setSortBy] = React.useState(orderableCols[0]);
  const [sortDir, setSortDir] = React.useState('desc'); // asc | desc

  const [list, setList] = React.useState([]);
  const [todayCount, setTodayCount] = React.useState(0);
  const [openId, setOpenId] = React.useState(null);
  const [err, setErr] = React.useState('');

  function toggleOpen(id) {
    setOpenId((x) => (x === id ? null : id));
  }

  function todayStartISO() {
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
    );
    return start.toISOString();
  }

  async function loadToday() {
    const col = cols.date_entered ? 'date_entered' : 'created_at';
    const from = todayStartISO();
    const { count } = await supabase
      .from('candidates')
      .select('*', { count: 'exact', head: true })
      .gte(col, from);
    setTodayCount(count || 0);
  }

  async function load() {
    try {
      setErr('');
      let q = supabase.from('candidates').select('*');

      // sliders
      q = q.gte('salary', minSalary).lte('salary', maxSalary);
      q = q.gte('years', minYears).lte('years', maxYears);

      // booleans
      if (onlyContract) q = q.eq('contract', true);

      // text filters (ILIKE)
      const ors = [];
      if (nameQ.trim()) ors.push(`name.ilike.%${nameQ.trim()}%`);
      if (titleQ.trim() && cols.titles_csv) ors.push(`titles_csv.ilike.%${titleQ.trim()}%`);
      if (lawQ.trim() && cols.law_csv) ors.push(`law_csv.ilike.%${lawQ.trim()}%`);
      if (cityQ.trim()) ors.push(`city.ilike.%${cityQ.trim()}%`);
      if (stateQ.trim()) ors.push(`state.ilike.%${stateQ.trim()}%`);
      if (ors.length) q = q.or(ors.join(','));

      // ordering
      q = q.order(sortBy, { ascending: sortDir === 'asc' }).limit(75);

      const { data, error } = await q;
      if (error) return setErr(error.message);
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || 'Error loading candidates.');
    }
  }

  React.useEffect(() => {
    loadToday();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panel = {
    border: '1px solid rgba(148,163,184,0.16)',
    borderRadius: 14,
    padding: 14,
    background: 'rgba(17,24,39,0.72)',
  };

  return (
    <>
      {/* top summary + refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'end' }}>
        <div style={panel}>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>Candidates added today</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{todayCount}</div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <select
            style={ST.input}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            title="Sort by"
          >
            {orderableCols.map((c) => (
              <option key={c} value={c}>
                Sort by: {c}
              </option>
            ))}
          </select>
          <select
            style={ST.input}
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value)}
            title="Direction"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
          <button style={ST.btn} onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {/* filters */}
      <div style={{ ...panel, marginTop: 12 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 10,
            marginBottom: 8,
          }}
        >
          <input
            style={ST.input}
            placeholder="Name"
            value={nameQ}
            onChange={(e) => setNameQ(e.target.value)}
          />
          <input
            style={ST.input}
            placeholder="Title (CSV contains)"
            value={titleQ}
            onChange={(e) => setTitleQ(e.target.value)}
          />
          <input
            style={ST.input}
            placeholder="Type of Law (CSV contains)"
            value={lawQ}
            onChange={(e) => setLawQ(e.target.value)}
          />
          <input
            style={ST.input}
            placeholder="City"
            value={cityQ}
            onChange={(e) => setCityQ(e.target.value)}
          />
          <input
            style={ST.input}
            placeholder="State"
            value={stateQ}
            onChange={(e) => setStateQ(e.target.value)}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
              Salary range (${minSalary.toLocaleString()} – ${maxSalary.toLocaleString()})
            </div>
            <TwoThumb
              min={0}
              max={400000}
              step={5000}
              valueMin={minSalary}
              valueMax={maxSalary}
              onChangeMin={setMinSalary}
              onChangeMax={setMaxSalary}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
              Years of experience ({minYears} – {maxYears})
            </div>
            <TwoThumb
              min={0}
              max={50}
              step={1}
              valueMin={minYears}
              valueMax={maxYears}
              onChangeMin={setMinYears}
              onChangeMax={setMaxYears}
            />
          </div>
        </div>

        <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
            <input
              type="checkbox"
              checked={onlyContract}
              onChange={(e) => setOnlyContract(e.target.checked)}
            />
            Contract only
          </label>
          <button style={ST.btn} onClick={load}>
            Apply filters
          </button>
        </div>
      </div>

      {err && <div style={{ color: '#f87171', fontSize: 12, marginTop: 10 }}>{err}</div>}

      {/* results */}
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
                background: 'rgba(17,24,39,0.72)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 900 }}>
                    {c.name}
                    <span style={{ color: '#9ca3af', fontWeight: 500 }}>
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
                  <button style={ST.btn} onClick={() => setOpenId((x) => (x === c.id ? null : c.id))}>
                    {openId === c.id ? 'Hide details' : 'Additional information'}
                  </button>
                  <a
                    style={{ ...ST.btn, textDecoration: 'none' }}
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
    </>
  );
}

/* ---------- admin (simple directory) ---------- */
function Admin() {
  const [rows, setRows] = React.useState([]);
  const [err, setErr] = React.useState('');

  async function load() {
    const { data, error } = await supabase
      .from('profiles')
      .select('email,role,org,account_manager_email')
      .order('email', { ascending: true });
    if (error) setErr(error.message);
    else setRows(Array.isArray(data) ? data : []);
  }

  React.useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 900 }}>Directory</div>
        <button style={ST.btn} onClick={load}>
          Refresh
        </button>
      </div>
      {err && <div style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>{err}</div>}

      <div
        style={{
          marginTop: 10,
          border: '1px solid rgba(148,163,184,0.16)',
          borderRadius: 12,
          overflow: 'hidden',
          background: 'rgba(17,24,39,0.72)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
            gap: 0,
            padding: '10px 12px',
            borderBottom: '1px solid rgba(148,163,184,0.16)',
            color: '#9ca3af',
            fontSize: 12,
          }}
        >
          <div>Email</div>
          <div>Role</div>
          <div>Org</div>
          <div>Sales contact</div>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: 12, color: '#9ca3af', fontSize: 13 }}>No profiles.</div>
        ) : (
          rows.map((r) => (
            <div
              key={r.email}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
                gap: 0,
                padding: '10px 12px',
                borderTop: '1px solid rgba(148,163,184,0.12)',
              }}
            >
              <div>{r.email}</div>
              <div>
                <span style={ST.chip}>{r.role}</span>
              </div>
              <div>{r.org || '—'}</div>
              <div>{r.account_manager_email || '—'}</div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

/* ---------- frame & helpers ---------- */
function Frame({ title, onLogout, children }) {
  return (
    <div style={ST.wrap}>
      <div style={ST.bg} />
      <div style={ST.shell}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 20 }}>{title}</div>
          <button
            onClick={onLogout}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid rgba(148,163,184,0.16)',
              background: 'rgba(31,41,55,0.7)',
              color: '#e5e5e5',
              fontWeight: 700,
            }}
          >
            Log out
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const label = { display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 6 };

/* ---------- two-thumb slider (both thumbs active) ---------- */
function TwoThumb({ min, max, step, valueMin, valueMax, onChangeMin, onChangeMax }) {
  const pctMin = ((valueMin - min) / (max - min)) * 100;
  const pctMax = ((valueMax - min) / (max - min)) * 100;

  const base = {
    WebkitAppearance: 'none',
    appearance: 'none',
    width: '100%',
    background: 'transparent',
    outline: 'none',
    position: 'absolute',
    top: 0,
    left: 0,
    height: 24,
    margin: 0,
    pointerEvents: 'auto', // both sliders interactive
  };

  function clampMin(v) {
    const nv = Math.min(Math.max(v, min), valueMax);
    onChangeMin(nv);
  }
  function clampMax(v) {
    const nv = Math.max(Math.min(v, max), valueMin);
    onChangeMax(nv);
  }

  return (
    <div style={{ position: 'relative', height: 24 }}>
      {/* track */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 0,
          right: 0,
          height: 4,
          borderRadius: 999,
          background: 'rgba(148,163,184,0.25)',
        }}
      />
      {/* selected */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          height: 4,
          left: `${pctMin}%`,
          width: `${Math.max(0, pctMax - pctMin)}%`,
          background: '#4f46e5',
          borderRadius: 999,
        }}
      />

      {/* lower thumb */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valueMin}
        onChange={(e) => clampMin(Number(e.target.value))}
        style={{ ...base, zIndex: 3 }}
      />
      {/* upper thumb */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valueMax}
        onChange={(e) => clampMax(Number(e.target.value))}
        style={{ ...base, zIndex: 4 }}
      />

      {/* thumb styles */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb{
          -webkit-appearance:none; appearance:none;
          height:16px; width:16px; border-radius:50%;
          background:#2563eb; border:2px solid #93c5fd; cursor:pointer; margin-top:-6px;
        }
        input[type="range"]::-moz-range-thumb{
          height:16px; width:16px; border-radius:50%;
          background:#2563eb; border:2px solid #93c5fd; cursor:pointer;
        }
        input[type="range"]::-webkit-slider-runnable-track{ height:4px; background:transparent; }
        input[type="range"]::-moz-range-track{ height:4px; background:transparent; }
      `}</style>
    </div>
  );
}
