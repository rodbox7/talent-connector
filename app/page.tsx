'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase as sb } from '../lib/supabaseClient';

/**
 * CONFIG
 */
const APP_NAME = 'Talent Connector';

/**
 * HELPERS
 */
function parseCSV(str: string) {
  return String(str || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function formatDate(iso?: string | null) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '-';
  }
}

/**
 * TYPES (lightweight)
 */
type UserRole = 'admin' | 'recruiter' | 'client';

type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
  org?: string;
};

type UICandidate = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  years: number | null;
  salary: number | null;
  contract: boolean | null;
  hourly: number | null;
  notes: string | null;
  roles: string[];               // from view
  practice_areas: string[];      // from view
  created_at?: string | null;    // from base table
};

/**
 * MAIN PAGE
 */
export default function Page() {
  const [mode, setMode] = useState<UserRole>('recruiter');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState<string>('');
  const [user, setUser] = useState<SessionUser | null>(null);

  // Candidate list (for recruiter/client)
  const [cands, setCands] = useState<UICandidate[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * AUTH: Login via Supabase, read role from public.profiles
   */
  async function login() {
    try {
      setErr('');
      const e = String(email).trim().toLowerCase();
      if (!e.includes('@')) {
        setErr('Enter a valid email');
        return;
      }

      const { data: signIn, error: signErr } = await sb.auth.signInWithPassword({
        email: e,
        password: pwd,
      });
      if (signErr || !signIn?.user) {
        setErr('Invalid credentials');
        return;
      }

      const { data: prof, error: profErr } = await sb
        .from('profiles')
        .select('id,email,role,org')
        .eq('id', signIn.user.id)
        .single();

      if (profErr || !prof) {
        setErr('Login succeeded, but profile is missing. Ask Admin to create your profile.');
        return;
      }

      if (prof.role !== mode) {
        setErr(`This account is a ${prof.role}. Switch to the ${prof.role} tab.`);
        return;
      }

      setUser({
        id: prof.id,
        email: prof.email,
        role: prof.role as UserRole,
        org: prof.org || '',
      });
    } catch (ex) {
      console.error(ex);
      setErr('Login error. Please try again.');
    }
  }

  async function logout() {
    try {
      await sb.auth.signOut();
    } catch {}
    setUser(null);
    setEmail('');
    setPwd('');
    setMode('recruiter');
    setCands([]);
  }

  /**
   * DATA: Load candidates for recruiter/client
   * Uses the convenience view v_candidates and pulls created_at
   */
  async function loadCandidates() {
    setLoading(true);
    try {
      const { data, error } = await sb
        .from('v_candidates')
        .select(
          'id,name,city,state,years,salary,contract,hourly,notes,roles,practice_areas,created_at'
        )
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        return;
      }
      setCands((data || []) as UICandidate[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && (user.role === 'recruiter' || user.role === 'client')) {
      loadCandidates();
    }
  }, [user]);

  /**
   * ACTION: Recruiter adds a candidate
   * 1) Insert into public.candidates (created_at auto-filled by DB)
   * 2) Insert roles into public.candidate_roles
   * 3) Insert practice areas into public.candidate_practice_areas
   * Finally reload list
   */
  async function addCandidate(form: {
    name: string;
    rolesCSV: string;
    lawCSV: string;
    years: string;
    city: string;
    state: string;
    salary: string;
    contract: boolean;
    hourly: string;
    notes: string;
  }) {
    if (!form.name.trim()) return;

    // 1) Insert into candidates
    const { data: cand, error: insErr } = await sb
      .from('candidates')
      .insert({
        name: form.name.trim(),
        years: Number(form.years) || 0,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        salary: Number(form.salary) || 0,
        contract: !!form.contract,
        hourly: form.contract ? Number(form.hourly) || 0 : 0,
        notes: form.notes || '',
      })
      .select('id')
      .single();

    if (insErr || !cand?.id) {
      console.error(insErr);
      alert('Error adding candidate.');
      return;
    }

    const candidate_id = cand.id as string;

    // 2) Insert roles
    const roles = parseCSV(form.rolesCSV);
    if (roles.length) {
      const rows = roles.map(r => ({ candidate_id, role: r }));
      const { error } = await sb.from('candidate_roles').insert(rows);
      if (error) console.error('roles insert error', error);
    }

    // 3) Insert practice areas
    const areas = parseCSV(form.lawCSV);
    if (areas.length) {
      const rows = areas.map(p => ({ candidate_id, practice_area: p }));
      const { error } = await sb.from('candidate_practice_areas').insert(rows);
      if (error) console.error('areas insert error', error);
    }

    await loadCandidates();
  }

  /**
   * UI BUILDING BLOCKS
   */
  const shell = (children: React.ReactNode) => (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#e5e5e5',
        fontFamily: 'system-ui, Arial',
        padding: 16,
      }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 700 }}>{APP_NAME}</div>
          {user ? (
            <button onClick={logout} style={{ fontSize: 12 }}>
              Log out
            </button>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );

  /**
   * RENDERINGS
   */

  // Admin minimal (you’re using Supabase dashboard to add users)
  if (user && user.role === 'admin') {
    return shell(
      <div
        style={{
          background: '#0b0b0b',
          border: '1px solid #1f2937',
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div style={{ fontWeight: 700 }}>Admin</div>
        <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 6 }}>
          Signed in as {user.email}. You can manage users from Supabase directly.
        </div>
      </div>
    );
  }

  // Recruiter view: add form + list
  if (user && user.role === 'recruiter') {
    return shell(
      <>
        <RecruiterAddForm onAdd={addCandidate} />

        <div
          style={{
            marginTop: 12,
            background: '#0b0b0b',
            border: '1px solid #1f2937',
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            Candidates {loading ? '(loading...)' : ''}
          </div>

          {cands.length === 0 ? (
            <div style={{ fontSize: 12, color: '#9ca3af' }}>No candidates yet.</div>
          ) : (
            cands.map(c => <CandidateCard key={c.id} c={c} />)
          )}
        </div>
      </>
    );
  }

  // Client view: read-only list
  if (user && user.role === 'client') {
    return shell(
      <div
        style={{
          background: '#0b0b0b',
          border: '1px solid #1f2937',
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          Candidates {loading ? '(loading...)' : ''}
        </div>

        {cands.length === 0 ? (
          <div style={{ fontSize: 12, color: '#9ca3af' }}>No candidates available.</div>
        ) : (
          cands.map(c => <CandidateCard key={c.id} c={c} />)
        )}
      </div>
    );
  }

  // Login screen
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#0a0a0a',
        color: '#e5e5e5',
        fontFamily: 'system-ui, Arial',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: '#0b0b0b',
          border: '1px solid #1f2937',
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div style={{ textAlign: 'center', fontWeight: 700 }}>{APP_NAME}</div>
        <div
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: '#9ca3af',
            marginBottom: 8,
          }}
        >
          Invitation-only access
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8,
          }}
        >
          <button
            onClick={() => setMode('recruiter')}
            style={{
              padding: 8,
              background: mode === 'recruiter' ? '#1f2937' : '#111827',
              color: '#e5e5e5',
              borderRadius: 8,
            }}
          >
            Recruiter
          </button>
          <button
            onClick={() => setMode('client')}
            style={{
              padding: 8,
              background: mode === 'client' ? '#1f2937' : '#111827',
              color: '#e5e5e5',
              borderRadius: 8,
            }}
          >
            Client
          </button>
          <button
            onClick={() => setMode('admin')}
            style={{
              padding: 8,
              background: mode === 'admin' ? '#1f2937' : '#111827',
              color: '#e5e5e5',
              borderRadius: 8,
            }}
          >
            Admin
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
            <div style={{ color: '#9ca3af', marginBottom: 4 }}>Email</div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@company.com"
              style={{
                width: '100%',
                padding: 8,
                background: '#111827',
                color: '#e5e5e5',
                border: '1px solid #1f2937',
                borderRadius: 8,
              }}
            />
          </label>
          <label style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
            <div style={{ color: '#9ca3af', marginBottom: 4 }}>Password</div>
            <input
              type="password"
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              placeholder="your password"
              style={{
                width: '100%',
                padding: 8,
                background: '#111827',
                color: '#e5e5e5',
                border: '1px solid #1f2937',
                borderRadius: 8,
              }}
            />
          </label>
          <button
            onClick={login}
            style={{
              width: '100%',
              padding: 10,
              marginTop: 8,
              background: '#4f46e5',
              color: 'white',
              borderRadius: 8,
            }}
          >
            Log in
          </button>
          {err ? (
            <div style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>
              {err}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Recruiter Add Form
 */
function RecruiterAddForm(props: {
  onAdd: (form: {
    name: string;
    rolesCSV: string;
    lawCSV: string;
    years: string;
    city: string;
    state: string;
    salary: string;
    contract: boolean;
    hourly: string;
    notes: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [rolesCSV, setRolesCSV] = useState('');
  const [lawCSV, setLawCSV] = useState('');
  const [years, setYears] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [salary, setSalary] = useState('');
  const [contract, setContract] = useState(false);
  const [hourly, setHourly] = useState('');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState<string>('');

  async function submit() {
    setMsg('');
    if (!name.trim()) {
      setMsg('Name is required.');
      return;
    }

    await props.onAdd({
      name,
      rolesCSV,
      lawCSV,
      years,
      city,
      state,
      salary,
      contract,
      hourly,
      notes,
    });

    setName('');
    setRolesCSV('');
    setLawCSV('');
    setYears('');
    setCity('');
    setState('');
    setSalary('');
    setContract(false);
    setHourly('');
    setNotes('');
    setMsg('Candidate added.');
  }

  const label = { color: '#9ca3af', marginBottom: 4, fontSize: 12 };

  return (
    <div
      style={{
        background: '#0b0b0b',
        border: '1px solid #1f2937',
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Add candidate</div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 8,
        }}
      >
        <label style={{ fontSize: 12 }}>
          <div style={label}>Full name</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ fontSize: 12 }}>
          <div style={label}>Titles (CSV)</div>
          <input
            value={rolesCSV}
            onChange={e => setRolesCSV(e.target.value)}
            placeholder="Attorney, Paralegal"
            style={inputStyle}
          />
        </label>

        <label style={{ fontSize: 12 }}>
          <div style={label}>Type of Law (CSV)</div>
          <input
            value={lawCSV}
            onChange={e => setLawCSV(e.target.value)}
            placeholder="Litigation, Immigration"
            style={inputStyle}
          />
        </label>

        <label style={{ fontSize: 12 }}>
          <div style={label}>Years of experience</div>
          <input
            type="number"
            value={years}
            onChange={e => setYears(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ fontSize: 12 }}>
          <div style={label}>City</div>
          <input
            value={city}
            onChange={e => setCity(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ fontSize: 12 }}>
          <div style={label}>State</div>
          <input
            value={state}
            onChange={e => setState(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ fontSize: 12 }}>
          <div style={label}>Salary desired</div>
          <input
            type="number"
            value={salary}
            onChange={e => setSalary(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            marginTop: 6,
          }}
        >
          <input
            type="checkbox"
            checked={contract}
            onChange={e => setContract(e.target.checked)}
          />
          <span>Available for contract</span>
        </label>

        {contract ? (
          <label style={{ fontSize: 12 }}>
            <div style={label}>Hourly rate</div>
            <input
              type="number"
              value={hourly}
              onChange={e => setHourly(e.target.value)}
              style={inputStyle}
            />
          </label>
        ) : null}
      </div>

      <label style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
        <div style={label}>Candidate Notes</div>
        <textarea
          rows={4}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Short summary: strengths, availability, fit notes."
          style={{
            width: '100%',
            padding: 8,
            background: '#111827',
            color: '#e5e5e5',
            border: '1px solid #1f2937',
            borderRadius: 8,
          }}
        />
      </label>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={submit} style={{ fontSize: 12 }}>
          Add candidate
        </button>
        <div style={{ fontSize: 12, color: msg.includes('added') ? '#93e2b7' : '#f87171' }}>
          {msg}
        </div>
      </div>
    </div>
  );
}

function CandidateCard({ c }: { c: UICandidate }) {
  const pill = (t: string) => (
    <span
      key={t}
      style={{
        display: 'inline-block',
        fontSize: 11,
        padding: '2px 8px',
        background: '#111827',
        color: '#e5e5e5',
        border: '1px solid #1f2937',
        borderRadius: 999,
        marginRight: 6,
        marginBottom: 4,
      }}
    >
      {t}
    </span>
  );

  return (
    <div
      style={{
        border: '1px solid #1f2937',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        background: '#0b0b0b',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 600 }}>{c.name}</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>
            {(c.city || '') + (c.state ? ', ' + c.state : '')} — {c.years ?? 0} yrs
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
            Date added: {formatDate(c.created_at)}
          </div>
        </div>
      </div>

      {c.roles?.length ? <div style={{ marginTop: 6 }}>{c.roles.map(pill)}</div> : null}

      {c.practice_areas?.length ? (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Type of law</div>
          {c.practice_areas.map(pill)}
        </div>
      ) : null}

      {String(c.notes || '').trim() ? (
        <div
          style={{
            fontSize: 12,
            color: '#e5e5e5',
            background: '#0d1b2a',
            border: '1px solid #1e3a8a',
            borderRadius: 8,
            padding: 8,
            marginTop: 8,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Candidate Notes</div>
          <div>{c.notes}</div>
        </div>
      ) : null}

      <div style={{ fontSize: 12, color: '#e5e5e5', marginTop: 6 }}>
        Salary: {c.salary ? `$${c.salary}` : '-'}
      </div>
      <div style={{ fontSize: 12, color: '#e5e5e5' }}>
        Contract: {c.contract ? `Yes${c.hourly ? `, $${c.hourly}/hr` : ''}` : 'No'}
      </div>
    </div>
  );
}

/** shared input style */
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 8,
  background: '#111827',
  color: '#e5e5e5',
  border: '1px solid #1f2937',
  borderRadius: 8,
};
