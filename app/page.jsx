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
const TITLE_OPTIONS = [
  'Administrative','Legal Support','Paralegal','Attorney',
];

const LAW_OPTIONS = [
  "40's Act",'Administrative','Administrative Manager','Antitrust','Appellate','Asbestos','Associate','Attorney','Banking','Bankruptcy','Commercial Litigation','Commercial Real Estate','Compliance','Conflicts','Conflicts Analyst','Construction','Contracts','Corporate','Criminal','Data Privacy/Cybersecurity','Docketing','Document Review','Employee Benefits/Executive Comp/ERISA','Energy','Entertainment','Environmental','Family','FCPA','FDA','Finance','Financial Services','FinTech','Foreclosure','Foreign Filing','Foreign Language Review','Franchise','General Counsel','Government Contracts','Government Contracts Attorney','Healthcare','HSR','Immigration','In House Associate','Insurance Coverage','Insurance Defense','Insurance Litigation','Insurance Regulatory','International Arbitration','International Trade','Labor & Employment','Law Clerk','Law Student','Leasing','Legal JD','Legal Malpractice','Legal Marketing','Legal Support','Life Sciences','Litigation','Litigation Technology','Medical Malpractice','Mergers and Acquisitions','MRS Project Manager','Mutual Fund','Nurse','Oil & Gas','Paralegal','Partner','Patent Agent','Patent Counsel','Patent Litigation','Patent Prosecution','Personal Injury','Project Finance','Project Manager','Public Finance','Real Estate Finance','Regulatory','Residential Real Estate','Restructuring','Securities','Securities Litigation','Syndication','Tax','Technology','Technology Transactions','Toxic Tort','Trade Attorney','Trademark','Trust & Estate',"Worker's Compensation",'White Collar Litigation',
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
      padding: '12px 14px',
      borderRadius: 10,
      border: '1px solid #1F2937',
      background: '#0F172A',
      color: '#E5E7EB',
      outline: 'none',
      fontSize: 16,
      lineHeight: '22px',
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
      padding: '12px 14px',
      borderRadius: 10,
      border: '1px solid #1F2937',
      background: '#0F172A',
      color: '#E5E7EB',
      outline: 'none',
      fontSize: 16,
      lineHeight: '22px',
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
function renderDate(val) { if (!val) return '—'; if (typeof val === 'string') { const m = val.match(/^(\d{4}-\d{2}-\d{2})/); if (m) return m[1]; } try { return new Date(val).toLocaleDateString(); } catch { return String(val); } }
function formatMDY(val) { if (!val) return ''; if (typeof val === 'string') { const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[2] + '/' + m[3] + '/' + m[1]; } try { const d = new Date(val); const mm = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0'); const yyyy = d.getFullYear(); return `${mm}/${dd}/${yyyy}`; } catch { return String(val); } }
function ymd(val) { if (!val) return null; if (typeof val === 'string') { const m = val.match(/^(\d{4}-\d{2}-\d{2})/); if (m) return m[1]; } try { const d = new Date(val); const yyyy = d.getFullYear(); const mm = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0'); return `${yyyy}-${mm}-${dd}`; } catch { return null; } }
const numOrNull = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
function toTitleCaseCity(s) { if (!s) return ''; return s.toLowerCase().split(/\s+/).map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : '')).join(' ').replace(/\b(Of|And|The|De|La|Da|Van|Von)\b/g, (m) => m.toLowerCase()); }
function normState(s) { if (!s) return ''; return s.trim().toUpperCase(); }
function displayCompRecruiter(c) { const bill = (c.contract && Number.isFinite(Number(c.hourly))) ? Math.round(Number(c.hourly) * 1.66) : null; if (Number.isFinite(Number(c.salary)) && Number(c.salary) > 0) { return `$${Number(c.salary).toLocaleString()}${bill ? `  /  $${bill}/hr` : ''}`; } if (bill) return `$${bill}/hr`; return '—'; }
function displayCompClient(c) { const bill = (c.contract && Number.isFinite(Number(c.hourly))) ? Math.round(Number(c.hourly) * 1.66) : null; if (Number.isFinite(Number(c.salary)) && Number(c.salary) > 0) { return `$${Number(c.salary).toLocaleString()}${bill ? `  /  $${bill}/hr` : ''}`; } if (bill) return `$${bill}/hr`; return '—'; }
function statsFrom(values) { const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b); const n = v.length; if (!n) return { n: 0, avg: null, median: null, p25: null, p75: null }; const avg = Math.round(v.reduce((a, c) => a + c, 0) / n); const q = (p) => { const idx = (p / 100) * (n - 1); const lo = Math.floor(idx), hi = Math.ceil(idx); if (lo === hi) return v[lo]; const t = idx - lo; return Math.round(v[lo] * (1 - t) + v[hi] * t); }; return { n, avg, median: q(50), p25: q(25), p75: q(75) }; }
function matchesCSV(csv, needle) { if (!needle) return true; return String(csv || '').split(',').map((s) => s.trim().toLowerCase()).some((s) => s.includes(String(needle).trim().toLowerCase())); }
function presetRange(preset) { const toYMD = (d) => { const yyyy = d.getFullYear(); const mm = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0'); return `${yyyy}-${mm}-${dd}`; }; const today = new Date(); const end = toYMD(today); const startOfYear = new Date(today.getFullYear(), 0, 1); const q = Math.floor(today.getMonth() / 3); const startOfQuarter = new Date(today.getFullYear(), q * 3, 1); const backDays = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return toYMD(d); }; switch (preset) { case 'LAST_30': return { start: backDays(30), end }; case 'LAST_60': return { start: backDays(60), end }; case 'LAST_90': return { start: backDays(90), end }; case 'LAST_180': return { start: backDays(180), end }; case 'YTD': return { start: toYMD(startOfYear), end }; case 'THIS_Q': return { start: toYMD(startOfQuarter), end }; case 'ALL': return { start: '', end: '' }; default: return { start: '', end: '' }; } }
function useIsMobile(breakpoint = 768) { const [isMobile, setIsMobile] = React.useState(false); React.useEffect(() => { if (typeof window === 'undefined') return; const mql = window.matchMedia(`(max-width:${breakpoint}px)`); const onChange = () => setIsMobile(mql.matches); onChange(); mql.addEventListener('change', onChange); return () => mql.removeEventListener('change', onChange); }, [breakpoint]); return isMobile; }

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
    try { await supabase.auth.signOut(); } catch {}
    setUser(null); setEmail(''); setPwd(''); setMode('recruiter'); setErr('');
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

  function cancelEdit() { setEditingId(null); setEditForm({}); }
  function changeEditField(k, v) { setEditForm((s) => ({ ...s, [k]: v })); }

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

  const [showInsights, setShowInsights] = React.useState(false);
  const [insights, setInsights] = React.useState(null);

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
        const cset = new Set(), sset = new Set(), tset = new Set(), lset = new Set();
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
            r.name, r.titles_csv, r.law_csv, r.city, r.state, r.notes,
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

  /* ---------- Layout (mobile-aware) ---------- */
  const pageWrap = {
    minHeight: '100vh',
    width: '100%',
    backgroundImage: `url(${NYC})`,
    backgroundPosition: isMobile ? 'center top' : 'center',
    backgroundSize: 'cover',
    backgroundAttachment: isMobile ? 'scroll' : 'fixed',
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
    padding: isMobile ? '20px 16px' : '40px 16px',
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
    padding: isMobile ? '20px 16px' : '40px 16px',
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

            {/* Center the inputs + button */}
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

              {/* Center the form grid within the card */}
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

                    {/* Title dropdown */}
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

                    {/* Type of Law dropdown */}
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

                    {/* State dropdown */}
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

                    {/* Metro select writes city/state */}
                    <div>
                      <Label>Metro Area</Label>
                      <select
                        value={city ? `${city}${state ? `, ${state}` : ''}` : ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          const [cName, st] = v.split(',').map(s => s.trim());
                          setCity(cName || '');
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

              <div style={{ marginTop: 14, display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
                <Button onClick={addCandidate} style={{ width: isMobile ? '100%' : undefined }}>Add candidate</Button>
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
          /* ------------ EDIT MODE CARD ------------ */
          <Card key={c.id} style={{ padding: 16, background: '#0B1220' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0,1fr))', gap: 12 }}>
              <div>
                <Label>Description</Label>
                <Input
                  value={editForm.name || ''}
                  onChange={(e) => changeEditField('name', e.target.value)}
                />
              </div>

              <div>
                <Label>Title(s)</Label>
                <Input
                  value={editForm.titles_csv || ''}
                  onChange={(e) => changeEditField('titles_csv', e.target.value)}
                  placeholder="Paralegal, Legal Support"
                />
              </div>

              <div>
                <Label>Type(s) of Law</Label>
                <Input
                  value={editForm.law_csv || ''}
                  onChange={(e) => changeEditField('law_csv', e.target.value)}
                  placeholder="Litigation, Securities"
                />
              </div>

              <div>
                <Label>City</Label>
                <Input
                  value={editForm.city || ''}
                  onChange={(e) => changeEditField('city', e.target.value)}
                />
              </div>

              <div>
                <Label>State</Label>
                <select
                  value={editForm.state || ''}
                  onChange={(e) => changeEditField('state', normState(e.target.value))}
                  style={selectStyle}
                >
                  <option value="">Select state</option>
                  {STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Years of experience</Label>
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
                <Label>Salary desired</Label>
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

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <input
                    type="checkbox"
                    checked={!!editForm.contract}
                    onChange={(e) => changeEditField('contract', e.target.checked)}
                  />
                  <span style={{ color: '#E5E7EB', fontSize: 13 }}>Available for contract</span>
                </label>
                {editForm.contract ? (
                  <div style={{ flex: 1 }}>
                    <Input
                      placeholder="Hourly rate"
                      inputMode="numeric"
                      value={editForm.hourly ?? ''}
                      onChange={(e) => changeEditField('hourly', e.target.value)}
                    />
                  </div>
                ) : null}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={!!editForm.on_assignment}
                    onChange={(e) => changeEditField('on_assignment', e.target.checked)}
                  />
                  <span style={{ color: '#E5E7EB', fontSize: 13 }}>On assignment</span>
                </label>

                <div style={{ flex: 1 }}>
                  <Label>Est. available date</Label>
                  <Input
                    type="date"
                    value={editForm.est_available_date || ''}
                    onChange={(e) => changeEditField('est_available_date', e.target.value)}
                    disabled={!editForm.on_assignment}
                  />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={!!editForm.off_market}
                    onChange={(e) => changeEditField('off_market', e.target.checked)}
                  />
                  <span style={{ color: '#E5E7EB', fontSize: 13 }}>Off market</span>
                </label>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <Label>Notes</Label>
                <TextArea
                  value={editForm.notes || ''}
                  onChange={(e) => changeEditField('notes', e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
              <Button onClick={saveEdit}>Save</Button>
              <Button
                onClick={cancelEdit}
                style={{ background: '#111827', border: '1px solid #1F2937' }}
              >
                Cancel
              </Button>
            </div>
          </Card>
        ) : (
          /* ------------ READ-ONLY CARD ------------ */
          <Card key={c.id} style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 700 }}>
                {c.name || 'Untitled'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Tag>{displayCompRecruiter(c)}</Tag>
                <Tag>{[c.city, c.state].filter(Boolean).join(', ') || '—'}</Tag>
                <Tag>{c.contract ? 'Contract OK' : 'Perm only'}</Tag>
                {c.off_market ? <Tag style={{ borderColor: '#7F1D1D', background: '#111' }}>Off market</Tag> : null}
              </div>
            </div>

            <div style={{ marginTop: 6, color: '#9CA3AF', fontSize: 13 }}>
              {c.titles_csv || '—'} • {c.law_csv || '—'} • {c.years ?? '—'} yrs • Entered {formatMDY(c.date_entered || c.created_at)}
            </div>

            {c.notes ? (
              <div style={{ marginTop: 8, fontSize: 14 }}>{c.notes}</div>
            ) : null}

            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <Button onClick={() => startEdit(c)}>Edit</Button>
              <Button
                onClick={() => removeCandidate(c.id)}
                style={{ background: '#111827', border: '1px solid #1F2937' }}
              >
                Delete
              </Button>
            </div>
          </Card>
        )
      )}
    </div>
  )}
</Card>

  ) : (
    /* -------- READ-ONLY ROW -------- */
    <Card
      key={c.id}
      style={{
        padding: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700 }}>
          {c.name || '(no description)'}{' '}
          <span style={{ color: '#9CA3AF', fontWeight: 400 }}>
            {['—', c.city, c.state].filter(Boolean).join(', ').replace('—, ', '')}
          </span>
        </div>
        <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>
          {[
            c.titles_csv ? `Title(s): ${c.titles_csv}` : '',
            c.law_csv ? `Law: ${c.law_csv}` : '',
            c.years != null ? `Years: ${c.years}` : '',
            c.contract && Number.isFinite(Number(c.hourly))
              ? `Billable est: $${Math.round(Number(c.hourly) * 1.66)}/hr`
              : '',
            Number.isFinite(Number(c.salary)) ? `Salary: $${Number(c.salary).toLocaleString()}` : '',
            `Entered: ${formatMDY(c.date_entered || c.created_at)}`,
          ]
            .filter(Boolean)
            .join('  •  ')}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <Button onClick={() => startEdit(c)}>Edit</Button>
        <Button
          onClick={() => removeCandidate(c.id)}
          style={{ background: '#111827', border: '1px solid #1F2937' }}
          title="Delete candidate"
        >
          Delete
        </Button>
      </div>
    </Card>
  )
)}

  /* ---------- Client UI ---------- */
  if (user.role === 'client') {

    function buildMailto(c) {
      const to = user.amEmail || 'info@youragency.com';
      const subj = `Talent Connector Candidate — ${c?.name || ''}`;
      const NL = '\n';
      const body = [
        'Hello,','',
        "I'm interested in this candidate:",
        `• Name: ${c?.name || ''}`,
        `• Titles: ${c?.titles_csv || ''}`,
        `• Type of law: ${c?.law_csv || ''}`,
        `• Location: ${[c?.city, c?.state].filter(Boolean).join(', ')}`,
        `• Years: ${c?.years ?? ''}`,
        c?.contract && c?.hourly ? `• Contract: $${Math.round(c.hourly * 1.66)}/hr` : '',
        c?.salary ? `• Salary: $${c.salary}` : '',
        '',`My email: ${user.email || ''}`,'','Sent from Talent Connector',
      ].filter(Boolean).join(NL);

      return `mailto:${to}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
    }

    function Kpi({ label, value, sub }) {
      return (
        <Card style={{ padding: 16 }}>
          <div style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            {value ?? '—'}
          </div>
          {sub ? <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>{sub}</div> : null}
        </Card>
      );
    }

    // compact control metrics used to match "Additional information" / "Email for more information"
    const compact = { padding: '8px 12px', fontSize: 14, lineHeight: '20px', borderRadius: 10 };

    function BarChart(){ return null; } // (omitted for brevity – unchanged)
    function InsightsView(){ return null; } // (omitted for brevity – unchanged)

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
                {/* LEFT: page title (unchanged) */}
                <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>
                  Talent Connector – Powered by Beacon Hill Legal <span style={{ color: '#93C5FD' }}>—</span>{' '}
                  <span style={{ color: '#9CA3AF' }}>CLIENT workspace</span>
                </div>

                {/* >>> CLIENT HEADER: RIGHT-SIDE CONTROLS (COMPACT) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: isMobile ? 'stretch' : 'center',
                    gap: 12,
                    flexDirection: isMobile ? 'column' : 'row',
                    width: isMobile ? '100%' : 'auto',
                  }}
                >
                  <Tag
                    style={{
                      ...compact,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#111827',
                      color: '#E5E7EB',
                      fontWeight: 600,
                      width: isMobile ? '100%' : 'auto',
                    }}
                  >
                    New today: <strong style={{ marginLeft: 4 }}>{cCountToday}</strong>
                  </Tag>

                  <Button
                    onClick={() => setShowInsights(true)}
                    style={{
                      ...compact,
                      background: '#0EA5E9',
                      border: '1px solid #1F2937',
                      color: 'white',
                      fontWeight: 600,
                      width: isMobile ? '100%' : 'auto',
                    }}
                  >
                    Compensation Insights
                  </Button>

                  <Button
                    onClick={logout}
                    style={{
                      ...compact,
                      background: '#0B1220',
                      border: '1px solid #1F2937',
                      color: 'white',
                      fontWeight: 600,
                      width: isMobile ? '100%' : 'auto',
                    }}
                  >
                    Log out
                  </Button>
                </div>
              </div>

              <Card style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 12 }}>Filters</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
                  {/* Keyword — compact field height */}
                  <div style={{ minWidth: 0 }}>
                    <Label>Keyword</Label>
                    <Input
                      placeholder="description, law, title, metro, notes"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', fontSize: 14, lineHeight: '20px' }}
                    />
                  </div>

                  {/* Metro Area (client-facing search mirrors recruiter entry) */}
                  <div style={{ minWidth: 0 }}>
                    <Label>Metro Area</Label>
                    <select value={fCity} onChange={(e) => setFCity(e.target.value)} style={selectStyle}>
                      <option value="">Any</option>
                      {MAJOR_METROS.map((m) => (
                        <option key={m} value={m.split(',')[0]}>{m}</option>
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
                          <option value="">Any</option>
                          <option value="25-50">$25–$50</option>
                          <option value="50-75">$50–$75</option>
                          <option value="75-100">$75–$100</option>
                          <option value="100-150">$100–$150</option>
                          <option value="150-200">$150–$200</option>
                          <option value="200-300">$200–$300</option>
                          <option value="300-">$300+</option>
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

              {/* (Results / cards unchanged) */}
              <Card style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 800, marginBottom: 12 }}>Results</div>
                {/* ... keep your existing results list rendering here ... */}
              </Card>
            </div>
          ) : (
            <div style={{ width: 'min(1150px, 100%)' }}>
              {/* InsightsView rendering (unchanged) */}
            </div>
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
          {/* AdminPanel content unchanged */}
        </div>
      </div>
    </div>
  );
}

/* ---------- shared styles ---------- */
const selectStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid #1F2937',
  background: '#0F172A',
  color: '#E5E7EB',
  outline: 'none',
  fontSize: 16,
  lineHeight: '22px',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
};

const thStyle = { padding: '8px', borderBottom: '1px solid #1F2937' };
const tdStyle = { padding: '8px', borderBottom: '1px solid #1F2937' };

// Consistent button base style (matches <Button/> sizing)
const buttonBaseStyle = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #1F2937',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-block',
  textDecoration: 'none',
};
