// app/page.jsx — server component (no 'use client')
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'rgba(11,11,11,0.92)',
          border: '1px solid rgba(31,41,55,0.75)',
          borderRadius: 12,
          padding: 16,
          boxShadow: '0 10px 30px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.04)',
          color: '#e5e5e5',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ fontWeight: 700 }}>Minimal Home (SSR)</div>
        <div style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>
          If you see this, the /page export error is gone.
        </div>
      </div>
    </div>
  );
}
