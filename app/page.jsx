'use client';
import React from 'react';
import { supabase as sb } from '../lib/supabaseClient';

const NYC_BG =
  'https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg';

export default function Page() {
  const [user, setUser] = React.useState(null);
  const [mode, setMode] = React.useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = React.useState('');
  const [pwd, setPwd] = React.useState('');
  const [err, setErr] = React.useState('');

  React.useEffect(() => {
    (async () => {
      const { data } = await sb.auth.getSession();
      if (data?.session?.user) {
        const { data: prof } = await sb
          .from('profiles')
          .select('id,email,role,org,account_manager_email')
          .eq('id', data.session.user.id)
          .single();
        if (prof) {
          setUser({
            id: prof.id,
            email: prof.email,
            role: prof.role,
            org: prof.org || '',
            amEmail: prof.account_manager_email || '',
          });
        }
      }
    })();
  }, []);

  async function login() {
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
    if (authErr || !auth?.user) {
      setErr(authErr?.message || 'Invalid credentials.');
      return;
    }
    const { data: prof, error: profErr } = await sb
      .from('profiles')
      .select('id,email,role,org,account_manager_email')
      .eq('id', auth.user.id)
      .single();
    if (profErr || !prof) {
      setErr('Login ok, but no profile found. Ask admin to add your profile.');
      return;
    }
    if (prof.role !== mode) {
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

  const page = {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#e5e5e5',
    fontFamily: 'system-ui, Arial',
    position: 'relative',
    overflow: 'hidden',
  };
  const container = {
    width: '100%',
    maxWidth: 1160,
    margin: '0 auto',
    padding: 20,
    position: 'relative',
    zIndex: 2,
  };
  const glass = {
    border: '1px solid rgba(255,255,255,.10)',
    borderRadius: 14,
    padding: 16,
    background: 'rgba(8, 10, 16, .88)',
    boxShadow: '0 8px 24px rgba(0,0,0,.35)',
  };
  const logoutBtn = {
    padding: '8px 12px',
    borderRadius: 10,
    fontSize: 13,
    background: '#1f2937',
    color: '#e5e5e5',
    border: '1px solid rgba(255,255,255,.12)',
  };

  return (
    <div style={page}>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `url(${NYC_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'grayscale(0.1) contrast(1.08) brightness(0.95)',
          opacity: 0.9,
        }}
      />
      <div style={container}>
        {!user ? (
          <LoginCard
            mode={mode}
            setMode={setMode}
            email={email}
            setEmail={setEmail}
            pwd={pwd}
            setPwd={setPwd}
            onLogin={login}
            err={err}
          />
        ) : user.role === 'recruiter' ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ ...glass, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800 }}>
                Recruiter workspace
                <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 8 }}>({user.email})</span>
              </div>
              <button onClick={logout} style={logoutBtn}>
                Log out
              </button>
            </div>
            <RecruiterWorkspace user={user} />
          </div>
        ) : user.role === 'client' ? (
          <div style={{ ...glass, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800 }}>Client workspace</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Read-only view.</div>
            </div>
            <button onClick={logout} style={logoutBtn}>
              Log out
            </button>
          </div>
        ) : (
          <div style={{ ...glass, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800 }}>Admin workspace</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Minimal placeholder.</div>
            </div>
            <button onClick={logout} style={logoutBtn}>
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LoginCard({ mode, setMode, email, setEmail, pwd, setPwd, onLogin, err }) {
  const card = {
    width: '100%',
    maxWidth: 560,
    margin: '8vh auto 0',
    border: '1px solid rgba(255,255,255,.10)',
    borderRadius: 16,
    padding: 18,
    background: 'rgba(8, 10, 16, .90)',
    boxShadow: '0 18px 36px rgba(0,0,0,.45)',
  };
  const input = {
    width: '100%',
    padding: 10,
    borderRadius: 10,
    background: '#0f172a',
    color: '#e5e5eb',
    border: '1px solid #1f2937',
  };
  const label = { fontSize: 12, color: '#9ca3af', marginBottom: 6 };

  return (
    <div style={card}>
      <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 18 }}>Talent Connector - Powered by Beacon Hill Legal</div>
      <div style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>Invitation-only access</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
        <button
          onClick={() => setMode('recruiter')}
          style={{
            padding: 10,
            borderRadius: 10,
            background: mode === 'recruiter' ? '#1f2937' : '#111827',
            color: '#e5e5e5',
            border: '1px solid rgba(255,255,255,.12)',
          }}
        >
          Recruiter
        </button>
        <button
          onClick={() => setMode('client')}
          style={{
            padding: 10,
            borderRadius: 10,
            background: mode === 'client' ? '#1f2937' : '#111827',
            color: '#e5e5e5',
            border: '1px solid rgba(255,255,255,.12)',
          }}
        >
          Client
        </button>
        <button
          onClick={() => setMode('admin')}
          style={{
            padding: 10,
            borderRadius: 10,
            background: mode === 'admin' ? '#1f2937' : '#111827',
            color: '#e5e5e5',
            border: '1px solid rgba(255,255,255,.12)',
          }}
        >
          Admin
        </button>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <div>
          <div style={label}>Email</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="name@company.com"
            style={input}
          />
        </div>
        <div>
          <div style={label}>Password</div>
          <input
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            type="password"
            placeholder="your password"
            style={input}
          />
        </div>
        <button
          onClick={onLogin}
          style={{
            padding: 12,
            borderRadius: 10,
            background: '#4f46e5',
            color: 'white',
            border: '1px solid rgba(255,255,255,.12)',
            fontWeight: 600,
          }}
        >
          Log in
        </button>
        {err ? <div style={{ fontSize: 12, color: '#fca5a5' }}>{err}</div> : null}
      </div>
    </div>
  );
}

function RecruiterWorkspace({ user }) {
  const [recent, setRecent] = React.useState([]);
  const [flash, setFlash] = React.useState('');

  async function loadMine() {
    const { data, error } = await sb
      .from('candidates')
      .select('id,name,city,state,years,salary,contract,hourly,notes,created_at,titles_csv,law_csv')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(15);
    if (!error && Array.isArray(data)) setRecent(data);
  }

  React.useEffect(() => {
    loadMine();
  }, []);

  async function handleAdd(rec) {
    // Normalize numbers & blanks → null to satisfy DB types.
    const yearsNum = Number.isFinite(Number(rec.years)) ? Number(rec.years) : null;
    const salaryNum = Number.isFinite(Number(rec.salary)) ? Number(rec.salary) : null;
    const hourlyNum =
      rec.contract && Number.isFinite(Number(rec.hourly)) ? Number(rec.hourly) : null;

    const payload = {
      name: rec.name || null,
      titles_csv: rec.titles || null,
      law_csv: rec.law || null,
      years: yearsNum,
      city: rec.city || null,
      state: rec.state || null,
      salary: salaryNum,
      contract: !!rec.contract,
      hourly: hourlyNum, // <- NEW
      notes: rec.notes || null,
      created_by: user.id,
    };

    const { error } = await sb.from('candidates').insert(payload);
    if (error) {
      console.error('Insert error:', error);
      throw new Error(error.message || 'Insert failed');
    }

    setFlash('Candidate added');
    await loadMine();
    setTimeout(() => setFlash(''), 1500);
  }

  const panel = {
    border: '1px solid rgba(255,255,255,.10)',
    borderRadius: 14,
    padding: 16,
    background: 'rgba(8, 10, 16, .88)',
    boxShadow: '0 8px 24px rgba(0,0,0,.35)',
  };
  const row = { padding: 10, borderBottom: '1px solid rgba(255,255,255,.06)' };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <RecruiterAddForm onAdd={handleAdd} />
      <div style={panel}>
        <div style={{ fontWeight: 800, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>My recent candidates</span>
          {flash ? <span style={{ fontSize: 12, color: '#a7f3d0' }}>{flash}</span> : null}
        </div>
        {!recent.length ? (
          <div style={{ fontSize: 13, color: '#9ca3af' }}>No candidates yet.</div>
        ) : (
          recent.map((c) => (
            <div key={c.id} style={row}>
              <div style={{ fontWeight: 700 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                {(c.city || '-')}, {(c.state || '-')}&nbsp; •&nbsp; {String(c.years ?? 0)} yrs • Salary:{' '}
                {c.salary ? `$${c.salary}` : '-'} • Contract: {c.contract ? 'Yes' : 'No'}
                {c.contract && c.hourly ? ` • Hourly: $${c.hourly}` : ''}
              </div>
              {c.titles_csv || c.law_csv ? (
                <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>
                  {c.titles_csv ? `Titles: ${c.titles_csv}` : ''}
                  {c.titles_csv && c.law_csv ? ' • ' : ''}
                  {c.law_csv ? `Law: ${c.law_csv}` : ''}
                </div>
              ) : null}
              {c.notes ? (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: '#e5e7eb',
                    background: '#0d1b2a',
                    border: '1px solid #1e3a8a',
                    borderRadius: 8,
                    padding: 8,
                  }}
                >
                  {c.notes}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RecruiterAddForm({ onAdd }) {
  const [name, setName] = React.useState('');
  const [titles, setTitles] = React.useState('');
  const [law, setLaw] = React.useState('');
  const [years, setYears] = React.useState('');
  const [city, setCity] = React.useState('');
  const [state, setState] = React.useState('');
  const [salary, setSalary] = React.useState('');
  const [contract, setContract] = React.useState(false);
  const [hourly, setHourly] = React.useState(''); // <- NEW
  const [notes, setNotes] = React.useState('');
  const [flash, setFlash] = React.useState('');
  const [err, setErr] = React.useState('');

  const panel = {
    border: '1px solid rgba(255,255,255,.10)',
    borderRadius: 14,
    padding: 16,
    background: 'rgba(8, 10, 16, .88)',
    boxShadow: '0 8px 24px rgba(0,0,0,.35)',
  };
  const label = { fontSize: 12, color: '#9ca3af', marginBottom: 6 };
  const input = {
    width: '100%',
    padding: 10,
    borderRadius: 10,
    background: '#0f172a',
    color: '#e5e7eb',
    border: '1px solid #1f2937',
  };
  const grid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, minmax(0,1fr))',
    gap: 12,
  };

  async function submit() {
    setFlash('');
    setErr('');

    const yearsNum = Number.isFinite(Number(years)) ? Number(years) : null;
    const salaryNum = Number.isFinite(Number(salary)) ? Number(salary) : null;
    const hourlyNum =
      contract && Number.isFinite(Number(hourly)) ? Number(hourly) : null;

    if (!name.trim()) {
      setErr('Please enter a full name.');
      return;
    }

    try {
      await onAdd({
        name: name.trim(),
        titles: titles?.trim() || null,
        law: law?.trim() || null,
        years: yearsNum,
        city: city?.trim() || null,
        state: state?.trim() || null,
        salary: salaryNum,
        contract: !!contract,
        hourly: hourlyNum,
        notes: notes?.trim() || null,
      });

      setName('');
      setTitles('');
      setLaw('');
      setYears('');
      setCity('');
      setState('');
      setSalary('');
      setContract(false);
      setHourly('');
      setNotes('');
      setFlash('Candidate added');
      setTimeout(() => setFlash(''), 1200);
    } catch (e) {
      console.error(e);
      setErr(e.message || 'Database error adding candidate.');
    }
  }

  return (
    <div style={panel}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>Add candidate</div>

      <div style={grid}>
        <div style={{ gridColumn: 'span 4' }}>
          <div style={label}>Full name</div>
          <input value={name} onChange={(e) => setName(e.target.value)} style={input} />
        </div>

        <div style={{ gridColumn: 'span 4' }}>
          <div style={label}>Titles (e.g., Attorney, Paralegal)</div>
          <input
            value={titles}
            onChange={(e) => setTitles(e.target.value)}
            placeholder="Attorney, Paralegal"
            style={input}
          />
        </div>

        <div style={{ gridColumn: 'span 4' }}>
          <div style={label}>Type of Law (e.g., Litigation, Immigration)</div>
          <input
            value={law}
            onChange={(e) => setLaw(e.target.value)}
            placeholder="Litigation, Immigration"
            style={input}
          />
        </div>

        <div style={{ gridColumn: 'span 3' }}>
          <div style={label}>Years of experience</div>
          <input type="number" value={years} onChange={(e) => setYears(e.target.value)} style={input} />
        </div>

        <div style={{ gridColumn: 'span 5' }}>
          <div style={label}>City</div>
          <input value={city} onChange={(e) => setCity(e.target.value)} style={input} />
        </div>

        <div style={{ gridColumn: 'span 4' }}>
          <div style={label}>State</div>
          <input value={state} onChange={(e) => setState(e.target.value)} style={input} />
        </div>

        <div style={{ gridColumn: 'span 4' }}>
          <div style={label}>Salary desired (annual)</div>
          <input
            type="number"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            placeholder="e.g., 120000"
            style={input}
          />
        </div>

        <div style={{ gridColumn: 'span 4', display: 'flex', alignItems: 'end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#e5e7eb' }}>
            <input
              type="checkbox"
              checked={contract}
              onChange={(e) => setContract(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            Available for contract
          </label>
        </div>

        {/* Hourly rate appears only when contract is checked */}
        {contract ? (
          <div style={{ gridColumn: 'span 4' }}>
            <div style={label}>Hourly rate (if contract)</div>
            <input
              type="number"
              value={hourly}
              onChange={(e) => setHourly(e.target.value)}
              placeholder="e.g., 85"
              style={input}
            />
          </div>
        ) : (
          <div style={{ gridColumn: 'span 4' }} />
        )}

        <div style={{ gridColumn: '1 / -1', marginTop: 6 }}>
          <div style={label}>Candidate Notes</div>
          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Short summary: strengths, availability, fit notes."
            style={{ ...input, resize: 'vertical' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
        <button
          onClick={submit}
          style={{
            padding: '10px 14px',
            fontSize: 13,
            borderRadius: 10,
            background: '#4f46e5',
            color: 'white',
            border: '1px solid rgba(255,255,255,.08)',
            boxShadow: '0 6px 18px rgba(79,70,229,.35)',
          }}
        >
          Add candidate
        </button>

        {flash ? <div style={{ fontSize: 13, color: '#a7f3d0' }}>{flash}</div> : null}
        {err ? <div style={{ fontSize: 13, color: '#fca5a5' }}>{err}</div> : null}
      </div>
    </div>
  );
}
