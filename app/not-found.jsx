// app/not-found.jsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function NotFound() {
  return (
    <div style={{ minHeight:'100vh', display:'grid', placeItems:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontWeight: 700 }}>Page not found</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
          This route does not exist.
        </div>
      </div>
    </div>
  );
}
