'use client';
import React from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

/**
 * Compensation Insights
 * - No extra deps (pure React + SVG)
 * - Pulls from public.candidates (titles_csv, law_csv, city/state, salary, hourly, years)
 * - Filters: Location (City, State), Title, Practice Area
 * - Charts:
 *    1) Avg Salary by Title (scoped to selected Location, else overall)
 *    2) Avg Hourly by Title (scoped to selected Location, else overall)
 *    3) Avg Salary by Practice Area (scoped to selected Location, else overall)
 *    4) Avg Hourly by Practice Area (scoped to selected Location, else overall)
 *    5) Pie: Candidate distribution by State (or City if preferred)
 */

const PageWrap = ({ children }) => (
  <div
    style={{
      minHeight: '100vh',
      width: '100%',
      backgroundImage:
        "url('https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg')",
      backgroundPosition: 'center',
      backgroundSize: 'cover',
      backgroundAttachment: 'fixed',
    }}
  >
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backdropFilter: 'blur(1px)',
        background:
          'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.65) 16%, rgba(0,0,0,0.75) 100%)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '32px 16px',
      }}
    >
      <div style={{ width: 'min(1200px, 100%)' }}>{children}</div>
    </div>
  </div>
);

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

const Select = (props) => (
  <select
    {...props}
    style={{
      width: '100%',
      padding: '10px 12px',
      borderRadius: 10,
      border: '1px solid #1F2937',
      background: '#0F172A',
      color: '#E5E7EB',
      outline: 'none',
      ...(props.style || {}),
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

/* ---------------- helpers ---------------- */

function splitCSV(s = '') {
  return String(s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}
function fmtMoney(n) {
  if (n == null || isNaN(n)) return '—';
  return `$${Math.round(n).toLocaleString()}`;
}
function average(arr) {
  const vals = arr.filter((v) => v != null && !isNaN(v));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
function groupAvg(rows, keyFn, valueFn) {
  const map = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!k) continue;
    const v = valueFn(r);
    if (v == null || isNaN(v)) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(v);
  }
  return Array.from(map.entries())
    .map(([k, arr]) => ({ key: k, avg: average(arr) }))
    .filter((x) => x.avg != null)
    .sort((a, b) => b.avg - a.avg);
}

function useCandidates() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState('');

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr('');
        const { data, error } = await supabase
          .from('candidates')
          .select(
            'id,name,titles_csv,law_csv,city,state,years,salary,contract,hourly,date_entered,created_at'
          )
          .limit(5000);
        if (error) throw error;
        setRows(data || []);
      } catch (e) {
        console.error(e);
        setErr('Error loading compensation data.');
      }
      setLoading(false);
    })();
  }, []);

  return { rows, loading, err };
}

/* ------------ tiny SVG chart primitives ------------ */

function BarChart({ title, data, height = 240, color = '#60A5FA', fmt = fmtMoney }) {
  const pad = 24;
  const width = 820;
  const max = Math.max(1, ...data.map((d) => d.avg || 0));
  const barW = Math.max(16, Math.floor((width - pad * 2) / Math.max(1, data.length)));
  const chartH = height - pad * 2;

  return (
    <Card style={{ overflow: 'hidden' }}>
      <div style={{ color: '#E5E7EB', fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {data.length === 0 ? (
        <div style={{ color: '#9CA3AF', fontSize: 12 }}>No data.</div>
      ) : (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* y-grid */}
          {[0.25, 0.5, 0.75, 1].map((p) => (
            <line
              key={p}
              x1={pad}
              y1={pad + (1 - p) * chartH}
              x2={width - pad}
              y2={pad + (1 - p) * chartH}
              stroke="rgba(255,255,255,0.08)"
            />
          ))}
          {/* bars */}
          {data.map((d, i) => {
            const h = (d.avg / max) * chartH;
            const x = pad + i * barW + 2;
            const y = pad + (chartH - h);
            return (
              <g key={d.key}>
                <rect x={x} y={y} width={barW - 4} height={h} fill={color} rx="4" />
                {/* labels */}
                <text
                  x={x + (barW - 4) / 2}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#9CA3AF"
                >
                  {d.key.length > 12 ? d.key.slice(0, 12) + '…' : d.key}
                </text>
                <text
                  x={x + (barW - 4) / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#CBD5E1"
                >
                  {fmt(d.avg)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </Card>
  );
}

function PieChart({ title, slices, radius = 140 }) {
  const size = radius * 2 + 20;
  const cx = size / 2;
  const cy = size / 2 + 8;
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  let angle = -Math.PI / 2;

  const colors = [
    '#60A5FA',
    '#34D399',
    '#F59E0B',
    '#F87171',
    '#A78BFA',
    '#F472B6',
    '#22D3EE',
    '#FB7185',
    '#93C5FD',
    '#4ADE80',
  ];

  const arcs = slices.slice(0, 10).map((s, i) => {
    const frac = s.value / total;
    const start = angle;
    const end = angle + frac * Math.PI * 2;
    angle = end;

    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);
    const x2 = cx + radius * Math.cos(end);
    const y2 = cy + radius * Math.sin(end);
    const large = end - start > Math.PI ? 1 : 0;

    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
    return { d, color: colors[i % colors.length], label: s.label, value: s.value };
  });

  return (
    <Card>
      <div style={{ color: '#E5E7EB', fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {slices.length === 0 ? (
        <div style={{ color: '#9CA3AF', fontSize: 12 }}>No data.</div>
      ) : (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <svg width={size} height={size} style={{ flexShrink: 0 }}>
            {arcs.map((a, i) => (
              <path key={i} d={a.d} fill={a.color} stroke="rgba(0,0,0,0.4)" />
            ))}
          </svg>
          <div style={{ display: 'grid', gap: 6 }}>
            {arcs.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#CBD5E1' }}>
                <span style={{ width: 12, height: 12, background: a.color, borderRadius: 2 }} />
                <span style={{ minWidth: 120 }}>{a.label}</span>
                <span style={{ color: '#9CA3AF', fontSize: 12 }}>
                  {a.value} {a.value === 1 ? 'candidate' : 'candidates'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ---------------- main page ---------------- */

export default function InsightsPage() {
  const { rows, loading, err } = useCandidates();

  // Build filter options
  const allLocations = React.useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const loc = [r.city, r.state].filter(Boolean).join(', ');
      if (loc) set.add(loc);
    });
    return Array.from(set).sort();
  }, [rows]);

  const allTitles = React.useMemo(() => {
    const set = new Set();
    rows.forEach((r) => splitCSV(r.titles_csv).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [rows]);

  const allLaws = React.useMemo(() => {
    const set = new Set();
    rows.forEach((r) => splitCSV(r.law_csv).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [rows]);

  // Filters
  const [loc, setLoc] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [law, setLaw] = React.useState('');

  const scoped = React.useMemo(() => {
    return rows.filter((r) => {
      if (loc) {
        const l = [r.city, r.state].filter(Boolean).join(', ');
        if (l !== loc) return false;
      }
      if (title) {
        if (!splitCSV(r.titles_csv).some((t) => t.toLowerCase() === title.toLowerCase())) return false;
      }
      if (law) {
        if (!splitCSV(r.law_csv).some((t) => t.toLowerCase() === law.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, loc, title, law]);

  // Charts data
  const salaryByTitle = React.useMemo(() => {
    return groupAvg(scoped, (r) => splitCSV(r.titles_csv)[0], (r) => r.salary);
  }, [scoped]);

  const hourlyByTitle = React.useMemo(() => {
    return groupAvg(
      scoped.filter((r) => r.contract),
      (r) => splitCSV(r.titles_csv)[0],
      (r) => r.hourly
    );
  }, [scoped]);

  const salaryByLaw = React.useMemo(() => {
    // explode by law area
    const exploded = [];
    scoped.forEach((r) => {
      splitCSV(r.law_csv).forEach((p) => exploded.push({ ...r, _law: p }));
    });
    return groupAvg(exploded, (r) => r._law, (r) => r.salary);
  }, [scoped]);

  const hourlyByLaw = React.useMemo(() => {
    const exploded = [];
    scoped.forEach((r) => {
      splitCSV(r.law_csv).forEach((p) => exploded.push({ ...r, _law: p }));
    });
    return groupAvg(
      exploded.filter((r) => r.contract),
      (r) => r._law,
      (r) => r.hourly
    );
  }, [scoped]);

  const pieByState = React.useMemo(() => {
    const map = new Map();
    scoped.forEach((r) => {
      const k = r.state || '—';
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [scoped]);

  return (
    <PageWrap>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#E5E7EB' }}>
        <div style={{ fontWeight: 800, letterSpacing: 0.3, fontSize: 18 }}>
          Compensation Insights
          <span style={{ color: '#93C5FD' }}> — </span>
          <span style={{ color: '#9CA3AF' }}>{rows.length} candidates</span>
        </div>
        <Link href="/"><Button style={{ background: '#0B1220', border: '1px solid #1F2937' }}>Back to Client</Button></Link>
      </div>

      {/* Filters */}
      <Card style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 10, color: '#E5E7EB' }}>Filters (scope the charts)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          <div>
            <Label>Location</Label>
            <Select value={loc} onChange={(e) => setLoc(e.target.value)}>
              <option value="">All locations</option>
              {allLocations.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Select value={title} onChange={(e) => setTitle(e.target.value)}>
              <option value="">All titles</option>
              {allTitles.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Practice Area</Label>
            <Select value={law} onChange={(e) => setLaw(e.target.value)}>
              <option value="">All practice areas</option>
              {allLaws.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {loading ? (
          <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 10 }}>Loading…</div>
        ) : err ? (
          <div style={{ color: '#F87171', fontSize: 12, marginTop: 10 }}>{err}</div>
        ) : null}
      </Card>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 12 }}>
        <BarChart
          title={`Average Salary by Title${loc ? ` — ${loc}` : ''}`}
          data={salaryByTitle}
          color="#60A5FA"
        />
        <BarChart
          title={`Average Hourly by Title${loc ? ` — ${loc}` : ''}`}
          data={hourlyByTitle}
          color="#34D399"
          fmt={(n) => (n == null ? '—' : `$${Math.round(n)}/hr`)}
        />
        <BarChart
          title={`Average Salary by Practice Area${loc ? ` — ${loc}` : ''}`}
          data={salaryByLaw}
          color="#A78BFA"
        />
        <BarChart
          title={`Average Hourly by Practice Area${loc ? ` — ${loc}` : ''}`}
          data={hourlyByLaw}
          color="#F59E0B"
          fmt={(n) => (n == null ? '—' : `$${Math.round(n)}/hr`)}
        />
        <PieChart title="Candidate Distribution by State" slices={pieByState} />
      </div>

      <div style={{ height: 16 }} />
    </PageWrap>
  );
}
