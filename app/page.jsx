'use client';
import React from 'react';
import { supabase } from '../lib/supabaseClient';

const NYC =
  'https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg';

/* ---------- Small UI helpers ---------- */
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
      ...(rest.style || {}),
    }}
  >
    {children}
  </button>
);

const Tag = ({ children, style }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: 999,
      background: '#111827',
      border: '1px solid #1F2937',
      fontSize: 12,
      color: '#E5E7EB',
      ...style,
    }}
  >
    {children}
  </span>
);

/* ---------- Page ---------- */
export default function Page() {
  const [mode, setMode] = React.useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = React.useState('');
  const [pwd, setPwd] = React.useState('');
  const [err, setErr] = React.useState('');
  const [user, setUser] = React.useState(null);

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
        setErr('Login ok, but profile not found.');
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

  /* ---------- Recruiter state & functions ---------- */
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

  const [editingId, setEditingId] = React.useState(null);
  const [editForm, setEditForm] = React.useState({});

  function startEdit(row) {
    setEditingId(row.id);
    setEditForm({
      name: row.name || '',
      titles_csv: row.titles_csv || '',
      law_csv: row.law_csv || '',
      city: row.city || '',
      state: row.state || '',
      years: row.years ?? '',
      recent_role_years: row.recent_role_years ?? '',
      salary: row.salary ?? '',
      contract: !!row.contract,
      hourly: row.hourly ?? '',
      date_entered: (row.date_entered ? new Date(row.date_entered) : new Date(row.created_at))
        .toISOString()
        .slice(0, 10),
      notes: row.notes || '',
    });
  }
  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }
  function changeEditField(k, v) {
    setEditForm((s) => ({ ...s, [k]: v }));
  }

  async function saveEdit() {
    if (!editingId) return;
    try {
      const payload = {
        name: String(editForm.name || '').trim(),
        titles_csv: String(editForm.titles_csv || '').trim(),
        law_csv: String(editForm.law_csv || '').trim(),
        city: String(editForm.city || '').trim(),
        state: String(editForm.state || '').trim(),
        years: editForm.years === '' ? null : Number(editForm.years),
        recent_role_years:
          editForm.recent_role_years === '' ? null : Number(editForm.recent_role_years),
        salary: editForm.salary === '' ? null : Number(editForm.salary),
        contract: !!editForm.contract,
        hourly: !editForm.contract
          ? null
          : editForm.hourly === ''
          ? null
          : Number(editForm.hourly),
        date_entered: editForm.date_entered
          ? new Date(editForm.date_entered).toISOString()
          : null,
        notes: String(editForm.notes || '').trim() || null,
      };
      const { error } = await supabase.from('candidates').update(payload).eq('id', editingId);
      if (error) throw error;
      await refreshMyRecent();
      cancelEdit();
    } catch (e) {
      console.error(e);
      alert(`Update failed${e?.message ? `: ${e.message}` : ''}`);
    }
  }

  async function removeCandidate(id) {
    try {
      if (!confirm('Delete this candidate?')) return;
      const { error } = await supabase.from('candidates').delete().eq('id', id);
      if (error) throw error;
      await refreshMyRecent();
    } catch (e) {
      console.error(e);
      alert(`Delete failed${e?.message ? `: ${e.message}` : ''}`);
    }
  }

  async function refreshMyRecent() {
    if (!user || user.role !== 'recruiter') return;
    setLoadingList(true);
    const { data, error } = await supabase
      .from('candidates')
      .select(
        'id,name,titles_csv,law_csv,city,state,years,recent_role_years,salary,contract,hourly,date_entered,created_at,notes'
      )
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) setMyRecent(data);
    setLoadingList(false);
  }
  React.useEffect(() => {
    if (user?.role === 'recruiter') refreshMyRecent();
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
      await refreshMyRecent();
    } catch (e) {
      console.error(e);
      setAddMsg(`Database error adding candidate${e?.message ? `: ${e.message}` : ''}`);
    }
  }

  /* ---------- Client state & functions ---------- */
  const [cCountToday, setCCountToday] = React.useState(0);
  const [search, setSearch] = React.useState('');

  // Dropdown ranges (kept from your working version)
  const [salaryRange, setSalaryRange] = React.useState(''); // "min-max" or "min-"
  const [yearsRange, setYearsRange] = React.useState('');   // "min-max" or "min-"

  // NEW: contract filters
  const [onlyContract, setOnlyContract] = React.useState(false);
  const [hourlyRange, setHourlyRange] = React.useState(''); // "min-max"

  const [sortBy, setSortBy] = React.useState('date_desc');

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

  // Insights view
  const [showInsights, setShowInsights] = React.useState(false);
  const [insights, setInsights] = React.useState(null);

  const todayStartIso = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  React.useEffect(() => {
    if (user?.role !== 'client') return;
    (async () => {
      const { count } = await supabase
        .from('candidates')
        .select('id', { count: 'exact', head: true })
        .gte('date_entered', todayStartIso);
      setCCountToday(count || 0);
    })();
  }, [user, todayStartIso]);

  React.useEffect(() => {
    if (user?.role !== 'client') return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('candidates')
          .select('city,state,titles_csv,law_csv')
          .limit(1000);
        if (error) throw error;
        const cset = new Set(),
          sset = new Set(),
          tset = new Set(),
          lset = new Set();
        for (const r of data || []) {
          if (r.city) cset.add(r.city.trim());
          if (r.state) sset.add(r.state.trim());
          (r.titles_csv || '')
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean)
            .forEach((x) => tset.add(x));
          (r.law_csv || '')
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean)
            .forEach((x) => lset.add(x));
        }
        setCities([...cset].sort());
        setStates([...sset].sort());
        setTitleOptions([...tset].sort());
        setLawOptions([...lset].sort());
      } catch (e) {
        console.error(e);
      }
    })();
  }, [user]);

  // Helper to parse "min-max" or "min-" strings into numbers (or null)
  function parseRange(val) {
    if (!val) return { min: null, max: null };
    const [minStr, maxStr] = val.split('-');
    const min = minStr ? Number(minStr) : null;
    const max = maxStr ? Number(maxStr) : null;
    return { min: Number.isFinite(min) ? min : null, max: Number.isFinite(max) ? max : null };
  }

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

      const qStr = search.trim();
      if (qStr) {
        const like = `%${qStr}%`;
        q = q.or(
          `name.ilike.${like},city.ilike.${like},state.ilike.${like},titles_csv.ilike.${like},law_csv.ilike.${like},notes.ilike.${like}`
        );
      }
      if (fCity) q = q.eq('city', fCity);
      if (fState) q = q.eq('state', fState);
      if (fTitle) q = q.ilike('titles_csv', `%${fTitle}%`);
      if (fLaw) q = q.ilike('law_csv', `%${fLaw}%`);

      // Years range
      const y = parseRange(yearsRange);
      if (y.min != null) q = q.gte('years', y.min);
      if (y.max != null) q = q.lte('years', y.max);

      // Salary range
      const s = parseRange(salaryRange);
      if (s.min != null) q = q.gte('salary', s.min);
      if (s.max != null) q = q.lte('salary', s.max);

      // NEW: Contract filter + hourly range
      if (onlyContract) {
        q = q.eq('contract', true);
        const hr = parseRange(hourlyRange);
        if (hr.min != null) q = q.gte('hourly', hr.min);
        if (hr.max != null) q = q.lte('hourly', hr.max);
      }

      switch (sortBy) {
        case 'date_asc':
          q = q.order('date_entered', { ascending: true });
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
        case 'hourly_desc':
          q = q.order('hourly', { ascending: false, nullsFirst: false });
          break;
        case 'hourly_asc':
          q = q.order('hourly', { ascending: true, nullsFirst: true });
          break;
        case 'date_desc':
        default:
          q = q.order('date_entered', { ascending: false });
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

  function clearClientFilters() {
    setSearch('');
    setFCity('');
    setFState('');
    setFTitle('');
    setFLaw('');
    setSalaryRange('');
    setYearsRange('');
    setOnlyContract(false);
    setHourlyRange('');
    setSortBy('date_desc');
    setExpandedId(null);
    fetchClientRows();
  }

  React.useEffect(() => {
    if (user?.role === 'client') fetchClientRows();
  }, [user]);

  /* ---------- Layout ---------- */
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

  /* ---------- Logged-out ---------- */
  if (!user) {
    return (
      <div style={pageWrap}>
        <div style={overlay}>
          <Card style={{ width: 520, padding: 24 }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, letterSpacing: 0.3, textAlign: 'center' }}>
              Talent Connector
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12, textAlign: 'center' }}>
              Invitation-only access
            </div>

            {/* Centered login fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              <div style={{ width: '100%' }}>
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div style={{ width: '100%' }}>
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="your password"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                />
              </div>
              <div style={{ width: '100%', marginTop: 4, display: 'flex', justifyContent: 'center' }}>
                <Button onClick={login} style={{ minWidth: 120 }}>
                  Log in
                </Button>
              </div>
            </div>

            {err ? (
              <div style={{ color: '#F87171', fontSize: 12, marginTop: 10, textAlign: 'center' }}>{err}</div>
            ) : null}
          </Card>
        </div>
      </div>
    );
  }

  /* ---------- Recruiter UI ---------- */
  if (user.role === 'recruiter') {
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
                Talent Connector <span style={{ color: '#93C5FD' }}>—</span>{' '}
                <span style={{ color: '#9CA3AF' }}>RECRUITER workspace</span>
              </div>
              <Button onClick={logout} style={{ background: '#0B1220', border: '1px solid #1F2937' }}>
                Log out
              </Button>
            </div>

            <Card style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 14 }}>Add candidate</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 14,
                  alignItems: 'center',
                  justifyItems: 'stretch',
                }}
              >
                <div style={{ gridColumn: '1 / -1' }}>
                  <Label>Description</Label>
                  <Input
                    placeholder="AM Law 100 Litigation Paralegal"
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
                  <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
                </div>
                <div>
                  <Label>Years of experience</Label>
                  <Input
                    placeholder="Years"
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
                  <Input type="date" value={dateEntered} onChange={(e) => setDateEntered(e.target.value)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <input
                      type="checkbox"
                      checked={contract}
                      onChange={(e) => setContract(e.target.checked)}
                    />
                    <span style={{ color: '#E5E7EB', fontSize: 13 }}>Available for contract</span>
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
              <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'center' }}>
                <Button onClick={addCandidate}>Add candidate</Button>
                {addMsg ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: addMsg.startsWith('Database') ? '#F87171' : '#93E2B7',
                      paddingTop: 8,
                    }}
                  >
                    {addMsg}
                  </div>
                ) : null}
              </div>
            </Card>

            <Card style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 800, marginBottom: 12 }}>My recent candidates</div>
              {loadingList ? (
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>Loading…</div>
              ) : myRecent.length === 0 ? (
                <div style={{ fontSize: 14, color: '#9CA3AF' }}>No candidates yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {myRecent.map((c) =>
                    editingId === c.id ? (
                      <div
                        key={c.id}
                        style={{
                          border: '1px solid #1F2937',
                          borderRadius: 12,
                          padding: 12,
                          background: '#0B1220',
                        }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <Label>Description</Label>
                            <Input
                              value={editForm.name}
                              onChange={(e) => changeEditField('name', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Title(s) (CSV)</Label>
                            <Input
                              value={editForm.titles_csv}
                              onChange={(e) => changeEditField('titles_csv', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Type of Law (CSV)</Label>
                            <Input
                              value={editForm.law_csv}
                              onChange={(e) => changeEditField('law_csv', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>City</Label>
                            <Input
                              value={editForm.city}
                              onChange={(e) => changeEditField('city', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>State</Label>
                            <Input
                              value={editForm.state}
                              onChange={(e) => changeEditField('state', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Years</Label>
                            <Input
                              inputMode="numeric"
                              value={editForm.years}
                              onChange={(e) => changeEditField('years', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Recent role years</Label>
                            <Input
                              inputMode="numeric"
                              value={editForm.recent_role_years}
                              onChange={(e) => changeEditField('recent_role_years', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Salary</Label>
                            <Input
                              inputMode="numeric"
                              value={editForm.salary}
                              onChange={(e) => changeEditField('salary', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Date entered</Label>
                            <Input
                              type="date"
                              value={editForm.date_entered}
                              onChange={(e) => changeEditField('date_entered', e.target.value)}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <input
                                type="checkbox"
                                checked={!!editForm.contract}
                                onChange={(e) => changeEditField('contract', e.target.checked)}
                              />
                              <span style={{ color: '#E5E7EB', fontSize: 13 }}>Contract</span>
                            </label>
                            {editForm.contract ? (
                              <Input
                                placeholder="Hourly"
                                inputMode="numeric"
                                value={editForm.hourly}
                                onChange={(e) => changeEditField('hourly', e.target.value)}
                              />
                            ) : null}
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <Label>Notes</Label>
                            <TextArea
                              value={editForm.notes}
                              onChange={(e) => changeEditField('notes', e.target.value)}
                            />
                          </div>
                        </div>
                        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                          <Button onClick={saveEdit}>Save</Button>
                          <Button
                            onClick={cancelEdit}
                            style={{ background: '#111827', border: '1px solid #1F2937' }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={c.id}
                        style={{
                          border: '1px solid #1F2937',
                          borderRadius: 12,
                          padding: 12,
                          background: '#0B1220',
                          display: 'grid',
                          gridTemplateColumns:
                            '1.2fr 0.8fr 0.5fr 0.6fr 0.6fr 0.8fr auto',
                          gap: 10,
                          alignItems: 'center',
                          fontSize: 13,
                        }}
                      >
                        <div style={{ color: '#E5E7EB', fontWeight: 600 }}>
                          {c.name}
                          <div style={{ color: '#93C5FD', fontSize: 12, marginTop: 2 }}>
                            {[c.titles_csv, c.law_csv].filter(Boolean).join(' • ') || '—'}
                          </div>
                        </div>
                        <div style={{ color: '#9CA3AF' }}>
                          {c.city || '—'}, {c.state || '—'}
                        </div>
                        <div style={{ color: '#E5E7EB' }}>{c.years ?? '—'}</div>
                        <div style={{ color: '#E5E7EB' }}>{c.recent_role_years ?? '—'}</div>
                        <div style={{ color: '#E5E7EB' }}>
                          {c.salary ? `$${c.salary.toLocaleString()}` : '—'}
                          {c.contract && c.hourly ? `  /  $${c.hourly}/hr` : ''}
                        </div>
                        <div style={{ color: '#9CA3AF' }}>
                          {(c.date_entered ? new Date(c.date_entered) : new Date(c.created_at)).toLocaleDateString()}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button
                            onClick={() => startEdit(c)}
                            style={{ background: '#111827', border: '1px solid #1F2937' }}
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => removeCandidate(c.id)}
                            style={{ background: '#B91C1C', border: '1px solid #7F1D1D' }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Client UI ---------- */
  if (user.role === 'client') {
    function buildMailto(c) {
      const to = user.amEmail || 'info@youragency.com';
      const subj = `Talent Connector Candidate – ${c?.name || ''}`;
      const body = [
        `Hello,`,
        ``,
        `I'm interested in this candidate:`,
        `• Name: ${c?.name || ''}`,
        `• Titles: ${c?.titles_csv || ''}`,
        `• Type of law: ${c?.law_csv || ''}`,
        `• Location: ${[c?.city, c?.state].filter(Boolean).join(', ')}`,
        `• Years: ${c?.years ?? ''}`,
        c?.contract && c?.hourly ? `• Contract: $${c.hourly}/hr` : '',
        c?.salary ? `• Salary: $${c.salary}` : '',
        ``,
        `My email: ${user.email || ''}`,
        ``,
        `Sent from Talent Connector`,
      ]
        .filter(Boolean)
        .join('\n');
      return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
        subj
      )}&body=${encodeURIComponent(body)}`;
    }

    // Build dropdown options (same as your working version)
    const yearsOptions = [
      { label: 'Any', value: '' },
      { label: '0–2 years', value: '0-2' },
      { label: '3–5 years', value: '3-5' },
      { label: '6–10 years', value: '6-10' },
      { label: '11–20 years', value: '11-20' },
      { label: '21+ years', value: '21-' },
    ];

    const salaryOptions = (() => {
      const opts = [{ label: 'Any', value: '' }, { label: 'Under $40,000', value: '0-40000' }];
      for (let start = 40000; start < 500000; start += 20000) {
        const end = start + 20000;
        if (end <= 500000) {
          opts.push({ label: `$${(start/1000).toFixed(0)}k–$${(end/1000).toFixed(0)}k`, value: `${start}-${end}` });
        }
      }
      opts.push({ label: '$500k+', value: '500000-' });
      return opts;
    })();

    // NEW: hourly range options (25–50 up to 275–300)
    const hourlyOptions = (() => {
      const ranges = [{ label: 'Any', value: '' }];
      let start = 25;
      while (start < 300) {
        const end = start + 25;
        ranges.push({ label: `$${start}–$${end}/hr`, value: `${start}-${end}` });
        start = end;
      }
      // include the last exact 275–300 above; no 300+ per your spec
      return ranges;
    })();

    // Insights helpers (unchanged)
    function groupAvg(items, key, valueKey) {
      const acc = new Map();
      for (const it of items) {
        const k = (it[key] || '').trim();
        const v = Number(it[valueKey]);
        if (!k || !Number.isFinite(v) || v <= 0) continue;
        const cur = acc.get(k) || { sum: 0, n: 0 };
        cur.sum += v;
        cur.n += 1;
        acc.set(k, cur);
      }
      const rows = [];
      for (const [k, { sum, n }] of acc.entries()) rows.push({ label: k, avg: Math.round(sum / n), n });
      rows.sort((a, b) => b.avg - a.avg);
      return rows.slice(0, 12);
    }
    const _csvKey = (k) => k + '_one';
    function explodeCSVToRows(items, csvKey) {
      const rows = [];
      for (const it of items) {
        const raw = (it[csvKey] || '').split(',').map(s => s.trim()).filter(Boolean);
        for (const r of raw) rows.push({ ...it, [_csvKey(csvKey)]: r });
      }
      return rows;
    }

    async function loadInsights() {
      try {
        const { data, error } = await supabase
          .from('candidates')
          .select('titles_csv,city,state,years,salary,hourly')
          .limit(2000);
        if (error) throw error;

        const byTitleSalary = groupAvg(
          explodeCSVToRows(data, 'titles_csv').map((r) => ({ ...r, title_one: r[_csvKey('titles_csv')] })),
          'title_one',
          'salary'
        );
        const byTitleHourly = groupAvg(
          explodeCSVToRows(data, 'titles_csv').map((r) => ({ ...r, title_one: r[_csvKey('titles_csv')] })),
          'title_one',
          'hourly'
        );
        const withCityState = data.map((r) => ({ ...r, city_full: [r.city, r.state].filter(Boolean).join(', ') }));
        const byCitySalary = groupAvg(withCityState, 'city_full', 'salary');
        const byCityHourly = groupAvg(withCityState, 'city_full', 'hourly');

        const buckets = [
          { label: '0-2 yrs', check: (y) => y >= 0 && y <= 2 },
          { label: '3-5 yrs', check: (y) => y >= 3 && y <= 5 },
          { label: '6-10 yrs', check: (y) => y >= 6 && y <= 10 },
          { label: '11-20 yrs', check: (y) => y >= 11 && y <= 20 },
          { label: '21+ yrs', check: (y) => y >= 21 },
        ];
        const yearsAgg = [];
        for (const b of buckets) {
          const vals = data
            .map((r) => Number(r.salary))
            .filter((v, i) => {
              const y = Number(data[i].years);
              return Number.isFinite(v) && v > 0 && Number.isFinite(y) && b.check(y);
            });
          if (vals.length) {
            yearsAgg.push({
              label: b.label,
              avg: Math.round(vals.reduce((a, c) => a + c, 0) / vals.length),
              n: vals.length,
            });
          }
        }

        setInsights({
          byTitleSalary,
          byTitleHourly,
          byCitySalary,
          byCityHourly,
          byYearsSalary: yearsAgg,
        });
        setShowInsights(true);
      } catch (e) {
        console.error(e);
        alert('Failed to load insights.');
      }
    }

    function BarChart({ title, rows, money = true }) {
      const max = Math.max(...rows.map((r) => r.avg), 1);
      return (
        <Card style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>{title}</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {rows.map((r) => (
              <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 70px', gap: 10, alignItems: 'center' }}>
                <div style={{ color: '#E5E7EB', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.label}
                </div>
                <div style={{ height: 12, background: '#111827', borderRadius: 999, overflow: 'hidden', border: '1px solid #1F2937' }}>
                  <div
                    style={{
                      width: `${Math.round((r.avg / max) * 100)}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #3B82F6, #06B6D4)',
                    }}
                  />
                </div>
                <div style={{ color: '#9CA3AF', textAlign: 'right', fontSize: 12 }}>
                  {money ? `$${r.avg.toLocaleString()}` : r.avg.toLocaleString()}
                </div>
              </div>
            ))}
            {rows.length === 0 ? <div style={{ color: '#9CA3AF' }}>No data.</div> : null}
          </div>
        </Card>
      );
    }

    function InsightsView() {
      if (!insights) return null;
      return (
        <div style={{ width: 'min(1150px, 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>
              Compensation Insights <span style={{ color: '#93C5FD' }}>—</span>{' '}
              <span style={{ color: '#9CA3AF' }}>salary & hourly trends</span>
            </div>
            <Button
              onClick={() => setShowInsights(false)}
              style={{ background: '#0B1220', border: '1px solid #1F2937' }}
            >
              Back to Results
            </Button>
          </div>

          <BarChart title="Avg Salary by Title" rows={insights.byTitleSalary} money />
          <BarChart title="Avg Hourly by Title" rows={insights.byTitleHourly} money />
          <BarChart title="Avg Salary by City" rows={insights.byCitySalary} money />
          <BarChart title="Avg Hourly by City" rows={insights.byCityHourly} money />
          <BarChart title="Avg Salary by Years of Experience" rows={insights.byYearsSalary} money />
        </div>
      );
    }

    return (
      <div style={pageWrap}>
        <div style={overlay}>
          {!showInsights ? (
            <div style={{ width: 'min(1150px, 100%)' }}>
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
                  <span style={{ color: '#9CA3AF' }}>CLIENT workspace</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Tag style={{ fontSize: 16, padding: '6px 12px' }}>
                    New today: <strong>{cCountToday}</strong>
                  </Tag>
                  <Button
                    onClick={loadInsights}
                    style={{ background: '#0EA5E9', border: '1px solid #1F2937' }}
                  >
                    Compensation Insights
                  </Button>
                  <Button onClick={logout} style={{ background: '#0B1220', border: '1px solid #1F2937' }}>
                    Log out
                  </Button>
                </div>
              </div>

              <Card style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 12 }}>Filters</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
                  <div>
                    <Label>Keyword</Label>
                    <Input
                      placeholder="name, notes, law, title, city/state"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>City</Label>
                    <select value={fCity} onChange={(e) => setFCity(e.target.value)} style={selectStyle}>
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
                    <select value={fState} onChange={(e) => setFState(e.target.value)} style={selectStyle}>
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
                    <select value={fTitle} onChange={(e) => setFTitle(e.target.value)} style={selectStyle}>
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
                    <select value={fLaw} onChange={(e) => setFLaw(e.target.value)} style={selectStyle}>
                      <option value="">Any</option>
                      {lawOptions.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Salary range dropdown */}
                  <div>
                    <Label>Salary range</Label>
                    <select
                      value={salaryRange}
                      onChange={(e) => setSalaryRange(e.target.value)}
                      style={selectStyle}
                    >
                      {(() => {
                        const opts = [{ label: 'Any', value: '' }, { label: 'Under $40,000', value: '0-40000' }];
                        for (let start = 40000; start < 500000; start += 20000) {
                          const end = start + 20000;
                          if (end <= 500000) {
                            opts.push({
                              label: `$${(start / 1000).toFixed(0)}k–$${(end / 1000).toFixed(0)}k`,
                              value: `${start}-${end}`,
                            });
                          }
                        }
                        opts.push({ label: '$500k+', value: '500000-' });
                        return opts.map((o) => (
                          <option key={o.value || 'any-salary'} value={o.value}>
                            {o.label}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>

                  {/* Years range dropdown */}
                  <div>
                    <Label>Years of experience</Label>
                    <select
                      value={yearsRange}
                      onChange={(e) => setYearsRange(e.target.value)}
                      style={selectStyle}
                    >
                      {[
                        { label: 'Any', value: '' },
                        { label: '0–2 years', value: '0-2' },
                        { label: '3–5 years', value: '3-5' },
                        { label: '6–10 years', value: '6-10' },
                        { label: '11–20 years', value: '11-20' },
                        { label: '21+ years', value: '21-' },
                      ].map((o) => (
                        <option key={o.value || 'any-years'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* NEW: Contract-only checkbox */}
                  <div>
                    <Label>Contract availability</Label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42 }}>
                      <input
                        id="onlyContract"
                        type="checkbox"
                        checked={onlyContract}
                        onChange={(e) => {
                          setOnlyContract(e.target.checked);
                          if (!e.target.checked) setHourlyRange('');
                        }}
                      />
                      <label htmlFor="onlyContract" style={{ color: '#E5E7EB', fontSize: 13 }}>
                        Show contract-only candidates
                      </label>
                    </div>
                  </div>

                  {/* NEW: Hourly range dropdown (shows only if Contract is checked) */}
                  {onlyContract ? (
                    <div>
                      <Label>Hourly rate range</Label>
                      <select
                        value={hourlyRange}
                        onChange={(e) => setHourlyRange(e.target.value)}
                        style={selectStyle}
                      >
                        {hourlyOptions.map((o) => (
                          <option key={o.value || 'any-hourly'} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div />
                  )}

                  <div>
                    <Label>Sort by</Label>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={selectStyle}>
                      <option value="date_desc">Date (newest)</option>
                      <option value="date_asc">Date (oldest)</option>
                      <option value="salary_desc">Salary (high → low)</option>
                      <option value="salary_asc">Salary (low → high)</option>
                      <option value="hourly_desc">Hourly (high → low)</option>
                      <option value="hourly_asc">Hourly (low → high)</option>
                      <option value="years_desc">Years (high → low)</option>
                      <option value="years_asc">Years (low → high)</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <Button onClick={fetchClientRows}>Apply filters</Button>
                  <Button
                    onClick={clearClientFilters}
                    style={{ background: '#111827', border: '1px solid #1F2937' }}
                  >
                    Clear filters
                  </Button>
                  {clientErr ? (
                    <div style={{ color: '#F87171', fontSize: 12, paddingTop: 8 }}>{clientErr}</div>
                  ) : null}
                </div>
              </Card>

              <Card style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 800, marginBottom: 12 }}>Results</div>
                {clientRows.length === 0 ? (
                  <div style={{ color: '#9CA3AF', fontSize: 14 }}>
                    {clientLoading ? 'Loading…' : 'No candidates match the filters.'}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {clientRows.map((c) => (
                      <div
                        key={c.id}
                        style={{ border: '1px solid #1F2937', borderRadius: 12, padding: 12, background: '#0B1220' }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1.2fr 1fr 0.6fr 0.8fr auto',
                            gap: 10,
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ color: '#E5E7EB', fontWeight: 600 }}>
                            {c.name}
                            <div style={{ color: '#93C5FD', fontSize: 12, marginTop: 2 }}>
                              {[c.titles_csv, c.law_csv].filter(Boolean).join(' • ') || '—'}
                            </div>
                          </div>
                          <div style={{ color: '#9CA3AF' }}>
                            {c.city || '—'}, {c.state || '—'}
                          </div>
                          <div style={{ color: '#E5E7EB' }}>
                            {c.salary ? `$${c.salary.toLocaleString()}` : '—'}
                            {c.contract && c.hourly ? `  /  $${c.hourly}/hr` : ''}
                          </div>
                          <div style={{ color: '#9CA3AF' }}>
                            {(c.date_entered ? new Date(c.date_entered) : new Date(c.created_at)).toLocaleDateString()}
                          </div>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <Button
                              onClick={() => setExpandedId((id) => (id === c.id ? null : c.id))}
                              style={{ background: '#111827', border: '1px solid #1F2937' }}
                            >
                              Additional information
                            </Button>
                            <a
                              href={buildMailto(c)}
                              style={{
                                display: 'inline-block',
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: '1px solid #243041',
                                background: '#2563EB',
                                color: 'white',
                                fontWeight: 600,
                                textDecoration: 'none',
                              }}
                            >
                              Email for more information
                            </a>
                          </div>
                        </div>
                        {expandedId === c.id && (
                          <div
                            style={{
                              marginTop: 10,
                              padding: 10,
                              borderRadius: 10,
                              border: '1px solid #1F2937',
                              background: '#0F172A',
                              color: '#CBD5E1',
                              fontSize: 14,
                            }}
                          >
                            {c.notes ? c.notes : <i>No additional notes.</i>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          ) : (
            <InsightsView />
          )}
        </div>
      </div>
    );
  }

  /* ---------- Admin UI ---------- */
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
              Talent Connector <span style={{ color: '#93C5FD' }}>—</span>{' '}
              <span style={{ color: '#9CA3AF' }}>ADMIN workspace</span>
            </div>
            <Button onClick={logout} style={{ background: '#0B1220', border: '1px solid #1F2937' }}>
              Log out
            </Button>
          </div>
          <AdminPanel />
        </div>
      </div>
    </div>
  );
}

/* ---------- Admin Panel ---------- */
function AdminPanel() {
  const [list, setList] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState('');
  const [flash, setFlash] = React.useState('');

  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState('client');
  const [org, setOrg] = React.useState('');
  const [amEmail, setAmEmail] = React.useState('');
  const [tempPw, setTempPw] = React.useState('');

  React.useEffect(() => {
    loadProfiles();
  }, []);
  async function loadProfiles() {
    setLoading(true);
    setErr('');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,role,org,account_manager_email,created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setList(data || []);
    } catch (e) {
      console.error(e);
      setErr('Error loading profiles.');
    }
    setLoading(false);
  }

  async function invite() {
    setFlash('');
    setErr('');
    try {
      if (!email || !tempPw) {
        setErr('Email and temp password are required.');
        return;
      }
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          role,
          org: org.trim() || null,
          amEmail: amEmail.trim() || null,
          password: tempPw,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErr(json?.error || 'Invite failed');
        return;
      }
      setFlash(`Invited ${email} as ${role}`);
      setEmail('');
      setRole('client');
      setOrg('');
      setAmEmail('');
      setTempPw('');
      await loadProfiles();
    } catch (e) {
      console.error(e);
      setErr('Server error inviting user.');
    }
  }

  return (
    <>
      <Card style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Invite user</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label>Role</Label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={selectStyle}>
              <option value="client">Client</option>
              <option value="recruiter">Recruiter</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <Label>Organization (optional)</Label>
            <Input value={org} onChange={(e) => setOrg(e.target.value)} />
          </div>
          <div>
            <Label>Sales contact (optional)</Label>
            <Input
              type="email"
              placeholder="sales@youragency.com"
              value={amEmail}
              onChange={(e) => setAmEmail(e.target.value)}
            />
          </div>
          <div>
            <Label>Temp password</Label>
            <Input
              type="password"
              placeholder="set a password"
              value={tempPw}
              onChange={(e) => setTempPw(e.target.value)}
            />
          </div>
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <Button onClick={invite}>Add user</Button>
          {err ? (
            <div style={{ color: '#F87171', fontSize: 12, paddingTop: 8 }}>{err}</div>
          ) : (
            <div style={{ color: '#93E2B7', fontSize: 12, paddingTop: 8 }}>{flash}</div>
          )}
        </div>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Directory</div>
        {loading ? (
          <div style={{ fontSize: 12, color: '#9CA3AF' }}>Loading…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#9CA3AF' }}>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Org</th>
                  <th style={thStyle}>Sales contact</th>
                  <th style={thStyle}>Created</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <td style={tdStyle}>{r.email}</td>
                    <td style={tdStyle}>{r.role}</td>
                    <td style={tdStyle}>{r.org || '—'}</td>
                    <td style={tdStyle}>{r.account_manager_email || '—'}</td>
                    <td style={tdStyle}>{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ ...tdStyle, color: '#9CA3AF' }}>
                      No users yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

/* ---------- shared styles ---------- */
const selectStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #1F2937',
  background: '#0F172A',
  color: '#E5E7EB',
  outline: 'none',
};
const thStyle = { padding: '8px', borderBottom: '1px solid #1F2937' };
const tdStyle = { padding: '8px', borderBottom: '1px solid #1F2937' };
