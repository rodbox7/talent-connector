// app/layout.jsx — server component with global NYC background
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: "Talent Connector",
  description: "Beacon Hill Legal — Talent Connector",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png" // iOS home-screen icon
  },
  manifest: "/manifest.json"
};


const NYC_URL =
  'https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg'; // CC BY 4.0

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: '#0a0a0a',
          color: '#e5e5e5',
          fontFamily:
            'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
          minHeight: '100vh',
          position: 'relative',
          overflowX: 'hidden',
        }}
      >
        {/* Background image */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: -2,
            backgroundImage: `url(${NYC_URL})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'grayscale(0.15) contrast(1.1) brightness(0.95)',
            opacity: 0.95,
            pointerEvents: 'none',
          }}
        />

        {/* Soft dark overlay for readability */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: -1,
            background:
              'radial-gradient(ellipse at top, rgba(0,0,0,0.35), rgba(0,0,0,0.65) 65%)',
            pointerEvents: 'none',
          }}
        />

        {/* Page content */}
        <main style={{ minHeight: '100vh' }}>{children}</main>
      </body>
    </html>
  );
}
