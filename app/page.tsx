'use client';
import React from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Page() {
  console.log('BUILD_MARKER::MARK_A'); // unique marker for this test
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'system-ui, Arial' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 20 }}>Hello from TSX — MARK A</div>
        <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
          If you see this, this deployment used <code>app/page.tsx</code> from the current commit.
        </div>
      </div>
    </div>
  );
}
