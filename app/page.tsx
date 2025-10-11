'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { supabase as sb } from '../lib/supabaseClient';

// ---------- Config ----------
const APP_NAME = 'Talent Connector';
const BUILD_TAG = 'supa-v3';

// ---------- Seed fallback so you are never locked out ----------
const seedUsers = [
  { id: 'u1', email: 'admin@youragency.com', role: 'admin', org: 'Your Agency', password: 'admin' },
  { id: 'u2', email: 'recruiter@youragency.com', role: 'recruiter', org: 'Your Agency', password: 'recruit' },
  { id: 'u3', email: 'client@samplefirm.com', role: 'client', org: 'Sample Firm', password: 'client' },
];

// Local fallback auth
function localFindUser(users, email, pwd) {
  const e = String(email || '').toLowerCase();
  return (
    users.find(
      (u) =>
        String(u.email || '').toLowerCase() === e &&
        String(u.password || '') === String(pwd || '')
    ) || null
  );
}

function parseCSV(s) {
  return String(s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

// ---------- Supabase helpers for candidates ----------
async function fetchCandidates() {
  const { data, error } = await sb
    .from('candidates')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function insertCandidate(payload) {
  const { error } = await sb.from('candidates').insert([payload]);
  if (error) throw error;
}

async function updateCandidateRow(id, patch) {
  const { error } = await sb.from('candidates').update(patch).eq('id', id);
  if (error) throw error;
}

async function deleteCandidateRow(id) {
  const { error } = await sb.from('candidates').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Page ----------
export default function Page() {
  // Local mirror of users (purely for seed fallback)
  const [users, setUsers] = useState(() => {
    try {
      const s = localStorage.getItem('tc_users');
      if (s) return JSON.parse(s);
    } catch {}
    return seedUsers;
  });
  useEffect(() => {
    try {
      localStorage.setItem('tc_users', JSON.stringify(users));
    } catch {}
  }, [users]);

  // Login state
  const [mode, setMode] = useState('recruiter'); // recruiter | client | admin
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [user, setUser] = useState(null);

  // Candidates state (Supabase)
  const [cands, setCands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState('');

  // Fetch candidates (after login)
  async function loadAll() {
    try {
      setLoading(true);
      setLoadErr('');
      const rows = await fetchCandidates();
      setCands(rows);
    } catch (e) {
      console.error(e);
      setLoadErr('Failed to load candidates. Check RLS/policies and your role.');
    } finally {
      setLoading(false);
    }
  }

  // Auth: Supabase-first; fallback to seed
  async function login() {
    try {
      setErr('');
      const e = String(email).trim().toLowerCase();
      if (!e.includes('@')) {
        setErr('Enter a valid email');
        return;
      }

      // 1) Try Supabase Auth
      const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
        email: e,
        password: pwd,
      });

      if (!authErr && auth?.user) {
        // Fetch profile by auth user id
        const { data: prof, error: profErr } = await sb
          .from('profiles')
          .select('id,email,role,org')
          .eq('id', auth.user.id)
          .single();

        if (profErr || !prof) {
          setErr(
            'Login succeeded, but profile not found. Ask Admin to create/repair your profile.'
          );
          return;
        }

        if (mode !== prof.role) {
          setErr(
            `This account is a ${prof.role}. Switch to the ${prof.role} tab or ask Admin to change the role.`
          );
          return;
        }

        setUser({
          id: prof.id,
          email: prof.email,
          role: prof.role,
          org: prof.org || '',
        });

        // After login, load data
        await loadAll();
        return;
      }

      // 2) Fallback to local seed
      const u = localFindUser(users, e, pwd);
      if (!u) {
        setErr('Invalid credentials');
        return;
      }
      if (u.role !== mode) {
        setErr(`This account is a ${u.role}. Switch to the ${u.role} tab.`);
        return;
      }
      setUser({ id: u.id, email: u.email, role: u.role, org: u.org || '' });

      // Seed mode: show empty list (no Supabase)
      setCands([]);
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

  // ---------- Recruiter add/edit/delete ----------
  async function addCandidateLocal(form, me) {
    // Build payload to match Supabase schema
    const payload = {
      name: form.name.trim(),
      roles: parseCSV(form.rolesCSV),
      practice_areas: parseCSV(form.practiceCSV),
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      years: Number(form.years) || 0,
      years_in_most_recent: Number(form.recentYears) || 0,
      salary: Number(form.salary) || 0,
      contract: !!form.contract,
      hourly: form.contract ? Number(form.hourly) || 0 : 0,
      notes: String(form.notes || ''),
      date_entered: form.dateEntered || null,
      created_by: me?.id || null,
    };
    await insertCandidate(payload);
    await loadAll();
  }

  async function updateCandidateLocal(id, patch) {
    // Map UI fields back to DB column names
    const dbPatch = {};
    if ('name' in patch) dbPatch.name = String(patch.name || '');
    if ('rolesCSV' in patch) dbPatch.roles = parseCSV(patch.rolesCSV);
    if ('practiceCSV' in patch) dbPatch.practice_areas = parseCSV(patch.practiceCSV);
    if ('city' in patch) dbPatch.city = String(patch.city || '');
    if ('state' in patch) dbPatch.state = String(patch.state || '');
    if ('years' in patch) dbPatch.years = Number(patch.years) || 0;
    if ('recentYears' in patch)
      dbPatch.years_in_most_recent = Number(patch.recentYears) || 0;
    if ('salary' in patch) dbPatch.salary = Number(patch.salary) || 0;
    if ('contract' in patch) dbPatch.contract = !!patch.contract;
    if ('hourly' in patch)
      dbPatch.hourly = (patch.contract ? Number(patch.hourly) : Number(patch.hourly)) || 0;
    if ('notes' in patch) dbPatch.notes = String(patch.notes || '');
    if ('dateEntered' in patch) dbPatch.date_entered = patch.dateEntered || null;

    await updateCandidateRow(id, dbPatch);
    await loadAll();
  }

  async function deleteCandidateLocal(id) {
    await deleteCandidateRow(id);
    await loadAll();
  }

  // ---------- UI bits ----------
  const pageStyle = {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    background: '#0a0a0a',
    color: '#e5e5e5',
    fontFamily: 'system-ui, Arial',
  };
  const card = {
    width: '100%',
    maxWidth: 420,
    background: '#0b0b0b',
    border: '1px solid #1f2937',
    borderRadius: 12,
    padding: 16,
  };

  // ========== LOGGED-IN VIEWS ==========
  if (user && user.role === 'admin') {
    return (
      <div style={{ ...pageStyle, alignItems: 'start' }}>
        <div style={{ ...card, marginTop: 40, maxWidth: 800 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700 }}>Admin</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>{user.email}</div>
            </div>
            <button onClick={logout} style={{ fontSize: 12 }}>
              Log out
            </button>
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
            You’re using Supabase for users. Add / manage users in Supabase Auth & the <code>profiles</code> table. (We can re-add the Admin panel later.)
          </div>
        </div>
      </div>
    );
  }

  if (user && (user.role === 'recruiter' || user.role === 'client')) {
    const isRecruiter = user.role === 'recruiter';

    return (
      <div style={{ ...pageStyle, alignItems: 'start' }}>
        <div style={{ ...card, marginTop: 40, maxWidth: 980 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700 }}>
                {isRecruiter ? 'Recruiter' : 'Client'}{' '}
                <span style={{ color: '#9ca3af', fontSize: 12 }}>({user.email})</span>
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                Connected to Supabase • {BUILD_TAG}
              </div>
            </div>
            <div>
              <button onClick={loadAll} style={{ fontSize: 12, marginRight: 8 }}>
                Refresh
              </button>
              <button onClick={logout} style={{ fontSize: 12 }}>
                Log out
              </button>
            </div>
          </div>

          {/* Recruiter: Add form */}
          {isRecruiter ? (
            <RecruiterForm
              onAdd={(rec) => addCandidateLocal(rec, user)}
            />
          ) : null}

          {/* List */}
          <div style={{ marginTop: 12 }}>
            {loading ? (
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Loading…</div>
            ) : loadErr ? (
              <div style={{ fontSize: 12, color: '#f87171' }}>{loadErr}</div>
            ) : cands.length === 0 ? (
              <div style={{ fontSize: 12, color: '#9ca3af' }}>No candidates.</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {cands.map((c) => (
                  <CandidateCard
                    key={c.id}
                    row={c}
                    canEdit={isRecruiter}
                    onUpdate={(patch) => updateCandidateLocal(c.id, patch)}
                    onDelete={() => deleteCandidateLocal(c.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ========== LOGIN ==========
  return (
    <div style={pageStyle}>
      <div style={card}>
        <div style={{ textAlign: 'center', fontWeight: 700 }}>
          {APP_NAME} <span style={{ fontSize: 11, color: '#9ca3af' }}>({BUILD_TAG})</span>
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
          Invitation-only access
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
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
          <LabeledInput label="Email" type="email" value={email} onChange={setEmail} placeholder="name@company.com" />
          <LabeledInput label="Password" type="password" value={pwd} onChange={setPwd} placeholder="your password" />

          <button
            onClick={login}
            style={{ width: '100%', padding: 10, marginTop: 8, background: '#4f46e5', color: 'white', borderRadius: 8 }}
          >
            Log in
          </button>
          {err ? (
            <div style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>{err}</div>
          ) : null}
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
            Seed admin (fallback): <strong>admin@youragency.com / admin</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Small UI components ----------
function LabeledInput({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
      <div style={{ color: '#9ca3af', marginBottom: 4 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
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
  );
}

function LabeledTextArea({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
      <div style={{ color: '#9ca3af', marginBottom: 4 }}>{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
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
  );
}

// ---------- Recruiter Form ----------
function RecruiterForm({ onAdd }) {
  const [name, setName] = useState('');
  const [rolesCSV, setRolesCSV] = useState('');
  const [practiceCSV, setPracticeCSV] = useState('');
  const [years, setYears] = useState('');
  const [recentYears, setRecentYears] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [salary, setSalary] = useState('');
  const [contract, setContract] = useState(false);
  const [hourly, setHourly] = useState('');
  const [notes, setNotes] = useState('');
  const [dateEntered, setDateEntered] = useState(''); // NEW

  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  async function submit() {
    try {
      setErr('');
      setOk('');
      if (!name.trim()) {
        setErr('Name is required');
        return;
      }
      await onAdd({
        name,
        rolesCSV,
        practiceCSV,
        years,
        recentYears,
        city,
        state,
        salary,
        contract,
        hourly,
        notes,
        dateEntered, // pass through
      });
      setOk('Candidate added');
      // reset
      setName('');
      setRolesCSV('');
      setPracticeCSV('');
      setYears('');
      setRecentYears('');
      setCity('');
      setState('');
      setSalary('');
      setContract(false);
      setHourly('');
      setNotes('');
      setDateEntered('');
    } catch (e) {
      console.error(e);
      setErr('Failed to add candidate');
    }
  }

  return (
    <div style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, marginTop: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Add candidate</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 8,
        }}
      >
        <LabeledInput label="Full name" value={name} onChange={setName} />
        <LabeledInput label="Titles (CSV)" value={rolesCSV} onChange={setRolesCSV} placeholder="Attorney, Paralegal" />
        <LabeledInput
          label="Type of Law (CSV)"
          value={practiceCSV}
          onChange={setPracticeCSV}
          placeholder="Litigation, Immigration"
        />
        <LabeledInput label="Years of experience" value={years} onChange={setYears} />
        <LabeledInput label="Years in Most Recent Position" value={recentYears} onChange={setRecentYears} />
        <LabeledInput label="City" value={city} onChange={setCity} />
        <LabeledInput label="State" value={state} onChange={setState} />
        <LabeledInput label="Salary desired" value={salary} onChange={setSalary} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginTop: 6 }}>
          <input type="checkbox" checked={contract} onChange={(e) => setContract(e.target.checked)} />
          <span>Available for contract</span>
        </label>
        {contract ? (
          <LabeledInput label="Hourly rate" value={hourly} onChange={setHourly} />
        ) : null}
        <label style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
          <div style={{ color: '#9ca3af', marginBottom: 4 }}>Date Entered</div>
          <input
            type="date"
            value={dateEntered}
            onChange={(e) => setDateEntered(e.target.value)}
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
      </div>
      <LabeledTextArea
        label="Candidate Notes"
        value={notes}
        onChange={setNotes}
        placeholder="Short summary: strengths, availability, fit notes."
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={submit} style={{ fontSize: 12 }}>
          Add candidate
        </button>
        {err ? <div style={{ fontSize: 12, color: '#f87171' }}>{err}</div> : null}
        {ok ? <div style={{ fontSize: 12, color: '#a7f3d0' }}>{ok}</div> : null}
      </div>
    </div>
  );
}

// ---------- Candidate Card ----------
function CandidateCard({ row, canEdit, onUpdate, onDelete }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(row.name || '');
  const [rolesCSV, setRolesCSV] = useState((row.roles || []).join(', '));
  const [practiceCSV, setPracticeCSV] = useState((row.practice_areas || []).join(', '));
  const [years, setYears] = useState(String(row.years || ''));
  const [recentYears, setRecentYears] = useState(String(row.years_in_most_recent || ''));
  const [city, setCity] = useState(row.city || '');
  const [state, setState] = useState(row.state || '');
  const [salary, setSalary] = useState(String(row.salary || ''));
  const [contract, setContract] = useState(!!row.contract);
  const [hourly, setHourly] = useState(String(row.hourly || ''));
  const [notes, setNotes] = useState(row.notes || '');
  const [dateEntered, setDateEntered] = useState(row.date_entered || '');

  function badge(text) {
    return (
      <span
        key={text}
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
        {text}
      </span>
    );
  }

  async function save() {
    const patch = {
      name,
      rolesCSV,
      practiceCSV,
      years,
      recentYears,
      city,
      state,
      salary,
      contract,
      hourly,
      notes,
      dateEntered,
    };
    await onUpdate(patch);
    setEdit(false);
  }

  return (
    <div style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12 }}>
      {!edit ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{row.name}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                {[row.city, row.state].filter(Boolean).join(', ')} • {row.years || 0} yrs
                {row.years_in_most_recent ? ` • ${row.years_in_most_recent} yrs (recent)` : ''}
                {row.date_entered ? ` • Entered ${row.date_entered}` : ''}
              </div>
            </div>
          </div>
          {row.roles?.length ? <div style={{ marginTop: 6 }}>{row.roles.map((r) => badge(r))}</div> : null}
          {row.practice_areas?.length ? (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Type of law</div>
              {row.practice_areas.map((p) => badge(p))}
            </div>
          ) : null}
          {String(row.notes || '').trim() ? (
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
              <div>{row.notes}</div>
            </div>
          ) : null}
          <div style={{ fontSize: 12, color: '#e5e5e5', marginTop: 6 }}>
            Salary: {row.salary ? '$' + row.salary : '-'}
          </div>
          <div style={{ fontSize: 12, color: '#e5e5e5' }}>
            Contract: {row.contract ? 'Yes' + (row.hourly ? `, $${row.hourly}/hr` : '') : 'No'}
          </div>

          {canEdit ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => setEdit(true)} style={{ fontSize: 12 }}>
                Edit
              </button>
              <button onClick={onDelete} style={{ fontSize: 12 }}>
                Delete
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div>
          <LabeledInput label="Full name" value={name} onChange={setName} />
          <LabeledInput
            label="Titles (comma separated)"
            value={rolesCSV}
            onChange={setRolesCSV}
            placeholder="Attorney, Contract Attorney"
          />
          <LabeledInput
            label="Type of law (comma separated)"
            value={practiceCSV}
            onChange={setPracticeCSV}
            placeholder="Securities Litigation, Immigration"
          />
          <LabeledInput label="Years of experience" value={years} onChange={setYears} />
          <LabeledInput
            label="Years in Most Recent Position"
            value={recentYears}
            onChange={setRecentYears}
          />
          <LabeledInput label="City" value={city} onChange={setCity} />
          <LabeledInput label="State" value={state} onChange={setState} />
          <LabeledInput label="Desired salary" value={salary} onChange={setSalary} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginTop: 6 }}>
            <input type="checkbox" checked={contract} onChange={(e) => setContract(e.target.checked)} />
            <span>Available for contract</span>
          </label>
          {contract ? <LabeledInput label="Hourly rate" value={hourly} onChange={setHourly} /> : null}
          <label style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
            <div style={{ color: '#9ca3af', marginBottom: 4 }}>Date Entered</div>
            <input
              type="date"
              value={dateEntered || ''}
              onChange={(e) => setDateEntered(e.target.value)}
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
          <LabeledTextArea
            label="Candidate Notes"
            value={notes}
            onChange={setNotes}
            placeholder="Short summary: strengths, availability, fit notes."
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={save} style={{ fontSize: 12 }}>
              Save
            </button>
            <button onClick={() => setEdit(false)} style={{ fontSize: 12 }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
