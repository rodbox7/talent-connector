// app/layout.jsx  — server component (no 'use client')

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
        {/* Fixed background image behind the entire app */}
        <div className="tc-fixed-bg" aria-hidden="true">
          <img src={NYC_URL} alt="" />
        </div>

        {/* App content */}
        <div className="tc-content">{children}</div>

        {/* Global styles (server-safe) */}
        <style dangerouslySetInnerHTML={{ __html: `
          html, body { height: 100%; }
          body {
            margin: 0;
            font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
            color: #e5e5e5;
            background: transparent; /* keep transparent so photo shows */
          }
          /* Fixed background layer */
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
          /* Let pages scroll normally on top */
          .tc-content {
            min-height: 100vh;
          }
        `}} />
      </body>
    </html>
  );
}
