// app/layout.jsx
export const metadata = {
  title: 'Talent Connector',
  description: 'Invitation-only access',
};

const NYC_URL =
  'https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, Arial' }}>
        {/* Background layer (fixed across all routes) */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
            background:
              'radial-gradient(ellipse at top, #101827, #07070b 60%)',
          }}
        >
          <img
            alt=""
            src={NYC_URL}
            onError={(e) => {
              // hide if it fails to load
              e.currentTarget.style.display = 'none';
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter:
                'grayscale(0.15) contrast(1.1) brightness(0.95)',
              opacity: 0.95,
            }}
          />
        </div>

        {/* App content above background */}
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
