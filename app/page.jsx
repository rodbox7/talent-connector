'use client';
import React from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Client tab now includes extra sort options for hourly rate (high→low, low→high).
 * Recruiter UI and styling preserved.
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

  // Minimal auth
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

  // ---------- Recruiter form state ----------
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
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
      .toISOString()
      .slice(0, 10);
  });
  const [notes, setNotes] = React.useState('');
  const [addMsg, setAddMsg] = React.useState('');
  const [myRecent, setMyRecent] = React.useState([]);
  const [loadingList, setLoadingList] = React.useState(false);

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
      setName('');
      setCity('');
      setState('');
      setYears('');
      setRecentYears('');
      setSalary('');
      setContract(false);
      setHourly('');
      setNotes('');

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
        `Database error adding candidate${e?.message ? `: ${e.message}` : ''}`
      );
    }
  }

  // ---------- Client state ----------
  const [cCountToday, setCCountToday] = React.useState(0);
  const [search, setSearch] = React.useState('');
  const [minSalary, setMinSalary] = React.useState(0);
  const [maxSalary, setMaxSalary] = React.useState(400000);
  const [minYears, setMinYears] = React.useState(0);
  const [maxYears, setMaxYears] = React.useState(50);

  // NEW: add hourly sort options
  const [sortBy, setSortBy] = React.useState('date_desc');

  // filter selects
  const [cities, setCities] = React.useState([]);
  const [states, setStates] = React.useState([]);
  const [titleOptions, setTitleOptions] = React.useState([]);
  const [lawOptions, setLawOptions] = React.useState([]);

  const [fCity, setFCity] = React.useState('');
  const [fState, setFState] = React.useState('');
  const [fTitle, setFTitle] = React.useState('');
  const [fLaw, setFLaw] = React.useState('');

  const [clientRows, setClientRows] = React.useState([]);
  const [clientLoading, setClientLoading] = React.useState(false);
  const [clientErr, setClientErr] = React.useState('');
  const [expandedId, setExpandedId] = React.useState(null);

  const todayStartIso = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  // Load today count
  React.useEffect(() => {
    if (!user || user.role !== 'client') return;
    (async () => {
      const { count } = await supabase
        .from('candidates')
        .select('id', { count: 'exact', head: true })
        .gte('date_entered', todayStartIso);
      setCCountToday(count || 0);
    })();
  }, [user, todayStartIso]);

  // Load filter options
  React.useEffect(() => {
    if (!user || user.role !== 'client') return;

    async function loadOptions() {
      try {
        const { data, error } = await supabase
          .from('candidates')
          .select('city,state,titles_csv,law_csv')
          .limit(1000);

        if (error) throw error;
        const cset = new Set();
        const sset = new Set();
        const tset = new Set();
        const lset = new Set();

        for (const row of data || []) {
          if (row.city) cset.add(row.city.trim());
          if (row.state) sset.add(row.state.trim());

          if (row.titles_csv) {
            row.titles_csv
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean)
              .forEach((x) => tset.add(x));
          }
          if (row.law_csv) {
            row.law_csv
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean)
              .forEach((x) => lset.add(x));
          }
        }

        setCities(Array.from(cset).sort());
        setStates(Array.from(sset).sort());
        setTitleOptions(Array.from(tset).sort());
        setLawOptions(Array.from(lset).sort());
      } catch (e) {
        console.error('loadOptions', e);
      }
    }

    loadOptions();
  }, [user]);

  async function fetchClientRows() {
    if (!user || user.role !== 'client') return;
    setClientErr('');
    setClientLoading(true);
    try {
      let q = supabase
        .from('candidates')
        .select(
          'id,name,titles_csv,law_csv,city,state,years,salary,contract,hourly,notes,date_entered,created_at'
        );

      // Search
      const qStr = search.trim();
      if (qStr) {
        const like = `%${qStr}%`;
        q = q.or(
          `name.ilike.${like},city.ilike.${like},state.ilike.${like},titles_csv.ilike.${like},law_csv.ilike.${like}`
        );
      }

      // Select filters
      if (fCity) q = q.eq('city', fCity);
      if (fState) q = q.eq('state', fState);
      if (fTitle) q = q.ilike('titles_csv', `%${fTitle}%`);
      if (fLaw) q = q.ilike('law_csv', `%${fLaw}%`);

      // Salary filter
      if (minSalary != null) q = q.gte('salary', minSalary);
      if (maxSalary != null) q = q.lte('salary', maxSalary);

      // Years filter
      if (minYears != null) q = q.gte('years', minYears);
      if (maxYears != null) q = q.lte('years', maxYears);

      // Sorting
      switch (sortBy) {
        case 'date_asc':
          q = q.order('date_entered', { ascending: true, nullsFirst: false });
          break;
        case 'salary_desc':
          q = q.order('salary', { ascending: false, nullsFirst: false });
          break;
        case 'salary_asc':
          q = q.order('salary', { ascending: true, nullsFirst: true });
          break;
        case 'years_desc':
          q = q.order('years', { ascending: false, nullsFirst: false });
          break;
        case 'years_asc':
          q = q.order('years', { ascending: true, nullsFirst: true });
          break;
        // NEW: hourly sorts
        case 'hourly_desc':
          q = q.order('hourly', { ascending: false, nullsFirst: false });
          break;
        case 'hourly_asc':
          q = q.order('hourly', { ascending: true, nullsFirst: true });
          break;
        case 'date_desc':
        default:
          q = q.order('date_entered', { ascending: false, nullsFirst: false });
          break;
      }

      const { data, error } = await q.limit(200);
      if (error) throw error;
      setClientRows(data || []);
    } catch (e) {
      console.error(e);
      setClientErr('Error loading client view.');
    }
    setClientLoading(false);
  }

  React.useEffect(() => {
    if (user?.role === 'client') {
      fetchClientRows();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

  // ---------- Logged-out ----------
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
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>
              Invitation-only access
            </div>

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

  // ---------- Recruiter UI ----------
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
                  border: '1px solid '#1F2937',
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

              {/* 3-col grid */}
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

  // ---------- Client UI ----------
  if (user.role === 'client') {
    return (
      <div style={pageWrap}>
        <div style={overlay}>
          <div style={{ width: 'min(1200px, 100%)' }}>
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

            {/* Stat + Search/Filters */}
            <Card style={{ marginTop: 10 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                    Candidates added today
                  </div>
                  <div style={{ fontSize: 40, lineHeight: 1, fontWeight: 800 }}>
                    {cCountToday}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 8,
                    alignItems: 'center',
                  }}
                >
                  <Input
                    placeholder="Search name/city/state/titles/type of law"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Button onClick={fetchClientRows}>Refresh</Button>
                </div>
              </div>

              {/* Filters */}
              <div
                style={{
                  marginTop: 12,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                {/* Salary */}
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ color: '#9CA3AF', fontSize: 12 }}>
                    Salary range ($0 – $400,000)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input
                      type="range"
                      min={0}
                      max={400000}
                      step={1000}
                      value={minSalary}
                      onChange={(e) =>
                        setMinSalary(Math.min(Number(e.target.value), maxSalary))
                      }
                    />
                    <input
                      type="range"
                      min={0}
                      max={400000}
                      step={1000}
                      value={maxSalary}
                      onChange={(e) =>
                        setMaxSalary(Math.max(Number(e.target.value), minSalary))
                      }
                    />
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                    ${minSalary.toLocaleString()} – ${maxSalary.toLocaleString()}
                  </div>
                </div>

                {/* Years */}
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ color: '#9CA3AF', fontSize: 12 }}>
                    Years of experience (0 – 50)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={minYears}
                      onChange={(e) =>
                        setMinYears(Math.min(Number(e.target.value), maxYears))
                      }
                    />
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={maxYears}
                      onChange={(e) =>
                        setMaxYears(Math.max(Number(e.target.value), minYears))
                      }
                    />
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                    {minYears} – {maxYears} years
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <Label>Sort by</Label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid #1F2937',
                      background: '#0F172A',
                      color: '#E5E7EB',
                      outline: 'none',
                    }}
                  >
                    <option value="date_desc">Newest first</option>
                    <option value="date_asc">Oldest first</option>
                    <option value="salary_desc">Salary high → low</option>
                    <option value="salary_asc">Salary low → high</option>
                    <option value="hourly_desc">Hourly rate high → low</option>
                    <option value="hourly_asc">Hourly rate low → high</option>
                    <option value="years_desc">Experience high → low</option>
                    <option value="years_asc">Experience low → high</option>
                  </select>
                </div>
              </div>

              {/* Select filters row */}
              <div
                style={{
                  marginTop: 12,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 10,
                }}
              >
                <div>
                  <Label>City</Label>
                  <select
                    value={fCity}
                    onChange={(e) => setFCity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid #1F2937',
                      background: '#0F172A',
                      color: '#E5E7EB',
                      outline: 'none',
                    }}
                  >
                    <option value="">Any</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>State</Label>
                  <select
                    value={fState}
                    onChange={(e) => setFState(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid #1F2937',
                      background: '#0F172A',
                      color: '#E5E7EB',
                      outline: 'none',
                    }}
                  >
                    <option value="">Any</option>
                    {states.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Title</Label>
                  <select
                    value={fTitle}
                    onChange={(e) => setFTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid #1F2937',
                      background: '#0F172A',
                      color: '#E5E7EB',
                      outline: 'none',
                    }}
                  >
                    <option value="">Any</option>
                    {titleOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Type of Law</Label>
                  <select
                    value={fLaw}
                    onChange={(e) => setFLaw(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid #1F2937',
                      background: '#0F172A',
                      color: '#E5E7EB',
                      outline: 'none',
                    }}
                  >
                    <option value="">Any</option>
                    {lawOptions.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            {/* Results */}
            <Card style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>
                Recent candidates (read-only)
              </div>
              {clientErr ? (
                <div style={{ color: '#F87171', fontSize: 12 }}>{clientErr}</div>
              ) : null}
              {clientLoading ? (
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>Loading…</div>
              ) : clientRows.length === 0 ? (
                <div style={{ fontSize: 14, color: '#9CA3AF' }}>
                  No candidates found.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {clientRows.map((c) => {
                    const titleLawLine = [
                      c.titles_csv?.trim(),
                      c.law_csv?.trim(),
                    ]
                      .filter(Boolean)
                      .join(' • ');

                    return (
                      <div
                        key={c.id}
                        style={{
                          border: '1px solid #1F2937',
                          borderRadius: 12,
                          padding: 12,
                          background: '#0B1220',
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
                          <div>
                            <div style={{ fontWeight: 700, color: '#E5E7EB' }}>
                              {c.name || '—'}
                            </div>
                            <div
                              style={{
                                color: '#93C5FD',
                                fontSize: 13,
                                marginTop: 2,
                              }}
                            >
                              {titleLawLine || '—'}
                            </div>
                            <div
                              style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}
                            >
                              {c.city || '—'}, {c.state || '—'}
                            </div>

                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                              <Tag>
                                {c.years != null ? `${c.years} yrs` : 'yrs —'}
                              </Tag>
                              <Tag>
                                {c.salary
                                  ? `$${c.salary.toLocaleString()}`
                                  : 'salary —'}
                              </Tag>
                              {c.contract ? <Tag>contract</Tag> : null}
                              {c.hourly ? <Tag>${c.hourly}/hr</Tag> : null}
                              <Tag>
                                {c.date_entered
                                  ? new Date(c.date_entered).toLocaleDateString()
                                  : new Date(c.created_at).toLocaleDateString()}
                              </Tag>
                            </div>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              gap: 8,
                              justifyContent: 'flex-end',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                            }}
                          >
                            <Button
                              onClick={() =>
                                setExpandedId(expandedId === c.id ? null : c.id)
                              }
                              style={{
                                background: '#111827',
                                border: '1px solid #1F2937',
                              }}
                            >
                              Additional information
                            </Button>
                            <a
                              href={`mailto:${user.amEmail || ''}?subject=Candidate%20inquiry:%20${encodeURIComponent(
                                c.name || 'Candidate'
                              )}`}
                              style={{ textDecoration: 'none' }}
                            >
                              <Button
                                style={{
                                  background: '#0E7490',
                                  border: '1px solid #164E63',
                                }}
                              >
                                Email for more information
                              </Button>
                            </a>
                          </div>
                        </div>

                        {expandedId === c.id ? (
                          <div
                            style={{
                              marginTop: 10,
                              paddingTop: 10,
                              borderTop: '1px solid #1F2937',
                              color: '#E5E7EB',
                              whiteSpace: 'pre-wrap',
                              fontSize: 13,
                            }}
                          >
                            {c.notes || 'No additional notes.'}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Admin placeholder ----------
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
