'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '../../lib/supabaseClient';

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

/* ---------- Chart Component (forces Top 5 only) ---------- */
function ChartCard({ title, data }) {
  const limited = Array.isArray(data) ? data.slice(0, 5) : [];
// compute only the total of the shown slices (top 5)
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

/* ---------- Main Page ---------- */
export default function SearchInsights() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('search_logs')
        .select('title, type_of_law, metro')
        .limit(10000);
      if (error) {
        console.error(error);
        setRows([]);
      } else {
        const valid = (data || []).filter((r) => r.title || r.type_of_law || r.metro);
        setRows(valid);
      }
      setLoading(false);
    })();
  }, []);

  // compute top 5 only
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

  const summary = [
    topMetro && `Search volume was highest in ${topMetro.name}`,
    topLaw && `with ${topLaw.name.toLowerCase()} law showing notable activity`,
    topTitle && `and ${topTitle.name.toLowerCase()} roles leading among client queries`,
  ]
    .filter(Boolean)
    .join(', ') || 'Search activity data is being collected.';

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
        {/* Header */}
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

        {/* Summary */}
        <div
          style={{
            background: '#F9FAFB',
            padding: '16px 20px',
            borderLeft: '4px solid #2563EB',
            borderRadius: 8,
            marginBottom: 36,
          }}
        >
          <p style={{ margin: 0, color: '#1F2937', fontSize: 17, lineHeight: 1.6 }}>{summary}</p>
        </div>

        {/* Highlights */}
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

        {/* Donut Charts */}
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
