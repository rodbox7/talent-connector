'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase as sb } from '../lib/supabaseClient';

/** ─────────────────────────────────────────────────────────────────────────────
 * Talent Connector – single file page
 * - NYC background on all screens
 * - Login tabs (Recruiter / Client / Admin)
 * - Supabase-first auth with resilient profile fetch (id -> email fallback)
 * - Recruiter: add candidate + recent list
 * - Client: today count + recent list with text search
 * - Admin: placeholder (users managed via Supabase)
 * ──────────────────────────────────────────────────────────────────────────── */

const NYC =
  'https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg';

const shell = {
  minHeight: '100vh',
  width: '100%',
  backgroundImage: `url("${NYC}")`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  color: '#e5e7eb',
  fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
  display: 'flex',
  justifyContent: 'center',
  padding: '40px 16px',
};

const sheet = {
  width: '100%',
  maxWidth: 1180,
  background: 'rgba(0,0,0,.72)',
  backdropFilter: 'blur(2px)',
  border: '1px solid rgba(255,255,255,.09)',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 8px 28px rgba(0,0,0,.45)',
};

const h1 = { fontSize: 22, fontWeight: 800, margin: '2px 0 12px 0' };
const sub = { fontSize: 12, color: '#9ca3af', marginBottom: 12 };
const row = { display: 'flex', gap: 10, alignItems: 'center' };
const tabs = { display: 'grid', gridTemplateColumns: 'repeat(3,120px)', gap: 10, marginTop: 2 };
const tab = (active) => ({
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,.08)',
  background: active ? 'rgba(31,41,55,.85)' : 'rgba(17,24,39,.85)',
  color: '#e5e7eb',
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'center',
});

const label = { fontSize: 12, color: '#9ca3af', marginBottom: 4 };
const input = {
  width: '100%',
  padding: '10px 12px',
  background: 'rgba(17,24,39,.85)',
  border: '1px solid rgba(255,255,255,.08)',
  color: '#e5e7eb',
  borderRadius: 10,
  outline: 'none',
};
const btn = {
  padding: '10px 14px',
  borderRadius: 10,
  background: '#4f46e5',
  color: 'white',
  border: '1px solid rgba(255,255,255,.1)',
  fontWeight: 700,
  cursor: 'pointer',
};
const btnGhost = {
  padding: '8px 12px',
  borderRadius: 10,
  background: 'rgba(31,41,55,.85)',
  color: '#e5e7eb',
  border: '1px solid rgba(255,255,255,.1)',
  cursor: 'pointer',
};
const section = {
  background: 'rgba(0,0,0,.70)',
  border: '1px solid rgba(255,255,255,.08)',
  borderRadius: 14,
  padding: 16,
};

/* ────────────────────────────────────────────────────────────────────────────
   Auth + session
──────────────────────────────────────────────────────────────────────────── */

export default function Page() {
  const [mode, setMode] = useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [user, setUser] = useState(null); // {id,email,role,org,amEmail}

  // resilient login: id first, email fallback
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

      // primary: by auth.user.id
      let { data: prof, error: profErr } = await sb
        .from('profiles')
        .select('id,email,role,org,account_manager_email')
        .eq('id', auth.user.id)
        .single();

      // fallback: by email
      if (profErr || !prof) {
        const { data: byEmail, error: e2 } = await sb
          .from('profiles')
          .select('id,email,role,org,account_manager_email')
          .eq('email', e)
          .single();

        if (e2 || !byEmail) {
          setErr('Login ok, but profile not found. Ask Admin to add your profile.');
          return;
        }
        prof = byEmail;
      }

      if (mode !== prof.role) {
        setErr(`This account is a ${prof.role}. Switch to the ${prof.role} tab.`);
        return;
      }

      setUser({
        id: prof.id,
        email: prof.email,
        role: prof.role,
        org: prof.org || '',
        amEmail: prof.account_manager_email || '',
      });
    } catch (ex) {
      console.error(ex);
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

  /* ──────────────────────────────────────────────────────────────────────────
     Recruiter – add candidate + list
  ─────────────────────────────────────────────────────────────────────────── */

  const [cName, setCName] = useState('');
  const [cTitles, setCTitles] = useState(''); // CSV string
  const [cLaw, setCLaw] = useState(''); // CSV string
  const [cYears, setCYears] = useState('');
  const [cCity, setCCity] = useState('');
  const [cState, setCState] = useState('');
  const [cSalary, setCSalary] = useState('');
  const [cContract, setCContract] = useState(false);
  const [cHourly, setCHourly] = useState('');
  const [cNotes, setCNotes] = useState('');
  const [cRecentYears, setCRecentYears] = useState(''); // recent_role_years
  const [cYearsInRecent, setCYearsInRecent] = useState(''); // years_in_recent_role
  const [addFlash, setAddFlash] = useState('');

  const [myRecent, setMyRecent] = useState([]);
  const [loadingMy, setLoadingMy] = useState(false);

  async function addCandidate() {
    setAddFlash('');
    if (!user) return;
    try {
      const payload = {
        name: cName.trim(),
        title_csv: cTitles.trim(),
        law_csv: cLaw.trim(),
        years: cYears ? Number(cYears) : null,
        city: cCity.trim() || null,
        state: cState.trim() || null,
        salary: cSalary ? Number(cSalary) : null,
        contract: Boolean(cContract),
        hourly: cContract && cHourly ? Number(cHourly) : null,
        notes: cNotes.trim() || null,
        recent_role_years: cRecentYears ? Number(cRecentYears) : null,
        years_in_recent_role: cYearsInRecent ? Number(cYearsInRecent) : null,
        created_by: user.id,
        date_entered: new Date().toISOString(),
      };

      const { error } = await sb.from('candidates').insert(payload);
      if (error) throw error;

      setAddFlash('Candidate added');
      // reset a few inputs but keep notes / law / titles handy
      setCName('');
      setCYears('');
      setCCity('');
      setCState('');
      setCSalary('');
      setCContract(false);
      setCHourly('');
      setCRecentYears('');
      setCYearsInRecent('');

      // refresh my list
      await loadMyRecent();
    } catch (e) {
      console.error(e);
      setAddFlash('Database error adding candidate');
    }
  }

  async function loadMyRecent() {
    if (!user) return;
    setLoadingMy(true);
    try {
      const { data, error } = await sb
        .from('candidates')
        .select(
          'id,name,title_csv,law_csv,city,state,years,salary,contract,hourly,notes,date_entered'
        )
        .eq('created_by', user.id)
        .order('date_entered', { ascending: false })
        .limit(10);
      if (!error) setMyRecent(data || []);
    } finally {
      setLoadingMy(false);
    }
  }

  useEffect(() => {
    if (user?.role === 'recruiter') {
      loadMyRecent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  /* ──────────────────────────────────────────────────────────────────────────
     Client – today count + list with text search
  ─────────────────────────────────────────────────────────────────────────── */

  const [clientQuery, setClientQuery] = useState('');
  const [clientRows, setClientRows] = useState([]);
  const [clientLoadErr, setClientLoadErr] = useState('');
  const [todayCount, setTodayCount] = useState(0);

  async function loadClient() {
    setClientLoadErr('');
    try {
      // today count
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { count: cnt } = await sb
        .from('candidates')
        .select('id', { count: 'exact', head: true })
        .gte('date_entered', start.toISOString());
      setTodayCount(cnt || 0);

      // recent list with optional search
      let q = sb
        .from('candidates')
        .select(
          'id,name,title_csv,law_csv,city,state,years,salary,contract,hourly,notes,date_entered'
        )
        .order('date_entered', { ascending: false })
        .limit(50);

      const t = clientQuery.trim();
      if (t) {
        // simple OR search across a few text columns
        q = q.or(
          ['name.ilike.%' + t + '%',
           'city.ilike.%' + t + '%',
           'state.ilike.%' + t + '%',
           'title_csv.ilike.%' + t + '%',
           'law_csv.ilike.%' + t + '%'
          ].join(',')
        );
      }

      const { data, error } = await q;
      if (error) throw error;
      setClientRows(data || []);
    } catch (e) {
      console.error(e);
      setClientLoadErr('Error loading client view.');
      setClientRows([]);
    }
  }

  useEffect(() => {
    if (user?.role === 'client') {
      loadClient();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  /* ──────────────────────────────────────────────────────────────────────────
     Render: Login
  ─────────────────────────────────────────────────────────────────────────── */

  if (!user) {
    return (
      <div style={shell}>
        <div style={{ ...sheet, maxWidth: 700 }}>
          <div style={h1}>Talent Connector - Powered by Beacon Hill Legal</div>
          <div style={sub}>Invitation-only access</div>

          <div style={tabs}>
            <button style={tab(mode === 'recruiter')} onClick={() => setMode('recruiter')}>
              Recruiter
            </button>
            <button style={tab(mode === 'client')} onClick={() => setMode('client')}>
              Client
            </button>
            <button style={tab(mode === 'admin')} onClick={() => setMode('admin')}>
              Admin
            </button>
          </div>

          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            <div>
              <div style={label}>Email</div>
              <input
                style={input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
              />
            </div>
            <div>
              <div style={label}>Password</div>
              <input
                style={input}
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="Your password"
              />
            </div>
            <div>
              <button style={btn} onClick={login}>
                Log in
              </button>
            </div>
            {err ? <div style={{ color: '#f87171', fontSize: 12 }}>{err}</div> : null}
          </div>
        </div>
      </div>
    );
  }

  /* ──────────────────────────────────────────────────────────────────────────
     Render: Admin
  ─────────────────────────────────────────────────────────────────────────── */

  if (user.role === 'admin') {
    return (
      <div style={shell}>
        <div style={sheet}>
          <div style={{ ...row, justifyContent: 'space-between' }}>
            <div>
              <div style={h1}>Admin workspace</div>
              <div style={sub}>
                Minimal placeholder for <b>admin</b>. (Users are managed in Supabase.)
              </div>
            </div>
            <button style={btnGhost} onClick={logout}>
              Log out
            </button>
          </div>

          <div style={section}>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>
              Nothing fancy here yet—just confirming admin login works with the new profile
              fallback.
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ──────────────────────────────────────────────────────────────────────────
     Render: Recruiter
  ─────────────────────────────────────────────────────────────────────────── */

  if (user.role === 'recruiter') {
    return (
      <div style={shell}>
        <div style={sheet}>
          <div style={{ ...row, justifyContent: 'space-between' }}>
            <div>
              <div style={h1}>Recruiter workspace</div>
              <div style={sub}>Add candidates (your recent entries appear below).</div>
            </div>
            <button style={btnGhost} onClick={logout}>
              Log out
            </button>
          </div>

          <div style={{ ...section, marginBottom: 14 }}>
            {/* Form grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(12, 1fr)',
                gap: 10,
              }}
            >
              <div style={{ gridColumn: 'span 4' }}>
                <div style={label}>Full name</div>
                <input style={input} value={cName} onChange={(e) => setCName(e.target.value)} />
              </div>
              <div style={{ gridColumn: 'span 4' }}>
                <div style={label}>Titles (CSV)</div>
                <input
                  style={input}
                  value={cTitles}
                  onChange={(e) => setCTitles(e.target.value)}
                  placeholder="Attorney, Paralegal"
                />
              </div>
              <div style={{ gridColumn: 'span 4' }}>
                <div style={label}>Type of Law (CSV)</div>
                <input
                  style={input}
                  value={cLaw}
                  onChange={(e) => setCLaw(e.target.value)}
                  placeholder="Litigation, Immigration"
                />
              </div>

              <div style={{ gridColumn: 'span 3' }}>
                <div style={label}>Years of experience</div>
                <input
                  style={input}
                  type="number"
                  value={cYears}
                  onChange={(e) => setCYears(e.target.value)}
                />
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <div style={label}>City</div>
                <input style={input} value={cCity} onChange={(e) => setCCity(e.target.value)} />
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <div style={label}>State</div>
                <input style={input} value={cState} onChange={(e) => setCState(e.target.value)} />
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <div style={label}>Salary desired</div>
                <input
                  style={input}
                  type="number"
                  value={cSalary}
                  onChange={(e) => setCSalary(e.target.value)}
                />
              </div>

              <div style={{ gridColumn: 'span 3', display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                <label style={{ ...label, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={cContract}
                    onChange={(e) => setCContract(e.target.checked)}
                  />
                  Available for contract
                </label>
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                {cContract ? (
                  <>
                    <div style={label}>Hourly rate</div>
                    <input
                      style={input}
                      type="number"
                      value={cHourly}
                      onChange={(e) => setCHourly(e.target.value)}
                    />
                  </>
                ) : null}
              </div>

              <div style={{ gridColumn: 'span 3' }}>
                <div style={label}>Years in recent role</div>
                <input
                  style={input}
                  type="number"
                  value={cYearsInRecent}
                  onChange={(e) => setCYearsInRecent(e.target.value)}
                />
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <div style={label}>Recent role years (overall)</div>
                <input
                  style={input}
                  type="number"
                  value={cRecentYears}
                  onChange={(e) => setCRecentYears(e.target.value)}
                />
              </div>

              <div style={{ gridColumn: 'span 12' }}>
                <div style={label}>Candidate Notes</div>
                <textarea
                  style={{ ...input, minHeight: 120, resize: 'vertical' }}
                  value={cNotes}
                  onChange={(e) => setCNotes(e.target.value)}
                  placeholder="Short summary: strengths, availability, fit notes."
                />
              </div>
            </div>

            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <button style={btn} onClick={addCandidate}>
                Add candidate
              </button>
              {addFlash ? (
                <span style={{ fontSize: 12, color: addFlash.includes('error') ? '#f87171' : '#93e2b7' }}>
                  {addFlash}
                </span>
              ) : null}
            </div>
          </div>

          <div style={section}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>My recent candidates</div>
            {loadingMy ? (
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Loading…</div>
            ) : myRecent.length === 0 ? (
              <div style={{ fontSize: 12, color: '#9ca3af' }}>No candidates yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {myRecent.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      background: 'rgba(17,24,39,.85)',
                      border: '1px solid rgba(255,255,255,.08)',
                      borderRadius: 10,
                      padding: 12,
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>
                      {r.name}{' '}
                      <span style={{ color: '#9ca3af', fontWeight: 400 }}>
                        · {r.title_csv || '—'} · {r.law_csv || '—'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      {r.city || '—'}, {r.state || '—'} · {r.years ?? '—'} yrs ·{' '}
                      {r.contract ? `Contract $${r.hourly ?? '—'}/hr` : `Salary $${r.salary ?? '—'}`}
                    </div>
                    {r.notes ? (
                      <div style={{ fontSize: 12, marginTop: 6, whiteSpace: 'pre-wrap' }}>{r.notes}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ──────────────────────────────────────────────────────────────────────────
     Render: Client
  ─────────────────────────────────────────────────────────────────────────── */

  return (
    <div style={shell}>
      <div style={sheet}>
        <div style={{ ...row, justifyContent: 'space-between' }}>
          <div>
            <div style={h1}>Client workspace</div>
            <div style={sub}>Read-only access to recent candidates.</div>
          </div>
          <button style={btnGhost} onClick={logout}>
            Log out
          </button>
        </div>

        <div style={{ ...section, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Candidates added today</div>
              <div style={{ fontSize: 40, lineHeight: '42px', fontWeight: 800 }}>{todayCount}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                style={{ ...input, width: 360 }}
                placeholder="Search name/city/state/title/law"
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
              />
              <button style={btnGhost} onClick={loadClient}>
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div style={section}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Recent candidates (read-only)</div>
          {clientLoadErr ? (
            <div style={{ fontSize: 12, color: '#f87171' }}>{clientLoadErr}</div>
          ) : clientRows.length === 0 ? (
            <div style={{ fontSize: 12, color: '#9ca3af' }}>No candidates found.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {clientRows.map((r) => (
                <ClientRow key={r.id} row={r} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Small row component so client list can expand for notes */
function ClientRow({ row }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        background: 'rgba(17,24,39,.85)',
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 10,
        padding: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800 }}>
            {row.name}{' '}
            <span style={{ color: '#9ca3af', fontWeight: 400 }}>
              · {row.title_csv || '—'} · {row.law_csv || '—'}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>
            {row.city || '—'}, {row.state || '—'} · {row.years ?? '—'} yrs ·{' '}
            {row.contract ? `Contract $${row.hourly ?? '—'}/hr` : `Salary $${row.salary ?? '—'}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnGhost} onClick={() => setOpen((v) => !v)}>
            {open ? 'Hide notes' : 'Additional information'}
          </button>
          {/* "Email for more information" simply opens default mail client to AM or generic */}
          <a
            style={{ ...btnGhost, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            href={`mailto:sales@youragency.com?subject=Candidate%20inquiry:%20${encodeURIComponent(
              row.name || ''
            )}`}
          >
            Email for more information
          </a>
        </div>
      </div>
      {open && row.notes ? (
        <div style={{ fontSize: 12, marginTop: 8, whiteSpace: 'pre-wrap' }}>{row.notes}</div>
      ) : null}
    </div>
  );
}
