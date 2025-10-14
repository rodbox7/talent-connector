'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const APP_NAME = 'Talent Connector - Powered by Beacon Hill Legal';

export default function Page() {
  const [mode, setMode] = useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [user, setUser] = useState(null); // { id, email, role, org? }

  // ---------- AUTH ----------
  async function login() {
    try {
      setErr('');
      const e = String(email).trim().toLowerCase();
      if (!e.includes('@')) {
        setErr('Enter a valid email');
        return;
      }

      const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: e,
        password: pwd,
      });
      if (authErr || !auth?.user) {
        setErr('Invalid credentials');
        return;
      }

      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id, email, role, org')
        .eq('id', auth.user.id)
        .single();

      if (profErr || !prof) {
        setErr('Login succeeded, but profile not found.');
        return;
      }
      if (prof.role !== mode) {
        setErr(`This account is a ${prof.role}. Switch to the ${prof.role} tab.`);
        return;
      }

      setUser({ id: prof.id, email: prof.email, role: prof.role, org: prof.org || '' });
    } catch (ex) {
      console.error(ex);
      setErr('Login error. Please try again.');
    }
  }

  async function logout() {
    try { await supabase.auth.signOut(); } catch {}
    setUser(null);
    setEmail('');
    setPwd('');
    setMode('recruiter');
  }

  // ---------- SHARED STYLES ----------
  const page = {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: 16,
    color: '#e5e5e5',
    fontFamily: 'system-ui, Arial',
  };
  const bigWrap = { width: '100%', maxWidth: 1100 };
  const card = {
    width: '100%',
    maxWidth: 520,
    background: 'rgba(12,12,12,.78)',
    border: '1px solid rgba(255,255,255,.08)',
    borderRadius: 14,
    padding: 18,
    boxShadow: '0 8px 24px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.06)',
    backdropFilter: 'blur(2px)',
  };
  const panel = {
    background: 'rgba(12,12,12,.78)',
    border: '1px solid rgba(255,255,255,.08)',
    borderRadius: 14,
    padding: 16,
    boxShadow: '0 8px 24px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.06)',
    backdropFilter: 'blur(2px)',
  };
  const subtle = { fontSize: 12, color: '#9ca3af' };
  const input = {
    width: '100%',
    padding: 10,
    background: 'rgba(17,17,27,.9)',
    color: '#e5e5e5',
    border: '1px solid #1f2937',
    borderRadius: 8,
  };
  const btn = {
    padding: '10px 16px',
    background: '#4f46e5',
    color: '#fff',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
  };
  const btnGhost = {
    padding: '8px 12px',
    background: '#1f2937',
    color: '#e5e5e5',
    borderRadius: 8,
    border: '1px solid #2b3443',
    cursor: 'pointer',
  };
  const tab = (active) => ({
    padding: 10,
    borderRadius: 8,
    background: active ? '#1f2937' : 'rgba(17,17,27,.85)',
    color: '#e5e5e5',
    border: '1px solid #1f2937',
    cursor: 'pointer',
  });

  // ---------- RECRUITER UI STATE ----------
  const [listErr, setListErr] = useState('');
  const [listFlash, setListFlash] = useState('');
  const [cands, setCands] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [rolesCSV, setRolesCSV] = useState('');
  const [lawCSV, setLawCSV] = useState('');
  const [years, setYears] = useState('');
  const [recentYears, setRecentYears] = useState(''); // NEW
  const [city, setCity] = useState('');
  const [stateV, setStateV] = useState('');
  const [salary, setSalary] = useState('');
  const [contract, setContract] = useState(false);
  const [hourly, setHourly] = useState('');
  const [dateEntered, setDateEntered] = useState(() => {
    const t = new Date();
    const mm = String(t.getMonth() + 1).padStart(2, '0');
    const dd = String(t.getDate()).padStart(2, '0');
    return `${t.getFullYear()}-${mm}-${dd}`;
  });
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);

  function parseCSV(s) {
    return String(s || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }

  async function loadCandidates() {
    try {
      setLoadingList(true);
      setListErr('');
      setListFlash('');

      // pull the most recent 50 for now
      const { data, error } = await supabase
        .from('candidates')
        .select(
          'id, name, roles, practice_areas, years, recent_years, city, state, salary, contract, hourly, notes, date_entered, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        setListErr('Error loading candidates');
        console.error(error);
        return;
      }
      setCands(data || []);
    } catch (ex) {
      setListErr('Error loading candidates');
      console.error(ex);
    } finally {
      setLoadingList(false);
    }
  }

  async function addCandidate() {
    try {
      setAdding(true);
      setListErr('');
      setListFlash('');

      if (!name.trim()) {
        setListErr('Full name is required.');
        return;
      }

      const roles = parseCSV(rolesCSV);
      const practice_areas = parseCSV(lawCSV);

      const { error } = await supabase.from('candidates').insert([
        {
          name: name.trim(),
          roles,                    // text[]
          practice_areas,           // text[]
          years: years ? Number(years) : null,
          recent_years: recentYears ? Number(recentYears) : null, // NEW
          city: city.trim() || null,
          state: stateV.trim() || null,
          salary: salary ? Number(salary) : null,
          contract: !!contract,
          hourly: contract ? (hourly ? Number(hourly) : null) : null,
          date_entered: dateEntered || null, // NEW
          notes: notes || null,
        },
      ]);

      if (error) {
        setListErr('Database error adding candidate.');
        console.error(error);
        return;
      }

      // Clear form and reload
      setName('');
      setRolesCSV('');
      setLawCSV('');
      setYears('');
      setRecentYears('');
      setCity('');
      setStateV('');
      setSalary('');
      setContract(false);
      setHourly('');
      setDateEntered(() => {
        const t = new Date();
        const mm = String(t.getMonth() + 1).padStart(2, '0');
        const dd = String(t.getDate()).padStart(2, '0');
        return `${t.getFullYear()}-${mm}-${dd}`;
      });
      setNotes('');
      setListFlash('Candidate added.');
      await loadCandidates();
    } catch (ex) {
      console.error(ex);
      setListErr('Unexpected error adding candidate.');
    } finally {
      setAdding(false);
    }
  }

  useEffect(() => {
    if (user?.role === 'recruiter') {
      loadCandidates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  // ---------- LOGGED-IN VIEWS ----------
  if (user) {
    // RECRUITER
    if (user.role === 'recruiter') {
      return (
        <div style={page}>
          <div style={bigWrap}>
            <Header title="Recruiter workspace" onLogout={logout} />

            {/* Add Candidate */}
            <div style={panel}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Add candidate</div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 10,
                }}
              >
                <Field label="Full name" value={name} onChange={setName} />
                <Field
                  label="Titles (CSV)"
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
                <Num label="Years of experience" value={years} onChange={setYears} />
                <Num
                  label="Years in most recent position"
                  value={recentYears}
                  onChange={setRecentYears}
                />
                <Field label="City" value={city} onChange={setCity} />
                <Field label="State" value={stateV} onChange={setStateV} />
                <Num label="Salary desired" value={salary} onChange={setSalary} />
                <div style={{ alignSelf: 'end' }}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={contract}
                      onChange={(e) => setContract(e.target.checked)}
                    />
                    <span>Available for contract</span>
                  </label>
                </div>
                {contract ? <Num label="Hourly rate" value={hourly} onChange={setHourly} /> : null}
                <DateField
                  label="Date entered"
                  value={dateEntered}
                  onChange={setDateEntered}
                />
              </div>

              <Area
                label="Candidate Notes"
                value={notes}
                onChange={setNotes}
                placeholder="Short summary: strengths, availability, fit notes."
              />

              <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
                <button onClick={addCandidate} style={btn} disabled={adding}>
                  {adding ? 'Adding…' : 'Add candidate'}
                </button>
                <button onClick={loadCandidates} style={btnGhost} disabled={loadingList}>
                  {loadingList ? 'Refreshing…' : 'Refresh list'}
                </button>
                {listErr ? <span style={{ color: '#f87171', fontSize: 12 }}>{listErr}</span> : null}
                {listFlash ? (
                  <span style={{ color: '#93e2b7', fontSize: 12 }}>{listFlash}</span>
                ) : null}
              </div>
            </div>

            {/* List */}
            <div style={{ ...panel, marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Recent candidates</div>
              {cands.length === 0 ? (
                <div style={subtle}>No candidates yet.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: '#9ca3af' }}>
                        <th style={th}>Name</th>
                        <th style={th}>Titles</th>
                        <th style={th}>Type of Law</th>
                        <th style={th}>Yrs</th>
                        <th style={th}>Recent Yrs</th>
                        <th style={th}>City</th>
                        <th style={th}>State</th>
                        <th style={th}>Salary</th>
                        <th style={th}>Contract</th>
                        <th style={th}>Hourly</th>
                        <th style={th}>Date entered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cands.map((c) => (
                        <tr key={c.id}>
                          <td style={td}>{c.name}</td>
                          <td style={td}>{(c.roles || []).join(', ')}</td>
                          <td style={td}>{(c.practice_areas || []).join(', ')}</td>
                          <td style={td}>{c.years ?? '-'}</td>
                          <td style={td}>{c.recent_years ?? '-'}</td>
                          <td style={td}>{c.city || '-'}</td>
                          <td style={td}>{c.state || '-'}</td>
                          <td style={td}>{c.salary ? `$${c.salary}` : '-'}</td>
                          <td style={td}>{c.contract ? 'Yes' : 'No'}</td>
                          <td style={td}>{c.hourly ? `$${c.hourly}/hr` : '-'}</td>
                          <td style={td}>{c.date_entered || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ADMIN
    if (user.role === 'admin') {
      return (
        <div style={page}>
          <div style={card}>
            <Header title="Admin workspace" onLogout={logout} simple />
            <div style={{ marginTop: 8, ...subtle }}>
              Minimal placeholder for <b>admin</b>. (Recruiters have full add/list UI.)
            </div>
          </div>
        </div>
      );
    }

    // CLIENT
    return (
      <div style={page}>
        <div style={card}>
          <Header title="Client workspace" onLogout={logout} simple />
          <div style={{ marginTop: 8, ...subtle }}>
            Minimal placeholder for <b>client</b>. (Read-only search UI coming next.)
          </div>
        </div>
      </div>
    );
  }

  // ---------- LOGIN ----------
  return (
    <div style={page}>
      <div style={card}>
        <div style={{ textAlign: 'center', fontWeight: 700 }}>{APP_NAME}</div>
        <div style={{ textAlign: 'center', ...subtle, marginBottom: 10 }}>Invitation-only access</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
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

        <div style={{ marginTop: 12 }}>
          <Label>Email</Label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            style={input}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <Label>Password</Label>
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="your password"
            style={input}
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <button onClick={login} style={{ ...btn, width: '100%' }}>
            Log in
          </button>
        </div>

        {err ? <div style={{ color: '#f87171', fontSize: 12, marginTop: 10 }}>{err}</div> : null}
      </div>
    </div>
  );
}

/* ---------- Small UI helpers ---------- */

function Header({ title, onLogout, simple }) {
  return (
    <div
      style={{
        ...(!simple && { marginBottom: 8 }),
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontWeight: 700,
      }}
    >
      <div>{title}</div>
      <button
        onClick={onLogout}
        style={{
          padding: '8px 12px',
          background: '#1f2937',
          color: '#e5e5e5',
          borderRadius: 8,
          border: '1px solid #2b3443',
          cursor: 'pointer',
        }}
      >
        Log out
      </button>
    </div>
  );
}

function Label({ children }) {
  return <div style={{ color: '#9ca3af', marginBottom: 4, fontSize: 12 }}>{children}</div>;
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: 'block' }}>
      <Label>{label}</Label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: 10,
          background: 'rgba(17,17,27,.9)',
          color: '#e5e5e5',
          border: '1px solid #1f2937',
          borderRadius: 8,
        }}
      />
    </label>
  );
}

function Num({ label, value, onChange }) {
  return (
    <label style={{ display: 'block' }}>
      <Label>{label}</Label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: 10,
          background: 'rgba(17,17,27,.9)',
          color: '#e5e5e5',
          border: '1px solid #1f2937',
          borderRadius: 8,
        }}
      />
    </label>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <label style={{ display: 'block' }}>
      <Label>{label}</Label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: 10,
          background: 'rgba(17,17,27,.9)',
          color: '#e5e5e5',
          border: '1px solid #1f2937',
          borderRadius: 8,
        }}
      />
    </label>
  );
}

function Area({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: 'block', marginTop: 10 }}>
      <Label>{label}</Label>
      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: 10,
          background: 'rgba(17,17,27,.9)',
          color: '#e5e5e5',
          border: '1px solid #1f2937',
          borderRadius: 8,
        }}
      />
    </label>
  );
}

const th = { padding: '8px 10px', borderBottom: '1px solid #1f2937' };
const td = { padding: '8px 10px', borderBottom: '1px solid #1f2937' };
