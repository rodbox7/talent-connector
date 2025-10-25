'use client';
import React from 'react';
import { supabase } from '../lib/supabaseClient';

const NYC =
  'https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg';

// US states (2-letter)
const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

// Major US metros (alpha)
const MAJOR_METROS = [
  'Atlanta, GA','Austin, TX','Baltimore, MD','Birmingham, AL','Boston, MA',
  'Buffalo, NY','Charlotte, NC','Chicago, IL','Cincinnati, OH','Cleveland, OH',
  'Columbus, OH','Dallas–Fort Worth, TX','Denver, CO','Detroit, MI','Hartford, CT',
  'Honolulu, HI','Houston, TX','Indianapolis, IN','Jacksonville, FL','Kansas City, MO',
  'Las Vegas, NV','Los Angeles, CA','Louisville, KY','Memphis, TN','Miami, FL',
  'Milwaukee, WI','Minneapolis–St. Paul, MN','Nashville, TN','New Orleans, LA','New York City, NY',
  'Oklahoma City, OK','Orlando, FL','Philadelphia, PA','Phoenix, AZ','Pittsburgh, PA',
  'Portland, OR','Providence, RI','Raleigh–Durham, NC','Richmond, VA','Sacramento, CA',
  'Salt Lake City, UT','San Antonio, TX','San Diego, CA','San Francisco–Oakland, CA','San Jose, CA',
  'Seattle, WA','St. Louis, MO','Tampa–St. Petersburg, FL','Tucson, AZ','Washington, DC',
];

/* ---------- NEW: Title/Practice options ---------- */
// Role titles
const TITLE_OPTIONS = ['Administrative','Legal Support','Paralegal','Attorney'];

// Type of Law / Practice Areas
const LAW_OPTIONS = [
  "40's Act",'Administrative','Administrative Manager','Antitrust','Appellate','Asbestos','Associate','Attorney',
  'Banking','Bankruptcy','Commercial Litigation','Commercial Real Estate','Compliance','Conflicts','Conflicts Analyst',
  'Construction','Contracts','Corporate','Criminal','Data Privacy/Cybersecurity','Docketing','Document Review',
  'Employee Benefits/Executive Comp/ERISA','Energy','Entertainment','Environmental','Family','FCPA','FDA','Finance',
  'Financial Services','FinTech','Foreclosure','Foreign Filing','Foreign Language Review','Franchise','General Counsel',
  'Government Contracts','Government Contracts Attorney','Healthcare','HSR','Immigration','In House Associate',
  'Insurance Coverage','Insurance Defense','Insurance Litigation','Insurance Regulatory','International Arbitration',
  'International Trade','Labor & Employment','Law Clerk','Law Student','Leasing','Legal JD','Legal Malpractice',
  'Legal Marketing','Legal Support','Life Sciences','Litigation','Litigation Technology','Medical Malpractice',
  'Mergers and Acquisitions','MRS Project Manager','Mutual Fund','Nurse','Oil & Gas','Paralegal','Partner',
  'Patent Agent','Patent Counsel','Patent Litigation','Patent Prosecution','Personal Injury','Project Finance',
  'Project Manager','Public Finance','Real Estate Finance','Regulatory','Residential Real Estate','Restructuring',
  'Securities','Securities Litigation','Syndication','Tax','Technology','Technology Transactions','Toxic Tort',
  'Trade Attorney','Trademark','Trust & Estate',"Worker's Compensation",'White Collar Litigation',
];

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

// Format YYYY-MM-DD or date-ish to MM/DD/YYYY without timezone drift
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

// YYYY-MM-DD from date/ISO string (no tz drift)
function ymd(val) {
  if (!val) return null;
  if (typeof val === 'string') {
    const m = val.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  try {
    const d = new Date(val);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return null;
  }
}

// Numeric guard so NaN never hits the DB
const numOrNull = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Normalize "new york" -> "New York"
function toTitleCaseCity(s) {
  if (!s) return '';
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ')
    .replace(/\b(Of|And|The|De|La|Da|Van|Von)\b/g, (m) => m.toLowerCase());
}

// Normalize state to 2-letter uppercase
function normState(s) {
  if (!s) return '';
  return s.trim().toUpperCase();
}

function displayCompRecruiter(c) {
  const bill = (c.contract && Number.isFinite(Number(c.hourly)))
    ? Math.round(Number(c.hourly) * 1.66)
    : null;
  if (Number.isFinite(Number(c.salary)) && Number(c.salary) > 0) {
    return `$${Number(c.salary).toLocaleString()}${bill ? `  /  $${bill}/hr` : ''}`;
  }
  if (bill) return `$${bill}/hr`;
  return '—';
}

function displayCompClient(c) {
  const bill = (c.contract && Number.isFinite(Number(c.hourly)))
    ? Math.round(Number(c.hourly) * 1.66)
    : null;
  if (Number.isFinite(Number(c.salary)) && Number(c.salary) > 0) {
    return `$${Number(c.salary).toLocaleString()}${bill ? `  /  $${bill}/hr` : ''}`;
  }
  if (bill) return `$${bill}/hr`;
  return '—';
}

// Stats (avg/median/p25/p75) for a numeric array
function statsFrom(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  const n = v.length;
  if (!n) return { n: 0, avg: null, median: null, p25: null, p75: null };
  const avg = Math.round(v.reduce((a, c) => a + c, 0) / n);
  const q = (p) => {
    const idx = (p / 100) * (n - 1);
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return v[lo];
    const t = idx - lo;
    return Math.round(v[lo] * (1 - t) + v[hi] * t);
  };
  return { n, avg, median: q(50), p25: q(25), p75: q(75) };
}

// Substring match against CSV field (case-insensitive)
function matchesCSV(csv, needle) {
  if (!needle) return true;
  return String(csv || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .some((s) => s.includes(String(needle).trim().toLowerCase()));
}

// Compute YYYY-MM-DD date ranges for presets
function presetRange(preset) {
  const toYMD = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const today = new Date();
  const end = toYMD(today);

  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const q = Math.floor(today.getMonth() / 3);
  const startOfQuarter = new Date(today.getFullYear(), q * 3, 1);

  const backDays = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return toYMD(d);
  };

  switch (preset) {
    case 'LAST_30':  return { start: backDays(30),  end };
    case 'LAST_60':  return { start: backDays(60),  end };
    case 'LAST_90':  return { start: backDays(90),  end };
    case 'LAST_180': return { start: backDays(180), end };
    case 'YTD':      return { start: toYMD(startOfYear),  end };
    case 'THIS_Q':   return { start: toYMD(startOfQuarter), end };
    case 'ALL':      return { start: '', end: '' };
    default:         return { start: '', end: '' };
  }
}

// Hook: true when viewport <= breakpoint px
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(`(max-width:${breakpoint}px)`);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [breakpoint]);
  return isMobile;
}

/* ---------- Page ---------- */
export default function Page() {
  const isMobile = useIsMobile(768);

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
      off_market: !!row.off_market,
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
      if (String(editForm.city || '').trim() && !String(editForm.state || '').trim()) {
        alert('Please select a state for this city.');
        return;
      }
      const payload = {
        name: String(editForm.name || '').trim(),
        titles_csv: String(editForm.titles_csv || '').trim(),
        law_csv: String(editForm.law_csv || '').trim(),
        city: toTitleCaseCity(String(editForm.city || '').trim()),
        state: normState(String(editForm.state || '').trim()),
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
        est_available_date: editForm.on_assignment ? (editForm.est_available_date || null) : null,
        off_market: !!editForm.off_market,
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

    let query = supabase
      .from('candidates')
      .select(
        'id,name,titles_csv,law_csv,city,state,years,recent_role_years,salary,contract,hourly,date_entered,created_at,notes,on_assignment,est_available_date,off_market'
      )
      .order('created_at', { ascending: false })
      .limit(50);

    if (!((user.email || '').toLowerCase() === 'jdavid@bhsg.com')) {
      query = query.eq('created_by', user.id);
    }

    const { data, error } = await query;
    if (!error && data) setMyRecent(data);
    setLoadingList(false);
  }

  React.useEffect(() => {
    if (user?.role === 'recruiter') {
      refreshMyRecent();
    }
  }, [user?.id, user?.role]);

  async function addCandidate() {
    setAddMsg('');
    try {
      if (!user || user.role !== 'recruiter') {
        setAddMsg('You must be logged in as recruiter.');
        return;
      }
      if (city.trim() && !state.trim()) {
        setAddMsg('Please select a state for this city.');
        return;
      }
      const payload = {
        name: name.trim(),
        titles_csv: titles.trim(),
        law_csv: law.trim(),
        city: toTitleCaseCity(city.trim()),
        state: normState(state.trim()),
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
  const [salaryRange, setSalaryRange] = React.useState('');
  const [yearsRange, setYearsRange] = React.useState('');
  const [contractOnly, setContractOnly] = React.useState(false);
  const [hourlyBillRange, setHourlyBillRange] = React.useState('');
  const [showOffMarket, setShowOffMarket] = React.useState(false);

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

  // Insights filters (for KPI + charts)
  const [iTitle, setITitle] = React.useState('');
  const [iLaw, setILaw] = React.useState('');
  const [iCity, setICity] = React.useState('');
  const [iState, setIState] = React.useState('');
  const [iYearsRange, setIYearsRange] = React.useState('');
  const [iContractOnly, setIContractOnly] = React.useState(false);
  const [iPreset, setIPreset] = React.useState('LAST_180');
  const [iStartDate, setIStartDate] = React.useState('');
  const [iEndDate, setIEndDate] = React.useState('');
  React.useEffect(() => {
    const { start, end } = presetRange(iPreset);
    setIStartDate(start);
    setIEndDate(end);
  }, [iPreset]);

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

  function parseRange(val) {
    if (!val) return { min: null, max: null };
    const [minStr, maxStr] = val.split('-');
    const min = minStr ? Number(minStr) : null;
    const max = maxStr ? Number(maxStr) : null;
    return { min: Number.isFinite(min) ? min : null, max: Number.isFinite(max) ? max : null };
  }

  function billToRecruiterRange(val) {
    const r = parseRange(val);
    const k = 1.66;
    let min = null, max = null;
    if (r.min != null) min = Math.ceil(r.min / k);
    if (r.max != null) max = Math.floor(r.max / k);
    return { min, max };
  }

  // ---------- FETCH CLIENT ROWS ----------
  async function fetchClientRows() {
    try {
      setClientErr('');
      setClientLoading(true);
      setExpandedId(null);

      const { data, error } = await supabase
        .from('candidates')
        .select(
          'id,name,titles_csv,law_csv,city,state,years,salary,contract,hourly,date_entered,created_at,notes,on_assignment,est_available_date,off_market'
        )
        .limit(2000);

      if (error) throw error;

      const { min: salMin, max: salMax } = parseRange(salaryRange);
      const { min: yrsMin, max: yrsMax } = parseRange(yearsRange);
      const hrRecRange = billToRecruiterRange(hourlyBillRange);

      const term = (search || '').trim().toLowerCase();

      const rows = (data || []).filter((r) => {
        if (term) {
          const blob = [
            r.name,
            r.titles_csv,
            r.law_csv,
            r.city,
            r.state,
            r.notes,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!blob.includes(term)) return false;
        }

        if (!showOffMarket && r.off_market) return false;

        if (fCity && String(r.city || '') !== fCity) return false;
        if (fState && String(r.state || '') !== fState) return false;

        if (salMin != null || salMax != null) {
          const s = Number(r.salary);
          const has = Number.isFinite(s) && s > 0;
          if (!has) return false;
          if (salMin != null && s < salMin) return false;
          if (salMax != null && s > salMax) return false;
        }

        if (yrsMin != null || yrsMax != null) {
          const y = Number(r.years);
          if (!Number.isFinite(y)) return false;
          if (yrsMin != null && y < yrsMin) return false;
          if (yrsMax != null && y > yrsMax) return false;
        }

        if (contractOnly && !r.contract) return false;
        if (contractOnly && hourlyBillRange) {
          const h = Number(r.hourly);
          if (!(Number.isFinite(h) && h > 0)) return false;
          if (hrRecRange.min != null && h < hrRecRange.min) return false;
          if (hrRecRange.max != null && h > hrRecRange.max) return false;
        }

        return true;
      });

      const sorted = rows.sort((a, b) => {
        switch (sortBy) {
          case 'date_asc':
            return (ymd(a.date_entered || a.created_at) || '').localeCompare(
              ymd(b.date_entered || b.created_at) || ''
            );
          case 'salary_desc':
          case 'salary_asc': {
            const sa = Number(a.salary) || -Infinity;
            const sb = Number(b.salary) || -Infinity;
            return sortBy === 'salary_desc' ? sb - sa : sa - sb;
          }
          case 'hourly_desc':
          case 'hourly_asc': {
            const ha = a.contract && Number.isFinite(Number(a.hourly)) ? Math.round(Number(a.hourly) * 1.66) : -Infinity;
            const hb = b.contract && Number.isFinite(Number(b.hourly)) ? Math.round(Number(b.hourly) * 1.66) : -Infinity;
            return sortBy === 'hourly_desc' ? hb - ha : ha - hb;
          }
          case 'years_desc':
          case 'years_asc': {
            const ya = Number(a.years);
            const yb = Number(b.years);
            const A = Number.isFinite(ya) ? ya : -Infinity;
            const B = Number.isFinite(yb) ? yb : -Infinity;
            return sortBy === 'years_desc' ? B - A : A - B;
          }
          case 'date_desc':
          default:
            return (ymd(b.date_entered || b.created_at) || '').localeCompare(
              ymd(a.date_entered || a.created_at) || ''
            );
        }
      });

      setClientRows(sorted);
    } catch (e) {
      console.error(e);
      setClientErr('Failed to load candidates.');
    } finally {
      setClientLoading(false);
    }
  }

  function clearClientFilters() {
    setSearch('');
    setFCity('');
    setFState('');
    setFTitle('');
    setFLaw('');
    setSalaryRange('');
    setYearsRange('');
    setContractOnly(false);
    setHourlyBillRange('');
    setSortBy('date_desc');
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
  const overlayCentered = {
    minHeight: '100vh',
    width: '100%',
    backdropFilter: 'blur(1px)',
    background:
      'linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.36) 16%, rgba(0,0,0,0.42) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: isMobile ? '16px 12px' : '40px 16px',
  };

  const overlay = {
    minHeight: '100vh',
    width: '100%',
    backdropFilter: 'blur(1px)',
    background:
      'linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.36) 16%, rgba(0,0,0,0.42) 100%)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: isMobile ? '16px 12px' : '40px 16px',
  };

  /* ---------- Logged-out ---------- */
  if (!user) {
    return (
      <div style={pageWrap}>
        <div style={overlayCentered}>
          <Card style={{ width: 520, padding: 24 }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, letterSpacing: 0.3 }}>
              Talent Connector – Powered by Beacon Hill Legal
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>
              Invitation-only access
            </div>

            {/* Role tabs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginBottom: 16,
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

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '100%', maxWidth: 400 }}>
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div style={{ width: '100%', maxWidth: 400, marginTop: 10 }}>
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="your password"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                />
              </div>
              <div style={{ marginTop: 14, width: '100%', maxWidth: 400, display: 'flex', justifyContent: 'center' }}>
                <Button onClick={login} style={{ width: '100%' }}>
                  Log in
                </Button>
              </div>
            </div>

            {err ? (
              <div style={{ color: '#F87171', fontSize: 12, marginTop: 10 }}>{err}</div>
            ) : null}
          </Card>
        </div>
      </div>
    );
  }

  /* ---------- Recruiter UI ---------- */
  if (user.role === 'recruiter') {
    const isSuperRecruiter = (user.email || '').toLowerCase() === 'jdavid@bhsg.com';

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
                Talent Connector – Powered by Beacon Hill Legal <span style={{ color: '#93C5FD' }}>—</span>{' '}
                <span style={{ color: '#9CA3AF' }}>RECRUITER workspace</span>
              </div>
              <Button onClick={logout} style={{ background: '#0B1220', border: '1px solid #1F2937' }}>
                Log out
              </Button>
            </div>

            <Card style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 14 }}>Add candidate</div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: 980 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <Label>Description</Label>
                      <Input
                        placeholder="AM Law 100 Litigation Paralegal"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    {/* Title */}
                    <div>
                      <Label>Title</Label>
                      <select
                        value={titles}
                        onChange={(e) => setTitles(e.target.value)}
                        style={selectStyle}
                      >
                        <option value="">Select title</option>
                        {TITLE_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    {/* Type of Law */}
                    <div>
                      <Label>Type of Law</Label>
                      <select
                        value={law}
                        onChange={(e) => setLaw(e.target.value)}
                        style={selectStyle}
                      >
                        <option value="">Select type of law</option>
                        {LAW_OPTIONS.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>

                    {/* State */}
                    <div>
                      <Label>State</Label>
                      <select
                        value={state}
                        onChange={(e) => setState(normState(e.target.value))}
                        style={selectStyle}
                      >
                        <option value="">Select state</option>
                        {STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {/* Metro (writes both city & state) */}
                    <div>
                      <Label>Metro Area</Label>
                      <select
                        value={city ? `${city}${state ? `, ${state}` : ''}` : ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          const [c, st] = v.split(',').map(s => s.trim());
                          setCity(c || '');
                          setState(st || '');
                        }}
                        style={selectStyle}
                      >
                        <option value="">Select a metro</option>
                        {MAJOR_METROS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
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
                </div>
              </div>

              <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
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
              <div style={{ fontWeight: 800, marginBottom: 12 }}>
                {isSuperRecruiter ? 'All recent candidates (superuser)' : 'My recent candidates'}
              </div>

              {loadingList ? (
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>Loading…</div>
              ) : myRecent.length === 0 ? (
                <div style={{ fontSize: 14, color: '#9CA3AF' }}>No candidates yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {myRecent.map((c) =>
                    editingId === c.id ? (
                      // ---------- EDIT MODE ----------
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
                            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                            gap: 10,
                          }}
                        >
                          <div style={{ gridColumn: '1 / -1' }}>
                            <Label>Description</Label>
                            <Input
                              value={editForm.name || ''}
                              onChange={(e) => changeEditField('name', e.target.value)}
                            />
                          </div>

                          <div>
                            <Label>Title</Label>
                            <select
                              value={editForm.titles_csv || ''}
                              onChange={(e) => changeEditField('titles_csv', e.target.value)}
                              style={selectStyle}
                            >
                              <option value="">Select title</option>
                              {TITLE_OPTIONS.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <Label>Type of Law</Label>
                            <select
                              value={editForm.law_csv || ''}
                              onChange={(e) => changeEditField('law_csv', e.target.value)}
                              style={selectStyle}
                            >
                              <option value="">Select type of law</option>
                              {LAW_OPTIONS.map((l) => (
                                <option key={l} value={l}>{l}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <Label>Metro Area</Label>
                            <select
                              value={
                                editForm.city
                                  ? `${editForm.city}${editForm.state ? `, ${editForm.state}` : ''}`
                                  : ''
                              }
                              onChange={(e) => {
                                const [cName, st] = e.target.value.split(',').map((x) => x.trim());
                                changeEditField('city', cName || '');
                                changeEditField('state', st ? normState(st) : '');
                              }}
                              style={selectStyle}
                            >
                              <option value="">Select a metro</option>
                              {MAJOR_METROS.map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <Label>Years</Label>
                            <Input
                              inputMode="numeric"
                              value={editForm.years ?? ''}
                              onChange={(e) => changeEditField('years', e.target.value)}
                            />
                          </div>

                          <div>
                            <Label>Years in most recent job</Label>
                            <Input
                              inputMode="numeric"
                              value={editForm.recent_role_years ?? ''}
                              onChange={(e) => changeEditField('recent_role_years', e.target.value)}
                            />
                          </div>

                          <div>
                            <Label>Salary</Label>
                            <Input
                              inputMode="numeric"
                              value={editForm.salary ?? ''}
                              onChange={(e) => changeEditField('salary', e.target.value)}
                            />
                          </div>

                          <div>
                            <Label>Date entered</Label>
                            <Input
                              type="date"
                              value={editForm.date_entered || ''}
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
                                value={editForm.hourly ?? ''}
                                onChange={(e) => changeEditField('hourly', e.target.value)}
                              />
                            ) : null}
                          </div>

                          <div
                            style={{
                              gridColumn: '1 / -1',
                              display: 'flex',
                              gap: 16,
                              alignItems: 'center',
                              flexWrap: 'wrap',
                            }}
                          >
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <input
                                type="checkbox"
                                checked={!!editForm.off_market}
                                onChange={(e) => changeEditField('off_market', e.target.checked)}
                              />
                              <span style={{ color: '#E5E7EB', fontSize: 13 }}>Off The Market</span>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <input
                                type="checkbox"
                                checked={!!editForm.on_assignment}
                                onChange={(e) => changeEditField('on_assignment', e.target.checked)}
                                disabled={!!editForm.off_market}
                                title={editForm.off_market ? 'Disabled while Off The Market' : ''}
                              />
                              <span style={{ color: '#E5E7EB', fontSize: 13 }}>On Assignment</span>
                            </label>

                            {editForm.on_assignment && !editForm.off_market ? (
                              <div>
                                <Label>Estimated date available</Label>
                                <Input
                                  type="date"
                                  value={editForm.est_available_date || ''}
                                  onChange={(e) => changeEditField('est_available_date', e.target.value)}
                                />
                              </div>
                            ) : null}
                          </div>

                          <div style={{ gridColumn: '1 / -1' }}>
                            <Label>Notes</Label>
                            <TextArea
                              value={editForm.notes || ''}
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
                      // ---------- READ-ONLY ROW ----------
                      <div
                        key={c.id}
                        style={{
                          border: '1px solid #1F2937',
                          borderRadius: 12,
                          padding: 12,
                          background: '#0B1220',
                          display: 'grid',
                          gridTemplateColumns: isMobile
                            ? '1fr'
                            : '1.2fr 0.8fr 0.5fr 0.6fr 0.6fr 0.8fr auto',
                          gap: 10,
                          rowGap: isMobile ? 8 : 10,
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
                        <div style={{ color: '#E5E7EB' }}>{displayCompRecruiter(c)}</div>
                        <div style={{ color: '#9CA3AF' }}>
                          {formatMDY(c.date_entered || c.created_at)}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            gap: 8,
                            justifyContent: isMobile ? 'stretch' : 'flex-end',
                            flexDirection: isMobile ? 'column' : 'row',
                          }}
                        >
                          <Button
                            onClick={() => startEdit(c)}
                            style={{
                              background: '#111827',
                              border: '1px solid #1F2937',
                              width: isMobile ? '100%' : undefined,
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => removeCandidate(c.id)}
                            style={{
                              background: '#B91C1C',
                              border: '1px solid #7F1D1D',
                              width: isMobile ? '100%' : undefined,
                            }}
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
  } // end recruiter branch

  /* ---------- Client UI ---------- */
  if (user.role === 'client') {
    const buildMailto = (c) => {
      const to = user.amEmail || 'info@youragency.com';
      const subj = `Talent Connector Candidate — ${c?.name || ''}`;
      const NL = '\n';
      const body = [
        'Hello,',
        '',
        "I'm interested in this candidate:",
        `• Name: ${c?.name || ''}`,
        `• Titles: ${c?.titles_csv || ''}`,
        `• Type of law: ${c?.law_csv || ''}`,
        `• Location: ${[c?.city, c?.state].filter(Boolean).join(', ')}`,
        `• Years: ${c?.years ?? ''}`,
        c?.contract && c?.hourly ? `• Contract: $${Math.round(c.hourly * 1.66)}/hr` : '',
        c?.salary ? `• Salary: $${c.salary}` : '',
        '',
        `My email: ${user.email || ''}`,
        '',
        'Sent from Talent Connector',
      ].filter(Boolean).join(NL);

      return `mailto:${to}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
    };

    // KPI tile
    const Kpi = ({ label, value, sub }) => (
      <Card style={{ padding: 16 }}>
        <div style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>
          {value ?? '—'}
        </div>
        {sub ? <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>{sub}</div> : null}
      </Card>
    );

    // Insights helpers
    const groupAvg = (items, key, valueKey) => {
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
    };
    const _csvKey = (k) => k + '_one';
    const explodeCSVToRows = (items, csvKey) => {
      const rows = [];
      for (const it of items) {
        const raw = String(it[csvKey] || '').split(',').map(s => s.trim()).filter(Boolean);
        for (const r of raw) rows.push({ ...it, [_csvKey(csvKey)]: r });
      }
      return rows;
    };

    // Load Insights with filters + KPIs + DATE RANGE
    const loadInsights = async () => {
      try {
        const { data, error } = await supabase
          .from('candidates')
          .select('titles_csv,law_csv,city,state,years,salary,hourly,contract,date_entered,created_at')
          .limit(5000);
        if (error) throw error;

        const yrs = (r) => Number(r.years);
        const pass = (r) => {
          if (iTitle && !matchesCSV(r.titles_csv, iTitle)) return false;
          if (iLaw && !matchesCSV(r.law_csv, iLaw)) return false;
          if (iCity && String(r.city || '').trim() !== iCity.trim()) return false;
          if (iState && String(r.state || '').trim() !== iState.trim()) return false;
          if (iContractOnly && !r.contract) return false;

          const recency = ymd(r.date_entered) || ymd(r.created_at);
          if (iStartDate && (!recency || recency < iStartDate)) return false;
          if (iEndDate   && (!recency || recency > iEndDate))   return false;

          if (iYearsRange) {
            const [minStr, maxStr] = iYearsRange.split('-');
            const min = minStr ? Number(minStr) : null;
            const max = maxStr ? Number(maxStr) : null;
            const y = yrs(r);
            if (Number.isFinite(min) && !(Number.isFinite(y) && y >= min)) return false;
            if (Number.isFinite(max) && !(Number.isFinite(y) && y <= max)) return false;
          }
          return true;
        };

        const rows = (data || []).filter(pass).map((r) => {
          const h = Number(r.hourly);
          const billable = Number.isFinite(h) && h > 0 ? Math.round(h * 1.66) : null;
          return { ...r, hourly_billable: billable };
        });

        const salVals = rows
          .map(r => Number(r.salary))
          .filter(v => Number.isFinite(v) && v > 0);
        const salStats = statsFrom(salVals);

        const hourlyVals = rows
          .filter(r => r.contract)
          .map(r => Number(r.hourly_billable))
          .filter(v => Number.isFinite(v) && v > 0);
        const hourlyStats = statsFrom(hourlyVals);

        const titleRows = explodeCSVToRows(rows, 'titles_csv').map((r) => ({
          ...r,
          title_one: r[_csvKey('titles_csv')],
        }));

        const withCityState = rows.map((r) => ({
          ...r,
          city_full: [r.city, r.state].filter(Boolean).join(', '),
        }));

        const byTitleSalary = groupAvg(titleRows, 'title_one', 'salary');
        const byTitleHourly = groupAvg(titleRows, 'title_one', 'hourly_billable');
        const byCitySalary = groupAvg(withCityState, 'city_full', 'salary');
        const byCityHourly = groupAvg(withCityState, 'city_full', 'hourly_billable');

        const buckets = [
          { label: '0-2 yrs',  check: (y) => y >= 0 && y <= 2 },
          { label: '3-5 yrs',  check: (y) => y >= 3 && y <= 5 },
          { label: '6-10 yrs', check: (y) => y >= 6 && y <= 10 },
          { label: '11-20 yrs',check: (y) => y >= 11 && y <= 20 },
          { label: '21+ yrs',  check: (y) => y >= 21 },
        ];
        const yearsAgg = [];
        for (const b of buckets) {
          const vals = rows
            .map((r) => Number(r.salary))
            .filter((v, i) => {
              const y = Number(rows[i].years);
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
          kpi: { salary: salStats, hourly: hourlyStats },
          byTitleSalary,
          byTitleHourly,
          byCitySalary,
          byCityHourly,
          byYearsSalary: yearsAgg,
          sampleN: rows.length,
        });
        setShowInsights(true);
      } catch (e) {
        console.error(e);
        alert('Failed to load insights.');
      }
    };

    const BarChart = ({ title, rows, money = true }) => {
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
    };

    const InsightsView = () => {
      if (!insights) return null;

      return (
        <div style={{ width: 'min(1150px, 100%)' }}>
          {/* Header with Back + Refresh */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>
              Compensation Insights <span style={{ color: '#93C5FD' }}>—</span>{' '}
              <span style={{ color: '#9CA3AF' }}>salary & hourly trends</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button
                onClick={() => setShowInsights(false)}
                style={{ background: '#0B1220', border: '1px solid #1F2937', width: isMobile ? '100%' : undefined }}
              >
                Back to Candidate Search
              </Button>
              <Button
                onClick={loadInsights}
                style={{ background: '#0EA5E9', border: '1px solid #1F2937', width: isMobile ? '100%' : undefined }}
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* Insights Filters */}
          <Card style={{ marginTop: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, minmax(0,1fr))', gap: 12 }}>
              <div>
                <Label>Title</Label>
                <select value={iTitle} onChange={(e)=>setITitle(e.target.value)} style={selectStyle}>
                  <option value="">Any</option>
                  {titleOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label>Type of Law</Label>
                <select value={iLaw} onChange={(e)=>setILaw(e.target.value)} style={selectStyle}>
                  <option value="">Any</option>
                  {lawOptions.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <Label>State</Label>
                <select value={iState} onChange={(e)=>setIState(e.target.value)} style={selectStyle}>
                  <option value="">Any</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>City</Label>
                <select value={iCity} onChange={(e)=>setICity(e.target.value)} style={selectStyle}>
                  <option value="">Any</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Years of experience</Label>
                <select value={iYearsRange} onChange={(e)=>setIYearsRange(e.target.value)} style={selectStyle}>
                  <option value="">Any</option>
                  <option value="0-2">0–2 years</option>
                  <option value="3-5">3–5 years</option>
                  <option value="6-10">6–10 years</option>
                  <option value="11-20">11–20 years</option>
                  <option value="21-">21+ years</option>
                </select>
              </div>

              <div>
                <Label>Date range</Label>
                <select value={iPreset} onChange={(e) => setIPreset(e.target.value)} style={selectStyle}>
                  <option value="LAST_30">Last 30 days</option>
                  <option value="LAST_60">Last 60 days</option>
                  <option value="LAST_90">Last 90 days</option>
                  <option value="LAST_180">Last 180 days</option>
                  <option value="YTD">Year to date</option>
                  <option value="THIS_Q">This quarter</option>
                  <option value="ALL">All time</option>
                </select>
              </div>

              <div style={{ display:'flex', alignItems:'end', gap:10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={iContractOnly} onChange={(e)=>setIContractOnly(e.target.checked)} />
                  <span style={{ color: '#E5E7EB', fontSize: 13 }}>Contract only</span>
                </label>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
              <Button onClick={loadInsights} style={{ background:'#0EA5E9', border:'1px solid #1F2937', width: isMobile ? '100%' : undefined }}>Apply</Button>
              <Button
                onClick={() => {
                  setITitle('');
                  setILaw('');
                  setIState('');
                  setICity('');
                  setIYearsRange('');
                  setIContractOnly(false);
                  setIPreset('LAST_180');
                }}
                style={{ background:'#111827', border:'1px solid #1F2937', width: isMobile ? '100%' : undefined }}
              >
                Clear
              </Button>
            </div>
          </Card>

          {/* KPI row */}
          {insights?.kpi ? (
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, minmax(0,1fr))', gap:12, marginTop:12 }}>
              <Kpi label="Avg Salary" value={insights.kpi.salary.avg ? `$${insights.kpi.salary.avg.toLocaleString()}` : '—'} sub={`Median $${insights.kpi.salary.median?.toLocaleString?.() || '—'}`} />
              <Kpi
                label="Typical Salary Range"
                value={(insights.kpi.salary.p25 && insights.kpi.salary.p75) ? `$${insights.kpi.salary.p25.toLocaleString()}–$${insights.kpi.salary.p75.toLocaleString()}` : '—'}
              />
              <Kpi label="Avg Billable Hourly" value={insights.kpi.hourly.avg ? `$${insights.kpi.hourly.avg.toLocaleString()}/hr` : '—'} sub={iContractOnly ? 'Contract filter on' : 'Contract roles only'} />
              <Kpi label="Sample Size" value={insights.sampleN} />
              <Kpi
                label="Filter"
                value={
                  [
                    iTitle,
                    iLaw,
                    [iCity, iState].filter(Boolean).join(', '),
                    (iStartDate || iEndDate)
                      ? `${formatMDY(iStartDate) || '…'} → ${formatMDY(iEndDate) || '…'}`
                      : null,
                    iContractOnly ? 'Contract only' : null,
                  ].filter(Boolean).join(' • ') || 'All'
                }
              />
            </div>
          ) : null}

          {/* Charts */}
          <BarChart title="Avg Salary by Title" rows={insights.byTitleSalary} money />
          <BarChart title="Avg Hourly (Billable) by Title" rows={insights.byTitleHourly} money />
          <BarChart title="Avg Salary by City" rows={insights.byCitySalary} money />
          <BarChart title="Avg Hourly (Billable) by City" rows={insights.byCityHourly} money />
          <BarChart title="Avg Salary by Years of Experience" rows={insights.byYearsSalary} money />
        </div>
      );
    };

    return (
      <div style={pageWrap}>
        <div style={overlay}>
          {!showInsights ? (
            <div style={{ width: 'min(1150px, 100%)' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: isMobile ? 'stretch' : 'center',
                  gap: 12,
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                  width: '100%',
                }}
              >
                <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>
                  Talent Connector – Powered by Beacon Hill Legal <span style={{ color: '#93C5FD' }}>—</span>{' '}
                  <span style={{ color: '#9CA3AF' }}>CLIENT workspace</span>
                </div>
                <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: 12, flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto' }}>
                  <Tag style={{ fontSize: 16, padding: '6px 12px' }}>
                    New today: <strong>{cCountToday}</strong>
                  </Tag>
                  <Button
                    onClick={loadInsights}
                    style={{ background: '#0EA5E9', border: '1px solid #1F2937', width: isMobile ? '100%' : undefined }}
                  >
                    Compensation Insights
                  </Button>
                  <Button onClick={logout} style={{ background: '#0B1220', border: '1px solid #1F2937', width: isMobile ? '100%' : undefined }}>
                    Log out
                  </Button>
                </div>
              </div>

              <Card style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 12 }}>Filters</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
                  <div style={{ minWidth: 0 }}>
                    <Label>Keyword</Label>
                    <Input
                      placeholder="description, law, title, city/state, notes"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
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

                  <div style={{ minWidth: 0 }}>
                    <Label>State</Label>
                    <select value={fState} onChange={(e) => setFState(e.target.value)} style={selectStyle}>
                      <option value="">Any</option>
                      {STATES.map((s) => (
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
                            opts.push({ label: `$${(start/1000).toFixed(0)}k–$${(end/1000).toFixed(0)}k`, value: `${start}-${end}` });
                          }
                        }
                        opts.push({ label: '$500k+', value: '500000-' });
                        return opts.map((o) => (
                          <option key={o.value || 'any-sal'} value={o.value}>
                            {o.label}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>

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
                        <option key={o.value || 'any-yrs'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Contract-only + Hourly Billable Range */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={contractOnly}
                        onChange={(e) => {
                          setContractOnly(e.target.checked);
                          if (!e.target.checked) setHourlyBillRange('');
                        }}
                      />
                      <span style={{ color: '#E5E7EB', fontSize: 13 }}>Only show available for contract</span>
                    </label>
                    {contractOnly ? (
                      <div style={{ flex: 1 }}>
                        <Label style={{ marginBottom: 4 }}>Hourly (billable)</Label>
                        <select
                          value={hourlyBillRange}
                          onChange={(e) => setHourlyBillRange(e.target.value)}
                          style={selectStyle}
                        >
                          {/* add any specific ranges you want */}
                          <option value="">Any</option>
                          <option value="50-100">$50–$100/hr</option>
                          <option value="100-150">$100–$150/hr</option>
                          <option value="150-200">$150–$200/hr</option>
                          <option value="200-">$200+/hr</option>
                        </select>
                      </div>
                    ) : null}
                  </div>

                  {/* Show off-market toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={showOffMarket}
                        onChange={(e) => setShowOffMarket(e.target.checked)}
                      />
                      <span style={{ color: '#E5E7EB', fontSize: 13 }}>
                        Show candidates no longer on the market
                      </span>
                    </label>
                  </div>

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

              <Card style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontWeight: 800 }}>Need a hand?</div>
                  <div style={{ color: '#CBD5E1', fontSize: 14, lineHeight: 1.4 }}>
                    If you aren’t finding what you’re looking for, we can help.
                  </div>
                  <a
                    href="https://bhsg.com/partner-with-us"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid #243041',
                      background: '#2563EB',
                      color: 'white',
                      fontWeight: 600,
                      textDecoration: 'none',
                      width: 'fit-content',
                    }}
                  >
                    Request our help with your search
                  </a>
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
                        {/* Off-market banner */}
                        {c.off_market ? (
                          <div
                            style={{
                              marginBottom: 8,
                              padding: '8px 10px',
                              borderRadius: 8,
                              background: '#7F1D1D',
                              border: '1px solid #B91C1C',
                              color: 'white',
                              fontWeight: 700,
                              fontSize: 13,
                            }}
                          >
                            Off The Market
                          </div>
                        ) : null}

                        {/* On assignment banner */}
                        {!c.off_market && c.on_assignment ? (
                          <div
                            style={{
                              marginBottom: 8,
                              padding: '8px 10px',
                              borderRadius: 8,
                              background: '#7F1D1D',
                              border: '1px solid #B91C1C',
                              color: 'white',
                              fontWeight: 700,
                              fontSize: 13,
                            }}
                          >
                            Currently on assignment — est. available {formatMDY(c.est_available_date) || 'TBD'}
                          </div>
                        ) : null}

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr 0.6fr 0.8fr auto',
                            gap: 10,
                            rowGap: isMobile ? 8 : 10,
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
                            {displayCompClient(c)}
                          </div>
                          <div style={{ color: '#9CA3AF' }}>
                            {formatMDY(c.date_entered || c.created_at)}
                          </div>
                          <div style={{ display: 'flex', gap: 8, justifyContent: isMobile ? 'stretch' : 'flex-end', flexDirection: isMobile ? 'column' : 'row' }}>
                            <Button
                              onClick={() => setExpandedId((id) => (id === c.id ? null : c.id))}
                              style={{ background: '#111827', border: '1px solid #1F2937', width: isMobile ? '100%' : undefined }}
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
                                width: isMobile ? '100%' : undefined,
                                textAlign: 'center',
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
              Talent Connector – Powered by Beacon Hill Legal <span style={{ color: '#93C5FD' }}>—</span>{' '}
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

  // Directory controls
  const [q, setQ] = React.useState('');
  const [editingId, setEditingId] = React.useState(null);
  const [editDraft, setEditDraft] = React.useState({ role: 'client', org: '', account_manager_email: '' });
  const [rowBusy, setRowBusy] = React.useState({}); // id -> boolean

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

  function toast(okMsg = '', errMsg = '') {
    if (okMsg) setFlash(okMsg);
    if (errMsg) setErr(errMsg);
    if (okMsg || errMsg) setTimeout(() => { setFlash(''); setErr(''); }, 2500);
  }

  async function invite() {
    setFlash('');
    setErr('');
    try {
      const em = (email || '').trim().toLowerCase();
      if (!em || !tempPw) {
        setErr('Email and temp password are required.');
        return;
      }
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: em,
          role,
          org: org.trim() || null,
          amEmail: (amEmail || '').trim() || null,
          password: tempPw,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErr(json?.error || 'Invite failed');
        return;
      }
      setEmail('');
      setRole('client');
      setOrg('');
      setAmEmail('');
      setTempPw('');
      toast(`Invited ${em} as ${role}`);
      await loadProfiles();
    } catch (e) {
      console.error(e);
      setErr('Server error inviting user.');
    }
  }

  function startEdit(row) {
    setEditingId(row.id);
    setEditDraft({
      role: row.role || 'client',
      org: row.org || '',
      account_manager_email: row.account_manager_email || '',
    });
  }
  function cancelEdit() {
    setEditingId(null);
    setEditDraft({ role: 'client', org: '', account_manager_email: '' });
  }
  function setBusy(id, v) {
    setRowBusy((s) => ({ ...s, [id]: !!v }));
  }

  async function saveEdit(id) {
    try {
      setBusy(id, true);
      const payload = {
        role: editDraft.role,
        org: (editDraft.org || '').trim() || null,
        account_manager_email: (editDraft.account_manager_email || '').trim() || null,
      };
      const { error } = await supabase.from('profiles').update(payload).eq('id', id);
      if (error) throw error;
      toast('Saved changes');
      await loadProfiles();
      cancelEdit();
    } catch (e) {
      console.error(e);
      setErr(e?.message || 'Update failed.');
    } finally {
      setBusy(id, false);
    }
  }

  async function resendInvite(row) {
    try {
      setBusy(row.id, true);
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: row.email,
          role: row.role,
          org: row.org || null,
          amEmail: row.account_manager_email || null,
          password: null,
          resend: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || 'Resend failed.');
      toast(`Resent invite to ${row.email}`);
    } catch (e) {
      console.error(e);
      setErr(e?.message || 'Resend failed.');
    } finally {
      setBusy(row.id, false);
    }
  }

  async function resetPassword(row) {
    try {
      const newPw = prompt('Set a new temporary password for this user (min 8 chars):');
      if (!newPw) return;
      if (newPw.length < 8) { alert('Password must be at least 8 characters.'); return; }
      setBusy(row.id, true);
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: row.email, password: newPw }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || 'Reset failed.');
      toast('Temporary password set');
    } catch (e) {
      console.error(e);
      setErr(e?.message || 'Password reset failed.');
    } finally {
      setBusy(row.id, false);
    }
  }

  async function deleteUser(row) {
    try {
      if (!confirm(`Delete user ${row.email}? This cannot be undone.`)) return;
      setBusy(row.id, true);
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || 'Delete failed.');
      toast(`Deleted ${row.email}`);
      await loadProfiles();
    } catch (e) {
      console.error(e);
      setErr(e?.message || 'Delete failed.');
    } finally {
      setBusy(row.id, false);
    }
  }

  const filtered = React.useMemo(() => {
    const s = (q || '').trim().toLowerCase();
    if (!s) return list;
    return list.filter((r) =>
      [r.email, r.org, r.account_manager_email].some((x) => (x || '').toLowerCase().includes(s))
    );
  }, [q, list]);

  return (
    <>
      {/* Invite */}
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

      {/* Directory */}
      <Card style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 800 }}>Directory</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              placeholder="Search email / org / sales contact"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: 300 }}
            />
            <Button onClick={loadProfiles} style={{ background: '#0EA5E9', border: '1px solid #1F2937' }}>
              Refresh
            </Button>
          </div>
        </div>

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
                  <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const busy = !!rowBusy[r.id];
                  const isEditing = editingId === r.id;
                  return (
                    <tr key={r.id}>
                      <td style={tdStyle}>{r.email}</td>
                      <td style={tdStyle}>
                        {isEditing ? (
                          <select
                            value={editDraft.role}
                            onChange={(e) => setEditDraft((s) => ({ ...s, role: e.target.value }))}
                            style={selectStyle}
                          >
                            <option value="client">Client</option>
                            <option value="recruiter">Recruiter</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          r.role
                        )}
                      </td>
                      <td style={tdStyle}>
                        {isEditing ? (
                          <Input
                            value={editDraft.org}
                            onChange={(e) => setEditDraft((s) => ({ ...s, org: e.target.value }))}
                          />
                        ) : (r.org || '—')}
                      </td>
                      <td style={tdStyle}>
                        {isEditing ? (
                          <Input
                            type="email"
                            value={editDraft.account_manager_email}
                            onChange={(e) => setEditDraft((s) => ({ ...s, account_manager_email: e.target.value }))}
                          />
                        ) : (r.account_manager_email || '—')}
                      </td>
                      <td style={tdStyle}>{new Date(r.created_at).toLocaleString()}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {!isEditing ? (
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <Button
                              onClick={() => startEdit(r)}
                              style={{ background: '#111827', border: '1px solid #1F2937' }}
                              disabled={busy}
                            >
                              Edit
                            </Button>
                            <Button
                              onClick={() => resendInvite(r)}
                              style={{ background: '#2563EB' }}
                              disabled={busy}
                            >
                              Resend invite
                            </Button>
                            <Button
                              onClick={() => resetPassword(r)}
                              style={{ background: '#0C4A6E' }}
                              disabled={busy}
                            >
                              Reset password
                            </Button>
                            <Button
                              onClick={() => deleteUser(r)}
                              style={{ background: '#B91C1C', border: '1px solid #7F1D1D' }}
                              disabled={busy}
                            >
                              Delete
                            </Button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <Button onClick={() => saveEdit(r.id)} disabled={busy}>Save</Button>
                            <Button
                              onClick={cancelEdit}
                              style={{ background: '#111827', border: '1px solid #1F2937' }}
                              disabled={busy}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ ...tdStyle, color: '#9CA3AF' }}>
                      No users found.
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
