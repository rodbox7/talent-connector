'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from 'chart.js';

import { supabase } from '../../lib/supabaseClient';

// Register chart.js extras
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTooltip, ChartLegend);

// expose supabase for console testing
if (typeof window !== 'undefined') window.__sb = supabase;

/* ---------- Utility: return top N only ---------- */
function topCounts(items, key, limit = 5) {
  const counts = {};
  for (const row of items) {
    const val = (row?.[key] || '').trim();
    if (!val) continue;
    counts[val] = (counts[val] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

const COLORS = ['#2563EB', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B'];

/* ---------- Chart Component (Top 5 only) ---------- */
function ChartCard({ title, data }) {
  const limited = Array.isArray(data) ? data.slice(0, 5) : [];

  const total = (data || [])
    .slice(0, 5)
    .reduce((sum, d) => sum + (d.value || 0), 0);

  if (!limited.length) return null;

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
        textAlign: 'center',
      }}
    >
      <h3 style={{ fontSize: 20, marginBottom: 16, color: '#111827' }}>{title}</h3>
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={limited}
              cx="50%"
              cy="48%"
              innerRadius={60}
              outerRadius={100}
              dataKey="value"
              paddingAngle={3}
            >
              {limited.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="white" />
              ))}
            </Pie>

            <Legend
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: '#374151' }}
              payload={limited.map((item, i) => ({
                value: item.name,
                type: 'circle',
                color: COLORS[i % COLORS.length],
                payload: item,
              }))}
              formatter={(value, entry) => {
                const v = entry?.payload?.value ?? 0;
                const pct = total ? Math.round((v / total) * 100) : 0;
                return `${value} (${v}, ${pct}%)`;
              }}
            />

            <Tooltip formatter={(v) => [`${v}`, 'Searches']} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p style={{ color: '#4B5563', fontSize: 14, marginTop: 8 }}>
        Showing Top 5 — Total: {total.toLocaleString()} searches
      </p>
    </div>
  );
}
function formatSavedSearch(filters) {
  if (!filters || typeof filters !== 'object') return '—';

  const parts = [];

  // Primary intent (most important first)
  if (filters.fTitle) parts.push(filters.fTitle);
  if (filters.search) parts.push(filters.search);

  // Practice / law
  if (filters.fLaw) parts.push(filters.fLaw);

  // Location
  if (filters.fCity) parts.push(filters.fCity);

  // Flags
  if (filters.contractOnly === true) parts.push('Contract only');
  if (filters.showOffMarket === true) parts.push('Includes off-market');

  return parts.join(' • ') || '—';
}

/* ---------- MAIN PAGE ---------- */
export default function SearchInsights() {
  const [rows, setRows] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
const [userEmails, setUserEmails] = useState({});

  // ✅ NEW (saved searches)
  const [savedSearches, setSavedSearches] = useState([]);
  const [loadingSavedSearches, setLoadingSavedSearches] = useState(true);

  /* --------- Load Top Insights (90 days) ---------- */
useEffect(() => {
  (async () => {
    const { data, error } = await supabase
      .from('v_search_logs_90d')
      .select('title, type_of_law, metro, created_at')
      .limit(10000);

    if (error) {
      console.error('Supabase error (top insights):', error);
      setRows([]);
    } else {
      const valid = (data || []).filter((r) => r.title || r.type_of_law || r.metro);
      setRows(valid);
    }
    setLoading(false);
  })();
}, []);

/* --------- Load FULL Recent Search Activity (raw logs) ---------- */
useEffect(() => {
  (async () => {
    const { data, error } = await supabase
      .from('search_logs')
      .select('id, user_email, title, type_of_law, metro, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Supabase error (search logs):', error);
      setRecentSearches([]);
    } else {
      setRecentSearches(data || []);
    }
    setLoadingRecent(false);
  })();
}, []);

/* --------- Load Saved Searches ---------- */
useEffect(() => {
  (async () => {
    const { data, error } = await supabase
      .from('saved_searches')
      .select('id, user_id, name, filters, alerts_enabled, alert_frequency, created_at')
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) {
      console.error('Supabase error (saved searches):', error);
      setSavedSearches([]);
    } else {
      setSavedSearches(data || []);
    }
    setLoadingSavedSearches(false);
  })();
}, []);

/* --------- NEW: Map user_id -> email from profiles ---------- */
useEffect(() => {
  if (!savedSearches || savedSearches.length === 0) return;

  const ids = [...new Set(savedSearches.map((s) => s.user_id).filter(Boolean))];
  if (ids.length === 0) return;

  (async () => {
    const { data, error } = await supabase.from('profiles').select('id, email').in('id', ids);

    if (error) {
      console.error('Supabase error (profiles emails):', error);
      return;
    }

    const map = {};
    (data || []).forEach((u) => {
      map[u.id] = u.email;
    });

    setUserEmails(map);
  })();
}, [savedSearches]);

  // ---- Compute top 5 ----
  const insights = useMemo(() => {
    const byTitle = topCounts(rows, 'title', 5);
    const byLaw = topCounts(rows, 'type_of_law', 5);
    const byMetro = topCounts(rows, 'metro', 5);
    return { byTitle, byLaw, byMetro };
  }, [rows]);

  const topMetro = insights.byMetro?.[0];
  const topLaw = insights.byLaw?.[0];
  const topTitle = insights.byTitle?.[0];

  const weekOf = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const summary =
    [
      topMetro && `Search volume was highest in ${topMetro.name}`,
      topLaw && `with ${topLaw.name.toLowerCase()} law showing notable activity`,
      topTitle && `and ${topTitle.name.toLowerCase()} roles leading among client queries`,
    ]
      .filter(Boolean)
      .join(', ') || 'Search activity data is being collected.';

  /* ---------- Daily Search Activity ---------- */
  const searchesByDay = useMemo(() => {
    const counts = {};
    recentSearches.forEach((r) => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [recentSearches]);

  const dailyChartData = {
    labels: searchesByDay.map((d) =>
      new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ),
    datasets: [
      {
  label: 'Searches per Day',
  data: searchesByDay.map((d) => d.count),
  borderColor: '#2563EB',
  backgroundColor: 'rgba(37,99,235,0.15)',
  borderWidth: 3,
  tension: 0.3,
  fill: true,
},

    ],
  };

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #EEF2FF 0%, #FFFFFF 100%)',
        minHeight: '100vh',
        padding: '48px 20px',
        fontFamily:
          '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 1000,
          margin: '0 auto',
          background: 'white',
          borderRadius: 20,
          padding: 36,
          boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
        }}
      >
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#111827' }}>
            Beacon Hill Legal – Search Insights
          </h1>
          <Link href="/" style={{ textDecoration: 'none', fontWeight: 600, color: '#2563EB' }}>
            ← Back to Search
          </Link>
        </div>

        <p style={{ marginTop: 4, marginBottom: 28, color: '#6B7280' }}>
          Weekly Summary – {weekOf}
        </p>

        {/* SUMMARY CARD */}
        <div
          style={{
            background: '#F9FAFB',
            padding: '16px 20px',
            borderLeft: '4px solid #2563EB',
            borderRadius: 8,
            marginBottom: 36,
          }}
        >
          <p style={{ margin: 0, color: '#1F2937', fontSize: 17, lineHeight: 1.6 }}>
            {summary}
          </p>
        </div>

        {/* HIGHLIGHTS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg,#2563EB,#1D4ED8)',
              color: 'white',
              borderRadius: 14,
              padding: 20,
              boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
            }}
          >
            <h3 style={{ margin: 0, fontSize: 14 }}>Top Metro</h3>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{topMetro?.name || '—'}</div>
            <div style={{ fontSize: 14 }}>
              {topMetro ? `${topMetro.value} searches` : 'No data'}
            </div>
          </div>

          <div
            style={{
              background: 'linear-gradient(135deg,#9333EA,#7E22CE)',
              color: 'white',
              borderRadius: 14,
              padding: 20,
              boxShadow: '0 4px 14px rgba(147,51,234,0.35)',
            }}
          >
            <h3 style={{ margin: 0, fontSize: 14 }}>Top Type of Law</h3>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{topLaw?.name || '—'}</div>
            <div style={{ fontSize: 14 }}>
              {topLaw ? `${topLaw.value} searches` : 'No data'}
            </div>
          </div>

          <div
            style={{
              background: 'linear-gradient(135deg,#059669,#047857)',
              color: 'white',
              borderRadius: 14,
              padding: 20,
              boxShadow: '0 4px 14px rgba(4,120,87,0.35)',
            }}
          >
            <h3 style={{ margin: 0, fontSize: 14 }}>Top Title</h3>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{topTitle?.name || '—'}</div>
            <div style={{ fontSize: 14 }}>
              {topTitle ? `${topTitle.value} searches` : 'No data'}
            </div>
          </div>
        </div>

        {/* DONUT CHARTS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 28,
          }}
        >
          <ChartCard title="Top Titles" data={insights.byTitle} />
          <ChartCard title="Top Types of Law" data={insights.byLaw} />
          <ChartCard title="Top Metro Areas" data={insights.byMetro} />
        </div>

        {/* RECENT SEARCH ACTIVITY */}
        <div style={{ marginTop: 60 }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 20 }}>
            Recent Search Activity
          </h2>

          {/* Search Timeline */}
          <div
            style={{
              background: 'white',
              padding: 24,
              borderRadius: 16,
              boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
              marginBottom: 30,
            }}
          >
            <h3 style={{ margin: 0, marginBottom: 12, color: '#1F2937', fontSize: 16 }}>
              Search Timeline
            </h3>
            <div style={{ width: '100%', height: 320 }}>
              <Line
                data={dailyChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true } },
                }}
              />
            </div>
          </div>

          {/* SAVED SEARCHES */}
          <div
            style={{
              background: 'white',
              padding: 24,
              borderRadius: 16,
              boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
              marginBottom: 30,
            }}
          >
            <h3 style={{ margin: 0, marginBottom: 12, color: '#1F2937', fontSize: 16 }}>
              Saved Searches
            </h3>

            {loadingSavedSearches ? (
              <p style={{ color: '#6B7280', fontSize: 14 }}>Loading saved searches…</p>
            ) : savedSearches.length === 0 ? (
              <p style={{ color: '#6B7280', fontSize: 14 }}>No saved searches yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                 <thead>
  <tr>
    <th style={{ padding: 10, borderBottom: '1px solid #E5E7EB', color: '#6B7280' }}>
      User
    </th>
    <th style={{ padding: 10, borderBottom: '1px solid #E5E7EB', color: '#6B7280' }}>
      Search Name
    </th>
    <th style={{ padding: 10, borderBottom: '1px solid #E5E7EB', color: '#6B7280' }}>
      Criteria
    </th>
    <th style={{ padding: 10, borderBottom: '1px solid #E5E7EB', color: '#6B7280' }}>
      Alerts
    </th>
    <th style={{ padding: 10, borderBottom: '1px solid #E5E7EB', color: '#6B7280' }}>
      Created
    </th>
  </tr>
</thead>

                  <tbody>
                   {savedSearches.map((s) => (
  <tr key={s.id}>
  {/* USER */}
  <td style={{ padding: 10, color: '#111827', fontSize: 13 }}>
    {userEmails[s.user_id] || '—'}
  </td>

  {/* SEARCH NAME */}
  <td style={{ padding: 10, fontWeight: 600, color: '#111827' }}>
    {s.name || 'Untitled Search'}
  </td>

    <td style={{ padding: 10, color: '#111827' }}>
  {(() => {
    if (!s.filters) return '—';

    let parsed = s.filters;

    // Handle stringified JSON
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        return '—';
      }
    }

    return formatSavedSearch(parsed);
  })()}
</td>

    <td style={{ padding: 10 }}>
      {s.alerts_enabled ? `On (${s.alert_frequency})` : 'Off'}
    </td>

    <td style={{ padding: 10 }}>
      {new Date(s.created_at).toLocaleDateString()}
    </td>
  </tr>
))}

                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RECENT SEARCH TABLE */}
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 14,
                color: '#111827',
              }}
            >
              <thead>
                <tr>
                  <th style={{ padding: 10, borderBottom: '1px solid #E5E7EB' }}>User</th>
                  <th style={{ padding: 10, borderBottom: '1px solid #E5E7EB' }}>Title</th>
                  <th style={{ padding: 10, borderBottom: '1px solid #E5E7EB' }}>Type of Law</th>
                  <th style={{ padding: 10, borderBottom: '1px solid #E5E7EB' }}>Metro</th>
                  <th style={{ padding: 10, borderBottom: '1px solid #E5E7EB' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentSearches.map((r) => (
                  <tr key={r.id}>
                    <td style={{ padding: 10 }}>{r.user_email || '—'}</td>
                    <td style={{ padding: 10 }}>{r.title || '—'}</td>
                    <td style={{ padding: 10 }}>{r.type_of_law || '—'}</td>
                    <td style={{ padding: 10 }}>{r.metro || '—'}</td>
                    <td style={{ padding: 10 }}>
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ color: '#6B7280', fontSize: 12, marginTop: 10 }}>
            Note: Older searches may show “—” for User until new searches are run with user
            tracking enabled.
          </p>
        </div>

        {/* FOOTER */}
        <div
          style={{
            textAlign: 'center',
            marginTop: 48,
            paddingTop: 16,
            borderTop: '1px solid #E5E7EB',
            color: '#6B7280',
            fontSize: 13,
          }}
        >
          © {new Date().getFullYear()} Beacon Hill Legal · Weekly Talent Connector Analytics
        </div>
      </div>
    </div>
  );
}
