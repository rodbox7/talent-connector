'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/* ---------- Constants ---------- */
const NYC =
  'https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg';

// ---------- METROS (single source of truth) ----------
const METROS = [
  'Atlanta, GA','Austin, TX','Baltimore, MD','Birmingham, AL','Boise, ID','Boston, MA',
  'Buffalo, NY','Burlington, VT','Charlotte, NC','Chicago, IL','Cincinnati, OH','Cleveland, OH',
  'Columbus, OH','Dallas–Fort Worth, TX','Denver, CO','Detroit, MI','Hartford, CT',
  'Honolulu, HI','Houston, TX','Indianapolis, IN','Jacksonville, FL','Kansas City, MO',
  'Las Vegas, NV','Los Angeles, CA','Louisville, KY','Memphis, TN','Miami, FL',
  'Milwaukee, WI','Minneapolis–St. Paul, MN','Nashville, TN','New Orleans, LA','New York City, NY',
  'Oklahoma City, OK','Orlando, FL','Philadelphia, PA','Phoenix, AZ','Pittsburgh, PA',
  'Portland, ME','Portland, OR','Providence, RI','Raleigh–Durham, NC','Richmond, VA','Sacramento, CA',
  'Salt Lake City, UT','San Antonio, TX','San Diego, CA','San Francisco–Oakland, CA','San Jose, CA',
  'Seattle, WA','St. Louis, MO','Tampa–St. Petersburg, FL','Tucson, AZ','Washington, DC'
];





// US states (2-letter)
const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DC','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

/* ---------- Canonical Metro formatter ---------- */
const WORD_SEP = /[–—-]/; // en dash, em dash, hyphen
const SMALL = new Set(['of','and','the','for','to','in','on','at','by']);

function titleCasePart(part = '') {
  return part
    .trim()
    .split(/\s+/)
    .map((w, i) => {
      const base = w.replace(/\.$/, '');
      const lw = base.toLowerCase();
      if (lw === 'st') return 'St.';   // St. Petersburg
      if (lw === 'ft') return 'Ft.';   // Ft. Lauderdale
      if (SMALL.has(lw) && i !== 0) return lw; // keep small words lower unless first
      return lw.replace(/(^[a-z])|([-'][a-z])/g, (m) => m.toUpperCase()); // O'Connor, McDonald
    })
    .join(' ');
}
function getMetroRaw(m) {
  if (typeof m === 'string') return m;
  return (m?.value ?? m?.metro ?? m?.label ?? m?.name ?? '').toString();
}

/* ---------- Disable metro reformatting ---------- */
function formatMetro(m) {
  return getMetroRaw(m);  // Show metros exactly as written in METROS[]
}



/* ---------- Title/Practice options (base lists) ---------- */
const TITLE_OPTIONS = [
  'Administrative','Legal Support','Paralegal','Attorney',
];
const LAW_OPTIONS = [
  "40's Act",'Administrative','Administrative Manager','Antitrust','Appellate','Asbestos','Associate','Attorney','Banking','Bankruptcy','Commercial Litigation','Commercial Real Estate','Compliance','Conflicts','Conflicts Analyst','Construction','Contracts','Corporate','Criminal','Data Privacy/Cybersecurity','Docketing','Document Review','Employee Benefits/Executive Comp/ERISA','Energy','Entertainment','Environmental','Family','FCPA','FDA','Finance','Financial Services','FinTech','Foreclosure','Foreign Filing','Foreign Language Review','Franchise','General Counsel','Government Contracts','Government Contracts Attorney','Healthcare','HSR','Immigration','In House Associate','Insurance Coverage','Insurance Defense','Insurance Litigation','Insurance Regulatory','International Arbitration','International Trade','Labor & Employment','Law Clerk','Law Student','Leasing','Legal JD','Legal Malpractice','Legal Marketing','Legal Support','Life Sciences','Litigation','Litigation Technology','Medical Malpractice','Mergers and Acquisitions','MRS Project Manager','Mutual Fund','Nurse','Oil & Gas','Paralegal','Partner','Patent Agent','Patent Counsel','Patent Litigation','Patent Prosecution','Personal Injury','Project Finance','Project Manager','Public Finance','Real Estate Finance','Regulatory','Residential Real Estate','Restructuring','Securities','Securities Litigation','Syndication','Tax','Technology','Technology Transactions','Toxic Tort','Trade Attorney','Trademark','Trust & Estate',"Worker's Compensation",'White Collar Litigation',
];

const LANGUAGE_OPTIONS = [
  'Arabic',
  'Chinese (Cantonese)',
  'Chinese (Mandarin)',
  'Czech',
  'Danish',
  'Dutch',
  'English',
  'Finnish',
  'Flemish',
  'French',
  'German',
  'Greek',
  'Haitian Creole',
  'Hebrew',
  'Hindi',
  'Indonesian',
  'Italian',
  'Japanese',
  'Korean',
  'Norwegian',
  'Portuguese',
  'Russian',
  'Spanish',
  'Swedish',
  'Thai',
  'Turkish',
  'Vietnamese',
];

const ASSIGNMENT_TIER_OPTIONS = [
  { label: '—', value: '' },
  { label: '5+ completed assignments', value: '5+' },
  { label: '10+ completed assignments', value: '10+' },
  { label: '15+ completed assignments', value: '15+' },
];




/* ---------- Small UI helpers ---------- */
const Card = ({ children, style }) => (
  <div
    style={{
      background: 'rgba(9,12,18,0.82)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset, 0 8px 30px rgba(0,0,0,0.45)',
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
      pointerEvents: 'auto',
      position: 'relative',
      zIndex: 11,
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
      pointerEvents: 'auto',
      position: 'relative',
      zIndex: 11,
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

function assignmentMedal(tier) {
  const t = String(tier || '').trim();
  if (t === '15+') return { icon: '🥇', label: '15+ completed assignments' };
  if (t === '10+') return { icon: '🥈', label: '10+ completed assignments' };
  if (t === '5+')  return { icon: '🥉', label: '5+ completed assignments' };
  return null;
}


function highlightKeywords(text, keywords) {
  if (!text || !keywords) return text;

  const terms = keywords
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t.length >= 3);

  if (terms.length === 0) return text;

  const escaped = terms.map(t =>
    t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );

  const regex = new RegExp(`(${escaped.join("|")})`, "gi");

  return text.split(regex).map((part, i) =>
    regex.test(part) ? (
      <span
        key={i}
       style={{
  backgroundColor: '#FDE047',     // bright yellow
  color: '#111827',               // dark text so it’s legible
  padding: '1px 4px',
  borderRadius: 4,
  fontWeight: 800,
}}

      >
        {part}
      </span>
    ) : (
      part
    )
  );
}

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
const numOrNull = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
function toTitleCaseCity(s) {
  if (!s) return '';
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ')
    .replace(/\b(Of|And|The|De|La|Da|Van|Von)\b/g, (m) => m.toLowerCase());
}
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
function matchesCSV(csv, needle) {
  if (!needle) return true;
  return String(csv || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .some((s) => s.includes(String(needle).trim().toLowerCase()));
}

// ⬇️ LANGUAGES HELPER
function matchesLangCSV(csv, needle) {
  if (!needle) return true;
  return String(csv || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .some((s) => s === String(needle).trim().toLowerCase());
}

// ⬇️ LICENSED STATES HELPER — NEW
function matchesStatesCSV(csv, needle) {
  if (!needle) return true;
  const n = String(needle).trim().toUpperCase();
  return String(csv || '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .some((s) => s === n);
}
// ⬆️ END OF NEW HELPER


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

/* =========================================================
   Page
   ========================================================= */
export default function Page() {
  const isMobile = useIsMobile(768);

  // ---- Auth user (required for search logging) ----
  const [authUser, setAuthUser] = useState(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('auth.getUser failed:', error);
        return;
      }
      if (alive) setAuthUser(data?.user || null);
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Helper to format metro names correctly
  function formatMetro(m) {

    const raw = getMetroRaw(m).trim();
    if (!raw) return '';
    return raw.split(WORD_SEP).map(titleCasePart).join('-');
  }


  // ---- Dynamic Metro options ----
  const [metrosList] = React.useState(METROS);

  // ---- Auth ----
  const [mode, setMode] = React.useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = React.useState('');
  const [pwd, setPwd] = React.useState('');
  const [err, setErr] = React.useState('');
  const [user, setUser] = React.useState(null);


  // ---- Saved Searches (client, read-only for now) ----
const [savedSearches, setSavedSearches] = React.useState([]);
const [savedSearchesLoading, setSavedSearchesLoading] = React.useState(false);
const [savedSearchesError, setSavedSearchesError] = React.useState('');

async function loadSavedSearches() {
  try {
    setSavedSearchesError('');
    setSavedSearchesLoading(true);

    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token;
    if (!token) return;

    const res = await fetch('/api/saved-searches/list', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Failed to load saved searches');

    setSavedSearches(json.searches || []);
  } catch (e) {
    setSavedSearchesError(e?.message || 'Failed to load saved searches');
  } finally {
    setSavedSearchesLoading(false);
  }
}

function applySavedSearch(filters = {}) {
  // Text / keyword
  setSearch(filters.search || '');

  // Location
  setFCity(filters.fCity || '');
  setFState(filters.fState || '');

  // Practice / role
  setFTitle(filters.fTitle || '');
  setFLaw(filters.fLaw || '');
  setFLang(filters.fLang || '');
  setFLicensedState(filters.fLicensedState || '');

  // Compensation
  setSalaryRange(filters.salaryRange || '');
  setYearsRange(filters.yearsRange || '');
  setHourlyBillRange(filters.hourlyBillRange || '');

  // Flags
  setContractOnly(!!filters.contractOnly);
  setShowOffMarket(!!filters.showOffMarket);

  // Sort
  setSortBy(filters.sortBy || 'date_desc');

  // Re-run the query
  fetchClientRows();
}
async function setAlertsEnabled(searchId, enabled) {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token;
    if (!token) throw new Error('Not authenticated');

    const res = await fetch('/api/saved-searches/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: searchId, enabled }),
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Failed to update alerts');

    await loadSavedSearches(); // refresh state
  } catch (e) {
    alert(e?.message || 'Failed to update alerts');
  }
}

async function saveCurrentSearch() {
  try {
    const name = prompt('Name this search');
    if (!name) return;

    const filters = {
      search,
      fCity,
      fState,
      fTitle,
      fLaw,
      fLang,
      fLicensedState,
      salaryRange,
      yearsRange,
      contractOnly,
      hourlyBillRange,
      showOffMarket,
      sortBy,
    };

    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token;
    if (!token) throw new Error('Not authenticated');

    const res = await fetch('/api/saved-searches/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, filters }),
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Failed to save search');

    await loadSavedSearches();
    alert('Search saved');
  } catch (e) {
    alert(e?.message || 'Failed to save search');
  }
}


async function deleteSavedSearch(id) {
  try {
    if (!confirm('Delete this saved search?')) return;

    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token;
    if (!token) throw new Error('Not authenticated');

    const res = await fetch('/api/saved-searches/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id }),
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Failed to delete search');

    await loadSavedSearches();
  } catch (e) {
    alert(e?.message || 'Failed to delete saved search');
  }
}




React.useEffect(() => {
  if (user?.role === 'client') {
    loadSavedSearches();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.role]);

   async function login() {
  try {
    setErr('');
    if (!email || !pwd) {
      setErr('Enter email & password.');
      return;
    }

    // 1️⃣ Auth sign-in
    const { data: auth, error: authErr } =
  await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: pwd,
  });

if (authErr) throw authErr;

// 🔴 THIS IS CRITICAL
await supabase.auth.refreshSession();


    const authUser = auth?.user;
    if (!authUser) {
      setErr('Login failed: no user returned from auth.');
      return;
    }

    // 2️⃣ Try to load profile (may be missing for older users)
    let { data: prof, error: profErr } = await supabase
      .from('profiles')
      .select('id,email,role,org,account_manager_email')
      .eq('id', authUser.id)
      .maybeSingle(); // returns null if no row

    if (profErr) {
      console.error('Error loading profile:', profErr);
    }

    // 3️⃣ If no profile row at all, create it using auth metadata
    if (!prof) {
      const meta = authUser.user_metadata || {};
      const roleFromMeta = meta.role || mode; // fall back to the tab they used

      const { data: inserted, error: insertErr } = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          email: authUser.email,
          role: roleFromMeta,
          org: meta.org || null,
          account_manager_email: meta.account_manager_email || null,
        })
        .select('id,email,role,org,account_manager_email')
        .single();

      if (insertErr) {
        console.error('Profile insert failed:', insertErr);
        setErr('Login ok, but could not create profile.');
        return;
      }

      prof = inserted;
    } else if (!prof.role || prof.role === '') {
      // 4️⃣ Profile exists but is missing fields — patch it
      const meta = authUser.user_metadata || {};

      const { error: patchErr } = await supabase
        .from('profiles')
        .update({
          role: prof.role || meta.role || 'client',
          org: prof.org ?? meta.org ?? null,
          account_manager_email:
            prof.account_manager_email ?? meta.account_manager_email ?? null,
        })
        .eq('id', authUser.id);

      if (patchErr) {
        console.error('Failed to patch profile:', patchErr);
      } else {
        // refresh in-memory copy if we patched
        prof = {
          ...prof,
          role: prof.role || meta.role || 'client',
          org: prof.org ?? meta.org ?? null,
          account_manager_email:
            prof.account_manager_email ?? meta.account_manager_email ?? null,
        };
      }
    }

   // 5️⃣ Enforce role vs tab selection
// Allow admins to use recruiter mode (super user), but keep other mismatches blocked.
const allowAdminInRecruiter = prof.role === 'admin' && mode === 'recruiter';

if (prof.role !== mode && !allowAdminInRecruiter) {
  setErr(`This account is a ${prof.role}. Switch to the ${prof.role} tab.`);
  return;
}


    // 6️⃣ Set logged-in user for the app
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
    setUser(null);
    setEmail('');
    setPwd('');
    setMode('recruiter');
    setErr('');
  }

  /* ---------- AI write-up state ---------- */
  const [aiWriting, setAiWriting] = React.useState(false);
  const [aiText, setAiText] = React.useState('');
  const [aiErr, setAiErr] = React.useState('');
  const [selectedCandidate, setSelectedCandidate] = React.useState(null);
  const [aiCandidateList, setAiCandidateList] = React.useState([]);

  // Load a small list of recent candidates for the AI selector (once on mount)
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('candidates')
          .select('id, name, titles_csv, law_csv, city, state, created_at')
          .order('created_at', { ascending: false })
          .limit(200);
        if (error) throw error;
        if (mounted) {
          setAiCandidateList(data || []);
        }
      } catch (e) {
        console.error('Error loading candidates for AI:', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function handleGenerateWriteup() {
    try {
      if (!selectedCandidate) {
        alert('Select a candidate first.');
        return;
      }
      setAiWriting(true);
      setAiErr('');
      setAiText('');

      // Send the full row; your /api/writeup can pick fields it needs
      const res = await fetch('/api/writeup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate: selectedCandidate }),
      });

      if (!res.ok) {
        const msg = `Request failed (${res.status})`;
        setAiErr(msg);
        alert(msg);
        return;
      }

      const data = await res.json();
      const text =
        (data && data.result) ||
        (data && data.text) ||
        (data && data.message) ||
        (typeof data === 'string' ? data : '');

      if (!text) {
        setAiErr('Empty response from AI.');
        alert('Empty response from AI.');
        return;
      }
      setAiText(text);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setAiErr(msg);
      alert('AI error: ' + msg);
    } finally {
      setAiWriting(false);
    }
  }

  /* ---------- Recruiter state ---------- */
  const [name, setName] = React.useState('');
  const [titles, setTitles] = React.useState('');
  const [law, setLaw] = React.useState('');
  const [languages, setLanguages] = React.useState([]);
  const [licensedStates, setLicensedStates] = React.useState([]);  // ⭐ NEW
  const [city, setCity] = React.useState('');
  const [state, setState] = React.useState('');
  const [years, setYears] = React.useState('');
  const [recentYears, setRecentYears] = React.useState('');
  const [salary, setSalary] = React.useState('');
  const [contract, setContract] = React.useState(false);
  const [completedAssignmentsTier, setCompletedAssignmentsTier] = React.useState('');
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

  // ⭐ NEW
  languages_csv: row.languages_csv || '',
  licensed_states_csv: row.licensed_states_csv || '',   // ⭐ NEW


  city: row.city || '',
  state: row.state || '',
  years: row.years ?? '',
  recent_role_years: row.recent_role_years ?? '',
  salary: row.salary ?? '',
  contract: !!row.contract,
  hourly: row.hourly ?? '',
  completed_assignments_tier: row.completed_assignments_tier || '',
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
  languages_csv: String(editForm.languages_csv || '').trim(), // ✅ NEW
  licensed_states_csv: String(editForm.licensed_states_csv || '').trim(), // ⭐ NEW
  city: String(editForm.city || '').trim(),
state: String(editForm.state || '').trim(),
  years: editForm.years === '' ? null : Number(editForm.years),
  recent_role_years:
    editForm.recent_role_years === '' ? null : Number(editForm.recent_role_years),
  salary: editForm.salary === '' ? null : Number(editForm.salary),
  contract: !!editForm.contract,
  completed_assignments_tier: !!editForm.contract
  ? (String(editForm.completed_assignments_tier || '').trim() || null)
  : null,
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

  const isSuper = (user.email || '').toLowerCase() === 'jdavid@bhsg.com';

  try {
    let query = supabase
  .from('candidates')
 .select(
  'id,name,titles_csv,law_csv,languages_csv,licensed_states_csv,city,state,years,recent_role_years,salary,contract,completed_assignments_tier,hourly,date_entered,created_at,notes,on_assignment,est_available_date,off_market,created_by'
)

  .order('created_at', { ascending: false });


    // Regular recruiters: only their own candidates
    if (!isSuper) {
      query = query.eq('created_by', user.id);
    }

    // Superuser: large limit so you effectively see "all"
    query = query.limit(isSuper ? 5000 : 50);

    const { data, error } = await query;
    if (error) throw error;

    if (data) setMyRecent(data);
  } catch (e) {
    console.error(e);
    // optional: surface an error message if you want
  } finally {
    setLoadingList(false);
  }
}

 React.useEffect(() => {
  if (user?.role === 'recruiter' || user?.role === 'admin') {
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
   // --- recruiter attribution (authoritative) ---
const { data: authData, error: authError } = await supabase.auth.getUser();
if (authError) console.error('auth.getUser failed:', authError);

const recruiterId = authData?.user?.id ?? null;
const recruiterEmail = authData?.user?.email ?? null;

let recruiterName = null;
let recruiterLinkedIn = null;


if (recruiterId) {
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('full_name,display_name,email,linkedin_url')
    .eq('id', recruiterId)
    .maybeSingle();

  if (profErr) console.error('profiles lookup failed:', profErr);

 recruiterName =
  profile?.full_name ||
  profile?.display_name ||
  profile?.email ||
  recruiterEmail;

  // ✅ ADD THIS LINE RIGHT HERE
  recruiterLinkedIn = profile?.linkedin_url || null;

} else {
  recruiterName = recruiterEmail;
  recruiterLinkedIn = null;
}



      const payload = {
  name: name.trim(),
  titles_csv: titles.trim(),
  law_csv: law.trim(),

  // recruiter attribution
  entered_by_email: recruiterEmail,
  entered_by_name: recruiterName,
  entered_by_linkedin_url: recruiterLinkedIn,


  // ⭐ NEW
  languages_csv: (languages || []).join(','),
  licensed_states_csv: (licensedStates || []).join(','),   // ⭐ NEW

  city: toTitleCaseCity(city.trim()),
  state: normState(state.trim()),
  years: numOrNull(years),
  recent_role_years: numOrNull(recentYears),
  salary: numOrNull(salary),
  contract: !!contract,
  completed_assignments_tier: contract ? (completedAssignmentsTier || null) : null,
  hourly: contract ? numOrNull(hourly) : null,
  date_entered: dateEntered || null,
  notes: notes.trim() || null,
  created_by: user.id,
};

      const { error } = await supabase.from('candidates').insert(payload);
      if (error) throw error;

      setAddMsg('Candidate added');

      // Reset form
      setName('');
      setTitles('');
      setLaw('');
      setCity('');
      setState('');
      setYears('');
      setRecentYears('');
      setSalary('');
      setContract(false);
      setCompletedAssignmentsTier('');
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
      // Also refresh client-side lists if needed (safe no-op for other roles)
      await loadClientCandidates();
    } catch (e) {
      console.error(e);
      setAddMsg(`Database error adding candidate${e?.message ? `: ${e.message}` : ''}`);
    }
  }

  /* ---------- Client state ---------- */
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
  const [titleOptions, setTitleOptions] = React.useState(TITLE_OPTIONS);
  const [lawOptions, setLawOptions] = React.useState(LAW_OPTIONS);

  const [fCity, setFCity] = React.useState('');
  const [fMetros, setFMetros] = React.useState([]); // multi-metro
  const [metroOpen, setMetroOpen] = React.useState(false); // ✅ STEP 1: dropdown open/close
  const metroRef = React.useRef(null); // ✅ STEP 1: ref for outside-click detection
  const [fState, setFState] = React.useState('');

 const [fTitle, setFTitle] = React.useState('');
const [fLaw, setFLaw] = React.useState('');
const [fLang, setFLang] = React.useState('');
const [fLicensedState, setFLicensedState] = React.useState('');

const [fLicensedStates, setFLicensedStates] = React.useState([]); // ✅ NEW
const [licensedOpen, setLicensedOpen] = React.useState(false);    // ✅ NEW
const licensedRef = React.useRef(null);                           // ✅ NEW

const [clientRows, setClientRows] = React.useState([]);
const [clientLoading, setClientLoading] = React.useState(false);
const [clientErr, setClientErr] = React.useState('');
const [expandedId, setExpandedId] = React.useState(null);


  const [showInsights, setShowInsights] = React.useState(false);
  const [insights, setInsights] = React.useState(null);

  const [iTitle, setITitle] = React.useState('');
  const [iLaw, setILaw] = React.useState('');
  const [iLang, setILang] = React.useState('');
  const [iLicensedState, setILicensedState] = React.useState('');  // ⭐ NEW
  const [iMetro, setIMetro] = React.useState('');
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

  // Count new today for clients
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

// ✅ Close Metro dropdown only when clicking OUTSIDE the metro control
React.useEffect(() => {
  function onMouseDown(e) {
    if (!metroOpen) return;
    if (!metroRef.current) return;

    if (!metroRef.current.contains(e.target)) {
      setMetroOpen(false);
    }
  }

  document.addEventListener('mousedown', onMouseDown);
  return () => document.removeEventListener('mousedown', onMouseDown);
}, [metroOpen]);

// ✅ Close Licensed In dropdown only when clicking OUTSIDE the licensed control
React.useEffect(() => {
  function onMouseDown(e) {
    if (!licensedOpen) return;
    if (!licensedRef.current) return;

    if (!licensedRef.current.contains(e.target)) {
      setLicensedOpen(false);
    }
  }

  document.addEventListener('mousedown', onMouseDown);
  return () => document.removeEventListener('mousedown', onMouseDown);
}, [licensedOpen]);



  // Loader for client-facing options and searchable list population
  const loadClientCandidates = React.useCallback(async () => {
    try {
    const { data, error } = await supabase
  .from('candidates')
  .select(`
  id,
  name,
  titles_csv,
  law_csv,
  languages_csv,
  licensed_states_csv,
  city,
  state,
  years,
  salary,
  hourly,
  contract,
  completed_assignments_tier,
  date_entered,
  created_at,
  notes,
  entered_by_name,
  entered_by_email,
  entered_by_linkedin_url,
  on_assignment,
  est_available_date,
  off_market,
  created_by
`)

.limit(5000);


  console.log('CLIENT CANDIDATE SAMPLE:', data?.[0]);




      if (error) throw error;

      const rows = data || [];

      // Cities (display as "City, ST") from rows + METROS fallback
      const setC = new Set(
        rows
          .map((r) => [r.city, r.state].filter(Boolean).join(', '))
          .filter((s) => s && s.includes(','))
      );
      METROS.forEach((m) => setC.add(m));
      const cityList = Array.from(setC).sort((a, b) => a.localeCompare(b));

      // States from data + STATES fallback
      const setS = new Set(rows.map((r) => (r.state || '').trim()).filter(Boolean));
      STATES.forEach((s) => setS.add(s));
      const stateList = Array.from(setS).sort();

      // Titles and Law: merge constants with any values found in CSVs
      const foundTitles = new Set(TITLE_OPTIONS);
      const foundLaw = new Set(LAW_OPTIONS);
      rows.forEach((r) => {
        String(r.titles_csv || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((t) => foundTitles.add(t));
        String(r.law_csv || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((l) => foundLaw.add(l));
      });

      setCities(cityList);
      setStates(stateList);
      setTitleOptions(Array.from(foundTitles).sort((a, b) => a.localeCompare(b)));
      setLawOptions(Array.from(foundLaw).sort((a, b) => a.localeCompare(b)));

      // A friendly alert the first time (per your preference)
      alert('Loaded ' + rows.length + ' candidates');
    } catch (err) {
      console.error('Error loading client candidate list:', err?.message || err);
    }
  }, []);

  // Run once when role flips to client
  React.useEffect(() => {
    if (user?.role !== 'client') return;
    loadClientCandidates();
  }, [user?.role, loadClientCandidates]);

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
  'id,name,titles_csv,law_csv,languages_csv,licensed_states_csv,city,state,years,salary,contract,hourly,completed_assignments_tier,date_entered,created_at,notes,on_assignment,est_available_date,off_market,entered_by_name,entered_by_email,entered_by_linkedin_url'
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
          ].filter(Boolean).join(' ').toLowerCase();
          if (!blob.includes(term)) return false;
        }
        if (!showOffMarket && r.off_market) return false;

       // ✅ Metro (multi-select OR logic)
      // If fMetros has selections, use OR-matching against "City, ST"
        if (Array.isArray(fMetros) && fMetros.length > 0) {
        const candidateMetro = `${r.city || ''}${r.state ? `, ${r.state}` : ''}`;
        if (!fMetros.includes(candidateMetro)) return false;
        } else {
        // Backwards-compatible single selection
        if (fCity && `${r.city || ''}${r.state ? `, ${r.state}` : ''}` !== fCity) return false;
}

        if (fState && String(r.state || '') !== fState) return false;
        if (fTitle && !matchesCSV(r.titles_csv, fTitle)) return false;
        if (fLaw && !matchesCSV(r.law_csv, fLaw)) return false;
        if (fLang && !matchesLangCSV(r.languages_csv, fLang)) return false;
        // ✅ Licensed In (multi-select OR logic)
if (Array.isArray(fLicensedStates) && fLicensedStates.length > 0) {
  const ok = fLicensedStates.some((st) => matchesStatesCSV(r.licensed_states_csv, st));
  if (!ok) return false;
} else {
  if (fLicensedState && !matchesStatesCSV(r.licensed_states_csv, fLicensedState)) return false;
}




        


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
// --- Log client search to search_logs ---
try {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) console.warn('getUser error:', userErr);

  await supabase.from('search_logs').insert([
    {
      metro: fCity || null,
      title: fTitle || null,
      type_of_law: fLaw || null,
      user_email: user?.email || null,
      created_at: new Date().toISOString(),
    },
  ]);
} catch (err) {
  console.error('Search log insert failed:', err);
}



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
  setFMetros([]); // clear multi-metro
  setFState('');
  setFTitle('');
  setFLaw('');
  setFLang('');
  setFLicensedStates([]); // ✅ clear multi-licensed
  setFLicensedState('');  // backward-compatible single
  setLicensedOpen(false); // close dropdown
  setSalaryRange('');
  setYearsRange('');
  setContractOnly(false);
  setHourlyBillRange('');
  setSortBy('date_desc');

  fetchClientRows(); // ✅ keep this LAST
}



  /* ---------- Logged-out ---------- */
  const pageWrap = {
  minHeight: '100vh',
  width: '100%',
  backgroundImage: (!user && !isMobile) ? `url(${NYC})` : 'none',
backgroundColor: user ? '#E9F3FC' : (isMobile ? '#fff' : 'transparent'),



  backgroundPosition: isMobile ? 'center top' : 'center',
  backgroundSize: 'cover',
  backgroundAttachment: isMobile ? 'scroll' : 'fixed',

  // Critical for mobile
  overflowX: 'hidden',
};

  const overlayCentered = {
  minHeight: '100vh',
  width: '100%',
  backdropFilter: isMobile ? 'none' : 'blur(1px)',
  background: isMobile
    ? '#fff'
    : 'linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.36) 16%, rgba(0,0,0,0.42) 100%)',
  display: 'flex',

  // Key change: stop "modal centering" on mobile
  alignItems: isMobile ? 'flex-start' : 'center',

  justifyContent: 'center',
  padding: isMobile ? '12px' : '40px 16px',
  boxSizing: 'border-box',
};

  const overlay = {
  minHeight: '100vh',
  width: '100%',
  maxWidth: '100%',
  overflowX: 'hidden',
  boxSizing: 'border-box',

  // ✅ After login: do NOT darken/tint the background
  backdropFilter: (user || isMobile) ? 'none' : 'blur(1px)',
  background: user
    ? 'transparent'
    : (isMobile
        ? 'transparent'
        : 'linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.36) 16%, rgba(0,0,0,0.42) 100%)'),

  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: isMobile ? '20px 16px' : '40px 16px',
};

  if (!user) {
    return (
      <div style={pageWrap}>
        <div style={overlayCentered}>
         <Card
  style={{
    width: '100%',
    maxWidth: isMobile ? '100%' : 520,
    padding: isMobile ? '14px' : 24,
    borderRadius: isMobile ? 12 : 16,
  }}
>


           <div
  style={{
    fontSize: isMobile ? 16 : 18,
    fontWeight: 800,
    marginBottom: isMobile ? 8 : 10,
    letterSpacing: 0.3,
    lineHeight: 1.2,
  }}
>

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
              <div
  style={{
    width: '100%',
    maxWidth: isMobile ? '100%' : 400,
  }}
>

               <div style={{ width: '100%', maxWidth: isMobile ? '100%' : 400 }}>
  <Label>Email</Label>
  <Input
    type="email"
    placeholder="name@company.com"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    style={{
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
    }}
  />
</div>


               <div style={{ width: '100%', maxWidth: isMobile ? '100%' : 400, marginTop: 10 }}>
  <Label>Password</Label>
  <Input
    type="password"
    placeholder="your password"
    value={pwd}
    onChange={(e) => setPwd(e.target.value)}
    style={{
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
    }}
  />
</div>


              </div>
              <div style={{ marginTop: 14, width: '100%' }}>
                <Button onClick={login} style={{ width: '100%', display: 'block' }}>
                  Log in
                </Button>
              </div>
            </div>
{/* <<< NEW BLOCK GOES RIGHT HERE >>> */}
<div
  style={{
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
    color: '#FFFFFF',
  }}
>
  Need An Account?{' '}
  <a
    href="mailto:jdavid@bhsg.com?subject=Access%20Request-BHLTalent%20Connector"
    style={{
      color: '#FFFFFF',
      textDecoration: 'underline',
      fontWeight: 600,
      cursor: 'pointer',
    }}
  >
    Click Here To Request Access
  </a>
</div>
{/* <<< END OF NEW BLOCK >>> */}


            {err ? (
              <div style={{ color: '#F87171', fontSize: 12, marginTop: 10 }}>{err}</div>
            ) : null}
          </Card>
        </div>
      </div>
    );
  }

  /* ---------- Recruiter UI ---------- */
  if (mode === 'recruiter') {
    const isSuperRecruiter = user.role === 'admin';


    return (
      <div style={pageWrap}>
        <div style={overlay}>
          <div
  style={{
    width: '100%',
    maxWidth: isMobile ? '100%' : '1100px',
    margin: '0 auto',
  }}
>
            <div
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  }}
>
  {/* TOP NAV (Recruiter) */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <a
  href="/recruiter-insights"
  style={{
    color: '#93C5FD',
    textDecoration: 'none',
    fontSize: 12,
    fontWeight: 700,
    marginLeft: 16,
    whiteSpace: 'nowrap',
  }}
>
  Recruiter Insights
</a>

  </div>

  

              <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>
                Talent Connector – Powered by Beacon Hill Legal <span style={{ color: '#93C5FD' }}>—</span>{' '}
                <span style={{ color: '#9CA3AF' }}>RECRUITER workspace</span>
              </div>
              <Button onClick={logout} style={{ background: '#0B1220', border: '1px solid #1F2937', marginLeft: 12 }}>
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

                    
                    {/* LANGUAGES — NEW FIELD */}
<div style={{ gridColumn: isMobile ? '1 / -1' : '1 / 3' }}>
  <Label>Languages</Label>
  <select
    multiple
    value={languages}
    onChange={(e) => {
      const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
      setLanguages(selected);
    }}
    style={{
      width: '100%',
      padding: '12px 14px',
      borderRadius: 10,
      border: '1px solid #1F2937',
      background: '#0F172A',
      color: '#E5E7EB',
      minHeight: 110
    }}
  >
    {LANGUAGE_OPTIONS.map((lang) => (
      <option key={lang} value={lang}>
        {lang}
      </option>
    ))}
  </select>
  <div style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>
    Hold ⌘ (Mac) or Ctrl (Windows) to select multiple
  </div>
</div>

{/* LICENSED STATES — NEW FIELD */}
<div style={{ gridColumn: isMobile ? '1 / -1' : '3 / 4' }}>
  <Label>Licensed State(s)</Label>
  <select
    multiple
    value={licensedStates}
    onChange={(e) => {
      const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
      setLicensedStates(selected);
    }}
    style={{
      width: '100%',
      padding: '12px 14px',
      borderRadius: 10,
      border: '1px solid #1F2937',
      background: '#0F172A',
      color: '#E5E7EB',
      minHeight: 110
    }}
  >
    {STATES.map((st) => (
      <option key={st} value={st}>
        {st}
      </option>
    ))}
  </select>
  <div style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>
    Hold ⌘ (Mac) or Ctrl (Windows) to select multiple
  </div>
</div>



                    <div>
                      <Label>Title</Label>
                      <select value={titles} onChange={(e) => setTitles(e.target.value)} style={selectStyle}>
                        <option value="">Select title</option>
                        {TITLE_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Type of Law</Label>
                      <select value={law} onChange={(e) => setLaw(e.target.value)} style={selectStyle}>
                        <option value="">Select type of law</option>
                        {LAW_OPTIONS.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>

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

                 <div>
  <Label>Metro Area</Label>
  <select
    value={city && state ? `${city}, ${state}` : ''}
    onChange={(e) => {
      const raw = e.target.value || '';
      if (!raw) {
        setCity('');
        setState('');
        return;
      }

      const [cName, st] = raw.split(',').map(x => x.trim());
      setCity(cName);
      setState(normState(st));
    }}
    style={selectStyle}
  >
    <option value="">Select a metro</option>
    {METROS.map((m) => (
      <option key={m} value={m}>
        {m}
      </option>
    ))}
  </select>
</div>


<div style={{ gridColumn: isMobile ? '1 / -1' : '2 / 3' }}>
                      <Label>Years of experience</Label>
                      <Input
  placeholder="Years"
  inputMode="numeric"
  value={years}
  onChange={(e) => setYears(e.target.value)}
  style={inputStyle}
/>

                    </div>
                    <div style={{ gridColumn: isMobile ? '1 / -1' : '3 / 4' }}>
  <Label>Years in most recent job</Label>
  <Input
    placeholder="e.g., 3"
    inputMode="numeric"
    value={recentYears}
    onChange={(e) => setRecentYears(e.target.value)}
    style={inputStyle}
  />
</div>

                    <div style={{ gridColumn: isMobile ? '1 / -1' : '1 / 2' }}>
  <Label>Salary desired</Label>
  <Input
    placeholder="e.g., 120000"
    inputMode="numeric"
    value={salary}
    onChange={(e) => setSalary(e.target.value)}
    style={inputStyle}
  />
</div>

                    <div style={{ gridColumn: isMobile ? '1 / -1' : '2 / 3' }}>
  <Label>Date entered</Label>
  <Input
    type="date"
    value={dateEntered}
    onChange={(e) => setDateEntered(e.target.value)}
    style={inputStyle}
  />
</div>

                   

                    {/* ---------- Contract Section ---------- */}
<div style={{ gridColumn: '1 / -1', marginTop: 6 }}>
  <label
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      cursor: 'pointer',
    }}
  >
    <input
      type="checkbox"
      checked={contract}
      onChange={(e) => {
        const checked = e.target.checked;
        setContract(checked);
        if (!checked) {
          setHourly('');
          setCompletedAssignmentsTier('');
        }
      }}
      style={{ transform: 'scale(1.1)' }}
    />
    <span style={{ color: '#E5E7EB', fontSize: 14, fontWeight: 500 }}>
      Available for contract
    </span>
  </label>

  {contract && (
    <div
      style={{
        marginTop: 10,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 14,
      }}
    >
      <div>
        <Label style={{ marginBottom: 4 }}>Hourly rate</Label>
        <Input
          placeholder="e.g., 80"
          inputMode="numeric"
          value={hourly}
          onChange={(e) => setHourly(e.target.value)}
        />
      </div>

      <div>
        <Label style={{ marginBottom: 4 }}>Completed assignments</Label>
        <select
          value={completedAssignmentsTier}
          onChange={(e) => setCompletedAssignmentsTier(e.target.value)}
          style={selectStyle}
        >
          {ASSIGNMENT_TIER_OPTIONS.map((o) => (
            <option key={o.value || 'none-tier'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )}
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
{/* AI Write-Up Generator */}

              <Card style={{ marginTop: 14 }}>
  <div style={{ fontWeight: 800, marginBottom: 12 }}>AI Write-Up</div>

                <div style={{ margin: '10px 0' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
                    Candidate for AI Write-Up
                  </label>
                  <select
                    value={selectedCandidate?.id || ''}
                    onChange={(e) => {
                      const chosen = aiCandidateList.find((x) => String(x.id) === e.target.value);
                      setSelectedCandidate(chosen || null);
                    }}
                    style={{
                      width: '100%',
                      maxWidth: 420,
                      padding: 8,
                      borderRadius: 6,
                      border: '1px solid #E5E7EB',
                      background: 'white',
                    }}
                  >
                    <option value="">— Select a candidate —</option>
                    {aiCandidateList.map((c) => {
                      const displayTitle = (c.titles_csv || '').trim();
                      const displayLaw = (c.law_csv || '').trim();
                      const displayLocation =
                        c.city && c.state
                          ? ` (${c.city}, ${c.state})`
                          : c.city
                          ? ` (${c.city})`
                          : c.state
                          ? ` (${c.state})`
                          : '';
                      const main = [c.name, displayTitle, displayLaw].filter(Boolean).join(' — ');
                      return (
                        <option key={c.id} value={String(c.id)}>
                          {main}{displayLocation}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <button
                  onClick={handleGenerateWriteup}
                  disabled={aiWriting}
                  style={{
                    background: aiWriting ? '#93C5FD' : '#2563EB',
                    color: 'white',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: 6,
                    padding: '10px 16px',
                    cursor: aiWriting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  }}
                >
                  {aiWriting ? 'Generating…' : 'Generate AI Write-Up'}
                </button>

                {(aiText || aiErr) && (
                  <div
                    style={{
                      marginTop: 12,
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      padding: 12,
                      borderRadius: 8,
                      color: '#111', // <-- added: makes text black
                      opacity: 1           // ✅ added: override inherited transparency
                    }}
                  >
                    {aiText && (
                      <>
                        <b>AI Summary:</b>
                        <p style={{ marginTop: 8, whiteSpace: 'pre-wrap', color: '#111' }}>{aiText}</p>
                      </>
                    )}
                    {aiErr && (
                      <p style={{ color: '#B91C1C', marginTop: 6 }}>
                        Error: {aiErr}
                      </p>
                    )}
                  </div>
                )}
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
  {/* Description */}
  <div style={{ gridColumn: '1 / -1' }}>
    <Label>Description</Label>
    <Input
      value={editForm.name || ''}
      onChange={(e) => changeEditField('name', e.target.value)}
    />
  </div>

  {/* Title */}
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

  {/* Type of Law */}
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

  {/* Languages */}
  <div>
    <Label>Languages</Label>
    <div
      style={{
        border: '1px solid #1F2937',
        borderRadius: 10,
        padding: 8,
        maxHeight: 140,
        overflowY: 'auto',
        background: '#020617',
      }}
    >
      {LANGUAGE_OPTIONS.map((lang) => {
        const selected = String(editForm.languages_csv || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        const isChecked = selected
          .map((s) => s.toLowerCase())
          .includes(lang.toLowerCase());

        return (
          <label
            key={lang}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
              fontSize: 13,
              color: '#E5E7EB',
            }}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => {
                const current = new Set(selected);
                if (e.target.checked) {
                  current.add(lang);
                } else {
                  current.delete(lang);
                }
                changeEditField(
                  'languages_csv',
                  Array.from(current).join(', ')
                );
              }}
            />
            <span>{lang}</span>
          </label>
        );
      })}
    </div>
  </div>

 {/* LICENSED STATES — EDIT FIELD */}
<div style={{ marginTop: 16 }}>
  <Label>Licensed State(s)</Label>

  <div
    style={{
      border: '1px solid #1F2937',
      borderRadius: 10,
      padding: 8,
      maxHeight: 140,
      overflowY: 'auto',
      background: '#020617',
    }}
  >
    {STATES.map((st) => {
      const selected = String(editForm.licensed_states_csv || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const isChecked = selected
        .map((s) => s.toUpperCase())
        .includes(st.toUpperCase());

      return (
        <label
          key={st}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 4,
            fontSize: 13,
            color: '#E5E7EB',
          }}
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => {
              const current = new Set(selected);
              if (e.target.checked) current.add(st);
              else current.delete(st);

              changeEditField(
                'licensed_states_csv',
                Array.from(current).join(', ')
              );
            }}
          />
          <span>{st}</span>
        </label>
      );
    })}
  </div>
</div>


                         

                          {/* Metro (writes city & state) */}
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
                              {(Array.isArray(metrosList) ? metrosList : []).map((m) => (
                                <option key={m} value={m}>
                                  {typeof formatMetro === 'function' ? formatMetro(m) : m}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Years */}
                          <div>
                            <Label>Years</Label>
                            <Input
                              inputMode="numeric"
                              value={editForm.years ?? ''}
                              onChange={(e) => changeEditField('years', e.target.value)}
                            />
                          </div>

                          {/* Recent role years */}
                          <div>
                            <Label>Years in most recent job</Label>
                            <Input
                              inputMode="numeric"
                              value={editForm.recent_role_years ?? ''}
                              onChange={(e) => changeEditField('recent_role_years', e.target.value)}
                            />
                          </div>

                          {/* Salary */}
                          <div>
                            <Label>Salary</Label>
                            <Input
                              inputMode="numeric"
                              value={editForm.salary ?? ''}
                              onChange={(e) => changeEditField('salary', e.target.value)}
                            />
                          </div>

                          {/* Date entered */}
                          <div>
                            <Label>Date entered</Label>
                            <Input
                              type="date"
                              value={editForm.date_entered || ''}
                              onChange={(e) => changeEditField('date_entered', e.target.value)}
                            />
                          </div>

                          {/* Contract + Hourly */}
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

                          {/* Completed Assignments Tier */}
{editForm.contract && (
  <div style={{ marginTop: 8 }}>
    <Label>Completed assignments</Label>
    <select
      value={editForm.completed_assignments_tier || ''}
      onChange={(e) =>
        changeEditField('completed_assignments_tier', e.target.value)
      }
      style={selectStyle}
    >
      {ASSIGNMENT_TIER_OPTIONS.map((o) => (
        <option key={o.value || 'none'} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
)}


                          {/* Off Market + On Assignment */}
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

                          {/* Notes */}
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


   function buildMailto(c) {
  const to = user.amEmail || 'info@bhsg.com';
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
}

/* ✅ ADD THIS RIGHT HERE */
function clientMetaLine(c) {
  const parts = [];

  const y = Number(c?.years);
  if (Number.isFinite(y) && y > 0) parts.push(`${y} yrs`);

  const licensed = String(c?.licensed_states_csv || '').trim();
  if (licensed) parts.push(`Licensed in: ${licensed}`);

  const langs = String(c?.languages_csv || '').trim();
  if (langs) parts.push(`Languages: ${langs}`);

  return parts.join(' • ');
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
        const raw = String(it[csvKey] || '').split(',').map(s => s.trim()).filter(Boolean);
        for (const r of raw) rows.push({ ...it, [_csvKey(csvKey)]: r });
      }
      return rows;
    }

   

    async function loadInsights() {
      try {
        const { data, error } = await supabase
          .from('candidates')
         .select('titles_csv,law_csv,languages_csv,licensed_states_csv,city,state,years,salary,hourly,contract,date_entered,created_at')
          .limit(5000);
        if (error) throw error;

        const pass = (r) => {
          if (iTitle && !matchesCSV(r.titles_csv, iTitle)) return false;
          if (iLaw && !matchesCSV(r.law_csv, iLaw)) return false;
          if (iLang && !matchesLangCSV(r.languages_csv, iLang)) return false;
          // ⭐ NEW: Licensed State filter
          if (iLicensedState && !matchesStatesCSV(r.licensed_states_csv, iLicensedState)) return false;
          if (iMetro) {
          const rowMetro = [r.city, r.state].filter(Boolean).join(', ').toLowerCase();
          if (rowMetro !== iMetro.toLowerCase()) return false;

}

          if (iState && String(r.state || '').trim() !== iState.trim()) return false;
          if (iContractOnly && !r.contract) return false;

          const recency = ymd(r.date_entered) || ymd(r.created_at);
          if (iStartDate && (!recency || recency < iStartDate)) return false;
          if (iEndDate   && (!recency || recency > iEndDate))   return false;

          if (iYearsRange) {
            const [minStr, maxStr] = iYearsRange.split('-');
            const min = minStr ? Number(minStr) : null;
            const max = maxStr ? Number(maxStr) : null;
            const y = Number(r.years);
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

        const licensedStateRows = explodeCSVToRows(rows, 'licensed_states_csv').map((r) => ({
  ...r,
  licensed_state: r[_csvKey('licensed_states_csv')],
}));

const languageRows = explodeCSVToRows(rows, 'languages_csv').map((r) => ({
  ...r,
  language: r[_csvKey('languages_csv')],
}));



       const withMetro = rows.map((r) => ({
  ...r,
  metro: [r.city, r.state].filter(Boolean).join(', '),
}));


        const byTitleSalary = groupAvg(titleRows, 'title_one', 'salary');
        const byTitleHourly = groupAvg(titleRows, 'title_one', 'hourly_billable');
        const byCitySalary = groupAvg(withMetro, 'metro', 'salary');
        const byCityHourly = groupAvg(withMetro, 'metro', 'hourly_billable');
        const byLicensedStateSalary = groupAvg(licensedStateRows, 'licensed_state', 'salary');
        const byLanguageSalary = groupAvg(languageRows, 'language', 'salary');
        const byLanguageHourly = groupAvg(languageRows, 'language', 'hourly_billable');




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
  byLicensedStateSalary,
  byLanguageSalary,
  byLanguageHourly,
  sampleN: rows.length,
});


        setShowInsights(true);
      } catch (e) {
        console.error(e);
        alert('Failed to load insights.');
      }
    }

   function BarChart({ title, rows, money = true }) {
  const safeRows = (rows || []).filter((r) => r.n == null || r.n >= 3);
  const sortedRows = [...safeRows].sort((a, b) => (b.avg || 0) - (a.avg || 0));
  const max = Math.max(...sortedRows.map((r) => r.avg), 1);


      return (
        <Card style={{ marginTop: 12, position: 'relative', zIndex: 1 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>{title}</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {sortedRows.map((r) => (
  <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 70px', gap: 10, alignItems: 'center' }}>

                <div style={{ color: '#E5E7EB', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
  {r.label}
  {r.n ? <span style={{ color: '#6B7280', fontSize: 11 }}> ({r.n})</span> : null}
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
            {sortedRows.length === 0 ? <div style={{ color: '#9CA3AF' }}>Not enough data.</div> : null}

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

          <Card style={{ marginTop: 12, position: 'relative', zIndex: 10, pointerEvents: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, minmax(0,1fr))', gap: 12 }}>
             <div>
  <Label>Title</Label>
  <select value={iTitle} onChange={(e) => setITitle(e.target.value)} style={selectStyle}>
    <option value="">Any</option>
    {['Administrative', 'Legal Support', 'Paralegal', 'Attorney'].map((t) => (
      <option key={t} value={t}>
        {t}
      </option>
    ))}
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
  <Label>Language</Label>
  <select
    value={iLang}
    onChange={(e) => setILang(e.target.value)}
    style={selectStyle}
  >
    <option value="">Any</option>
    {LANGUAGE_OPTIONS.map((lang) => (
      <option key={lang} value={lang}>{lang}</option>
    ))}
  </select>
</div>

{/* Licensed In */}
<div>
  <Label>Licensed In</Label>
  <select
   value={iLicensedState || ''}
onChange={(e) => setILicensedState(e.target.value)}
    style={selectStyle}
  >
    <option value="">Any licensed state</option>
    {STATES.map((st) => (
      <option key={st} value={st}>
        {st}
      </option>
    ))}
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
  <Label>Metro Area</Label>
  <select
    value={iMetro}
    onChange={(e) => setIMetro(e.target.value)}
    style={selectStyle}
  >
    <option value="">Any</option>
    {METROS.map((m) => (
      <option key={m} value={m}>
        {m}
      </option>
    ))}
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
    setILang('');
    setIState('');
    setIMetro('');
    setILicensedState('');
    setIYearsRange('');
    setIContractOnly(false);
    setIPreset('LAST_180');
  }}
  style={{ background:'#111827', border:'1px solid #1F2937', width: isMobile ? '100%' : undefined }}
>

                Clear
              </Button>
            </div>
            <div
  style={{
    marginTop: 10,
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 1.35,
  }}
>
  Insights are compiled from the Talent Connector candidate database and update regularly as records are added and refreshed.
</div>

          </Card>

          {/* KPI row */}
          {insights?.kpi ? (
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, minmax(0,1fr))', gap:12, marginTop:12, position: 'relative', zIndex: 1 }}>
              <Kpi
  label="Median Salary"
  value={insights.kpi.salary.median ? `$${insights.kpi.salary.median.toLocaleString()}` : '—'}
  sub={insights.kpi.salary.avg ? `Avg $${insights.kpi.salary.avg.toLocaleString()}` : undefined}
/>

              <Kpi
                label="Typical Salary Range"
                value={(insights.kpi.salary.p25 && insights.kpi.salary.p75) ? `$${insights.kpi.salary.p25.toLocaleString()}–$${insights.kpi.salary.p75.toLocaleString()}` : '—'}
              />

              <Kpi
  label="Typical Billable Hourly Range"
  value={
    (insights.kpi.hourly.p25 && insights.kpi.hourly.p75)
      ? `$${insights.kpi.hourly.p25.toLocaleString()}/hr–$${insights.kpi.hourly.p75.toLocaleString()}/hr`
      : '—'
  }
/>



              <Kpi
  label="Median Billable Hourly"
  value={insights.kpi.hourly.median ? `$${insights.kpi.hourly.median.toLocaleString()}/hr` : '—'}
  sub={
    insights.kpi.hourly.avg
      ? `Avg $${insights.kpi.hourly.avg.toLocaleString()}/hr`
      : (iContractOnly ? 'Contract filter on' : 'Contract roles only')
  }
/>

<Kpi
  label="Sample Size"
  value={insights.sampleN}
  sub="Matching professionals"
/>


              <Kpi label="Sample Size" value={insights.sampleN} />
              <Kpi
                label="Filter"
                value={
                 [
  iTitle,
  iLaw,
  [iMetro, iState].filter(Boolean).join(', '),
  (iStartDate || iEndDate)
    ? `${formatMDY(iStartDate) || '…'} → ${formatMDY(iEndDate) || '…'}`
    : null,
  iContractOnly ? 'Contract only' : null,
].filter(Boolean).join(' • ') || 'All'

                }
              />
            </div>
          ) : null}

          <BarChart title="Avg Salary by Title" rows={insights.byTitleSalary} money />
<BarChart title="Avg Hourly (Billable) by Title" rows={insights.byTitleHourly} money />

<BarChart title="Median Salary by Licensed State" rows={insights.byLicensedStateSalary} money />

<BarChart title="Avg Salary by Metro Area" rows={insights.byCitySalary} money />
<BarChart title="Avg Hourly (Billable) by Metro Area" rows={insights.byCityHourly} money />
<BarChart title="Avg Salary by Years of Experience" rows={insights.byYearsSalary} money />
<BarChart title="Avg Salary by Language" rows={insights.byLanguageSalary} money />
<BarChart title="Avg Hourly (Billable) by Language" rows={insights.byLanguageHourly} money />


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
                  alignItems: isMobile ? 'stretch' : 'center',
                  gap: 12,
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                  width: '100%',
                }}
              >
                <div
  style={{
    fontWeight: 800,
    letterSpacing: 0.3,
    color: isMobile ? '#0EA5E9' : '#E5E7EB',
  }}
>

                  Talent Connector – Powered by Beacon Hill Legal <span style={{ color: '#93C5FD' }}>—</span>{' '}
                  <span style={{ color: '#9CA3AF' }}>CLIENT workspace</span>
                </div>
                <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: 12, flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto' }}>
                  <Tag style={{ fontSize: 16, padding: '6px 12px' }}>
                    New today: <strong>{cCountToday}</strong>
                  </Tag>
                  <Button
                    onClick={async () => {
                      if (!showInsights) setShowInsights(true);
                      await loadInsights();
                    }}
                    style={{ background: '#0EA5E9', border: '1px solid #1F2937', width: isMobile ? '100%' : undefined }}
                  >
                    Compensation Insights
                  </Button>
                  <Button onClick={logout} style={{ background: '#0B1220', border: '1px solid #1F2937', width: isMobile ? '100%' : undefined }}>
                    Log out
                  </Button>
                </div>
              </div>

             <Card
  style={{
    marginTop: 12,
    maxWidth: '100%',
    overflowX: 'hidden',
    boxSizing: 'border-box',
  }}
>

                <div style={{ fontWeight: 800, marginBottom: 12 }}>Filters</div>

<div
  style={{
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
    gap: 14,
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
  }}
>
  <div style={{ minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}>
    <Label>Keyword</Label>
    <Input
      placeholder="description, law, title, city/state, notes"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      style={inputStyle}
    />
  </div>



                  <div style={{ minWidth: 0, position: 'relative' }}>
  <Label>Metro Area</Label>

  {/* Collapsed control */}
  <button
    type="button"
    onClick={() => setMetroOpen((v) => !v)}
    style={{
      ...selectStyle,
      width: '100%',
      textAlign: 'left',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    }}
  >
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {fMetros.length === 0
        ? 'Any'
        : fMetros.length === 1
          ? fMetros[0]
          : `${fMetros[0]} + ${fMetros.length - 1} more`}
    </span>

    <span style={{ color: '#9CA3AF', fontSize: 12 }}>
      {metroOpen ? '▲' : '▼'}
    </span>
  </button>

  {/* Dropdown panel */}
  {metroOpen ? (
    <div
      style={{
        position: 'absolute',
        zIndex: 50,
        top: '100%',
        left: 0,
        right: 0,
        marginTop: 6,
        background: '#0B1220',
        border: '1px solid #1F2937',
        borderRadius: 12,
        padding: 10,
        boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
      }}
      onClick={(e) => e.stopPropagation()} // lets you click inside without closing
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ color: '#9CA3AF', fontSize: 12 }}>Select one or more</div>

        <button
          type="button"
          onClick={() => {
            setFMetros([]);
            setFCity('');
          }}
          style={{
            background: '#111827',
            border: '1px solid #1F2937',
            color: '#E5E7EB',
            borderRadius: 10,
            padding: '6px 10px',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      </div>

     <div style={{ maxHeight: 220, overflow: 'auto', paddingRight: 4 }}>
  {METROS.map((m) => {
    const checked = fMetros.includes(m);

    return (
      <label
        key={m}
        onClick={(e) => e.stopPropagation()} // ✅ prevents dropdown from closing
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 8px',
          borderRadius: 10,
          cursor: 'pointer',
          userSelect: 'none',
          background: checked ? 'rgba(14,165,233,0.12)' : 'transparent',
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onClick={(e) => e.stopPropagation()} // ✅ prevents dropdown from closing
          onChange={(e) => {
            setFCity('');
            setFMetros((prev) => {
              if (e.target.checked) return [...prev, m];
              return prev.filter((x) => x !== m);
            });
          }}
        />
        <span style={{ color: '#E5E7EB', fontSize: 13 }}>{m}</span>
      </label>
    );
  })}
</div>


      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#9CA3AF', fontSize: 12 }}>Selected: {fMetros.length}</div>

        <button
          type="button"
          onClick={() => setMetroOpen(false)}
          style={{
            background: '#0EA5E9',
            border: '1px solid #1F2937',
            color: '#041014',
            borderRadius: 10,
            padding: '6px 10px',
            fontSize: 12,
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Done
        </button>
      </div>
    </div>
  ) : null}
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
                      {['Administrative', 'Legal Support', 'Paralegal', 'Attorney'].map((t) => (
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

                  {/* NEW — Language filter */}
<div>
  <Label>Language</Label>
  <select
    value={fLang}
    onChange={(e) => setFLang(e.target.value)}
    style={selectStyle}
  >
    <option value="">Any</option>
    {LANGUAGE_OPTIONS.map((lang) => (
      <option key={lang} value={lang}>{lang}</option>
    ))}
  </select>
</div>

{/* Licensed In (multi-select) */}
<div ref={licensedRef} style={{ minWidth: 0, position: 'relative' }}>
  <Label>Licensed In</Label>

  <button
    type="button"
    onClick={() => setLicensedOpen((v) => !v)}
    style={{
      ...selectStyle,
      width: '100%',
      textAlign: 'left',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    }}
  >
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {fLicensedStates.length === 0
        ? 'Any licensed state'
        : fLicensedStates.length === 1
          ? fLicensedStates[0]
          : `${fLicensedStates[0]} + ${fLicensedStates.length - 1} more`}
    </span>

    <span style={{ color: '#9CA3AF', fontSize: 12 }}>
      {licensedOpen ? '▲' : '▼'}
    </span>
  </button>

  {licensedOpen ? (
    <div
      style={{
        position: 'absolute',
        zIndex: 50,
        top: '100%',
        left: 0,
        right: 0,
        marginTop: 6,
        background: '#0B1220',
        border: '1px solid #1F2937',
        borderRadius: 12,
        padding: 10,
        boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ color: '#9CA3AF', fontSize: 12 }}>Select one or more</div>

        <button
          type="button"
          onClick={() => {
            setFLicensedStates([]);
            setFLicensedState('');
          }}
          style={{
            background: '#111827',
            border: '1px solid #1F2937',
            color: '#E5E7EB',
            borderRadius: 10,
            padding: '6px 10px',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      </div>

      <div style={{ maxHeight: 220, overflow: 'auto', paddingRight: 4 }}>
        {STATES.map((st) => {
          const checked = fLicensedStates.includes(st);

          return (
            <label
              key={st}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 8px',
                borderRadius: 10,
                cursor: 'pointer',
                userSelect: 'none',
                background: checked ? 'rgba(14,165,233,0.12)' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  setFLicensedState('');
                  setFLicensedStates((prev) => {
                    if (e.target.checked) return [...prev, st];
                    return prev.filter((x) => x !== st);
                  });
                }}
              />
              <span style={{ color: '#E5E7EB', fontSize: 13 }}>{st}</span>
            </label>
          );
        })}
      </div>

      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#9CA3AF', fontSize: 12 }}>
          Selected: {fLicensedStates.length}
        </div>

        <button
          type="button"
          onClick={() => setLicensedOpen(false)}
          style={{
            background: '#0EA5E9',
            border: '1px solid #1F2937',
            color: '#041014',
            borderRadius: 10,
            padding: '6px 10px',
            fontSize: 12,
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Done
        </button>
      </div>
    </div>
  ) : null}
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
               <div
  style={{
    marginTop: 12,
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  }}
>
  <Button onClick={fetchClientRows}>Apply filters</Button>
  <Button
    onClick={clearClientFilters}
    style={{ background: '#111827', border: '1px solid #1F2937' }}
  >
    Clear filters
  </Button>

  <Button
  onClick={saveCurrentSearch}
  style={{ background: '#0EA5E9', border: '1px solid #1F2937' }}
>
  Save this search
</Button>


  {/* NEW disclaimer text to the right of Clear filters */}
  <div
  style={{
    color: '#FFFFFF',
    fontSize: 10,
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
    fontStyle: 'italic',
    maxWidth: '100%',
  }}
>
  Rates And Availability Are Subject To Change
</div>


  {clientErr ? (
    <div style={{ color: '#F87171', fontSize: 12, paddingTop: 8 }}>{clientErr}</div>
  ) : null}
</div>
</Card>


{/* ---------- Saved Searches (read-only) ---------- */}
<Card style={{ marginTop: 12 }}>
  <div style={{ fontWeight: 800, marginBottom: 8 }}>
    Saved Searches
  </div>

  {savedSearchesLoading && (
    <div style={{ fontSize: 12, opacity: 0.7 }}>
      Loading…
    </div>
  )}

  {savedSearchesError && (
    <div style={{ fontSize: 12, color: '#F87171' }}>
      {savedSearchesError}
    </div>
  )}

  {!savedSearchesLoading && savedSearches.length === 0 && (
    <div style={{ fontSize: 12, opacity: 0.6 }}>
      No saved searches yet.
    </div>
  )}

  <div style={{ display: 'grid', gap: 8 }}>
   {savedSearches.map((s) => (
    <div
      key={s.id}
      onClick={() => applySavedSearch(s.filters)}
      style={{
        padding: 10,
        borderRadius: 10,
        border: '1px solid #1F2937',
        background: '#0B1220',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        cursor: 'pointer',
      }}
    >
      {/* LEFT */}
      <div>
        <div style={{ fontWeight: 700 }}>{s.name}</div>
        <div style={{ fontSize: 12, opacity: 0.6 }}>
          Alerts: {s.alerts_enabled ? 'On' : 'Off'}
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setAlertsEnabled(s.id, !s.alerts_enabled);
          }}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #1F2937',
            background: s.alerts_enabled ? '#16A34A' : '#111827',
            color: 'white',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {s.alerts_enabled ? 'Turn Off' : 'Turn On'}
        </button>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            deleteSavedSearch(s.id);
          }}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #7F1D1D',
            background: '#7F1D1D',
            color: 'white',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Delete
        </button>
      </div>
    </div>
  ))}
</div>
</Card>





            <Card
  style={{
    marginTop: 12,
    maxWidth: '100%',
    overflowX: 'hidden',
    boxSizing: 'border-box',
  }}
>

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
  width: isMobile ? '100%' : 'fit-content',
  maxWidth: '100%',
  boxSizing: 'border-box',

  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #1F2937',
  background: '#0EA5E9',
  color: '#041014',

  fontSize: 14,
  lineHeight: '20px',
  fontWeight: 800,

  textDecoration: 'none',
  textAlign: 'center',

  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}}

    >
      Request our help with your search
    </a>

    {/* Legal industry employment data link */}
    <a
      href="/legal-insights"
      style={{
  display: 'inline-block',
  marginTop: 8,

  width: isMobile ? '100%' : 'fit-content',
  maxWidth: '100%',
  boxSizing: 'border-box',

  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #1F2937',
  background: '#0B1220',
  color: '#E5E7EB',

  fontSize: 14,
  lineHeight: '20px',
  fontWeight: 700,

  textDecoration: 'none',
  textAlign: 'center',

  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}}

    >
      Click here for legal industry employment data
    </a>
  </div>
</Card>


             <Card
  style={{
    marginTop: 14,
    maxWidth: '100%',
    overflowX: 'hidden',
    boxSizing: 'border-box',
  }}
>

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
  style={{
    border: '1px solid #1F2937',
    borderRadius: 12,
    padding: isMobile ? 10 : 12,
    background: '#0B1220',
    maxWidth: '100%',
    boxSizing: 'border-box',
    overflowX: 'hidden',
  }}
>

                        {/* Red banner for Off The Market */}
                        {c.off_market ? (
                          <div
                            style={{
                              marginBottom: 8,
                              padding: '8px 10px',
                              borderRadius: 8,
                              background: 'rgba(250, 204, 21, 0.14)',
                             border: '1px solid rgba(250, 204, 21, 0.95)',
                              color: '#FDE68A',
                              fontWeight: 800,
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
    gap: isMobile ? 8 : 10,
    rowGap: isMobile ? 6 : 10,
    alignItems: isMobile ? 'start' : 'center',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    minWidth: 0,
  }}
>

                       <div style={{ color: '#E5E7EB', fontWeight: 600, minWidth: 0 }}>

  {c.name}

  {/* ⭐ Medal */}
  {(() => {
    const m = assignmentMedal(c.completed_assignments_tier);
    return m ? (
      <div
        title={m.label}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 4,
          padding: '2px 8px',
          borderRadius: 999,
          background: '#0F172A',
          border: '1px solid #1F2937',
          fontSize: 12,
          fontWeight: 700,
          color: '#FACC15',
          width: 'fit-content',
        }}
      >
        <span style={{ fontSize: 14 }}>{m.icon}</span>
        <span>{m.label}</span>
      </div>
    ) : null;
  })()}

  <div style={{ color: '#93C5FD', fontSize: 12, marginTop: 4 }}>
    {[c.titles_csv, c.law_csv].filter(Boolean).join(' • ') || '—'}
  </div>

  {clientMetaLine(c) ? (
    <div style={{ color: '#60A5FA', fontSize: 12, marginTop: 2 }}>
      {clientMetaLine(c)}
    </div>
  ) : null}
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
                              style={{
                                background: '#93C5FD',
                                color: '#0B1220',
                                border: '1px solid #4B77B9',
                                width: isMobile ? '100%' : undefined,
                              }}
                            >
                              Additional information
                            </Button>
                            <a
                              href={buildMailto(c)}
                             style={{
  display: 'inline-block',
  width: isMobile ? '100%' : undefined,
  maxWidth: '100%',
  boxSizing: 'border-box',

  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #1F2937',
  background: '#0EA5E9',      // same as Compensation Insights (optional—keep if you want)
  color: '#041014',

  fontSize: 14,
  lineHeight: '20px',
  fontWeight: 700,

  textDecoration: 'none',
  textAlign: 'center',

  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
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
  {(c.entered_by_name || c.entered_by_email) ? (
  <div style={{ marginBottom: 8, fontSize: 12, color: '#9CA3AF' }}>
    Interviewed by{' '}
    {c.entered_by_linkedin_url ? (
      <a
        href={c.entered_by_linkedin_url}
        target="_blank"
        rel="noreferrer"
        style={{
          color: '#93C5FD',
          textDecoration: 'underline',
          cursor: 'pointer',
          pointerEvents: 'auto',
        }}
      >
        {c.entered_by_name || c.entered_by_email}
      </a>
    ) : (
      <span>{c.entered_by_name || c.entered_by_email}</span>
    )}
  </div>
) : null}




    {c.notes ? highlightKeywords(c.notes, search) : <i>No additional notes.</i>}
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
       <div
  style={{
    width: '100%',
    maxWidth: isMobile ? '100%' : '1100px',
    margin: '0 auto',
  }}
>
  <div
    style={{
      display: 'flex',

              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <div
  style={{
    fontWeight: 800,
    letterSpacing: 0.3,
    color: isMobile ? '#0EA5E9' : '#E5E7EB',
  }}
>
  Talent Connector – Powered by Beacon Hill Legal <span style={{ color: '#93C5FD' }}>—</span>{' '}
  <span style={{ color: '#9CA3AF' }}>CLIENT workspace</span>
</div>

            <Button onClick={logout} style={{ background: '#0B1220', border: '1px solid #1F2937' }}>
              Log out
            </Button>
          </div>
          <AdminPanel isMobile={isMobile} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Admin Panel ---------- */
function AdminPanel({ isMobile }) {
  const [list, setList] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState('');
  const [flash, setFlash] = React.useState('');

  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState('client');
  const [org, setOrg] = React.useState('');
  const [amEmail, setAmEmail] = React.useState('');
  const [tempPw, setTempPw] = React.useState('');

  const [q, setQ] = React.useState('');
  const [editingId, setEditingId] = React.useState(null);
  const [editDraft, setEditDraft] = React.useState({
    role: 'client',
    org: '',
    account_manager_email: '',
  });
  const [rowBusy, setRowBusy] = React.useState({});

  React.useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
  setLoading(true);
  setErr('');

  try {
    const res = await fetch('/api/admin/users', { cache: 'no-store' });
    const json = await res.json();

    console.log('ADMIN /api/admin/users RAW RESPONSE:', json);
    console.log(
      'ADMIN /api/admin/users EMAILS:',
      (json.users || []).map((u) => u.email)
    );

    if (!json.ok) throw new Error(json.error || 'Failed loading users');

    const users = (json.users || []).slice().sort((a, b) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return tb - ta; // newest first
    });

    setList(users);
  } catch (e) {
    console.error('Load profiles error:', e);
    setErr(e.message || 'Failed loading users');
  } finally {
    setLoading(false);
  }
}


  function toast(okMsg = '', errMsg = '') {
    if (okMsg) setFlash(okMsg);
    if (errMsg) setErr(errMsg);
    if (okMsg || errMsg) {
      setTimeout(() => {
        setFlash('');
        setErr('');
      }, 2500);
    }
  }

    async function invite() {
  setFlash('');
  setErr('');

  try {
    const em = (email || '').trim().toLowerCase();
    if (!em) {
      setErr('Email is required.');
      return;
    }

    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: em,
        role,
        org: (org || '').trim() || null,
        amEmail: (amEmail || '').trim() || null,
      }),
    });

    const json = await res.json();

    if (!json.ok) {
      setErr(json?.error || 'Invite failed');
      return;
    }

    // ⭐ Build a clean Talent Connector password setup link
    const base =
      typeof window !== 'undefined'
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');

    const onboardingUrl = `${base}/set-password?email=${encodeURIComponent(em)}`;

    // Show this link in the green box
    setTempPw(onboardingUrl);

    // Refresh list
    await loadProfiles();

    // Reset form
    setEmail('');
    setRole('client');
    setOrg('');
    setAmEmail('');

    toast(`Created ${em}. Send them the password setup link below.`);
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
        account_manager_email:
          (editDraft.account_manager_email || '').trim() || null,
      };
      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', id);
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
    setErr('');
    setFlash('');

    // Build the same password setup link used elsewhere
    const base =
      typeof window !== 'undefined'
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');

    const emailLower = (row.email || '').trim().toLowerCase();
    const onboardingUrl = `${base}/set-password?email=${encodeURIComponent(
      emailLower
    )}`;

    // Plain-text, black-text only email (client’s mail app handles fonts/colors)
    const subject = encodeURIComponent(
      'Beacon Hill Legal-Talent Connector access'
    );

    const bodyText = `
Hello,

Beacon Hill Legal has set you up with access to Talent Connector, our on-demand way to review pre-vetted legal talent.

Use the link below to set your password and sign in:

${onboardingUrl}

With Talent Connector you can:
- Search legal professionals by practice area, location, and experience
- View profiles of candidates vetted by Beacon Hill Legal recruiters
- Quickly identify candidates you would like to discuss with your Beacon Hill contact

This link is unique to your email address. For security, please do not forward it.

If you have any trouble signing in or would like a brief walkthrough, reply to this email and our team will help.

Best regards,
Beacon Hill Legal
`.trim();

    const mailto = `mailto:${encodeURIComponent(
      emailLower
    )}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;

    // Open the user's email client with the draft
    window.location.href = mailto;

    toast(`Opened email draft for ${row.email}`);
  } catch (e) {
    console.error(e);
    setErr(e?.message || 'Could not open email draft.');
  } finally {
    setBusy(row.id, false);
  }
}


  async function resetPassword(row) {
    try {
      const newPw = prompt(
        'Set a new temporary password for this user (min 8 chars):'
      );
      if (!newPw) return;
      if (newPw.length < 8) {
        alert('Password must be at least 8 characters.');
        return;
      }
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
      const res = await fetch('/api/admin/deleteUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || 'Delete failed.');

      toast(`Deleted ${row.email}`);

      // Instantly remove from UI (no reload needed)
      setList((prev) => prev.filter((u) => u.id !== row.id));
    } catch (e) {
      console.error(e);
      setErr(e?.message || 'Delete failed.');
    } finally {
      setBusy(row.id, false);
    }
  }

  const filtered = React.useMemo(() => {
    const s = (q || '').trim().toLowerCase();

    if (!s) {
      console.log('NO SEARCH TERM, USING FULL LIST:', list);
      return list;
    }

    const result = list.filter((r) =>
      [r.email, r.org, r.account_manager_email].some((x) =>
        (x || '').toLowerCase().includes(s)
      )
    );

    console.log('SEARCH TERM:', s, 'FILTERED RESULT:', result);

    return result;
  }, [q, list]);

  console.log('FINAL DISPLAYED ROWS:', filtered);

  return (
    <>
      {/* --- Search Insights link --- */}
      <div style={{ margin: '10px 0', textAlign: 'right' }}>
        <a
          href="/search-insights"
          style={{
            display: 'inline-block',
            fontWeight: 700,
            textDecoration: 'none',
            color: '#2563EB',
          }}
        >
          → View Search Insights
        </a>
      </div>

      {/* Invite */}
      <Card style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Invite user</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 12,
          }}
        >
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
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={selectStyle}
            >
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
        </div>

        <div
          style={{
            marginTop: 10,
            display: 'flex',
            gap: 8,
            flexDirection: isMobile ? 'column' : 'row',
          }}
        >
          <Button
            onClick={invite}
            style={{ width: isMobile ? '100%' : undefined }}
          >
            Add user
          </Button>
          {err ? (
            <div
              style={{ color: '#F87171', fontSize: 12, paddingTop: 8 }}
            >
              {err}
            </div>
          ) : (
            <div
              style={{ color: '#93E2B7', fontSize: 12, paddingTop: 8 }}
            >
              {flash}
            </div>
          )}
        </div>
      </Card>

      {/* Password Setup Link Display */}
      {tempPw ? (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            background: '#065F46',
            color: 'white',
            fontSize: 14,
            lineHeight: 1.4,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            Send this password setup link to the new user:
          </div>

          <div
            style={{
              wordBreak: 'break-all',
              background: '#064E3B',
              padding: 10,
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            {tempPw}
          </div>

          <button
            onClick={() => navigator.clipboard.writeText(tempPw)}
            style={{
              marginTop: 8,
              padding: '6px 12px',
              background: '#10B981',
              borderRadius: 6,
              border: 'none',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Copy link
          </button>
        </div>
      ) : null}

      {/* Directory */}
      <Card style={{ marginTop: 12 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <div style={{ fontWeight: 800 }}>Directory</div>
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexDirection: isMobile ? 'column' : 'row',
              width: isMobile ? '100%' : 'auto',
            }}
          >
            <Input
              placeholder="Search email / org / sales contact"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: isMobile ? '100%' : 300 }}
            />
            <Button
              onClick={loadProfiles}
              style={{
                background: '#0EA5E9',
                border: '1px solid #1F2937',
                width: isMobile ? '100%' : undefined,
              }}
            >
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div style={{ fontSize: 12, color: '#9CA3AF' }}>Loading…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: isMobile ? 14 : 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    textAlign: 'left',
                    color: '#9CA3AF',
                    fontSize: isMobile ? 13 : 12,
                  }}
                >
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Org</th>
                  <th style={thStyle}>Sales contact</th>
                  <th style={thStyle}>Created</th>
                  <th
                    style={{ ...thStyle, textAlign: 'right' }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const busy = !!rowBusy[r.id];
                  const isEditing = editingId === r.id;
                  return (
                    <tr key={r.id}>
                      <td style={tdStyle}>{r.email}</td>

                      {/* Status */}
                      <td style={tdStyle}>
                        {r.email_confirmed_at ? (
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: 9999,
                              background: '#d1fae5',
                              color: '#065f46',
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            Verified
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: 9999,
                              background: '#fef3c7',
                              color: '#92400e',
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            Pending
                          </span>
                        )}
                      </td>

                      <td style={tdStyle}>
                        {isEditing ? (
                          <select
                            value={editDraft.role}
                            onChange={(e) =>
                              setEditDraft((s) => ({
                                ...s,
                                role: e.target.value,
                              }))
                            }
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
                            onChange={(e) =>
                              setEditDraft((s) => ({
                                ...s,
                                org: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          r.org || '—'
                        )}
                      </td>

                      <td style={tdStyle}>
                        {isEditing ? (
                          <Input
                            type="email"
                            value={editDraft.account_manager_email}
                            onChange={(e) =>
                              setEditDraft((s) => ({
                                ...s,
                                account_manager_email: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          r.account_manager_email || '—'
                        )}
                      </td>

                      <td style={tdStyle}>
                        {new Date(r.created_at).toLocaleString()}
                      </td>

                      <td
                        style={{ ...tdStyle, textAlign: 'right' }}
                      >
                        {!isEditing ? (
                          <div
                            style={{
                              display: 'flex',
                              gap: 8,
                              justifyContent: 'flex-end',
                              flexWrap: 'wrap',
                            }}
                          >
                            <Button
                              onClick={() => startEdit(r)}
                              style={{
                                background: '#111827',
                                border: '1px solid #1F2937',
                              }}
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
                              style={{
                                background: '#B91C1C',
                                border: '1px solid #7F1D1D',
                              }}
                              disabled={busy}
                            >
                              Delete
                            </Button>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              gap: 8,
                              justifyContent: 'flex-end',
                              flexWrap: 'wrap',
                            }}
                          >
                            <Button
                              onClick={() => saveEdit(r.id)}
                              disabled={busy}
                            >
                              Save
                            </Button>
                            <Button
                              onClick={cancelEdit}
                              style={{
                                background: '#111827',
                                border: '1px solid #1F2937',
                              }}
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
                    <td
                      colSpan={7}
                      style={{ ...tdStyle, color: '#9CA3AF' }}
                    >
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
  maxWidth: '100%',
  boxSizing: 'border-box',

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
  pointerEvents: 'auto',
  position: 'relative',
  zIndex: 11,
};

const inputStyle = {
  ...selectStyle,
  WebkitAppearance: undefined,
  MozAppearance: undefined,
};

const thStyle = {
  padding: '8px',
  borderBottom: '1px solid #1F2937',
  boxSizing: 'border-box',
};

const tdStyle = {
  padding: '8px',
  borderBottom: '1px solid #1F2937',
  boxSizing: 'border-box',
};
