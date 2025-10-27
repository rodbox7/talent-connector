// This is your corrected page.jsx, with ONLY the AdminPanel fixes applied
// to prevent the 'Unexpected token <' error.

'use client';
import React from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Page() {
  return <div>...</div>; // placeholder for brevity — your recruiter/client UI remains unchanged
}

/* ---------- Admin Panel ---------- */
function AdminPanel({ isMobile }) {
  const [list, setList] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState('');
  const [flash, setFlash] = React.useState('');

  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState('client');
  const [org, setOrg] = React.useState('');
  const [amEmail, setAmEmail] = React.useState('');
  const [tempPw, setTempPw] = React.useState('');

  const [q, setQ] = React.useState('');
  const [editingId, setEditingId] = React.useState(null);
  const [editDraft, setEditDraft] = React.useState({ role: 'client', org: '', account_manager_email: '' });
  const [rowBusy, setRowBusy] = React.useState({});

  React.useEffect(() => { loadProfiles(); }, []);

  async function loadProfiles() {
    setLoading(true);
    setErr('');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,role,org,account_manager_email,created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setList(data || []);
    } catch (e) {
      console.error(e);
      setErr('Error loading profiles.');
    }
    setLoading(false);
  }

  function toast(okMsg = '', errMsg = '') {
    if (okMsg) setFlash(okMsg);
    if (errMsg) setErr(errMsg);
    if (okMsg || errMsg) setTimeout(() => { setFlash(''); setErr(''); }, 2500);
  }

  // --- Safe fetch wrapper ---
  async function postJSON(path, payload) {
    const res = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });

    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const json = await res.json();
      if (!res.ok || json?.ok === false) {
        const msg = json?.error || `Request failed (${res.status})`;
        throw new Error(msg);
      }
      return json;
    } else {
      const text = await res.text();
      const hint = text.slice(0, 200);
      throw new Error(`Server returned ${res.status} ${res.statusText}. Not JSON. ${hint}`);
    }
  }

  async function invite() {
    setFlash('');
    setErr('');
    try {
      const em = (email || '').trim().toLowerCase();
      if (!em || !tempPw) {
        setErr('Email and temp password are required.');
        return;
      }

      await postJSON('/api/admin/invite', {
        email: em,
        role,
        org: org.trim() || null,
        amEmail: (amEmail || '').trim() || null,
        password: tempPw,
      });

      setEmail('');
      setRole('client');
      setOrg('');
      setAmEmail('');
      setTempPw('');
      toast(`Invited ${em} as ${role}`);
      await loadProfiles();
    } catch (e) {
      console.error(e);
      setErr(e?.message || 'Server error inviting user.');
    }
  }

  async function resendInvite(row) {
    try {
      setBusy(row.id, true);
      await postJSON('/api/admin/invite', {
        email: row.email,
        role: row.role,
        org: row.org || null,
        amEmail: row.account_manager_email || null,
        password: null,
        resend: true,
      });
      toast(`Resent invite to ${row.email}`);
    } catch (e) {
      console.error(e);
      setErr(e?.message || 'Resend failed.');
    } finally {
      setBusy(row.id, false);
    }
  }

  async function resetPassword(row) {
    try {
      const newPw = prompt('Set a new temporary password for this user (min 8 chars):');
      if (!newPw) return;
      if (newPw.length < 8) { alert('Password must be at least 8 characters.'); return; }
      setBusy(row.id, true);

      await postJSON('/api/admin/reset-password', {
        email: row.email,
        password: newPw,
      });

      toast('Temporary password set');
    } catch (e) {
      console.error(e);
      setErr(e?.message || 'Password reset failed.');
    } finally {
      setBusy(row.id, false);
    }
  }

  async function deleteUser(row) {
    try {
      if (!confirm(`Delete user ${row.email}? This cannot be undone.`)) return;
      setBusy(row.id, true);

      await postJSON('/api/admin/delete-user', { id: row.id });

      toast(`Deleted ${row.email}`);
      await loadProfiles();
    } catch (e) {
      console.error(e);
      setErr(e?.message || 'Delete failed.');
    } finally {
      setBusy(row.id, false);
    }
  }

  function setBusy(id, v) {
    setRowBusy((s) => ({ ...s, [id]: !!v }));
  }

  return <div>...</div>; // rest of AdminPanel UI unchanged
}
