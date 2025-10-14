'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { supabase as sb } from '../lib/supabaseClient';

// ───────────────────────────────────────────────────────────────────────────────
// Config
// ───────────────────────────────────────────────────────────────────────────────
const NYC_URL =
  'https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg';

const CARD_LIMIT_STEP = 30; // how many to show per "page"

// ───────────────────────────────────────────────────────────────────────────────
// Tiny utils
// ───────────────────────────────────────────────────────────────────────────────
const fmtNum = (n) => (n || n === 0 ? n.toLocaleString() : '-');
const qs = {
  read() {
    if (typeof window === 'undefined') return {};
    const p = new URLSearchParams(window.location.search);
    const o = {};
    p.forEach((v, k) => (o[k] = v));
    return o;
  },
  write(next) {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(next);
    const url = `${window.location.pathname}?${p.toString()}`;
    window.history.replaceState({}, '', url);
  },
};

function getWhen(ts, fallback) {
  const d = ts ? new Date(ts) : fallback ? new Date(fallback) : null;
  return d ? d : null;
}
function isSameDay(a, b = new Date()) {
  return (
    a &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ───────────────────────────────────────────────────────────────────────────────
// App Root
// ───────────────────────────────────────────────────────────────────────────────
export default function Page() {
  const [user, setUser] = useState(null); // { id, email, role, org, amEmail }
  const [mode, setMode] = useState('recruiter');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');

  async function login() {
    try {
      setErr('');
      const e = String(email).trim().toLowerCase();
      if (!e.includes('@')) {
        setErr('Enter a valid email');
        return;
      }
      const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
        email: e,
        password: pwd,
      });
      if (authErr) {
        setErr(authErr.message || 'Invalid credentials');
        return;
      }
      if (!auth?.user) {
        setErr('Invalid credentials');
        return;
      }
      const { data: prof, error: profErr } = await sb
        .from('profiles')
        .select('id,email,role,org,account_manager_email')
        .eq('id', auth.user.id)
        .single();

      if (profErr || !prof) {
        setErr('Profile not found. Ask Admin to create your profile.');
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
      setErr('Login error. Please try again.');
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

  // Layout + background
  return (
    <div
      style={{
        minHeight: '100vh',
        color: '#e5e5e5',
        fontFamily: 'system-ui, Arial',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      <Background />

      {!user ? (
        <AuthCard
          email={email}
          setEmail={setEmail}
          pwd={pwd}
          setPwd={setPwd}
          mode={mode}
          setMode={setMode}
          onLogin={login}
          err={err}
        />
      ) : user.role === 'admin' ? (
        <AdminUI user={user} onLogout={logout} />
      ) : user.role === 'recruiter' ? (
        <RecruiterUI user={user} onLogout={logout} />
      ) : (
        <ClientUI user={user} onLogout={logout} />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Background image (safe fallback if it fails)
// ───────────────────────────────────────────────────────────────────────────────
function Background() {
  const [failed, setFailed] = useState(false);
  const style = {
    position: 'fixed',
    inset: 0,
    zIndex: -1,
    pointerEvents: 'none',
    overflow: 'hidden',
    background: 'radial-gradient(ellipse at top, #111827, #07070b 60%)',
  };
  if (failed) return <div aria-hidden="true" style={style} />;
  return (
    <div aria-hidden="true" style={style}>
      <img
        alt=""
        src={NYC_URL}
        onError={() => setFailed(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'grayscale(0.15) contrast(1.1) brightness(0.9)',
          opacity: 0.95,
        }}
      />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Auth Card
// ───────────────────────────────────────────────────────────────────────────────
function AuthCard({ email, setEmail, pwd, setPwd, mode, setMode, onLogin, err }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'rgba(0,0,0,.6)',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 14,
          padding: 16,
          boxShadow: '0 10px 30px rgba(0,0,0,.35)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 18 }}>
          Talent Connector - Powered by Beacon Hill Legal
        </div>
        <div
          style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginBottom: 8 }}
        >
          Invitation-only access
        </div>

        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}
        >
          {['recruiter', 'client', 'admin'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: 10,
                borderRadius: 8,
                background: mode === m ? '#1f2937' : 'rgba(17,24,39,.8)',
                color: '#e5e5e5',
                border: '1px solid rgba(255,255,255,.08)',
              }}
            >
              {m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
            placeholder="name@company.com"
          />
          <Field
            label="Password"
            value={pwd}
            onChange={setPwd}
            type="password"
            placeholder="your password"
          />
          <button
            onClick={onLogin}
            style={{
              width: '100%',
              padding: 12,
              marginTop: 10,
              borderRadius: 8,
              background: '#4f46e5',
              color: '#fff',
            }}
          >
            Log in
          </button>
          {err ? (
            <div style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>{err}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Admin (kept minimal)
// ───────────────────────────────────────────────────────────────────────────────
function AdminUI({ user, onLogout }) {
  return (
    <TopContainer title="Admin workspace" onLogout={onLogout}>
      <div style={{ color: '#9ca3af' }}>
        Minimal placeholder for <b>admin</b>. (Recruiters and Clients have full UI.)
      </div>
    </TopContainer>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Recruiter (kept functional; matches your columns)
// ───────────────────────────────────────────────────────────────────────────────
function RecruiterUI({ user, onLogout }) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [years, setYears] = useState('');
  const [salary, setSalary] = useState('');
  const [contract, setContract] = useState(false);
  const [hourly, setHourly] = useState('');
  const [recentYears, setRecentYears] = useState('');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');

  async function add() {
    setMsg('');
    try {
      const payload = {
        name: name.trim(),
        city: city.trim(),
        state: state.trim(),
        years: years ? Number(years) : null,
        salary: salary ? Number(salary) : null,
        contract: !!contract,
        hourly: contract ? (hourly ? Number(hourly) : null) : null,
        notes: String(notes || ''),
        date_entered: new Date().toISOString(),
        years_in_recent_role: recentYears ? Number(recentYears) : null,
        created_by: user.id,
      };
      if (!payload.name) {
        setMsg('Enter a name');
        return;
      }
      const { error } = await sb.from('candidates').insert(payload);
      if (error) {
        setMsg('Database error adding candidate');
        console.error(error);
        return;
      }
      setMsg('Candidate added');
      setName('');
      setCity('');
      setState('');
      setYears('');
      setSalary('');
      setContract(false);
      setHourly('');
      setRecentYears('');
      setNotes('');
    } catch (e) {
      console.error(e);
      setMsg('Error adding candidate');
    }
  }

  return (
    <TopContainer title="Recruiter workspace" onLogout={onLogout}>
      <div
        style={{
          background: 'rgba(0,0,0,.5)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Add candidate</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 8,
          }}
        >
          <Field label="Full name" value={name} onChange={setName} />
          <Field label="City" value={city} onChange={setCity} />
          <Field label="State" value={state} onChange={setState} />
          <Field label="Years of experience" value={years} onChange={setYears} type="number" />
          <Field label="Salary" value={salary} onChange={setSalary} type="number" />
          <label style={{ fontSize: 12, marginTop: 6 }}>
            <div style={{ color: '#9ca3af', marginBottom: 4 }}>Available for contract</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={contract} onChange={(e) => setContract(e.target.checked)} />
              {contract ? (
                <input
                  type="number"
                  placeholder="Hourly"
                  value={hourly}
                  onChange={(e) => setHourly(e.target.value)}
                  style={inputStyle}
                />
              ) : null}
            </div>
          </label>
          <Field
            label="Years in most recent role"
            value={recentYears}
            onChange={setRecentYears}
            type="number"
          />
        </div>
        <Area
          label="Candidate Notes"
          value={notes}
          onChange={setNotes}
          placeholder="Short summary: strengths, availability, fit notes."
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={add} style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8 }}>
            Add candidate
          </button>
          {msg ? (
            <div
              style={{
                fontSize: 12,
                color: /error/i.test(msg) ? '#f87171' : '#a7f3d0',
                alignSelf: 'center',
              }}
            >
              {msg}
            </div>
          ) : null}
        </div>
      </div>
    </TopContainer>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Client: full experience
// ───────────────────────────────────────────────────────────────────────────────
function ClientUI({ user, onLogout }) {
  // raw data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');

  // filters/state
  const initial = qs.read();
  const [q, setQ] = useState(initial.q || '');
  const [contractOnly, setContractOnly] = useState(initial.co === '1');
  const [minSalary, setMinSalary] = useState(initial.ms || '');
  const [minYears, setMinYears] = useState(initial.my || '');
  const [city, setCity] = useState(initial.city || '');
  const [state, setState] = useState(initial.state || '');
  const [sort, setSort] = useState(initial.sort || 'newest');
  const [range, setRange] = useState(initial.range || '7d'); // today | 7d | 30d | all
  const [compact, setCompact] = useState(initial.comp === '1');
  const [pageSize, setPageSize] = useState(CARD_LIMIT_STEP);
  const [expanded, setExpanded] = useState({}); // id -> bool
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const s = localStorage.getItem('tc_bookmarks');
      return s ? JSON.parse(s) : {};
    } catch {
      return {};
    }
  });

  // fetch candidates (last 1000 by newest first)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadErr('');
      try {
        const { data, error } = await sb
          .from('candidates')
          .select(
            'id,name,city,state,years,salary,contract,hourly,notes,date_entered,created_at,years_in_recent_role'
          )
          .order('date_entered', { ascending: false })
          .limit(1000);
        if (error) throw error;
        if (!cancelled) setRows(data || []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoadErr('Error loading candidates.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // derive city/state lists
  const allCities = useMemo(() => {
    const s = new Set(rows.map((r) => (r.city || '').trim()).filter(Boolean));
    return Array.from(s).sort();
  }, [rows]);
  const allStates = useMemo(() => {
    const s = new Set(rows.map((r) => (r.state || '').trim()).filter(Boolean));
    return Array.from(s).sort();
  }, [rows]);

  // keep URL in sync
  useEffect(() => {
    qs.write({
      q,
      co: contractOnly ? '1' : undefined,
      ms: minSalary || undefined,
      my: minYears || undefined,
      city: city || undefined,
      state: state || undefined,
      sort,
      range,
      comp: compact ? '1' : undefined,
    });
  }, [q, contractOnly, minSalary, minYears, city, state, sort, range, compact]);

  // filter/sort/paginate
  const filtered = useMemo(() => {
    const now = new Date();
    const minDate =
      range === 'today'
        ? daysAgo(0)
        : range === '7d'
        ? daysAgo(6)
        : range === '30d'
        ? daysAgo(29)
        : daysAgo(3650); // "all"
    const s = String(q || '').toLowerCase();
    let out = rows.filter((r) => {
      const when = getWhen(r.date_entered, r.created_at) || new Date(0);
      if (when < minDate) return false;
      if (contractOnly && !r.contract) return false;
      if (minSalary && (!r.salary || r.salary < Number(minSalary))) return false;
      if (minYears && (!r.years || r.years < Number(minYears))) return false;
      if (city && String(r.city || '').toLowerCase() !== city.toLowerCase())
        return false;
      if (state && String(r.state || '').toLowerCase() !== state.toLowerCase())
        return false;
      if (s) {
        const blob = [
          r.name,
          r.city,
          r.state,
          r.notes,
          r.salary ? `$${r.salary}` : '',
          r.years ? `${r.years} yrs` : '',
        ]
          .join(' ')
          .toLowerCase();
        if (!blob.includes(s)) return false;
      }
      return true;
    });

    // sort
    out.sort((a, b) => {
      if (sort === 'years') return (b.years || 0) - (a.years || 0);
      if (sort === 'salary') return (b.salary || 0) - (a.salary || 0);
      if (sort === 'city')
        return String(a.city || '').localeCompare(String(b.city || ''));
      if (sort === 'state')
        return String(a.state || '').localeCompare(String(b.state || ''));
      // newest
      const ad = getWhen(a.date_entered, a.created_at) || new Date(0);
      const bd = getWhen(b.date_entered, b.created_at) || new Date(0);
      return bd - ad;
    });
    return out;
  }, [rows, q, contractOnly, minSalary, minYears, city, state, sort, range]);

  const page = filtered.slice(0, pageSize);

  // counts
  const counts = useMemo(() => {
    const today = rows.filter((r) =>
      isSameDay(getWhen(r.date_entered, r.created_at))
    ).length;
    const in7 =
      rows.filter(
        (r) => (getWhen(r.date_entered, r.created_at) || new Date(0)) >= daysAgo(6)
      ).length || 0;
    const in30 =
      rows.filter(
        (r) =>
          (getWhen(r.date_entered, r.created_at) || new Date(0)) >= daysAgo(29)
      ).length || 0;
    return { today, in7, in30 };
  }, [rows]);

  function toggleBookmark(id) {
    const next = { ...bookmarks };
    if (next[id]) delete next[id];
    else next[id] = 1;
    setBookmarks(next);
    try {
      localStorage.setItem('tc_bookmarks', JSON.stringify(next));
    } catch {}
  }

  function clearFilters() {
    setQ('');
    setContractOnly(false);
    setMinSalary('');
    setMinYears('');
    setCity('');
    setState('');
    setSort('newest');
    setRange('7d');
    setCompact(false);
    setPageSize(CARD_LIMIT_STEP);
  }

  const amEmail = user?.amEmail || 'info@youragency.com';

  return (
    <TopContainer title="Client workspace" onLogout={onLogout}>
      {/* Totals / today counter & search bar */}
      <div
        style={{
          position: 'sticky',
          top: 12,
          zIndex: 5,
          marginBottom: 12,
          background: 'transparent',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <SummaryCard counts={counts} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name/city/state/notes"
              style={inputStyle}
            />
            <button
              onClick={() => setQ(q)}
              style={{ padding: '10px 14px', borderRadius: 8 }}
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Filter row */}
      <div
        style={{
          background: 'rgba(0,0,0,.45)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 8,
          }}
        >
          <Select
            label="Sort by"
            value={sort}
            onChange={setSort}
            options={[
              { value: 'newest', label: 'Newest' },
              { value: 'years', label: 'Years' },
              { value: 'salary', label: 'Salary' },
              { value: 'city', label: 'City' },
              { value: 'state', label: 'State' },
            ]}
          />
          <Select
            label="Date range"
            value={range}
            onChange={setRange}
            options={[
              { value: 'today', label: 'Today' },
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: 'all', label: 'All time' },
            ]}
          />
          <label style={{ fontSize: 12, marginTop: 6 }}>
            <div style={{ color: '#9ca3af', marginBottom: 4 }}>City</div>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={inputStyle}
            >
              <option value="">Any</option>
              {allCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12, marginTop: 6 }}>
            <div style={{ color: '#9ca3af', marginBottom: 4 }}>State</div>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              style={inputStyle}
            >
              <option value="">Any</option>
              {allStates.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <Num label="Min years" value={minYears} onChange={setMinYears} />
          <Num label="Min salary" value={minSalary} onChange={setMinSalary} />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, marginTop: 8 }}>
            <input
              type="checkbox"
              checked={contractOnly}
              onChange={(e) => setContractOnly(e.target.checked)}
            />
            <span>Contract only</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
              <input
                type="checkbox"
                checked={compact}
                onChange={(e) => setCompact(e.target.checked)}
              />
              <span>Compact cards</span>
            </label>
          </div>
          <button onClick={clearFilters} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8 }}>
            Clear filters
          </button>
        </div>
      </div>

      {/* Results */}
      <div
        style={{
          background: 'rgba(0,0,0,.45)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          Results ({fmtNum(filtered.length)})
          {Object.keys(bookmarks).length ? (
            <span style={{ fontWeight: 400, color: '#9ca3af' }}>
              {' '}
              • Shortlisted {Object.keys(bookmarks).length}
            </span>
          ) : null}
        </div>

        {loadErr ? (
          <div style={{ color: '#f87171', fontSize: 12 }}>{loadErr}</div>
        ) : loading ? (
          <div style={{ color: '#9ca3af', fontSize: 12 }}>Loading…</div>
        ) : page.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: 12 }}>No candidates found.</div>
        ) : (
          page.map((c) => {
            const when = getWhen(c.date_entered, c.created_at);
            const showNotes = !!expanded[c.id];
            return (
              <div
                key={c.id}
                onClick={() => setExpanded((e) => ({ ...e, [c.id]: !e[c.id] }))}
                style={{
                  cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,.08)',
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 8,
                  background: 'rgba(17,24,39,.55)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {c.name}{' '}
                      <span style={{ color: '#9ca3af', fontWeight: 400 }}>
                        • {c.city || '-'}, {c.state || '-'} • {c.years || 0} yrs
                        {c.years_in_recent_role ? `, recent ${c.years_in_recent_role} yrs` : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                      Added {when ? when.toLocaleDateString() : '-'}{' '}
                      {c.contract
                        ? c.hourly
                          ? `• Contract $${c.hourly}/hr`
                          : '• Contract'
                        : '• Full-time'}
                      {c.salary ? ` • $${fmtNum(c.salary)}` : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const mail = buildMailto(c, amEmail);
                        window.location.href = mail;
                      }}
                      style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8 }}
                    >
                      Contact
                    </button>
                    <button
                      title="Shortlist"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(c.id);
                      }}
                      style={{
                        fontSize: 12,
                        padding: '6px 10px',
                        borderRadius: 8,
                        background: bookmarks[c.id] ? '#16a34a' : undefined,
                      }}
                    >
                      {bookmarks[c.id] ? '★ Saved' : '☆ Save'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpanded((x) => ({ ...x, [c.id]: !x[c.id] }));
                      }}
                      style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8 }}
                    >
                      {showNotes ? 'Hide notes' : 'View notes'}
                    </button>
                  </div>
                </div>

                {/* Notes (expand/collapse) */}
                {(!compact || showNotes) && (c.notes || '').trim() ? (
                  <div
                    style={{
                      fontSize: 13,
                      color: '#e5e5e5',
                      background: 'rgba(30,58,138,.35)',
                      border: '1px solid rgba(59,130,246,.35)',
                      borderRadius: 8,
                      padding: 8,
                      marginTop: 8,
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Candidate Notes</div>
                    <div>{c.notes}</div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}

        {page.length < filtered.length ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
            <button
              onClick={() => setPageSize((n) => n + CARD_LIMIT_STEP)}
              style={{ padding: '10px 14px', borderRadius: 8 }}
            >
              Load more
            </button>
          </div>
        ) : null}
      </div>
    </TopContainer>
  );
}

function SummaryCard({ counts }) {
  return (
    <div
      style={{
        background: 'rgba(0,0,0,.45)',
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 12,
        padding: 12,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <Stat label="Today" value={counts.today} />
      <Stat label="Last 7 days" value={counts.in7} />
      <Stat label="Last 30 days" value={counts.in30} />
    </div>
  );
}
function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#9ca3af' }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 22 }}>{fmtNum(value)}</div>
    </div>
  );
}
function buildMailto(c, amEmail) {
  const to = amEmail || 'info@youragency.com';
  const subj = `Talent Connector Candidate – ${c?.name || ''}`;
  const body = [
    `Hello,`,
    ``,
    `I'm interested in this candidate:`,
    `• Name: ${c?.name || ''}`,
    `• Location: ${[c?.city, c?.state].filter(Boolean).join(', ')}`,
    `• Years: ${c?.years ?? ''}`,
    c?.salary ? `• Salary: $${fmtNum(c.salary)}` : '',
    c?.contract ? `• Contract${c.hourly ? ` @ $${fmtNum(c.hourly)}/hr` : ''}` : '',
    ``,
    `Sent from Talent Connector`,
  ]
    .filter(Boolean)
    .join('\n');
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
    subj
  )}&body=${encodeURIComponent(body)}`;
}

// ───────────────────────────────────────────────────────────────────────────────
// Shared UI bits
// ───────────────────────────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%',
  padding: 10,
  background: 'rgba(17,24,39,.8)',
  color: '#e5e5e5',
  border: '1px solid rgba(255,255,255,.1)',
  borderRadius: 8,
};

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
      <div style={{ color: '#9ca3af', marginBottom: 4 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
  );
}
function Num({ label, value, onChange }) {
  return <Field label={label} value={value} onChange={onChange} type="number" />;
}
function Area({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
      <div style={{ color: '#9ca3af', marginBottom: 4 }}>{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        style={{ ...inputStyle, resize: 'vertical' }}
      />
    </label>
  );
}
function Select({ label, value, onChange, options }) {
  return (
    <label style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
      <div style={{ color: '#9ca3af', marginBottom: 4 }}>{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function TopContainer({ title, onLogout, children }) {
  return (
    <div style={{ padding: 12, maxWidth: 1200, margin: '0 auto' }}>
      <div
        style={{
          background: 'rgba(0,0,0,.6)',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 14,
          padding: 14,
          marginBottom: 12,
          boxShadow: '0 10px 30px rgba(0,0,0,.35)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 18 }}>{title}</div>
          <button
            onClick={onLogout}
            style={{ padding: '8px 12px', borderRadius: 8 }}
          >
            Log out
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
