'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function RecruiterInsightsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [range, setRange] = useState('MTD'); // MTD | YTD | ALL

  useEffect(() => {
    loadData();
  }, [range]);

  async function loadData() {
    setLoading(true);
    setErr('');

    const { data, error } = await supabase.rpc(
      'recruiter_candidate_counts',
      { time_range: range }
    );

    if (error) {
      console.error('RPC error:', error);
      setErr('Failed to load recruiter insights.');
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(
      (data || []).map((r) => ({
        id: r.recruiter_id,
        name: r.recruiter_name,
        count: Number(r.candidate_count || 0),
      }))
    );

    setLoading(false);
  }

  const topRows = useMemo(() => rows.slice(0, 10), [rows]);
  const maxCount = Math.max(...topRows.map((r) => r.count), 0);

  const chartData = {
    labels: topRows.map((r) => r.name),
    datasets: [
      {
        label: 'Candidates Entered',
        data: topRows.map((r) => r.count),
        backgroundColor: 'rgba(96,165,250,0.9)',
        borderRadius: 6,
        barThickness: 20,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: {
        labels: { color: '#fff' },
      },
      tooltip: {
        titleColor: '#fff',
        bodyColor: '#fff',
        backgroundColor: 'rgba(0,0,0,0.85)',
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        suggestedMax: maxCount + 2,
        ticks: { color: '#fff' },
        grid: { color: 'rgba(255,255,255,0.12)' },
      },
      y: {
        ticks: { color: '#fff', font: { size: 12 } },
        grid: { color: 'rgba(255,255,255,0.06)' },
      },
    },
  };

  const rangeLabel =
    range === 'MTD'
      ? 'Month to Date'
      : range === 'YTD'
      ? 'Year to Date'
      : 'All Time';

  const monthLabel = new Date().toLocaleString('default', { month: 'long' });

  return (
  <div style={{ padding: 24 }}>
    <a
      href="/"
      style={{
        display: 'inline-block',
        marginBottom: 10,
        color: '#93C5FD',
        fontSize: 13,
        fontWeight: 700,
        textDecoration: 'none',
      }}
    >
      ← Back to Recruiter Home
    </a>

    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
        Recruiter Insights
      </h1>
      <span style={{ opacity: 0.75, fontSize: 13 }}>
        Candidates entered • {rangeLabel}
        {range === 'MTD' ? ` (${monthLabel})` : ''}
      </span>
    </div>

    {/* RANGE TOGGLE */}

      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { key: 'MTD', label: 'Month to Date' },
          { key: 'YTD', label: 'Year to Date' },
          { key: 'ALL', label: 'All Time' },
        ].map((btn) => (
          <button
            key={btn.key}
            onClick={() => setRange(btn.key)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.25)',
              background:
                range === btn.key
                  ? 'rgba(96,165,250,0.9)'
                  : 'rgba(0,0,0,0.5)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ marginTop: 20 }}>Loading…</p>
      ) : err ? (
        <div
          style={{
            marginTop: 18,
            padding: 14,
            borderRadius: 10,
            background: 'rgba(0,0,0,0.55)',
            color: '#FCA5A5',
            fontWeight: 700,
          }}
        >
          {err}
        </div>
      ) : (
        <>
          {/* TOP 10 CHART */}
          <div
            style={{
              marginTop: 22,
              padding: 18,
              borderRadius: 12,
              background: 'rgba(0,0,0,0.65)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>
                Top 10 Recruiters ({range})
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                Total recruiters: {rows.length}
              </div>
            </div>

            <div style={{ height: 420, marginTop: 14 }}>
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* FULL LEADERBOARD */}
          <div
            style={{
              marginTop: 22,
              padding: 18,
              borderRadius: 12,
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
          >
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 14, marginBottom: 12 }}>
              Full Leaderboard
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.18)' }}>
                  <th align="left">Rank</th>
                  <th align="left">Recruiter</th>
                  <th align="left">Candidates Entered</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <td>{i + 1}</td>
                    <td>{r.name}</td>
                    <td style={{ fontWeight: 800 }}>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
