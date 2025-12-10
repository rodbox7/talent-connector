// app/api/bls/legal-insights/route.js
import { NextResponse } from 'next/server';

/**
 * This route returns a curated, BLS-inspired snapshot for the legal industry.
 *
 * NOTE:
 * - Values below are directional / approximate and structured to be presentation-ready.
 * - To fully automate with live BLS series, you would replace these static blocks
 *   with real calls to the BLS public API.
 */

export async function GET() {
  try {
    // ---- 1) National legal services employment trend (thousands of jobs) ----
    const employmentTrend = {
      labels: [
        '2019-01',
        '2019-07',
        '2020-01',
        '2020-07',
        '2021-01',
        '2021-07',
        '2022-01',
        '2022-07',
        '2023-01',
        '2023-07',
        '2024-01',
        '2024-07',
        '2025-01',
      ],
      values: [
        1180,
        1195,
        1160,
        1100,
        1135,
        1170,
        1205,
        1230,
        1245,
        1275,
        1295,
        1320,
        1335,
      ],
    };

    // ---- 2) Metro-level approximate legal employment (headcount proxies) ----
    const metroEmployment = {
      labels: [
        'New York City',
        'Washington, DC',
        'Los Angeles',
        'Chicago',
        'Boston',
        'San Francisco',
        'Dallas',
        'Miami',
      ],
      values: [
        145000,
        78000,
        72000,
        61000,
        42000,
        39000,
        33000,
        31000,
      ],
    };

    // ---- 3) Legal occupation mix (national) ----
    const occupationMix = {
      labels: [
        'Lawyers',
        'Paralegals & legal assistants',
        'Legal support workers',
        'Other legal staff',
      ],
      values: [52, 26, 14, 8], // percent share
    };

    // ---- 4) Wage snapshot (national, representative) ----
    const wages = {
      labels: [
        'Lawyers',
        'Paralegals & legal assistants',
        'Legal support workers',
      ],
      hourly: [90, 32, 28], // approximate medians
      annual: [187000, 67000, 58000], // approximate medians
    };

    // ---- 5) JOLTS-style movement (openings / hires / separations index) ----
    const jolts = {
      labels: [
        '2021-Q1',
        '2021-Q3',
        '2022-Q1',
        '2022-Q3',
        '2023-Q1',
        '2023-Q3',
        '2024-Q1',
        '2024-Q3',
      ],
      openings: [105, 120, 140, 135, 150, 145, 155, 150],
      hires: [95, 100, 115, 110, 120, 118, 122, 120],
      separations: [70, 72, 78, 82, 80, 79, 77, 76],
    };

    // ---- 6) Unemployment overlay for legal occupations ----
    const unemployment = {
      rate: 1.8,
      asOfLabel: 'Q3 2024',
      deltaYoY: -0.2, // percentage points vs prior year
    };

    // ---- 7) NEW: metro salary comparison (median annual, USD) ----
    const metroSalary = {
      labels: [
        'New York City',
        'San Francisco',
        'Washington, DC',
        'Los Angeles',
        'Boston',
        'Chicago',
        'Dallas',
        'Miami',
      ],
      values: [
        215000,
        225000,
        205000,
        195000,
        190000,
        180000,
        165000,
        160000,
      ],
    };

    // ---- 8) NEW: national wage distribution (lawyers) ----
    const wageDistribution = {
      labels: [
        '25th percentile',
        'Median (50th)',
        '75th percentile',
        '90th percentile',
      ],
      values: [135000, 187000, 235000, 310000],
    };

    // ---- 9) NEW: 10-year salary trend (lawyers vs paralegals) ----
    const salaryTrend = {
      labels: [
        '2015',
        '2016',
        '2017',
        '2018',
        '2019',
        '2020',
        '2021',
        '2022',
        '2023',
        '2024',
      ],
      lawyer: [
        150000,
        154000,
        158000,
        162000,
        167000,
        170000,
        177000,
        182000,
        187000,
        194000,
      ],
      paralegal: [
        51000,
        52500,
        54000,
        55500,
        57000,
        58500,
        60500,
        63000,
        65500,
        67500,
      ],
    };

    // ---- 10) NEW: state-level employment snapshot ----
    const stateEmployment = {
      labels: ['New York', 'California', 'Texas', 'Florida', 'Illinois', 'Massachusetts'],
      values: [98000, 94000, 62000, 54000, 49000, 38000],
    };

    const stateGrowth = {
      labels: ['New York', 'California', 'Texas', 'Florida', 'Illinois', 'Massachusetts'],
      values: [2.1, 1.8, 3.2, 2.7, 0.9, 1.5], // YoY % growth
    };

    const payload = {
      lastUpdated: 'Approx. through late 2024 (BLS pattern-based snapshot)',
      employmentTrend,
      metroEmployment,
      occupationMix,
      wages,
      jolts,
      unemployment,
      metroSalary,
      wageDistribution,
      salaryTrend,
      stateEmployment,
      stateGrowth,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error('Error in /api/bls/legal-insights:', err);
    return NextResponse.json(
      { error: 'Failed to build legal insights payload' },
      { status: 500 }
    );
  }
}
