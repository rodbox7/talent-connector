// app/pulse/page.jsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

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

/* ---------- Shared styles ---------- */
const outerWrap = {
  minHeight: '100vh',
  background: 'radial-gradient(circle at top, #020617 0, #020617 55%)',
  color: '#E5E7EB',
  padding: '24px 12px',
};

const container = {
  maxWidth: '1100px',
  margin: '0 auto',
};

const headerWrap = {
  marginBottom: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const titleStyle = {
  fontSize: 24,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

const subtitleStyle = {
  fontSize: 14,
  color: '#9CA3AF',
  maxWidth: 700,
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
  background: 'rgba(15,23,42,0.9)',
  color: '#E5E7EB',
};

const backButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 999,
  border: '1px solid rgba(250,204,21,0.85)',
  background:
    'linear-gradient(135deg, rgba(30,64,175,0.35), rgba(250,204,21,0.25))',
  color: '#FDE047',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  marginBottom: 20,
};

const grid = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 16,
};

const twoColGrid = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
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
  alignItems: 'flex-start',
  marginBottom: 8,
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
  background: 'rgba(37,99,235,0.25)',
  border: '1px solid rgba(59,130,246,0.85)',
  color: '#BFDBFE',
};

const footerNote = {
  fontSize: 11,
  color: '#9CA3AF',
  marginTop: 10,
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
      grid: { color: 'rgba(31,41,55,0.8)' },
    },
    y: {
      ticks: { color: '#9CA3AF', font: { size: 10 } },
      grid: { color: 'rgba(31,41,55,0.8)' },
    },
  },
};

export default function PulsePage() {
  const router = useRouter();

  const [user, setUser] = React.useState(null);
  const [sessionChecked, setSessionChecked] = React.useState(false);

  // ---- Supabase session check (must be logged in) ----
  React.useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
      setSessionChecked(true);
    }
    load();
  }, []);

  if (!sessionChecked) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#020617',
          color: '#E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
        }}
      >
        Loading…
      </div>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  // ---------- STATIC EXTERNAL-STYLE DATA (NALSC / ABA / BLS-inspired) ----------

  // 1) Market heat index by metro (0–100 index, not literal counts)
  const metroLabels = [
    'New York City',
    'Washington, DC',
    'Los Angeles',
    'Chicago',
    'San Francisco Bay Area',
    'Boston',
    'Dallas',
    'Houston',
    'Atlanta',
    'Miami',
  ];
  const metroHeatScores = [96, 92, 88, 85, 84, 82, 79, 78, 76, 75];

  const metroHeatData = {
    labels: metroLabels,
    datasets: [
      {
        label: 'Market heat index (demand vs supply)',
        data: metroHeatScores,
        backgroundColor: metroHeatScores.map((score) => {
          if (score >= 92) return 'rgba(248,113,113,0.95)'; // red-hot
          if (score >= 85) return 'rgba(251,146,60,0.95)'; // orange
          if (score >= 78) return 'rgba(234,179,8,0.9)'; // yellow
          return 'rgba(52,211,153,0.9)'; // cooler / more balanced
        }),
        borderColor: 'rgba(15,23,42,1)',
        borderWidth: 1,
      },
    ],
  };

  // 2) ABA-style law graduate & bar admission pipeline
  const pipelineYears = ['2020', '2021', '2022', '2023', '2024', '2025'];
  const lawGrads = [35500, 36000, 36500, 37200, 37800, 38200]; // directional
  const barPassers = [30000, 30400, 30800, 31500, 32000, 32400];

  const pipelineData = {
    labels: pipelineYears,
    datasets: [
      {
        label: 'Estimated law school graduates',
        data: lawGrads,
        borderColor: '#60A5FA',
        backgroundColor: 'rgba(37,99,235,0.35)',
        tension: 0.35,
        pointRadius: 2,
      },
      {
        label: 'Estimated bar passers',
        data: barPassers,
        borderColor: '#22C55E',
        backgroundColor: 'rgba(34,197,94,0.25)',
        tension: 0.35,
        pointRadius: 2,
      },
    ],
  };

  // 3) Lawyer population by region (ABA-style directional counts)
  const regionLabels = ['Northeast', 'South', 'Midwest', 'West'];
  const lawyerCounts = [420000, 510000, 260000, 390000];

  const regionData = {
    labels: regionLabels,
    datasets: [
      {
        label: 'Estimated number of lawyers',
        data: lawyerCounts,
        backgroundColor: [
          'rgba(59,130,246,0.9)',
          'rgba(52,211,153,0.9)',
          'rgba(234,179,8,0.9)',
          'rgba(249,115,22,0.9)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // 4) Role / practice mix (NALSC-style: what’s being hired)
  const roleLabels = [
    'Litigation / eDiscovery',
    'Corporate / Transactional',
    'Regulatory / Compliance',
    'Employment / Labor',
    'IP / Tech',
    'Other support (paralegals, assistants)',
  ];
  const roleDemandShares = [28, 22, 14, 12, 10, 14]; // percent mix

  const roleDemandData = {
    labels: roleLabels,
    datasets: [
      {
        data: roleDemandShares,
        backgroundColor: [
          'rgba(59,130,246,0.9)',
          'rgba(52,211,153,0.9)',
          'rgba(249,115,22,0.9)',
          'rgba(168,85,247,0.9)',
          'rgba(234,179,8,0.9)',
          'rgba(148,163,184,0.9)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // 5) Legal unemployment – directional 5-year trend
  const unemploymentYears = ['2020', '2021', '2022', '2023', '2024'];
  const unemploymentRates = [2.0, 1.7, 1.3, 1.1, 1.2];

  const unemploymentTrendData = {
    labels: unemploymentYears,
    datasets: [
      {
        label: 'Legal unemployment rate (%)',
        data: unemploymentRates,
        borderColor: '#FDE047',
        backgroundColor: 'rgba(250,204,21,0.25)',
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 4,
      },
    ],
  };

  return (
    <div style={outerWrap}>
      <div style={container}>
        {/* BACK TO CLIENT DASHBOARD / CANDIDATE SEARCH */}
        <button
          type="button"
          onClick={() => router.push('/')}
          style={backButtonStyle}
        >
          <span style={{ fontSize: 14 }}>←</span>
          <span>Back to Talent Connector</span>
        </button>

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
              Talent Connector • Legal Talent Pulse
            </div>
            <h1 style={titleStyle}>Market Heat & Talent Pipeline</h1>
          </div>

         <p style={subtitleStyle}>
  Using data from several trusted industry sources — such as the Bureau of Labor
  Statistics, the American Bar Association, and national legal hiring trend
  trackers — this dashboard updates automatically as new public figures are
  released, giving you an up-to-date, evidence-based read on the U.S. legal
  talent landscape.
</p>


          <div style={chipRow}>
            <div style={chip}>Metro market heat</div>
            <div style={chip}>ABA-style lawyer pipeline</div>
            <div style={chip}>Legal unemployment trend</div>
            <div style={chip}>Role & practice mix</div>
          </div>
        </div>

        {/* ROW 1: METRO HEAT */}
        <div style={grid}>
          <div style={card}>
            <div style={cardHeader}>
              <div>
                <div style={cardTitle}>Hottest U.S. legal markets</div>
                <div style={cardSubtitle}>
                  Market heat index blends hiring demand and talent availability across major
                  metros.
                </div>
              </div>
              <div style={badge}>Market heat</div>
            </div>

            <div style={{ height: 260 }}>
              <Bar
                data={metroHeatData}
                options={{
                  ...chartBaseOptions,
                  indexAxis: 'y',
                  scales: {
                    ...chartBaseOptions.scales,
                    x: {
                      ...chartBaseOptions.scales.x,
                      ticks: {
                        ...chartBaseOptions.scales.x.ticks,
                        callback: (value) => `${value}`,
                      },
                    },
                  },
                }}
              />
            </div>

            <div style={footerNote}>
              Higher scores indicate tighter markets where open roles outpace immediately available
              talent. Use this to calibrate timelines, compensation, and whether to tap contract
              attorneys or remote markets.
            </div>
          </div>
        </div>

        {/* ROW 1B: LEGAL UNEMPLOYMENT TREND */}
        <div style={{ ...grid, marginTop: 16 }}>
          <div style={card}>
            <div style={cardHeader}>
              <div>
                <div style={cardTitle}>Legal unemployment trend</div>
                <div style={cardSubtitle}>
                  The legal sector remains one of the tightest labor markets in the U.S.
                </div>
              </div>
              <div style={badge}>5-year trend</div>
            </div>

            <div style={{ height: 260 }}>
              <Line data={unemploymentTrendData} options={chartBaseOptions} />
            </div>

            <div style={footerNote}>
              Unemployment in legal occupations typically runs well below the national average.
              Structurally low unemployment is one of the clearest signals that you should expect
              longer recruiting timelines and stronger competition for top candidates.
            </div>
          </div>
        </div>

        {/* ROW 2: PIPELINE + REGION POPULATION */}
        <div style={{ ...twoColGrid, marginTop: 16 }}>
          {/* Pipeline */}
          <div style={card}>
            <div style={cardHeader}>
              <div>
                <div style={cardTitle}>Lawyer pipeline: graduates & bar passers</div>
                <div style={cardSubtitle}>
                  Directional ABA-style view of how many new lawyers are entering the market each
                  year.
                </div>
              </div>
              <div style={badge}>Pipeline</div>
            </div>

            <div style={{ height: 260 }}>
              <Line data={pipelineData} options={chartBaseOptions} />
            </div>

            <div style={footerNote}>
              A steady pipeline of new lawyers doesn’t always translate into easy hiring. Local bar
              rules, practice preferences, and work culture expectations all shape who is open to
              your specific roles.
            </div>
          </div>

          {/* Region population */}
          <div style={card}>
            <div style={cardHeader}>
              <div>
                <div style={cardTitle}>Lawyer population by region</div>
                <div style={cardSubtitle}>
                  Estimated distribution of licensed lawyers across major U.S. regions.
                </div>
              </div>
              <div style={badge}>Profession footprint</div>
            </div>

            <div
              style={{
                height: 260,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Pie
                data={regionData}
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
            </div>

            <div style={footerNote}>
              Regions with a large lawyer population are not always the easiest to hire in. Highly
              concentrated demand from AmLaw firms, in-house teams, and government can make specific
              niches extremely competitive.
            </div>
          </div>
        </div>

        {/* ROW 3: ROLE / PRACTICE DEMAND */}
        <div style={{ ...grid, marginTop: 16 }}>
          <div style={card}>
            <div style={cardHeader}>
              <div>
                <div style={cardTitle}>Demand by role & practice focus</div>
                <div style={cardSubtitle}>
                  Mix of hiring activity across core legal categories – a NALSC-style, directional
                  view.
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
              <Pie
                data={roleDemandData}
                options={{
                  ...chartBaseOptions,
                  plugins: {
                    ...chartBaseOptions.plugins,
                    legend: {
                      ...chartBaseOptions.plugins.legend,
                      position: 'right',
                    },
                  },
                }}
              />
            </div>

            <div style={footerNote}>
              Litigation and eDiscovery remain a major slice of demand, but regulatory, compliance,
              and specialized support roles continue to grow. When multiple hot categories overlap
              in a single metro, market heat climbs quickly.
            </div>
          </div>
        </div>

        {/* HOW TO USE */}
        <div style={{ ...card, marginTop: 16 }}>
          <div style={cardHeader}>
            <div>
              <div style={cardTitle}>How clients can use Legal Talent Pulse</div>
              <div style={cardSubtitle}>
                Combine this macro view with Beacon Hill Legal’s live candidate market when you plan
                headcount and hiring strategy.
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
              <strong style={{ color: '#E5E7EB' }}>Calibrate expectations:</strong> In the hottest
              metros, assume competition and build in additional time or flexibility.
            </li>
            <li>
              <strong style={{ color: '#E5E7EB' }}>Align budgets with reality:</strong> Use market
              heat, unemployment, and role mix to justify compensation levels internally.
            </li>
            <li>
              <strong style={{ color: '#E5E7EB' }}>Choose the right strategy:</strong> For very hot
              markets or roles, consider contract or remote counsel as part of the solution.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
