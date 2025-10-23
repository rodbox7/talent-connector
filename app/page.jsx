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

const Label = ({ children, style }) => (
  <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6, ...(style || {}) }}>{children}</div>
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

/* ---------- helpers ---------- */
// Show date safely with *no timezone drift*.
function renderDate(val) {
  if (!val) return '—';
  if (typeof val === 'string') {
    const m = val.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  try {
    return new Date(val).toLocaleDateString();
  } catch {
    return String(val);
  }
}

// MM/DD/YYYY formatter for banner
function formatMDY(val) {
  if (!val) return '';
  if (typeof val === 'string') {
    const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[2] + '/' + m[3] + '/' + m[1];
  }
  try {
    const d = new Date(val);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  } catch {
    return String(val);
  }
}

const numOrNull = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

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
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
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
      date_entered: (row.date_entered ? String(row.date_entered).slice(0, 10) : new Date(row.created_at).toISOString().slice(0, 10)),
      notes: row.notes || '',
      on_assignment: !!row.on_assignment,
      est_available_date: row.est_available_date ? String(row.est_available_date).slice(0,10) : '',
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
        date_entered: editForm.date_entered || null,
        notes: String(editForm.notes || '').trim() || null,
        on_assignment: !!editForm.on_assignment,
        est_available_date: editForm.on_assignment
          ? (editForm.est_available_date || null)
          : null,
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

  // Fetch the recruiter's recent candidates list
  async function refreshMyRecent() {
    if (!user || user.role !== 'recruiter') return;
    setLoadingList(true);
    const { data, error } = await supabase
      .from('candidates')
      .select(
        'id,name,titles_csv,law_csv,city,state,years,recent_role_years,salary,contract,hourly,date_entered,created_at,notes,on_assignment,est_available_date'
      )
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) setMyRecent(data);
    setLoadingList(false);
  }

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
        years: numOrNull(years),
        recent_role_years: numOrNull(recentYears),
        salary: numOrNull(salary),
        contract: !!contract,
        hourly: contract ? numOrNull(hourly) : null,
        date_entered: dateEntered || null,
        notes: notes.trim() || null,
        created_by: user.id,
      };
      const { error } = await supabase.from('candidates').insert(payload);
      if (error) throw error;

      setAddMsg('Candidate added');

      // Clear fields
      setName('');
      setTitles('');
      setLaw('');
      setCity('');
      setState('');
      setYears('');
      setRecentYears('');
      setSalary('');
      setContract(false);
      setHourly('');
      setNotes('');
      // reset date picker back to "today"
      {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setDateEntered(`${yyyy}-${mm}-${dd}`);
      }
      await refreshMyRecent();
    } catch (e) {
      console.error(e);
      setAddMsg(`Database error adding candidate${e?.message ? `: ${e.message}` : ''}`);
    }
  }

  /* ---------- Client state & functions ---------- */
  const [cCountToday, setCCountToday] = React.useState(0);
  const [search, setSearch] = React.useState('');

  // dropdown ranges
  const [salaryRange, setSalaryRange] = React.useState(''); // "min-max" or "min-"
  const [yearsRange, setYearsRange] = React.useState('');   // "min-max" or "min-"
  const [contractOnly, setContractOnly] = React.useState(false);
  const [hourlyBillRange, setHourlyBillRange] = React.useState(''); // "25-50" ... "300-"

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

  // TODAY as plain local YYYY-MM-DD
  const todayStr = React.useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  React.useEffect(() => {
    if (user?.role !== 'client') return;
    (async () => {
      const { count } = await supabase
        .from('candidates')
        .select('id', { count: 'exact', head: true })
        .gte('date_entered', todayStr);
      setCCountToday(count || 0);
    })();
  }, [user, todayStr]);

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

  // Helpers
  function parseRange(val) {
    if (!val) return { min: null, max: null };
    const [minStr, maxStr] = val.split('-');
    const min = minStr ? Number(minStr) : null;
    const max = maxStr ? Number(maxStr) : null;
    return { min: Number.isFinite(min) ? min : null, max: Number.isFinite(max) ? max : null };
  }

  function billToRecruiterRange(val) {
    const r = parseRange(val);
    const k = 1.66; // bill = 1.66 * pay
    let min = null, max = null;
    i
