'use client';
import React from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Page() {
  // tiny runtime check to prove we're on the .tsx build
  console.log('BUILD_MARKER::TSX_ACTIVE');

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily:'system-ui, Arial' }}>
      <div>
        <div style={{ fontWeight: 700, textAlign: 'center' }}>Hello from TSX</div>
        <div style={{ fontSize: 12, color: '#666', marginTop: 8, textAlign: 'center' }}>
          If you see this, Vercel is building <code>app/page.tsx</code>.
        </div>
      </div>
    </div>
  );
}
