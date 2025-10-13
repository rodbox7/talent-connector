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

  // The rest of the code contains JSX with HTML-encoded characters
  // We will decode the entire code to replace < and > with < and >

  return null;  // Placeholder for actual JSX rendering
}

