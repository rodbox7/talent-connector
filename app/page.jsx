'use client';

import React from 'react';
import { supabase } from '../lib/supabaseClient';

const NYC_URL =
  'https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg';

const glass = {
  background: 'rgba(8,12,20,.85)',
  border: '1px solid rgba(255,255,255,.08)',
  borderRadius: 14,
  boxShadow: '0 8px 28px rgba(0,0,0,.35)',
};

const label = { fontSize: 12, color: '#c9d2e0', marginBottom: 6 };
const input = {
  width: '100%',
  padding: '10px 12px',
  background: '#0f1724',
  color: '#e6eefb',
  border: '1px solid rgba(255,255,255,.08)',
  borderRadius: 8,
  outline: 'none',
};
const btn = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,.12)',
  background: '#3b5bfd',
  color: 'white',
  fontWeight: 600,
};

export default function Page() {
  const [mode, setMode] = React.useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = React.useState('');
  const [pwd, setPwd] = React.useState('');
  const [user, setUser] = React.useState(null);
  const [msg, setMsg] = React.useState('');

  async function login() {
    setMsg('');
    try {
      const { data: auth, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pwd,
      });
      if (error) {
        setMsg(error.message);
        return;
      }
      // fetch profile to verify role
      const { data: prof, error: pErr } = await supabase
        .from('profiles')
        .select('id,email,role,org,account_manager_email')
        .eq('id', auth.user.id)
        .single();

      if (pErr || !prof) {
        setMsg('Login ok, but no profile found. Ask admin to add your profile.');
        return;
      }
      if (prof.role !== mode) {
        setMsg(`This account is a ${prof.role}. Switch to the ${prof.role} tab.`);
        return;
      }
      setUser({
        id: prof.id,
        email: prof.email,
        role: prof.role,
        org: prof.org || null,
        amEmail: prof.account_manager_email || null,
      });
    } catch (e) {
      setMsg('Login error. Please try again.');
    }
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
    } catch {}
    setUser(null);
    setEmail('');
    setPwd('');
    setMode('recruiter');
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
        color: '#e6eefb',
        backgroundColor: '#0b1220',
        backgroundImage: `linear-gradient(rgba(5,10,18,.6),rgba(5,10,18,.6)),url(${NYC_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Auth gates */}
      {!user ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
          <div style={{ ...glass, width: '100%', maxWidth: 720, padding: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Talent Connector</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>Invitation-only access</div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {['recruiter', 'client', 'admin'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,.1)',
                    background: mode === m ? 'rgba(59,91,253,.25)' : 'rgba(255,255,255,.05)',
                    color: '#e6eefb',
                    fontWeight: 700,
                  }}
                >
                  {m[0].toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <div style={label}>Email</div>
                <input
                  style={input}
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <div style={label}>Password</div>
                <input
                  style={input}
                  type="password"
                  placeholder="••••••••"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                />
              </div>
              <div>
                <button onClick={login} style={btn}>
                  Log in
                </button>
                {!!msg && (
                  <span style={{ marginLeft: 10, color: '#ff9aa2', fontSize: 12 }}>{msg}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : user.role === 'recruiter' ? (
        <RecruiterUI user={user} onLogout={logout} />
      ) : user.role === 'client' ? (
        <ClientUI user={user} onLogout={logout} />
      ) : (
        <AdminUI user={user} onLogout={logout} />
      )}
    </div>
  );
}

/* ----------------------------- RECRUITER UI ----------------------------- */

function RecruiterUI({ user, onLogout }) {
  // existing fields
  const [name, setName] = React.useState('');
  const [titlesCsv, setTitlesCsv] = React.useState('');
  const [lawCsv, setLawCsv] = React.useState('');
  const [years, setYears] = React.useState('');
  const [city, setCity] = React.useState('');
  const [state, setState] = React.useState('');
  const [salary, setSalary] = React.useState('');
  const [contract, setContract] = React.useState(false);
  const [hourly, setHourly] = React.useState('');
  const [notes, setNotes] = React.useState('');

  // NEW fields per your request
  const [singleTitle, setSingleTitle] = React.useState('');
  const [yearsRecent, setYearsRecent] = React.useState(''); // years in most recent job
  const [dateCreated, setDateCreated] = React.useState(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  });

  const [flash, setFlash] = React.useState('');
  const [err, setErr] = React.useState('');
  const [mine, setMine] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('candidates')
        .select('id,name,city,state,years,salary,contract,created_at')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setMine(data || []);
    })();
  }, [user.id]);

  function small(msg) {
    setFlash(msg);
    setTimeout(() => setFlash(''), 2500);
  }

  async function addCandidate() {
    setErr('');
    try {
      const payloadBase = {
        name: name.trim(),
        city: city.trim() || null,
        state: state.trim() || null,
        years: years ? Number(years) : null,
        salary: salary ? Number(salary) : null,
        contract: !!contract,
        hourly: hourly ? Number(hourly) : null,
        notes: (notes || '').trim(),
        created_by: user.id,
      };

      // Optional legacy fields (titlesCsv / lawCsv) still stored into notes if present.
      const extraFromLegacy =
        [titlesCsv, lawCsv].some(Boolean)
          ? `\n\n[meta]\n${titlesCsv ? `titles: ${titlesCsv}` : ''}${
              titlesCsv && lawCsv ? ' | ' : ''
            }${lawCsv ? `type_of_law: ${lawCsv}` : ''}`
          : '';

      // NEW fields
      const titleToStore = singleTitle.trim() || null;
      const yearsRecentNum = yearsRecent ? Number(yearsRecent) : null;
      const dateEnteredISO = dateCreated ? new Date(`${dateCreated}T00:00:00Z`).toISOString() : null;

      // --- First attempt: assume columns exist (title, years_in_recent_role, date_entered)
      let firstTry = await supabase.from('candidates').insert([
        {
          ...payloadBase,
          notes: `${payloadBase.notes}${extraFromLegacy}`,
          title: titleToStore,
          years_in_recent_role: yearsRecentNum,
          date_entered: dateEnteredISO,
        },
      ]);

      if (firstTry.error) {
        // Some environments may not have one/both columns yet.
        // Fallback: remove optional columns & append to notes to avoid breaking flow.
        const fallbackNotes = `${payloadBase.notes}${
          extraFromLegacy || ''
        }\n${titleToStore ? `\nTitle: ${titleToStore}` : ''}${
          yearsRecent ? `\nYears in recent role: ${yearsRecent}` : ''
        }${dateCreated ? `\nDate created: ${dateCreated}` : ''}`;

        const secondTry = await supabase.from('candidates').insert([
          {
            ...payloadBase,
            notes: fallbackNotes.trim(),
            // omit title / years_in_recent_role / date_entered
          },
        ]);

        if (secondTry.error) {
          throw secondTry.error;
        }
      }

      // Update list
      const { data: refreshed } = await supabase
        .from('candidates')
        .select('id,name,city,state,years,salary,contract,created_at')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setMine(refreshed || []);

      small('Candidate added');
      // Clear quick fields (keep notes & CSVs; feel free to clear them if you prefer)
      setName('');
      setSingleTitle('');
      setYears('');
      setYearsRecent('');
      setCity('');
      setState('');
      setSalary('');
      setHourly('');
      setContract(false);
    } catch (e) {
      setErr('Database error adding candidate');
    }
  }

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 20 }}>Recruiter workspace</div>
        <button onClick={onLogout} style={{ ...btn, background: '#2b3656' }}>
          Log out
        </button>
      </div>

      {/* ADD CANDIDATE */}
      <div style={{ ...glass, marginTop: 12, padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Add candidate</div>

        {/* grid: 6 cols on wide screens, stacked on small */}
        <div
          style={{
            display: 'grid',
            gap: 10,
            gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          }}
        >
          <div style={{ gridColumn: 'span 2' }}>
            <div style={label}>Full name</div>
            <input style={input} value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <div style={label}>Title (single)</div>
            <input
              style={input}
              placeholder="Attorney, Paralegal, etc."
              value={singleTitle}
              onChange={(e) => setSingleTitle(e.target.value)}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <div style={label}>Years of experience</div>
            <input
              style={input}
              type="number"
              min="0"
              max="50"
              value={years}
              onChange={(e) => setYears(e.target.value)}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <div style={label}>Years in most recent job</div>
            <input
              style={input}
              type="number"
              min="0"
              max="50"
              value={yearsRecent}
              onChange={(e) => setYearsRecent(e.target.value)}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <div style={label}>City</div>
            <input style={input} value={city} onChange={(e) => setCity(e.target.value)} />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <div style={label}>State</div>
            <input style={input} value={state} onChange={(e) => setState(e.target.value)} />
          </div>

          {/* legacy CSV fields (preserved) */}
          <div style={{ gridColumn: 'span 3' }}>
            <div style={label}>Titles (CSV)</div>
            <input
              style={input}
              placeholder="Attorney, Paralegal"
              value={titlesCsv}
              onChange={(e) => setTitlesCsv(e.target.value)}
            />
          </div>

          <div style={{ gridColumn: 'span 3' }}>
            <div style={label}>Type of Law (CSV)</div>
            <input
              style={input}
              placeholder="Litigation, Immigration"
              value={lawCsv}
              onChange={(e) => setLawCsv(e.target.value)}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <div style={label}>Salary desired</div>
            <input
              style={input}
              type="number"
              min="0"
              step="1000"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <div style={label}>Available for contract</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                checked={contract}
                onChange={(e) => setContract(e.target.checked)}
              />
              {contract ? (
                <input
                  style={{ ...input, width: 160 }}
                  type="number"
                  min="0"
                  step="5"
                  placeholder="Hourly rate"
                  value={hourly}
                  onChange={(e) => setHourly(e.target.value)}
                />
              ) : (
                <span style={{ fontSize: 12, opacity: 0.7 }}>Not contracting</span>
              )}
            </div>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <div style={label}>Date created</div>
            <input
              style={input}
              type="date"
              value={dateCreated}
              onChange={(e) => setDateCreated(e.target.value)}
            />
          </div>

          <div style={{ gridColumn: 'span 6' }}>
            <div style={label}>Candidate Notes</div>
            <textarea
              style={{ ...input, minHeight: 110, resize: 'vertical' }}
              placeholder="Short summary: strengths, availability, fit notes."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <button onClick={addCandidate} style={btn}>
            Add candidate
          </button>
          {!!flash && <span style={{ color: '#93e2b7', fontSize: 12 }}>{flash}</span>}
          {!!err && <span style={{ color: '#ff9aa2', fontSize: 12 }}>{err}</span>}
        </div>
      </div>

      {/* RECENT LIST */}
      <div style={{ ...glass, marginTop: 12, padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>My recent candidates</div>
        {mine.length === 0 ? (
          <div style={{ fontSize: 13, opacity: 0.7 }}>No candidates yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: '#aab6cf' }}>
                  {['Name', 'City', 'State', 'Years', 'Salary', 'Contract', 'Created'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderBottom: '1px solid rgba(255,255,255,.06)',
                        fontWeight: 600,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mine.map((r) => (
                  <tr key={r.id}>
                    <td style={td}>{r.name}</td>
                    <td style={td}>{r.city || '—'}</td>
                    <td style={td}>{r.state || '—'}</td>
                    <td style={td}>{r.years ?? '—'}</td>
                    <td style={td}>{r.salary ? `$${r.salary.toLocaleString()}` : '—'}</td>
                    <td style={td}>{r.contract ? 'Yes' : 'No'}</td>
                    <td style={td}>
                      {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const td = {
  padding: '8px 10px',
  borderBottom: '1px solid rgba(255,255,255,.06)',
};

/* ------------------------------ CLIENT UI ------------------------------- */

function ClientUI({ user, onLogout }) {
  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 20 }}>Client workspace</div>
        <button onClick={onLogout} style={{ ...btn, background: '#2b3656' }}>
          Log out
        </button>
      </div>

      <div style={{ ...glass, marginTop: 12, padding: 16 }}>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          Read-only view for clients (unchanged). Recruiters’ new fields do not affect this screen.
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- ADMIN UI ------------------------------- */

function AdminUI({ user, onLogout }) {
  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 20 }}>Admin workspace</div>
        <button onClick={onLogout} style={{ ...btn, background: '#2b3656' }}>
          Log out
        </button>
      </div>

      <div style={{ ...glass, marginTop: 12, padding: 16 }}>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          Minimal placeholder for admin (unchanged).
        </div>
      </div>
    </div>
  );
}
