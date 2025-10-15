'use client';
import React from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * NOTE:
 * - This file focuses on the layout polish for the Recruiter form only.
 * - Data field names and insert payload are unchanged (no schema risk).
 * - If your env or auth helpers differ, keep those as-is elsewhere.
 */

const NYC =
  'https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg';

// ---------- Tiny UI helpers ----------
const Card = ({ children, style }) => (
  <div
    style={{
      background: 'rgba(9,12,18,0.82)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: 20,
      boxShadow:
        '0 0 0 1px rgba(255,255,255,0.04) inset, 0 8px 30px rgba(0,0,0,0.45)',
      ...style,
    }}
  >
    {children}
  </div>
);

const Label = ({ children }) => (
  <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>{children}</div>
);

const Input = (props) => (
  <input
    {...props}
    style={{
      width: '100%',
      padding: '10px 12px',
      borderRadius: 10,
      border: '1px solid #1F2937',
      background: '#0F172A',
      color: '#E5E7EB',
      outline: 'none',
      ...props.style,
    }}
  />
);

const TextArea = (props) => (
  <textarea
    {...props}
    style={{
      width: '100%',
      minHeight: 120,
      padding: '10px 12px',
      borderRadius: 10,
      border: '1px solid #1F2937',
      background: '#0F172A',
      color: '#E5E7EB',
      outline: 'none',
      ...props.style,
    }}
  />
);

const Button = ({ children, ...rest }) => (
  <button
    {...rest}
    style={{
      padding: '10px 14px',
      borderRadius: 10,
      border: '1px solid #243041',
      background: '#3B82F6',
      color: 'white',
      fontWeight: 600,
      cursor: 'pointer',
    }}
  >
    {children}
  </button>
);

const Tag = ({ children }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      background: '#111827',
      border: '1px solid #1F2937',
      fontSize: 12,
      color: '#9CA3AF',
    }}
  >
    {children}
  </span>
);

// ---------- Main Page ----------
export default function Page() {
  const [mode, setMode] = React.useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = React.useState('');
  const [pwd, setPwd] = React.useState('');
  const [err, setErr] = React.useState('');
  const [user, setUser] = React.useState(null);

  // Minimal auth: Supabase email+password, then read profile from public.profiles
  async function login() {
    try {
      setErr('');
      if (!email || !pwd) {
        setErr('Enter email & password.');
        return;
      }
      const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: pwd,
      });
      if (authErr) throw authErr;

      // Profile
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id,email,role,org,account_manager_email')
        .eq('id', auth.user.id)
        .single();

      if (profErr || !prof) {
        setErr('Login ok, but profile not found. Ask admin to add your profile.');
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
        org: prof.org || null,
        amEmail: prof.account_manager_email || null,
      });
    } catch (e) {
      console.error(e);
      setErr('Login failed.');
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
    setErr('');
  }

  // ---------- Recruiter form state (unchanged fields; layout only) ----------
  const [name, setName] = React.useState('');
  const [titles, setTitles] = React.useState('');
  const [law, setLaw] = React.useState('');
  const [city, setCity] = React.useState('');
  const [state, setState] = React.useState('');
  const [years, setYears] = React.useState('');
  const [recentYears, setRecentYears] = React.useState('');
  const [salary, setSalary] = React.useState('');
  const [contract, setContract] = React.useState(false);
  const [hourly, setHourly] = React.useState('');
  const [dateEntered, setDateEntered] = React.useState(() => {
    const d = new Date();
    // yyyy-mm-dd for a date input
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
      .toISOString()
      .slice(0, 10);
  });
  const [notes, setNotes] = React.useState('');
  const [addMsg, setAddMsg] = React.useState('');
  const [myRecent, setMyRecent] = React.useState([]);
  const [loadingList, setLoadingList] = React.useState(false);

  // Load recent for recruiter
  React.useEffect(() => {
    if (!user || user.role !== 'recruiter') return;
    (async () => {
      setLoadingList(true);
      const { data, error } = await supabase
        .from('candidates')
        .select(
          'id,name,city,state,years,recent_role_years,salary,contract,hourly,date_entered,created_at'
        )
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(25);

      if (!error && data) setMyRecent(data);
      setLoadingList(false);
    })();
  }, [user]);

  async function addCandidate() {
    setAddMsg('');
    try {
      if (!user || user.role !== 'recruiter') {
        setAddMsg('You must be logged in as recruiter.');
        return;
      }

      const payload = {
        name: name.trim(),
        titles_csv: titles.trim(),
        law_csv: law.trim(),
        city: city.trim(),
        state: state.trim(),
        years: years ? Number(years) : null,
        recent_role_years: recentYears ? Number(recentYears) : null,
        salary: salary ? Number(salary) : null,
        contract: !!contract,
        hourly: contract ? (hourly ? Number(hourly) : null) : null,
        date_entered: dateEntered ? new Date(dateEntered).toISOString() : null,
        notes: notes.trim() || null,
        created_by: user.id,
      };

      const { error } = await supabase.from('candidates').insert(payload);
      if (error) throw error;

      setAddMsg('Candidate added');
      // Clear some fields but keep your preference for sticky tags
      setName('');
      setCity('');
      setState('');
      setYears('');
      setRecentYears('');
      setSalary('');
      setContract(false);
      setHourly('');
      setNotes('');

      // refresh list
      const { data, error: e2 } = await supabase
        .from('candidates')
        .select(
          'id,name,city,state,years,recent_role_years,salary,contract,hourly,date_entered,created_at'
        )
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(25);
      if (!e2 && data) setMyRecent(data);
    } catch (e) {
      console.error(e);
      setAddMsg(
        `Database error adding candidate${
          e?.message ? `: ${e.message}` : ''
        }`
      );
    }
  }

  // ---------- Layout ----------
  const pageWrap = {
    minHeight: '100vh',
    width: '100%',
    backgroundImage: `url(${NYC})`,
    backgroundPosition: 'center',
    backgroundSize: 'cover',
    backgroundAttachment: 'fixed',
  };

  const overlay = {
    minHeight: '100vh',
    width: '100%',
    backdropFilter: 'blur(1px)',
    background:
      'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.65) 16%, rgba(0,0,0,0.75) 100%)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 16px',
  };

  // ---------- Logged-out (login) ----------
  if (!user) {
    return (
      <div style={pageWrap}>
        <div style={overlay}>
          <Card style={{ width: 520, padding: 24 }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                marginBottom: 10,
                letterSpacing: 0.3,
              }}
            >
              Talent Connector
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#9CA3AF',
                marginBottom: 12,
              }}
            >
              Invitation-only access
            </div>

            {/* tabs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginBottom: 12,
              }}
            >
              {['recruiter', 'client', 'admin'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid #1F2937',
                    background: mode === m ? '#1F2937' : '#0B1220',
                    color: '#E5E7EB',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {m[0].toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div style={{ marginTop: 10 }}>
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="your password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
              />
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <Button onClick={login} style={{ width: '100%' }}>
                Log in
              </Button>
            </div>
            {err ? (
              <div style={{ color: '#F87171', fontSize: 12, marginTop: 10 }}>
                {err}
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    );
  }

  // ---------- Recruiter UI (new grid layout, same fields) ----------
  if (user.role === 'recruiter') {
    return (
      <div style={pageWrap}>
        <div style={overlay}>
          <div style={{ width: 'min(1100px, 100%)' }}>
            {/* Top bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>
                Talent Connector <span style={{ color: '#93C5FD' }}>—</span>{' '}
                <span style={{ color: '#9CA3AF' }}>RECRUITER workspace</span>
              </div>
              <Button
                onClick={logout}
                style={{
                  background: '#0B1220',
                  border: '1px solid #1F2937',
                }}
              >
                Log out
              </Button>
            </div>

            {/* Add form */}
            <Card style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 14 }}>
                Add candidate
              </div>

              {/* 3-col grid on wide screens, 1-col on mobile */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 14,
                }}
              >
                <div style={{ gridColumn: '1 / -1' }}>
                  <Label>Full name</Label>
                  <Input
                    placeholder="Attorney"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Title(s) (CSV)</Label>
                  <Input
                    placeholder="Attorney, Paralegal, etc."
                    value={titles}
                    onChange={(e) => setTitles(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Type of Law (CSV)</Label>
                  <Input
                    placeholder="Litigation, Immigration"
                    value={law}
                    onChange={(e) => setLaw(e.target.value)}
                  />
                </div>

                <div>
                  <Label>City</Label>
                  <Input
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <div>
                  <Label>State</Label>
                  <Input
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Years of experience</Label>
                  <Input
                    placeholder="Years of experience"
                    inputMode="numeric"
                    value={years}
                    onChange={(e) => setYears(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Years in most recent job</Label>
                  <Input
                    placeholder="e.g., 3"
                    inputMode="numeric"
                    value={recentYears}
                    onChange={(e) => setRecentYears(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Salary desired</Label>
                  <Input
                    placeholder="e.g., 120000"
                    inputMode="numeric"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Date entered</Label>
                  <Input
                    type="date"
                    value={dateEntered}
                    onChange={(e) => setDateEntered(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 2,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={contract}
                      onChange={(e) => setContract(e.target.checked)}
                    />
                    <span style={{ color: '#E5E7EB', fontSize: 13 }}>
                      Available for contract
                    </span>
                  </label>

                  {contract ? (
                    <div style={{ flex: 1 }}>
                      <Input
                        placeholder="Hourly rate (e.g., 80)"
                        inputMode="numeric"
                        value={hourly}
                        onChange={(e) => setHourly(e.target.value)}
                      />
                    </div>
                  ) : null}
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <Label>Candidate Notes</Label>
                  <TextArea
                    placeholder="Short summary: strengths, availability, fit notes."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                <Button onClick={addCandidate}>Add candidate</Button>
                {addMsg ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: addMsg.startsWith('Database')
                        ? '#F87171'
                        : '#93E2B7',
                      paddingTop: 8,
                    }}
                  >
                    {addMsg}
                  </div>
                ) : null}
              </div>
            </Card>

            {/* Recent */}
            <Card style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 800, marginBottom: 12 }}>
                My recent candidates
              </div>
              {loadingList ? (
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>Loading…</div>
              ) : myRecent.length === 0 ? (
                <div style={{ fontSize: 14, color: '#9CA3AF' }}>
                  No candidates yet.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 0.8fr 0.5fr 0.6fr 0.6fr 0.8fr',
                    gap: 10,
                    alignItems: 'center',
                    fontSize: 13,
                  }}
                >
                  <div style={{ color: '#9CA3AF' }}>Name</div>
                  <div style={{ color: '#9CA3AF' }}>Location</div>
                  <div style={{ color: '#9CA3AF' }}>Years</div>
                  <div style={{ color: '#9CA3AF' }}>Recent role yrs</div>
                  <div style={{ color: '#9CA3AF' }}>Salary</div>
                  <div style={{ color: '#9CA3AF' }}>Entered</div>

                  {myRecent.map((c) => (
                    <React.Fragment key={c.id}>
                      <div style={{ color: '#E5E7EB' }}>{c.name}</div>
                      <div style={{ color: '#9CA3AF' }}>
                        {c.city || '—'}, {c.state || '—'}
                      </div>
                      <div style={{ color: '#E5E7EB' }}>
                        {c.years ?? '—'}
                      </div>
                      <div style={{ color: '#E5E7EB' }}>
                        {c.recent_role_years ?? '—'}
                      </div>
                      <div style={{ color: '#E5E7EB' }}>
                        {c.salary ? `$${c.salary.toLocaleString()}` : '—'}
                      </div>
                      <div style={{ color: '#9CA3AF' }}>
                        {c.date_entered
                          ? new Date(c.date_entered).toLocaleDateString()
                          : new Date(c.created_at).toLocaleDateString()}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Client / Admin placeholders (unchanged) ----------
  if (user.role === 'client') {
    return (
      <div style={pageWrap}>
        <div style={overlay}>
          <div style={{ width: 'min(1100px, 100%)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>
                Client workspace
              </div>
              <Button
                onClick={logout}
                style={{ background: '#0B1220', border: '1px solid #1F2937' }}
              >
                Log out
              </Button>
            </div>
            <Card>Minimal placeholder for client.</Card>
          </div>
        </div>
      </div>
    );
  }

  // admin
  return (
    <div style={pageWrap}>
      <div style={overlay}>
        <div style={{ width: 'min(1100px, 100%)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>
              Admin workspace
            </div>
            <Button
              onClick={logout}
              style={{ background: '#0B1220', border: '1px solid #1F2937' }}
            >
              Log out
            </Button>
          </div>
          <Card>Minimal placeholder for admin.</Card>
        </div>
      </div>
    </div>
  );
}
