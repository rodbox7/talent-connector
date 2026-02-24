'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function CompensationSearchLogPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr('');

      const { data, error } = await supabase
        .from('compensation_search_logs')
        .select(`
          id,
          created_at,
          user_email,
          category,
          group_name,
          language,
          state,
          city,
          hourly_only,
          year
        `)
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) {
        console.error(error);
        setErr('Failed to load search logs.');
        setRows([]);
      } else {
        setRows(data || []);
      }

      setLoading(false);
    })();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#E5E7EB', padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
            Compensation Search Log
          </h1>

          <Link
            href="/search-insights"
            style={{ fontWeight: 700, color: '#0EA5E9', textDecoration: 'none' }}
          >
            ← Back to Search Insights
          </Link>
        </div>

        {/* Table Card */}
        <div
          style={{
            background: 'white',
            borderRadius: 14,
            padding: 16,
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          }}
        >
          {loading ? (
            <div style={{ color: '#6B7280' }}>Loading…</div>
          ) : err ? (
            <div style={{ color: '#DC2626' }}>{err}</div>
          ) : rows.length === 0 ? (
            <div style={{ color: '#6B7280' }}>No searches yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr>
                    {[
                      'Time',
                      'User',
                      'Category',
                      'Group',
                      'Language',
                      'State',
                      'City',
                      'Hourly',
                      'Year',
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: 10,
                          borderBottom: '1px solid #E5E7EB',
                          color: '#6B7280',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td style={cell}>
                        {r.created_at
                          ? new Date(r.created_at).toLocaleString()
                          : '—'}
                      </td>

                      <td style={cell}>{r.user_email || '—'}</td>
                      <td style={cell}>{r.category || '—'}</td>
                      <td style={cell}>{r.group_name || '—'}</td>
                      <td style={cell}>{r.language || '—'}</td>
                      <td style={cell}>{r.state || '—'}</td>
                      <td style={cell}>{r.city || '—'}</td>
                      <td style={cell}>{r.hourly_only ? 'Yes' : 'No'}</td>
                      <td style={cell}>{r.year ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: '#6B7280' }}>
          Showing latest 300 searches
        </div>
      </div>
    </div>
  );
}

const cell = {
  padding: 10,
  borderBottom: '1px solid #E5E7EB',
  whiteSpace: 'nowrap',
  color: '#111827',
  fontWeight: 500,
};