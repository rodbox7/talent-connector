'use client';
import React, { useState, useEffect } from 'react';

// 1) Fallback users so you can always log in (stored in localStorage)
const seedUsers = [
  { id: 'u1', email: 'admin@youragency.com', role: 'admin', org: 'Your Agency', password: 'admin', loginCount: 0, lastLoginAt: null, totalMinutes: 0, sessions: [] },
  // optional convenience accounts (can remove later)
  { id: 'u2', email: 'recruiter@youragency.com', role: 'recruiter', org: 'Your Agency', password: 'recruit', loginCount: 0, lastLoginAt: null, totalMinutes: 0, sessions: [] },
  { id: 'u3', email: 'client@samplefirm.com', role: 'client', org: 'Sample Firm', password: 'client', loginCount: 0, lastLoginAt: null, totalMinutes: 0, sessions: [] },
];

export default function Page() {
  // 2) Users state: load from localStorage, fall back to seedUsers
  const [users, setUsers] = useState(() => {
    try {
      const s = localStorage.getItem('tc_users');
      if (s) return JSON.parse(s);
    } catch {}
    return seedUsers;
  });

  // 3) Persist any changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tc_users', JSON.stringify(users));
    } catch {}
  }, [users]);

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'system-ui, Arial' }}>
      <div style={{ textAlign: 'center' }}>
        <div>Hello from a clean Next.js app</div>
        <div style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>
          Seed admin ready: <strong>admin@youragency.com / admin</strong><br/>
          Users loaded: {users.length}
        </div>
      </div>
    </div>
  );
}
