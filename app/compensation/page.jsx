'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function CompensationPage() {
  // ---------- Responsive ----------
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ---------- UI state ----------
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [insights, setInsights] = useState(null);

  // ---------- Filters ----------
  const [iCategory, setICategory] = useState(''); // FolderGroupCategory
  const [iGroup, setIGroup] = useState(''); // FolderGroup
  const [iLang, setILang] = useState(''); // Language
  const [iState, setIState] = useState(''); // StateCode

  // City filter: custom typeahead
  const [iCity, setICity] = useState(''); // applied value (must be exact from CITY_OPTIONS)
  const [cityQuery, setCityQuery] = useState(''); // what user types / sees
  const [cityOpen, setCityOpen] = useState(false);
  const [cityActiveIdx, setCityActiveIdx] = useState(0);

  const cityWrapRef = useRef(null);
  const cityInputRef = useRef(null);

  const [iHourlyOnly, setIHourlyOnly] = useState(false);

  // Year range (actual years)
  const [iYearStart, setIYearStart] = useState(''); // e.g. "2022"
  const [iYearEnd, setIYearEnd] = useState(''); // e.g. "2025"

  // ---------- Data ----------
  const [rawRows, setRawRows] = useState([]);
  const [CITY_OPTIONS, setCITY_OPTIONS] = useState([]);
  const [GROUPS, setGROUPS] = useState([]);
  const [LANGUAGE_OPTIONS, setLANGUAGE_OPTIONS] = useState([]);
  const [STATES, setSTATES] = useState([]);
  const [CATEGORY_OPTIONS, setCATEGORY_OPTIONS] = useState([]);
  const [YEAR_OPTIONS, setYEAR_OPTIONS] = useState([]); // ["2025","2024",...]

  // ---------- UI components ----------
  function Card({ children, style }) {
    return (
      <div
        style={{
          background: '#0B1220',
          border: '1px solid #1F2937',
          borderRadius: 14,
          padding: 16,
          boxShadow: '0 18px 60px rgba(0,0,0,0.25)',
          ...style,
        }}
      >
        {children}
      </div>
    );
  }

  function Button({ children, onClick, style, disabled, type = 'button' }) {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        style={{
          background: '#0EA5E9',
          border: '1px solid #1F2937',
          color: '#041014',
          borderRadius: 12,
          padding: '10px 12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontWeight: 900,
          opacity: disabled ? 0.6 : 1,
          ...style,
        }}
      >
        {children}
      </button>
    );
  }

  function Label({ children, style }) {
    return (
      <div style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 6, ...style }}>
        {children}
      </div>
    );
  }

  function Kpi({ label, value, sub }) {
    return (
      <Card style={{ padding: 16 }}>
        <div style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#E5E7EB' }}>{value ?? '—'}</div>
        {sub ? <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>{sub}</div> : null}
      </Card>
    );
  }

  const inputStyle = {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    background: '#0B1220',
    border: '1px solid #1F2937',
    color: '#E5E7EB',
    borderRadius: 12,
    padding: '10px 12px',
    outline: 'none',
    fontSize: 13,
  };

  const selectStyle = { ...inputStyle };

  // ---------- Stats helpers ----------
  function median(arr) {
    if (!arr.length) return null;
    const a = [...arr].sort((x, y) => x - y);
    const mid = Math.floor(a.length / 2);
    return a.length % 2 ? a[mid] : Math.round((a[mid - 1] + a[mid]) / 2);
  }

  function percentile(arr, p) {
    if (!arr.length) return null;
    const a = [...arr].sort((x, y) => x - y);
    const idx = Math.floor((p / 100) * (a.length - 1));
    return a[idx];
  }

  function statsFrom(vals) {
    const v = (vals || []).filter((n) => Number.isFinite(n) && n > 0);
    if (!v.length) return { n: 0 };
    const avg = Math.round(v.reduce((a, c) => a + c, 0) / v.length);
    return { n: v.length, avg, median: median(v), p25: percentile(v, 25), p75: percentile(v, 75) };
  }

  function groupAgg(items, key, valueKey, mode = 'avg') {
    const acc = new Map();
    for (const it of items) {
      const k = String(it[key] || '').trim();
      const v = Number(it[valueKey]);
      if (!k || !Number.isFinite(v) || v <= 0) continue;
      const cur = acc.get(k) || [];
      cur.push(v);
      acc.set(k, cur);
    }

    const rows = [];
    for (const [k, values] of acc.entries()) {
      const n = values.length;
      const metric = mode === 'median' ? median(values) : Math.round(values.reduce((a, c) => a + c, 0) / n);
      rows.push({ label: k, avg: metric, n });
    }

    rows.sort((a, b) => (b.avg || 0) - (a.avg || 0));
    return rows;
  }

  function BarChart({ title, rows, money = true, minN = 3 }) {
    const safeRows = (rows || []).filter((r) => r.n == null || r.n >= minN);
    const top = [...safeRows].sort((a, b) => (b.avg || 0) - (a.avg || 0)).slice(0, 12);
    const max = Math.max(...top.map((r) => r.avg || 0), 1);

    return (
      <Card style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 10, color: '#E5E7EB' }}>{title}</div>

        <div style={{ display: 'grid', gap: 8 }}>
          {top.map((r) => (
            <div
              key={r.label}
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '260px 1fr 90px',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <div style={{ color: '#E5E7EB', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.label}
                {typeof r.n === 'number' ? <span style={{ color: '#6B7280', fontSize: 11 }}> ({r.n})</span> : null}
                {typeof r.city_n === 'number' ? (
                  <span style={{ color: '#6B7280', fontSize: 11 }}> • total {r.city_n}</span>
                ) : null}
              </div>

              <div
                style={{
                  height: 12,
                  background: '#111827',
                  borderRadius: 999,
                  overflow: 'hidden',
                  border: '1px solid #1F2937',
                }}
              >
                <div
                  style={{
                    width: `${Math.round(((r.avg || 0) / max) * 100)}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #3B82F6, #06B6D4)',
                  }}
                />
              </div>

              {!isMobile ? (
                <div style={{ color: '#9CA3AF', textAlign: 'right', fontSize: 12 }}>
                  {money ? `$${(r.avg || 0).toLocaleString()}` : (r.avg || 0).toLocaleString()}
                </div>
              ) : null}
            </div>
          ))}

          {top.length === 0 ? <div style={{ color: '#9CA3AF' }}>Not enough data.</div> : null}
        </div>
      </Card>
    );
  }

  // ---------- Date helpers ----------
  // Normalize ANY date-ish value into "YYYY-MM-DD" (safe for string comparisons / display)
  function ymd(d) {
    if (!d) return '';

    if (d instanceof Date) {
      if (Number.isNaN(d.getTime())) return '';
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    const s = String(d).trim();
    if (!s) return '';

    // Handles: "2025-06-30", "2025-06-30T00:00:00Z", "2025-06-30 00:00:00+00"
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

    const dt = new Date(s);
    if (Number.isNaN(dt.getTime())) return '';
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Convert any date-ish value to milliseconds (UTC-safe enough for filtering)
  function toMs(d) {
    if (!d) return NaN;
    if (d instanceof Date) return Number.isNaN(d.getTime()) ? NaN : d.getTime();

    const s = String(d).trim();
    if (!s) return NaN;

    // If it's already YYYY-MM-DD, force UTC midnight
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00.000Z`).getTime();

    const t = new Date(s).getTime();
    return Number.isNaN(t) ? NaN : t;
  }

  function yearFromYmd(ymdStr) {
    if (!ymdStr || typeof ymdStr !== 'string') return NaN;
    const m = ymdStr.match(/^(\d{4})-/);
    if (!m) return NaN;
    return Number(m[1]);
  }

  // ---------- Pull ALL rows (pagination) ----------
  async function fetchAllCompRows() {
    const pageSize = 1000;
    let from = 0;
    let all = [];

    while (true) {
      const to = from + pageSize - 1;

      const { data, error } = await supabase.from('comp_observations_raw').select('*').range(from, to);
      if (error) throw error;

      const chunk = data || [];
      all = all.concat(chunk);

      if (chunk.length < pageSize) break;
      from += pageSize;
      if (from > 200000) break; // safety
    }

    return all;
  }

  // ---------- Load once ----------
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr('');

        const data = await fetchAllCompRows();

        const cleaned = (data || [])
          .map((r) => {
            const city = String(r.City || '').trim();
            const st = String(r.StateCode || '').trim();

            // observed_date is the column you showed in Supabase.
            // Add a few fallbacks just in case a view/transform renamed it.
            const observed =
              r.observed_date ??
              r.observedDate ??
              r.ObservedDate ??
              r.Observed_Date ??
              r.observed_dt ??
              r.observedAt;

            const rawDate = observed || r.imported_at || r.created_at || '';
            const dateStr = ymd(rawDate);
            const dateMs = toMs(rawDate);
            const dateYear = yearFromYmd(dateStr);

            // Normalize category into: Attorney | Paralegal | Legal Support
            const rawCat = String(r.FolderGroupCategory || '').toLowerCase().trim();

            let normCategory = 'Legal Support';

            // Attorney bucket (broad, on purpose)
            if (
              rawCat.includes('attorney') ||
              rawCat.includes('lawyer') ||
              rawCat.includes('partner') ||
              rawCat.includes('associate') ||
              rawCat.includes('general counsel') ||
              rawCat.includes('gc') ||
              rawCat.includes('assistant general counsel') ||
              rawCat.includes('agc') ||
              rawCat.includes('counsel')
            ) {
              normCategory = 'Attorney';
            }
            // Paralegal bucket
            else if (rawCat.includes('paralegal')) {
              normCategory = 'Paralegal';
            }

            return {
              ...r,
              City: city,
              StateCode: st,

              // Force clean categories
              FolderGroupCategory: normCategory,

              _city_label: [city, st].filter(Boolean).join(', '),
              _salary: Number(r.Salary),
              _hourly: Number(r.Hourly),
              _date: dateStr,
              _dateMs: dateMs,
              _year: dateYear,
            };
          })
          .filter((r) => {
            const cat = String(r.FolderGroupCategory || '').trim().toLowerCase();
            return cat !== 'admin' && cat !== 'administrative';
          });

        setRawRows(cleaned);

        const cities = Array.from(new Set(cleaned.map((r) => r._city_label).filter(Boolean))).sort();
        setCITY_OPTIONS(cities);
        setGROUPS(Array.from(new Set(cleaned.map((r) => String(r.FolderGroup || '').trim()).filter(Boolean))).sort());
        setLANGUAGE_OPTIONS(Array.from(new Set(cleaned.map((r) => String(r.Language || '').trim()).filter(Boolean))).sort());
        setSTATES(Array.from(new Set(cleaned.map((r) => String(r.StateCode || '').trim()).filter(Boolean))).sort());

        setCATEGORY_OPTIONS(
          Array.from(new Set(cleaned.map((r) => String(r.FolderGroupCategory || '').trim()).filter(Boolean)))
            .filter((c) => !['admin', 'administrative'].includes(String(c).toLowerCase()))
            .sort()
        );

        // Years (desc)
        const years = Array.from(
          new Set(
            cleaned
              .map((r) => r._year)
              .filter((y) => Number.isFinite(y) && y > 1900 && y < 3000)
              .map((y) => String(y))
          )
        ).sort((a, b) => Number(b) - Number(a));
        setYEAR_OPTIONS(years);

        setCityQuery('');
        setICity('');
        setCityOpen(false);
        setCityActiveIdx(0);

        // Default: all years
        setIYearStart('');
        setIYearEnd('');

        buildInsights(cleaned);
      } catch (e) {
        console.error('Compensation load failed:', e);

        const msg =
          e && e.message ? e.message : e && e.error_description ? e.error_description : typeof e === 'string' ? e : '';

        setErr('Failed to load compensation data.' + (msg ? ' (' + msg + ')' : ''));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Close city dropdown when clicking outside
  useEffect(() => {
    function onDocMouseDown(e) {
      if (!cityWrapRef.current) return;
      if (!cityWrapRef.current.contains(e.target)) {
        setCityOpen(false);
        validateCitySelection(cityQuery);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityQuery, CITY_OPTIONS]);

  function passesFilters(r) {
    if (iCategory && String(r.FolderGroupCategory || '').trim() !== iCategory.trim()) return false;
    if (iGroup && String(r.FolderGroup || '').trim() !== iGroup.trim()) return false;
    if (iLang && String(r.Language || '').trim() !== iLang.trim()) return false;
    if (iState && String(r.StateCode || '').trim() !== iState.trim()) return false;

    if (iCity) {
      if (String(r._city_label || '').toLowerCase() !== iCity.toLowerCase()) return false;
    }

    if (iHourlyOnly) {
      if (!(Number.isFinite(r._hourly) && r._hourly > 0)) return false;
    }

    // Year filtering (inclusive)
    const ys = iYearStart ? Number(iYearStart) : NaN;
    const ye = iYearEnd ? Number(iYearEnd) : NaN;

    if (iYearStart || iYearEnd) {
      const y = Number(r._year);
      if (!Number.isFinite(y)) return false;
      if (Number.isFinite(ys) && y < ys) return false;
      if (Number.isFinite(ye) && y > ye) return false;
    }

    return true;
  }

  function buildInsights(all) {
    const rows = (all || []).filter((r) => passesFilters(r));

    const salaryVals = rows.map((r) => r._salary).filter((v) => Number.isFinite(v) && v > 0);
    const hourlyVals = rows.map((r) => r._hourly).filter((v) => Number.isFinite(v) && v > 0);

    const cityCounts = new Map();
    for (const r of rows) {
      const k = String(r._city_label || '').trim();
      if (!k) continue;
      cityCounts.set(k, (cityCounts.get(k) || 0) + 1);
    }

    const minCityOccurrences = 20;

    const byCitySalaryRaw = groupAgg(rows, '_city_label', '_salary', 'avg');
    const byCityHourlyRaw = groupAgg(rows, '_city_label', '_hourly', 'avg');

    const byCitySalary = byCitySalaryRaw
      .filter((r) => (cityCounts.get(r.label) || 0) >= minCityOccurrences)
      .map((r) => ({ ...r, city_n: cityCounts.get(r.label) || 0 }));

    const byCityHourly = byCityHourlyRaw
      .filter((r) => (cityCounts.get(r.label) || 0) >= minCityOccurrences)
      .map((r) => ({ ...r, city_n: cityCounts.get(r.label) || 0 }));

    setInsights({
      kpi: { salary: statsFrom(salaryVals), hourly: statsFrom(hourlyVals) },
      byCitySalary,
      byCityHourly,
      byGroupSalary: groupAgg(rows, 'FolderGroup', '_salary', 'avg').slice(0, 12),
      byGroupHourly: groupAgg(rows, 'FolderGroup', '_hourly', 'avg').slice(0, 12),
      byLanguageSalary: groupAgg(rows, 'Language', '_salary', 'avg').slice(0, 12),
      byLanguageHourly: groupAgg(rows, 'Language', '_hourly', 'avg').slice(0, 12),
      sampleN: rows.length,
      cityMinOccurrences: minCityOccurrences,
    });
  }

  async function applyFiltersNow() {
    setLoading(true);
    setErr('');
    try {
      buildInsights(rawRows);
    } catch (e) {
      console.error(e);
      setErr('Failed to load insights.');
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setICategory('');
    setIGroup('');
    setILang('');
    setIState('');
    setICity('');
    setCityQuery('');
    setCityOpen(false);
    setCityActiveIdx(0);
    setIHourlyOnly(false);

    setIYearStart('');
    setIYearEnd('');

    setTimeout(() => buildInsights(rawRows), 0);
  }

  function moneyRange(p25, p75, suffix = '') {
    if (!p25 || !p75) return '—';
    return `$${Number(p25).toLocaleString()}${suffix} - $${Number(p75).toLocaleString()}${suffix}`;
  }

  const filterSummary = useMemo(() => {
    const parts = [];
    if (iCategory) parts.push(iCategory);
    if (iGroup) parts.push(iGroup);
    if (iLang) parts.push(iLang);
    if (iCity) parts.push(iCity);
    else if (iState) parts.push(iState);
    if (iHourlyOnly) parts.push('Hourly only');

    if (iYearStart || iYearEnd) {
      const a = iYearStart || '…';
      const b = iYearEnd || '…';
      parts.push(`${a}–${b}`);
    } else {
      parts.push('All years');
    }

    return parts.filter(Boolean).join(' • ') || 'All';
  }, [iCategory, iGroup, iLang, iCity, iState, iHourlyOnly, iYearStart, iYearEnd]);

 // ---------- Background (match CLIENT workspace) ----------
const CLIENT_BG = '#E5E7EB'; // light slate like client page

const pageWrap = {
  minHeight: '100vh',
  background: CLIENT_BG,
};

const overlay = {
  minHeight: '100vh',
  background: CLIENT_BG,
  padding: isMobile ? 16 : 28,
  display: 'flex',
  justifyContent: 'center',
};

const container = {
  width: 'min(1150px, 100%)',
};


  // ---------- City typeahead logic ----------
  function normalizeCity(s) {
    return String(s || '').trim();
  }

  function validateCitySelection(value) {
    const v = normalizeCity(value);
    if (!v) {
      setICity('');
      return;
    }
    const exact = CITY_OPTIONS.find((c) => c.toLowerCase() === v.toLowerCase());
    if (exact) {
      setICity(exact);
      setCityQuery(exact);
    } else {
      setICity('');
    }
  }

  function selectCity(exact) {
    if (!exact) return;
    setICity(exact);
    setCityQuery(exact);
    setCityOpen(false);
    setCityActiveIdx(0);
    requestAnimationFrame(() => cityInputRef.current?.focus());
  }

  function handleCityChange(next) {
    setCityQuery(next);
    setICity('');
    setCityOpen(true);
    setCityActiveIdx(0);

    requestAnimationFrame(() => {
      const el = cityInputRef.current;
      if (!el) return;
      if (document.activeElement !== el) el.focus();
      const len = el.value?.length ?? 0;
      try {
        el.setSelectionRange(len, len);
      } catch {}
    });
  }

  const filteredCities = useMemo(() => {
    const q = normalizeCity(cityQuery).toLowerCase();
    if (!q) return CITY_OPTIONS.slice(0, 25);
    const starts = [];
    const contains = [];
    for (const c of CITY_OPTIONS) {
      const lc = c.toLowerCase();
      if (lc.startsWith(q)) starts.push(c);
      else if (lc.includes(q)) contains.push(c);
      if (starts.length + contains.length >= 25) break;
    }
    return starts.concat(contains).slice(0, 25);
  }, [CITY_OPTIONS, cityQuery]);

  const showCityHelp = Boolean(cityQuery && !iCity);

  // Keep year range sane if user picks backwards
  useEffect(() => {
    if (!iYearStart || !iYearEnd) return;
    const a = Number(iYearStart);
    const b = Number(iYearEnd);
    if (Number.isFinite(a) && Number.isFinite(b) && a > b) {
      // swap
      setIYearStart(String(b));
      setIYearEnd(String(a));
    }
  }, [iYearStart, iYearEnd]);

  return (
    <div style={pageWrap}>
      <div style={overlay}>
        <div style={container}>
          {/* Header */}
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
            <div style={{ fontWeight: 900, letterSpacing: 0.3, color: '#0EA5E9' }}>
              Talent Connector – Powered by Beacon Hill Legal <span style={{ color: '#93C5FD' }}>—</span>{' '}
              <span style={{ color: '#111827' }}>Compensation Insights</span>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 10,
                flexDirection: isMobile ? 'column' : 'row',
                width: isMobile ? '100%' : 'auto',
              }}
            >
              <Link
                href="/"
                style={{
                  textDecoration: 'none',
                  background: '#0B1220',
                  border: '1px solid #1F2937',
                  color: '#E5E7EB',
                  borderRadius: 12,
                  padding: '10px 12px',
                  fontWeight: 900,
                  textAlign: 'center',
                }}
              >
                Back to Search
              </Link>

              <Button onClick={applyFiltersNow} disabled={loading} style={{ width: isMobile ? '100%' : undefined }}>
                {loading ? 'Working…' : 'Apply'}
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card style={{ marginTop: 12, overflow: 'hidden' }}>
            <div style={{ fontWeight: 900, marginBottom: 12, color: '#E5E7EB' }}>Filters</div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, minmax(0, 1fr))',
                gap: 12,
                width: '100%',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <Label>Category</Label>
                <select value={iCategory} onChange={(e) => setICategory(e.target.value)} style={selectStyle}>
                  <option value="">Any</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ minWidth: 0 }}>
                <Label>Group</Label>
                <select value={iGroup} onChange={(e) => setIGroup(e.target.value)} style={selectStyle}>
                  <option value="">Any</option>
                  {GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ minWidth: 0 }}>
                <Label>Language</Label>
                <select value={iLang} onChange={(e) => setILang(e.target.value)} style={selectStyle}>
                  <option value="">Any</option>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ minWidth: 0 }}>
                <Label>State</Label>
                <select value={iState} onChange={(e) => setIState(e.target.value)} style={selectStyle}>
                  <option value="">Any</option>
                  {STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* City custom typeahead */}
              <div ref={cityWrapRef} style={{ minWidth: 0, position: 'relative' }}>
                <Label>City</Label>
                <input
                  ref={cityInputRef}
                  value={cityQuery}
                  onChange={(e) => handleCityChange(e.target.value)}
                  onFocus={() => {
                    setCityOpen(true);
                    setCityActiveIdx(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setCityOpen(true);
                      setCityActiveIdx((i) => Math.min(i + 1, Math.max(filteredCities.length - 1, 0)));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setCityActiveIdx((i) => Math.max(i - 1, 0));
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (cityOpen && filteredCities[cityActiveIdx]) {
                        selectCity(filteredCities[cityActiveIdx]);
                      } else {
                        const exact = CITY_OPTIONS.find((c) => c.toLowerCase() === normalizeCity(cityQuery).toLowerCase());
                        if (exact) selectCity(exact);
                        else setCityOpen(false);
                      }
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setCityOpen(false);
                    } else if (e.key === 'Tab') {
                      validateCitySelection(cityQuery);
                      setCityOpen(false);
                    }
                  }}
                  placeholder="Type e.g., Bos…"
                  style={inputStyle}
                />

                {cityOpen && filteredCities.length > 0 ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: 66,
                      left: 0,
                      right: 0,
                      zIndex: 50,
                      background: '#0B1220',
                      border: '1px solid #1F2937',
                      borderRadius: 12,
                      overflow: 'hidden',
                      boxShadow: '0 18px 60px rgba(0,0,0,0.35)',
                      maxHeight: 260,
                      overflowY: 'auto',
                    }}
                  >
                    {filteredCities.map((c, idx) => {
                      const active = idx === cityActiveIdx;
                      return (
                        <div
                          key={c}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectCity(c);
                          }}
                          onMouseEnter={() => setCityActiveIdx(idx)}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            background: active ? '#111827' : 'transparent',
                            color: '#E5E7EB',
                            borderTop: idx === 0 ? 'none' : '1px solid #111827',
                            fontSize: 13,
                          }}
                        >
                          {c}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {showCityHelp ? (
                  <div style={{ color: '#9CA3AF', fontSize: 11, marginTop: 6 }}>
                    Pick a city from the suggestions to apply.
                  </div>
                ) : null}
              </div>

              {/* Year range */}
              <div style={{ minWidth: 0 }}>
                <Label>Start year</Label>
                <select value={iYearStart} onChange={(e) => setIYearStart(e.target.value)} style={selectStyle}>
                  <option value="">Any</option>
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ minWidth: 0 }}>
                <Label>End year</Label>
                <select value={iYearEnd} onChange={(e) => setIYearEnd(e.target.value)} style={selectStyle}>
                  <option value="">Any</option>
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ minWidth: 0, display: 'flex', alignItems: 'end', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={iHourlyOnly} onChange={(e) => setIHourlyOnly(e.target.checked)} />
                  <span style={{ color: '#E5E7EB', fontSize: 13 }}>Hourly only</span>
                </label>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
              <Button onClick={applyFiltersNow} disabled={loading} style={{ width: isMobile ? '100%' : undefined }}>
                Apply
              </Button>

              <Button
                onClick={clearFilters}
                disabled={loading}
                style={{
                  background: '#111827',
                  border: '1px solid #1F2937',
                  color: '#E5E7EB',
                  width: isMobile ? '100%' : undefined,
                }}
              >
                Clear
              </Button>
            </div>

            {err ? <div style={{ marginTop: 10, color: '#F87171', fontSize: 12 }}>{err}</div> : null}
          </Card>

          {/* KPIs */}
          {insights?.kpi ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, minmax(0,1fr))',
                gap: 12,
                marginTop: 12,
              }}
            >
              <Kpi
                label="Median Salary"
                value={insights.kpi.salary.median ? `$${insights.kpi.salary.median.toLocaleString()}` : '—'}
                sub={insights.kpi.salary.avg ? `Avg $${insights.kpi.salary.avg.toLocaleString()}` : undefined}
              />
              <Kpi label="Typical Salary Range" value={moneyRange(insights.kpi.salary.p25, insights.kpi.salary.p75)} />
              <Kpi
                label="Median Hourly"
                value={insights.kpi.hourly.median ? `$${insights.kpi.hourly.median.toLocaleString()}/hr` : '—'}
                sub={
                  insights.kpi.hourly.avg
                    ? `Avg $${insights.kpi.hourly.avg.toLocaleString()}/hr`
                    : 'Hourly observations only'
                }
              />
              <Kpi label="Typical Hourly Range" value={moneyRange(insights.kpi.hourly.p25, insights.kpi.hourly.p75, '/hr')} />
              <Kpi label="Sample Size" value={insights.sampleN} sub={`Filter: ${filterSummary}`} />
            </div>
          ) : null}

          {/* City charts */}
          <BarChart
            title={`Avg Salary by City (min ${insights?.cityMinOccurrences || 20} records)`}
            rows={insights?.byCitySalary}
            money
            minN={1}
          />
          <BarChart
            title={`Avg Hourly by City (min ${insights?.cityMinOccurrences || 20} records)`}
            rows={insights?.byCityHourly}
            money
            minN={1}
          />

          {/* Optional */}
          <BarChart title="Avg Salary by Group" rows={insights?.byGroupSalary} money />
          <BarChart title="Avg Hourly by Group" rows={insights?.byGroupHourly} money />
          <BarChart title="Avg Salary by Language" rows={insights?.byLanguageSalary} money />
          <BarChart title="Avg Hourly by Language" rows={insights?.byLanguageHourly} money />

          <div style={{ height: 24 }} />
        </div>
      </div>
    </div>
  );
}
