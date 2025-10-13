'use client';  // <-- force this layout to be a Client Component

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Talent Connector',
  description: 'Invitation-only portal',
};

const NYC_URL =
  'https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg'; // CC BY 4.0

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* Background image across ALL pages */}
        <div className="tc-fixed-bg" aria-hidden="true">
          <img src={NYC_URL} alt="" />
        </div>

        {/* Page content */}
        <div className="tc-content">{children}</div>

        {/* Global styles — plain <style> (NOT styled-jsx) */}
        <style>{`
          html, body { height: 100%; }
          body {
            margin: 0;
            font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
            color: #e5e5e5;
            background: #0a0a0a;
          }
          .tc-fixed-bg {
            position: fixed;
            inset: 0;
            z-index: -1;
            overflow: hidden;
            background: radial-gradient(ellipse at top, #101827, #07070b 60%);
          }
          .tc-fixed-bg img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            filter: grayscale(0.15) contrast(1.1) brightness(0.95);
            opacity: 0.95;
          }
          .tc-content { min-height: 100vh; }
        `}</style>
      </body>
    </html>
  );
}
