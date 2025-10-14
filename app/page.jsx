'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// ───────────────────────────────────────────────────────────────────────────────
// Shared styling + helpers
// ───────────────────────────────────────────────────────────────────────────────
const NYC_URL =
  'https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg';

const glass = {
  background: 'rgba(17,19,24,0.88)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow:
    '0 8px 30px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06), inset 0 0 1px rgba(255,255,255,.25)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  borderRadius: 14,
};

const btn = {
  background: '#3b82f6',
  color: '#fff',
  borderRadius: 8,
  padding: '9px 14px',
  border: '1px solid rgba(255,255,255,.12)',
  cursor: 'pointer',
};

const btnGhost = {
  background: '#1f2937',
  color: '#e8eaed',
  borderRadius: 8,
  padding: '9px 14px',
  border: '1px solid rgba(255,255,255,.12)',
  cursor: 'pointer',
};

const input = {
  width: '100%',
  padding: 10,
  borderRadius: 8,
  background: 'rgba(22,24,30,0.92)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#e8eaed',
  outline: 'none',
};

const label = { fontSize: 12, color: '#b6beca', marginBottom: 6 };

const csvToArray = (s) =>
  String(s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
const arrayToCsv = (arr) => (Array.isArray(arr) ? arr.join(', ') : '');

// Mailto for client → salesperson
function buildContactMailto(c, amEmail, clientEmail) {
  const to = amEmail || 'info@youragency.com';
  const subj = `Talent Connector Candidate – ${c?.name || ''}`;
  const body = [
    `Hello,`,
    ``,
    `I'm interested in this candidate:`,
    `• Name: ${c?.name || ''}`,
    `• Title(s): ${arrayToCsv(csvToArray(c?.titles))}`,
    `• Type(s) of Law: ${arrayToCsv(csvToArray(c?.practice_areas))}`,
    `• Location: ${[c?.city, c?.state].filter(Boolean).join(', ')}`,
    `• Years: ${c?.years ?? ''}`,
    ``,
    `My email: ${clientEmail || ''}`,
    ``,
    `Sent from Talent Connector`,
  ].join('\n');
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
}

// Dual-thumb slider styles (years & salary)
function RangeStyles() {
  return (
    <style>{`
      .dual-wrap { position: relative; height: 28px; }
      .dual-track {
        position: absolute; top: 12px; left: 0; right: 0; height: 4px;
        background: #1f2937; border-radius: 999px;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 1px 2px rgba(0,0,0,.6);
      }
      .dual-sel {
        position: absolute; top: 12px; height: 4px; background: #4f46e5; border-radius: 999px;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.15), 0 1px 2px rgba(0,0,0,.7);
      }
      .dual-range { -webkit-appearance:none; appearance:none; position:absolute; left:0; right:0; top:0; width:100%; height:28px; background:transparent; margin:0; }
      .dual-range:focus{ outline:none; }
      .dual-range::-webkit-slider-runnable-track{ background:transparent; }
      .dual-range::-moz-range-track{ background:transparent; border:none; }
      .dual-range.low{ z-index:4; }
      .dual-range.high{ z-index:5; pointer-events:none; }
      .dual-range.high::-webkit-slider-thumb{ pointer-events:all; }
      .dual-range.high::-moz-range-thumb{ pointer-events:all; }
      .dual-range::-webkit-slider-thumb{
        -webkit-appearance:none; width:18px; height:18px; border-radius:50%;
        background:#22d3ee; border:2px solid #0b0b0b;
        box-shadow: 0 2px 3px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.35);
      }
      .dual-range::-moz-range-thumb{
        width:18px; height:18px; border-radius:50%;
        background:#22d3ee; border:2px solid #0b0b0b;
        box-shadow: 0 2px 3px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.35);
      }
    `}</style>
  );
}

function DualSlider({ min, max, low, high, onChange }) {
  const lo = Math.max(min, Math.min(high, Number.isFinite(low) ? low : min));
  const hi = Math.min(max, Math.max(lo, Number.isFinite(high) ? high : max));
  const pct = (v) => ((v - min) / (max - min)) * 100;
  const leftPct = pct(lo);
  const rightPct = pct(hi);

  function handleLow(e) {
    const next = Math.min(Number(e.target.value), hi);
    onChange(next, hi);
  }
  function handleHigh(e) {
    const next = Math.max(Number(e.target.value), lo);
    onChange(lo, next);
  }

  return (
    <div className="dual-wrap">
      <div className="dual-track" />
      <div
        className="dual-sel"
        style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
      />
      <input
        className="dual-range low"
        type="range"
        min={min}
        max={max}
        step={1}
        value={lo}
        onChange={handleLow}
        onInput={handleLow}
      />
      <input
        className="dual-range high"
        type="range"
        min={min}
        max={max}
        step={1}
        value={hi}
        onChange={handleHigh}
        onInput={handleHigh}
      />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// App shell (login + role routing)
// ───────────────────────────────────────────────────────────────────────────────
export default function Page() {
  const [session, setSession] = useState(null); // { id, email, role? }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session ? { id: data.session.user.id, email: data.session.user.email } : null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      if (s?.user) {
        setSession({ id: s.user.id, email: s.user.email });
      } else {
        setSession(null);
      }
    });
    return () => sub?.subscription?.unsubscribe();
  }, []);

  const [role, setRole] = useState('recruiter');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');

  async function doLogin() {
    setErr('');
    const e = email.trim().toLowerCase();
    if (!e.includes('@')) {
      setErr('Enter a valid email');
      return;
    }
    const { data: auth, error } = await supabase.auth.signInWithPassword({ email: e, password: pwd });
    if (error) {
      setErr(error.message || 'Login failed');
      return;
    }
    const { data: prof, error: pErr } = await supabase
      .from('profiles')
      .select('id,email,role')
      .eq('id', auth.user.id)
      .single();

    if (pErr || !prof) {
      setErr('Profile not found. Ask admin to invite you.');
      return;
    }
    if (String(prof.role) !== role) {
      setErr(`This account is a ${prof.role}. Switch to the ${prof.role} tab.`);
      return;
    }
    setSession({ id: prof.id, email: prof.email, role: prof.role });
  }

  async function doLogout() {
    await supabase.auth.signOut();
    setSession(null);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        color: '#e8eaed',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <SkylineBG />

      {!session || !session.role ? (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 520, padding: 18, ...glass }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
              Talent Connector - Powered by Beacon Hill Legal
            </div>
            <div style={{ textAlign: 'center', color: '#b6beca', fontSize: 12, marginBottom: 12 }}>
              Invitation-only access
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              <button
                onClick={() => setRole('recruiter')}
                style={{ ...btnGhost, background: role === 'recruiter' ? '#1f2937' : '#16181e' }}
              >
                Recruiter
              </button>
              <button
                onClick={() => setRole('client')}
                style={{ ...btnGhost, background: role === 'client' ? '#1f2937' : '#16181e' }}
              >
                Client
              </button>
              <button
                onClick={() => setRole('admin')}
                style={{ ...btnGhost, background: role === 'admin' ? '#1f2937' : '#16181e' }}
              >
                Admin
              </button>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={label}>Email</div>
              <input style={input} value={email} onChange={(e) => setEmail(e.target.value)} />
              <div style={{ ...label, marginTop: 10 }}>Password</div>
              <input
                type="password"
                style={input}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doLogin()}
              />
              <div style={{ marginTop: 12 }}>
                <button onClick={doLogin} style={{ ...btn, width: '100%', background: '#4f46e5' }}>
                  Log in
                </button>
              </div>
              {err ? (
                <div style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>{err}</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : session.role === 'admin' ? (
        <AdminView email={session.email} onLogout={doLogout} />
      ) : session.role === 'recruiter' ? (
        <RecruiterView email={session.email} onLogout={doLogout} />
      ) : (
        <ClientView email={session.email} onLogout={doLogout} />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Admin placeholder (unchanged)
// ───────────────────────────────────────────────────────────────────────────────
function AdminView({ email, onLogout }) {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ ...glass, padding: 14, maxWidth: 1200, margin: '10px auto' }}>
        <Header title="Admin workspace" onLogout={onLogout} />
        <div style={{ color: '#b6beca' }}>
          Minimal placeholder for <b>admin</b>. (Recruiters/Clients have the full UI.)
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Recruiter view (add + list + delete, with improved error display)
// ───────────────────────────────────────────────────────────────────────────────
function RecruiterView({ email, onLogout }) {
  const [name, setName] = useState('');
  const [titlesCsv, setTitlesCsv] = useState('');
  const [practiceCsv, setPracticeCsv] = useState('');
  const [years, setYears] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [salary, setSalary] = useState('');
  const [contract, setContract] = useState(false);
  const [hourly, setHourly] = useState('');
  const [recentYears, setRecentYears] = useState('');
  const [notes, setNotes] = useState('');
  const [flash, setFlash] = useState('');
  const [err, setErr] = useState('');

  const [rows, setRows] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('candidates')
        .select(
          'id,name,titles,practice_areas,years,city,state,salary,contract,hourly,notes,date_entered,years_in_recent_role'
        )
        .order('date_entered', { ascending: false })
        .limit(100);
      if (!error) setRows(data || []);
    })();
  }, [refreshKey]);

  async function addCandidate() {
    setErr('');
    setFlash('');
    if (!name.trim()) {
      setErr('Name required');
      return;
    }
    const payload = {
      name: name.trim(),
      titles: titlesCsv.trim(),
      practice_areas: practiceCsv.trim(),
      years: years ? Number(years) : null,
      city: city.trim() || null,
      state: state.trim() || null,
      salary: salary ? Number(salary) : null,
      contract: !!contract,
      hourly: contract && hourly ? Number(hourly) : null,
      years_in_recent_role: recentYears ? Number(recentYears) : null,
      notes: notes || null,
      date_entered: new Date().toISOString(),
    };
    const { error } = await supabase.from('candidates').insert([payload]);
    if (error) {
      setErr(`Database error adding candidate: ${error.message || 'Unknown error'}`);
      return;
    }
    setFlash('Candidate added.');
    setName('');
    setTitlesCsv('');
    setPracticeCsv('');
    setYears('');
    setCity('');
    setState('');
    setSalary('');
    setContract(false);
    setHourly('');
    setRecentYears('');
    setNotes('');
    setRefreshKey((x) => x + 1);
  }

  async function deleteCandidate(id) {
    const { error } = await supabase.from('candidates').delete().eq('id', id);
    if (error) {
      alert(`Delete failed: ${error.message || 'Unknown error'}`);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div style={{ padding: 16 }}>
      <RangeStyles />
      <div style={{ ...glass, padding: 14, maxWidth: 1200, margin: '10px auto' }}>
        <Header title="Recruiter workspace" onLogout={onLogout} />

        {/* Add Form */}
        <div style={{ ...glass, padding: 14, marginTop: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Add candidate</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
              gap: 10,
            }}
          >
            <L label="Full name">
              <input style={input} value={name} onChange={(e) => setName(e.target.value)} />
            </L>
            <L label="Titles (CSV)">
              <input
                style={input}
                value={titlesCsv}
                onChange={(e) => setTitlesCsv(e.target.value)}
                placeholder="Attorney, Paralegal"
              />
            </L>
            <L label="Type of Law (CSV)">
              <input
                style={input}
                value={practiceCsv}
                onChange={(e) => setPracticeCsv(e.target.value)}
                placeholder="Litigation, Immigration"
              />
            </L>
            <L label="Years">
              <input style={input} type="number" value={years} onChange={(e) => setYears(e.target.value)} />
            </L>
            <L label="City">
              <input style={input} value={city} onChange={(e) => setCity(e.target.value)} />
            </L>
            <L label="State">
              <input style={input} value={state} onChange={(e) => setState(e.target.value)} />
            </L>
            <L label="Salary">
              <input
                style={input}
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
              />
            </L>
            <L label="Available for contract">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={contract}
                  onChange={(e) => setContract(e.target.checked)}
                />
                {contract ? (
                  <input
                    style={{ ...input, maxWidth: 150 }}
                    placeholder="Hourly"
                    type="number"
                    value={hourly}
                    onChange={(e) => setHourly(e.target.value)}
                  />
                ) : null}
              </div>
            </L>
            <L label="Years in most recent role">
              <input
                style={input}
                type="number"
                value={recentYears}
                onChange={(e) => setRecentYears(e.target.value)}
              />
            </L>
          </div>
          <L label="Candidate Notes">
            <textarea
              rows={4}
              style={{ ...input, resize: 'vertical' }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Short summary: strengths, availability, fit notes."
            />
          </L>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addCandidate} style={btn}>
              Add candidate
            </button>
            {flash ? <div style={{ color: '#93e2b7', fontSize: 12 }}>{flash}</div> : null}
            {err ? <div style={{ color: '#f87171', fontSize: 12 }}>{err}</div> : null}
          </div>
        </div>

        {/* Recent list (with delete) */}
        <div style={{ ...glass, padding: 14, marginTop: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Recent candidates</div>
          {rows.map((c) => (
            <div key={c.id} style={{ ...glass, padding: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {c.name}
                    {c.titles ? ` — ${arrayToCsv(csvToArray(c.titles))}` : ''}
                    {c.practice_areas ? ` — ${arrayToCsv(csvToArray(c.practice_areas))}` : ''}
                  </div>
                  <div style={{ fontSize: 12, color: '#b6beca' }}>
                    {[c.city, c.state].filter(Boolean).join(', ')} • {c.years ?? '-'} yrs
                    {c.years_in_recent_role != null
                      ? ` • ${c.years_in_recent_role} yrs recent role`
                      : ''}
                  </div>
                </div>
                <button onClick={() => deleteCandidate(c.id)} style={{ ...btnGhost }}>
                  Delete
                </button>
              </div>
              {c.notes ? (
                <div
                  style={{
                    marginTop: 8,
                    background: 'rgba(23,25,32,.9)',
                    border: '1px solid rgba(255,255,255,.12)',
                    borderRadius: 10,
                    padding: 10,
                    color: '#e8eaed',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Candidate Notes</div>
                  {c.notes}
                </div>
              ) : null}
            </div>
          ))}
          {!rows.length ? <div style={{ color: '#b6beca' }}>No candidates yet.</div> : null}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Client view (filters + sliders + email + expandable notes)
// ───────────────────────────────────────────────────────────────────────────────
function ClientView({ email, onLogout }) {
  const [todayCount, setTodayCount] = useState(0);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [amEmail, setAmEmail] = useState(''); // salesperson email tied to this client

  // Filters
  const [q, setQ] = useState('');
  const [titlesFilter, setTitlesFilter] = useState('');
  const [lawFilter, setLawFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [minYears, setMinYears] = useState(0);
  const [maxYears, setMaxYears] = useState(50);
  const [minSalary, setMinSalary] = useState(0);
  const [maxSalary, setMaxSalary] = useState(300000);
  const [contractOnly, setContractOnly] = useState(false);

  // Load profile to get client's salesperson email
  useEffect(() => {
    (async () => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('account_manager_email')
        .eq('email', email)
        .single();
      setAmEmail(prof?.account_manager_email || '');
    })();
  }, [email]);

  async function loadAll() {
    setErr('');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    const startISO = `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
    const endISO = `${yyyy}-${mm}-${dd}T23:59:59.999Z`;

    const { count: cnt } = await supabase
      .from('candidates')
      .select('id', { count: 'exact', head: true })
      .gte('date_entered', startISO)
      .lte('date_entered', endISO);
    if (typeof cnt === 'number') setTodayCount(cnt);

    const { data, error } = await supabase
      .from('candidates')
      .select(
        'id,name,titles,practice_areas,years,city,state,salary,contract,hourly,notes,date_entered,years_in_recent_role'
      )
      .order('date_entered', { ascending: false })
      .limit(300);

    if (error) setErr('Error loading client view.');
    else setRows(data || []);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const titlesTokens = csvToArray(titlesFilter).map((x) => x.toLowerCase());
    const lawTokens = csvToArray(lawFilter).map((x) => x.toLowerCase());
    const cityTok = cityFilter.trim().toLowerCase();
    const stateTok = stateFilter.trim().toLowerCase();

    return rows.filter((r) => {
      const blob = [r.name, r.titles, r.practice_areas, r.city, r.state, r.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (s && !blob.includes(s)) return false;

      if (titlesTokens.length) {
        const roles = csvToArray(r.titles).map((x) => x.toLowerCase());
        const match = roles.some((role) => titlesTokens.some((t) => role.includes(t)));
        if (!match) return false;
      }

      if (lawTokens.length) {
        const areas = csvToArray(r.practice_areas).map((x) => x.toLowerCase());
        const match = areas.some((area) => lawTokens.some((t) => area.includes(t)));
        if (!match) return false;
      }

      if (cityTok && !String(r.city || '').toLowerCase().includes(cityTok)) return false;
      if (stateTok && !String(r.state || '').toLowerCase().includes(stateTok)) return false;

      const yrs = Number(r.years) || 0;
      if (yrs < minYears || yrs > maxYears) return false;

      const sal = Number(r.salary) || 0;
      if (sal < minSalary || sal > maxSalary) return false;

      if (contractOnly && !r.contract) return false;

      return true;
    });
  }, [
    rows,
    q,
    titlesFilter,
    lawFilter,
    cityFilter,
    stateFilter,
    minYears,
    maxYears,
    minSalary,
    maxSalary,
    contractOnly,
  ]);

  return (
    <div style={{ padding: 16 }}>
      <RangeStyles />
      <div style={{ ...glass, padding: 14, maxWidth: 1200, margin: '10px auto' }}>
        <Header title="Client workspace" onLogout={onLogout} />

        {/* Stats + search */}
        <div
          style={{
            ...glass,
            padding: 14,
            display: 'grid',
            gridTemplateColumns: '1fr 280px auto',
            gap: 10,
            alignItems: 'center',
            marginTop: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: '#b6beca' }}>Candidates added today</div>
            <div style={{ fontWeight: 800, fontSize: 40, marginTop: -2 }}>{todayCount}</div>
          </div>

          <input
            style={input}
            placeholder="Search name/city/state/notes/titles/law"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button onClick={loadAll} style={btn}>
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div style={{ ...glass, padding: 14, marginTop: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Filters</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
              gap: 10,
            }}
          >
            <L label="Titles (CSV)">
              <input
                style={input}
                value={titlesFilter}
                onChange={(e) => setTitlesFilter(e.target.value)}
                placeholder="Attorney, Paralegal"
              />
            </L>
            <L label="Type of Law (CSV)">
              <input
                style={input}
                value={lawFilter}
                onChange={(e) => setLawFilter(e.target.value)}
                placeholder="Litigation, Immigration"
              />
            </L>
            <L label="City">
              <input style={input} value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} />
            </L>
            <L label="State">
              <input style={input} value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} />
            </L>
            <L label="Years of experience">
              <DualSlider
                min={0}
                max={50}
                low={minYears}
                high={maxYears}
                onChange={(lo, hi) => {
                  setMinYears(lo);
                  setMaxYears(hi);
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6 }}>
                <span>{minYears} yrs</span>
                <span>{maxYears} yrs</span>
              </div>
            </L>
            <L label="Salary range ($)">
              <DualSlider
                min={0}
                max={300000}
                low={minSalary}
                high={maxSalary}
                onChange={(lo, hi) => {
                  setMinSalary(lo);
                  setMaxSalary(hi);
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6 }}>
                <span>${minSalary.toLocaleString()}</span>
                <span>${maxSalary.toLocaleString()}</span>
              </div>
            </L>
            <L label=" ">
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={contractOnly}
                  onChange={(e) => setContractOnly(e.target.checked)}
                />
                Contract only
              </label>
            </L>
          </div>
        </div>

        {/* Results */}
        <div style={{ ...glass, padding: 14, marginTop: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Recent candidates (read-only)</div>
          {err ? <div style={{ color: '#f87171', marginBottom: 8 }}>{err}</div> : null}

          {filtered.map((c) => (
            <ClientCandidateRow key={c.id} c={c} amEmail={amEmail} clientEmail={email} />
          ))}
          {!filtered.length ? <div style={{ color: '#b6beca' }}>No candidates found.</div> : null}
        </div>
      </div>
    </div>
  );
}

// A row with inline header + buttons + expandable notes
function ClientCandidateRow({ c, amEmail, clientEmail }) {
  const [open, setOpen] = useState(false);
  const titlesCsv = arrayToCsv(csvToArray(c.titles));
  const lawCsv = arrayToCsv(csvToArray(c.practice_areas));
  const when = c.date_entered ? new Date(c.date_entered) : null;

  return (
    <div style={{ ...glass, padding: 12, marginBottom: 10 }}>
      {/* Header line: Name — Titles — Type of Law */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700 }}>
            {c.name}
            {titlesCsv ? ` — ${titlesCsv}` : ''}
            {lawCsv ? ` — ${lawCsv}` : ''}
          </div>
          <div style={{ fontSize: 12, color: '#b6beca' }}>
            {[c.city, c.state].filter(Boolean).join(', ')} • {c.years ?? '-'} yrs
            {c.years_in_recent_role != null ? ` • ${c.years_in_recent_role} yrs recent role` : ''}
            {when ? ` • ${when.toLocaleDateString()}` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'start', flexWrap: 'wrap' }}>
          <button onClick={() => setOpen((v) => !v)} style={btnGhost}>
            Additional information
          </button>
          <a
            href={buildContactMailto(c, amEmail, clientEmail)}
            style={{ ...btn, textDecoration: 'none', display: 'inline-block' }}
          >
            Email for more information
          </a>
        </div>
      </div>

      {/* Notes (expanded only by button) */}
      {open && c.notes ? (
        <div
          style={{
            marginTop: 10,
            background: 'rgba(23,25,32,.9)',
            border: '1px solid rgba(255,255,255,.12)',
            borderRadius: 10,
            padding: 10,
            color: '#e8eaed',
            whiteSpace: 'pre-wrap',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Candidate Notes</div>
          {c.notes}
        </div>
      ) : null}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Reusable pieces
// ───────────────────────────────────────────────────────────────────────────────
function Header({ title, onLogout }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontWeight: 800, fontSize: 20 }}>{title}</div>
      <button onClick={onLogout} style={{ ...btnGhost, background: '#1f2937' }}>
        Log out
      </button>
    </div>
  );
}

function L({ label: text, children }) {
  return (
    <label>
      <div style={label}>{text}</div>
      {children}
    </label>
  );
}

function SkylineBG() {
  const [failed, setFailed] = useState(false);
  if (failed || !NYC_URL) return null;
  return (
    <img
      src={NYC_URL}
      alt=""
      aria-hidden="true"
      onError={() => setFailed(true)}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        filter: 'grayscale(0.1) contrast(1.08) brightness(0.95)',
        zIndex: -1,
      }}
    />
  );
}
