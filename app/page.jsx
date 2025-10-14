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

  const baseShell = (
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
    </div>
  );

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
// Recruiter view (unchanged from your working build)
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
        .limit(50);
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
      setErr('Database error adding candidate');
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

  return (
    <div style={{ padding: 16 }}>
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

        {/* Recent list */}
        <div style={{ ...glass, padding: 14, marginTop: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Recent candidates</div>
          {rows.map((c) => (
            <CandidateCard key={c.id} c={c} />
          ))}
          {!rows.length ? <div style={{ color: '#b6beca' }}>No candidates yet.</div> : null}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Client view (updated as requested)
// ───────────────────────────────────────────────────────────────────────────────
function ClientView({ email, onLogout }) {
  const [todayCount, setTodayCount] = useState(0);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const [amEmail, setAmEmail] = useState(''); // salesperson email tied to this client

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
      .limit(100);

    if (error) setErr('Error loading client view.');
    else setRows(data || []);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const blob = [r.name, r.titles, r.practice_areas, r.city, r.state, r.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(s);
    });
  }, [q, rows]);

  return (
    <div style={{ padding: 16 }}>
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

// A non-clickable row with inline header + buttons
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
