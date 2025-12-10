// app/legal-insights/page.jsx
'use client';

import React from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const outerWrap = {
  minHeight: '100vh',
  background: 'radial-gradient(circle at top, #0b1120 0, #020617 55%)',
  color: '#E5E7EB',
  padding: '24px 12px',
};

const container = {
  maxWidth: '1100px',
  margin: '0 auto',
};

const headerWrap = {
  marginBottom: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const titleStyle = {
  fontSize: 26,
  fontWeight: 700,
  letterSpacing: '0.04em',
};

const subtitleStyle = {
  fontSize: 14,
  color: '#9CA3AF',
  maxWidth: 650,
};

const chipRow = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 8,
};

const chip = {
  fontSize: 11,
  padding: '4px 10px',
  borderRadius: 999,
  border: '1px solid rgba(148,163,184,0.6)',
  background: 'rgba(15,23,42,0.85)',
  color: '#E5E7EB',
};

const grid = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 16,
};

const twoColGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 16,
};

const card = {
  background: 'rgba(15,23,42,0.96)',
  borderRadius: 16,
  padding: 16,
  border: '1px solid rgba(148,163,184,0.45)',
  boxShadow: '0 18px 45px rgba(15,23,42,0.9)',
};

const cardHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 10,
};

const cardTitle = {
  fontSize: 15,
  fontWeight: 600,
};

const cardSubtitle = {
  fontSize: 11,
  color: '#9CA3AF',
};

const badge = {
  fontSize: 10,
  padding: '2px 8px',
  borderRadius: 999,
  background: 'rgba(37,99,235,0.2)',
  border: '1px solid rgba(59,130,246,0.85)',
  color: '#BFDBFE',
};

const statRow = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  marginTop: 6,
};

const statPill = {
  padding: '6px 10px',
  borderRadius: 999,
  background: 'rgba(15,23,42,0.9)',
  border: '1px solid rgba(55,65,81,0.9)',
  fontSize: 11,
};

const statLabel = {
  color: '#9CA3AF',
  marginRight: 4,
};

const statValue = {
  color: '#E5E7EB',
  fontWeight: 600,
};

const footerNote = {
  fontSize: 11,
  color: '#9CA3AF',
  marginTop: 12,
  lineHeight: 1.5,
};

const chartBaseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: '#E5E7EB',
        font: { size: 11 },
      },
    },
    title: {
      display: false,
    },
    tooltip: {
      backgroundColor: 'rgba(15,23,42,0.95)',
      titleColor: '#F9FAFB',
      bodyColor: '#E5E7EB',
      borderColor: 'rgba(148,163,184,0.8)',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      ticks: { color: '#9CA3AF', font: { size: 10 } },
      grid: { color: 'rgba(31,41,55,0.9)' },
    },
    y: {
      ticks: { color: '#9CA3AF', font: { size: 10 } },
      grid: { color: 'rgba(31,41,55,0.9)' },
    },
  },
};

export default function LegalInsightsPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [insights, setInsights] = React.useState(null);

  React.useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setError('');
        const res = await fetch('/api/bls/legal-insights', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`API ${res.status}`);
        }
        const json = await res.json();
        if (isMounted) {
          setInsights(json);
          setLoading(false);
        }
      } catch (err) {
        console.error('Legal insights error:', err);
        if (isMounted) {
          setError('Unable to load legal employment data right now.');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const isReady = !loading && insights;

  // ---------- Existing charts ----------

  const employmentTrendData = React.useMemo(() => {
    if (!insights?.employmentTrend) return null;
    return {
      labels: insights.employmentTrend.labels,
      datasets: [
        {
          label: 'Legal services employment (thousands)',
          data: insights.employmentTrend.values,
          borderColor: '#60A5FA',
          backgroundColor: 'rgba(37,99,235,0.25)',
          tension: 0.35,
          pointRadius: 2,
          pointHoverRadius: 4,
        },
      ],
    };
  }, [insights]);

  const metroBarData = React.useMemo(() => {
    if (!insights?.metroEmployment) return null;
    return {
      labels: insights.metroEmployment.labels,
      datasets: [
        {
          label: 'Legal employment (approx. headcount)',
          data: insights.metroEmployment.values,
          backgroundColor: 'rgba(52,211,153,0.65)',
          borderColor: '#22C55E',
          borderWidth: 1,
        },
      ],
    };
  }, [insights]);

  const occupationPieData = React.useMemo(() => {
    if (!insights?.occupationMix) return null;
    return {
      labels: insights.occupationMix.labels,
      datasets: [
        {
          data: insights.occupationMix.values,
          backgroundColor: [
            'rgba(59,130,246,0.9)',
            'rgba(52,211,153,0.9)',
            'rgba(249,115,22,0.9)',
            'rgba(245,158,11,0.9)',
          ],
          borderColor: [
            'rgba(59,130,246,1)',
            'rgba(22,163,74,1)',
            'rgba(194,65,12,1)',
            'rgba(217,119,6,1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [insights]);

  const wageBarData = React.useMemo(() => {
    if (!insights?.wages) return null;
    return {
      labels: insights.wages.labels,
      datasets: [
        {
          label: 'Median hourly wage (USD)',
          data: insights.wages.hourly,
          backgroundColor: 'rgba(96,165,250,0.8)',
          borderColor: '#3B82F6',
          borderWidth: 1,
        },
        {
          label: 'Median annual wage (USD, ×$1k)',
          data: insights.wages.annual.map((v) => v / 1000),
          backgroundColor: 'rgba(251,191,36,0.8)',
          borderColor: '#F59E0B',
          borderWidth: 1,
        },
      ],
    };
  }, [insights]);

  const joltsLineData = React.useMemo(() => {
    if (!insights?.jolts) return null;
    return {
      labels: insights.jolts.labels,
      datasets: [
        {
          label: 'Job openings',
          data: insights.jolts.openings,
          borderColor: '#F97316',
          backgroundColor: 'rgba(248,113,113,0.25)',
          tension: 0.35,
          pointRadius: 1.5,
        },
        {
          label: 'Hires',
          data: insights.jolts.hires,
          borderColor: '#22C55E',
          backgroundColor: 'rgba(74,222,128,0.25)',
          tension: 0.35,
          pointRadius: 1.5,
        },
        {
          label: 'Separations',
          data: insights.jolts.separations,
          borderColor: '#FACC15',
          backgroundColor: 'rgba(250,204,21,0.25)',
          tension: 0.35,
          pointRadius: 1.5,
        },
      ],
    };
  }, [insights]);

  const unemployment = insights?.unemployment;

  // ---------- NEW: metro salary, state employment, salary trend, wage distribution ----------

  const metroSalaryData = React.useMemo(() => {
    if (!insights?.metroSalary) return null;
    return {
      labels: insights.metroSalary.labels,
      datasets: [
        {
          label: 'Median annual salary (USD, ×$1k)',
          data: insights.metroSalary.values.map((v) => v / 1000),
          backgroundColor: 'rgba(251,191,36,0.85)',
          borderColor: '#F59E0B',
          borderWidth: 1,
        },
      ],
    };
  }, [insights]);

  const stateEmploymentData = React.useMemo(() => {
    if (!insights?.stateEmployment) return null;
    return {
      labels: insights.stateEmployment.labels,
      datasets: [
        {
          label: 'Estimated legal employment',
          data: insights.stateEmployment.values,
          backgroundColor: 'rgba(96,165,250,0.85)',
          borderColor: '#3B82F6',
          borderWidth: 1,
        },
      ],
    };
  }, [insights]);

  const salaryTrendData = React.useMemo(() => {
    if (!insights?.salaryTrend) return null;
    return {
      labels: insights.salaryTrend.labels,
      datasets: [
        {
          label: 'Lawyers (median, ×$1k)',
          data: insights.salaryTrend.lawyer.map((v) => v / 1000),
          borderColor: '#60A5FA',
          backgroundColor: 'rgba(37,99,235,0.25)',
          tension: 0.35,
          pointRadius: 2,
        },
        {
          label: 'Paralegals & legal assistants (median, ×$1k)',
          data: insights.salaryTrend.paralegal.map((v) => v / 1000),
          borderColor: '#22C55E',
          backgroundColor: 'rgba(52,211,153,0.25)',
          tension: 0.35,
          pointRadius: 2,
        },
      ],
    };
  }, [insights]);

  const wageDistributionData = React.useMemo(() => {
    if (!insights?.wageDistribution) return null;
    return {
      labels: insights.wageDistribution.labels,
      datasets: [
        {
          label: 'Annual wage (USD, ×$1k)',
          data: insights.wageDistribution.values.map((v) => v / 1000),
          backgroundColor: 'rgba(129,140,248,0.9)',
          borderColor: '#6366F1',
          borderWidth: 1,
        },
      ],
    };
  }, [insights]);

  return (
    <div style={outerWrap}>
      <div style={container}>
        {/* HEADER */}
        <div style={headerWrap}>
          <div>
            <div
              style={{
                fontSize: 11,
                color: '#60A5FA',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Talent Connector · Client Insights
            </div>
            <h1 style={titleStyle}>Legal Industry Employment Deep Dive</h1>
          </div>
          <p style={subtitleStyle}>
            A compact, BLS-informed snapshot of how the U.S. legal industry is hiring across markets,
            titles, and compensation. Designed for in-house legal, law firms, and litigation leaders.
          </p>
          <div style={chipRow}>
            <div style={chip}>Source: U.S. Bureau of Labor Statistics</div>
            <div style={chip}>Focus: Legal Services &amp; Legal Occupations</div>
            {insights?.lastUpdated && <div style={chip}>Last updated: {insights.lastUpdated}</div>}
          </div>
        </div>

                        {/* BACK TO TALENT CONNECTOR (bright and uses history back) */}
        <div style={{ marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.history.back();
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              borderRadius: 999,
              border: '1px solid rgba(250,204,21,0.85)',
              background:
                'linear-gradient(135deg, rgba(250,204,21,0.12), rgba(251,191,36,0.32))',
              color: '#FACC15',
              fontSize: 12,
              fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 14 }}>←</span>
            <span>Back to Talent Connector</span>
          </button>
        </div>


        {/* ERROR / LOADING */}
        {loading && (
          <div style={{ ...card, textAlign: 'center', padding: 28 }}>
            <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 6 }}>
              Loading legal employment data…
            </div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>
              Pulling a curated snapshot based on BLS legal and professional services series.
            </div>
          </div>
        )}

        {error && !loading && (
          <div style={{ ...card, borderColor: 'rgba(248,113,113,0.7)' }}>
            <div style={{ ...cardHeader, marginBottom: 4 }}>
              <div style={cardTitle}>We hit a snag loading the data</div>
            </div>
            <p style={{ fontSize: 12, color: '#FCA5A5' }}>{error}</p>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
              Your Talent Connector experience is unaffected; this is just the external BLS layer.
              You can refresh the page to try again later.
            </p>
          </div>
        )}

        {isReady && (
          <>
            {/* TOP ROW */}
            <div style={grid}>
              {/* National Trend */}
              <div style={card}>
                <div style={cardHeader}>
                  <div>
                    <div style={cardTitle}>National legal services employment</div>
                    <div style={cardSubtitle}>
                      Monthly headcount in the U.S. legal services sector (BLS-style CES series).
                    </div>
                  </div>
                  <div style={badge}>Macro trend</div>
                </div>
                <div style={{ height: 260 }}>
                  {employmentTrendData ? (
                    <Line data={employmentTrendData} options={chartBaseOptions} />
                  ) : (
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>No data available.</div>
                  )}
                </div>
                {unemployment && (
                  <div style={statRow}>
                    <div style={statPill}>
                      <span style={statLabel}>Legal unemployment:</span>
                      <span style={statValue}>{unemployment.rate}%</span>
                      <span style={{ ...statLabel, marginLeft: 6 }}>
                        (as of {unemployment.asOfLabel})
                      </span>
                    </div>
                    <div style={statPill}>
                      <span style={statLabel}>Change vs. prior year:</span>
                      <span
                        style={{
                          ...statValue,
                          color:
                            unemployment.deltaYoY < 0
                              ? '#22C55E'
                              : unemployment.deltaYoY > 0
                              ? '#F97316'
                              : '#E5E7EB',
                        }}
                      >
                        {unemployment.deltaYoY > 0 ? '+' : ''}
                        {unemployment.deltaYoY} pts
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* MIDDLE ROW: GEO + OCCUPATION */}
            <div
              style={{
                ...twoColGrid,
                marginTop: 16,
                gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)',
              }}
            >
              {/* Metro / Geography */}
              <div style={card}>
                <div style={cardHeader}>
                  <div>
                    <div style={cardTitle}>Top U.S. legal employment markets</div>
                    <div style={cardSubtitle}>
                      Approximate legal headcount by metro – a quick read on where talent is clustered.
                    </div>
                  </div>
                  <div style={badge}>Geographic focus</div>
                </div>
                <div style={{ height: 260 }}>
                  {metroBarData ? (
                    <Bar
                      data={metroBarData}
                      options={{
                        ...chartBaseOptions,
                        indexAxis: 'y',
                        scales: {
                          ...chartBaseOptions.scales,
                          x: {
                            ...chartBaseOptions.scales.x,
                            ticks: {
                              ...chartBaseOptions.scales.x.ticks,
                              callback: (val) => `${val}`,
                            },
                          },
                        },
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>No metro data available.</div>
                  )}
                </div>
                <div style={footerNote}>
                  Metro figures are approximate and directional, using large-market patterns
                  (NYC, DC, LA, Chicago, SF, Boston, Dallas, Miami). They’re ideal for relative
                  benchmarking, not precise headcount.
                </div>
              </div>

              {/* Occupation mix */}
              <div style={card}>
                <div style={cardHeader}>
                  <div>
                    <div style={cardTitle}>Legal occupation mix</div>
                    <div style={cardSubtitle}>
                      Distribution across lawyers, paralegals, and other legal support roles.
                    </div>
                  </div>
                  <div style={badge}>Role mix</div>
                </div>
                <div
                  style={{
                    height: 260,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {occupationPieData ? (
                    <Pie
                      data={occupationPieData}
                      options={{
                        ...chartBaseOptions,
                        plugins: {
                          ...chartBaseOptions.plugins,
                          legend: {
                            ...chartBaseOptions.plugins.legend,
                            position: 'bottom',
                          },
                        },
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>No occupation data available.</div>
                  )}
                </div>
                <div style={footerNote}>
                  Based on national patterns for legal occupations (lawyers, paralegals, legal support).
                  Mix will vary by firm and practice area; this provides a national anchor.
                </div>
              </div>
            </div>

            {/* WAGES + JOLTS STYLE */}
            <div
              style={{
                ...twoColGrid,
                marginTop: 16,
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.25fr)',
              }}
            >
              {/* Wages */}
              <div style={card}>
                <div style={cardHeader}>
                  <div>
                    <div style={cardTitle}>Compensation snapshot</div>
                    <div style={cardSubtitle}>
                      Median hourly and annual wages across key U.S. legal roles (national view).
                    </div>
                  </div>
                  <div style={badge}>Comp &amp; benchmarking</div>
                </div>
                <div style={{ height: 260 }}>
                  {wageBarData ? (
                    <Bar
                      data={wageBarData}
                      options={{
                        ...chartBaseOptions,
                        scales: {
                          ...chartBaseOptions.scales,
                          y: {
                            ...chartBaseOptions.scales.y,
                            ticks: {
                              ...chartBaseOptions.scales.y.ticks,
                              callback: (val) => `$${val}`,
                            },
                          },
                        },
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>No wage data available.</div>
                  )}
                </div>
                <div style={footerNote}>
                  Annual wages shown in thousands of dollars (×$1k). Use this as a directional
                  anchor, then layer in your specific metro and practice area for offer decisions.
                </div>
              </div>

              {/* JOLTS-style chart */}
              <div style={card}>
                <div style={cardHeader}>
                  <div>
                    <div style={cardTitle}>Openings, hires, and separations</div>
                    <div style={cardSubtitle}>
                      JOLTS-style series for professional/legal services – a proxy for how “hot”
                      the market feels.
                    </div>
                  </div>
                  <div style={badge}>Market heat</div>
                </div>
                <div style={{ height: 260 }}>
                  {joltsLineData ? (
                    <Line
                      data={joltsLineData}
                      options={{
                        ...chartBaseOptions,
                        plugins: {
                          ...chartBaseOptions.plugins,
                          legend: {
                            ...chartBaseOptions.plugins.legend,
                            position: 'bottom',
                          },
                        },
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>No movement data available.</div>
                  )}
                </div>
                <div style={footerNote}>
                  When openings meaningfully exceed hires, it often signals tight talent conditions.
                  When separations spike, it can indicate churn or restructuring. Beacon Hill Legal
                  can help you navigate both environments.
                </div>
              </div>
            </div>

            {/* NEW: GEO & SALARY DEEP DIVE */}
            <div
              style={{
                ...twoColGrid,
                marginTop: 16,
                gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)',
              }}
            >
              {/* Metro salary comparison */}
              <div style={card}>
                <div style={cardHeader}>
                  <div>
                    <div style={cardTitle}>Median lawyer salaries by metro</div>
                    <div style={cardSubtitle}>
                      Benchmark major U.S. legal hubs on median annual lawyer compensation.
                    </div>
                  </div>
                  <div style={badge}>Metro comp</div>
                </div>
                <div style={{ height: 260 }}>
                  {metroSalaryData ? (
                    <Bar
                      data={metroSalaryData}
                      options={{
                        ...chartBaseOptions,
                        indexAxis: 'y',
                        scales: {
                          ...chartBaseOptions.scales,
                          x: {
                            ...chartBaseOptions.scales.x,
                            ticks: {
                              ...chartBaseOptions.scales.x.ticks,
                              callback: (val) => `$${val}k`,
                            },
                          },
                        },
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                      No metro salary data available.
                    </div>
                  )}
                </div>
                <div style={footerNote}>
                  Use this to sense-check offers across offices. High-comp metros (NYC, SF, DC) will
                  often require materially different bands than secondary markets.
                </div>
              </div>

              {/* State employment snapshot */}
              <div style={card}>
                <div style={cardHeader}>
                  <div>
                    <div style={cardTitle}>Top states by legal employment</div>
                    <div style={cardSubtitle}>
                      Directional view of where legal headcount is concentrated across key states.
                    </div>
                  </div>
                  <div style={badge}>State-level view</div>
                </div>
                <div style={{ height: 260 }}>
                  {stateEmploymentData ? (
                    <Bar
                      data={stateEmploymentData}
                      options={{
                        ...chartBaseOptions,
                        indexAxis: 'y',
                        plugins: {
                          ...chartBaseOptions.plugins,
                          legend: { display: false },
                        },
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                      No state employment data available.
                    </div>
                  )}
                </div>
                <div style={footerNote}>
                  These estimates help frame national footprint strategy – which states have the
                  deepest legal talent pools for offices, remote teams, or document review hubs.
                </div>
              </div>
            </div>

            {/* NEW: SALARY TREND + WAGE DISTRIBUTION */}
            <div
              style={{
                ...twoColGrid,
                marginTop: 16,
                gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)',
              }}
            >
              {/* Salary trend over time */}
              <div style={card}>
                <div style={cardHeader}>
                  <div>
                    <div style={cardTitle}>10-year salary trend</div>
                    <div style={cardSubtitle}>
                      National median salaries for lawyers vs. paralegals/legal assistants over time.
                    </div>
                  </div>
                  <div style={badge}>Trend over time</div>
                </div>
                <div style={{ height: 260 }}>
                  {salaryTrendData ? (
                    <Line
                      data={salaryTrendData}
                      options={{
                        ...chartBaseOptions,
                        plugins: {
                          ...chartBaseOptions.plugins,
                          legend: {
                            ...chartBaseOptions.plugins.legend,
                            position: 'bottom',
                          },
                        },
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                      No salary trend data available.
                    </div>
                  )}
                </div>
                <div style={footerNote}>
                  Use this to understand how fast legal compensation has been moving. Rapid
                  slope changes often correspond to tight markets or major regulatory and
                  litigation cycles.
                </div>
              </div>

              {/* Wage distribution */}
              <div style={card}>
                <div style={cardHeader}>
                  <div>
                    <div style={cardTitle}>Legal wage distribution</div>
                    <div style={cardSubtitle}>
                      National wage percentiles for lawyers – from 25th percentile to 90th.
                    </div>
                  </div>
                  <div style={badge}>Distribution</div>
                </div>
                <div style={{ height: 260 }}>
                  {wageDistributionData ? (
                    <Bar
                      data={wageDistributionData}
                      options={{
                        ...chartBaseOptions,
                        plugins: {
                          ...chartBaseOptions.plugins,
                          legend: { display: false },
                        },
                        scales: {
                          ...chartBaseOptions.scales,
                          y: {
                            ...chartBaseOptions.scales.y,
                            ticks: {
                              ...chartBaseOptions.scales.y.ticks,
                              callback: (val) => `$${val}k`,
                            },
                          },
                        },
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                      No wage distribution data available.
                    </div>
                  )}
                </div>
                <div style={footerNote}>
                  The gap between the median and 90th percentile is where premium talent lives
                  – specialists, niche practice experts, and leadership roles. This helps frame
                  what “top of market” really looks like.
                </div>
              </div>
            </div>

            {/* METHODOLOGY / FOOTER */}
            <div style={{ ...card, marginTop: 16 }}>
              <div style={cardHeader}>
                <div>
                  <div style={cardTitle}>How to use this page</div>
                  <div style={cardSubtitle}>
                    Pair BLS-style macro data with your internal metrics and Beacon Hill Legal’s live
                    candidate market.
                  </div>
                </div>
              </div>
              <ul
                style={{
                  fontSize: 12,
                  color: '#9CA3AF',
                  paddingLeft: 18,
                  marginTop: 4,
                  lineHeight: 1.6,
                }}
              >
                <li>
                  <strong style={{ color: '#E5E7EB' }}>Macro first:</strong> Use national and metro
                  trends to frame your hiring plans for the year.
                </li>
                <li>
                  <strong style={{ color: '#E5E7EB' }}>Then zoom in:</strong> Work with Beacon Hill
                  Legal to overlay this data with current candidate availability in your specific
                  practice area and office location.
                </li>
                <li>
                  <strong style={{ color: '#E5E7EB' }}>Refresh cadence:</strong> Many BLS series
                  update monthly; others (like wages) update annually. This page is designed as a
                  directional guide, not a real-time compensation survey.
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
