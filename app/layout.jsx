export const metadata = { title: 'Talent Connector', description: 'Login' };

import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0a0a0a' }}>
        {/* Hard reset to ensure no white borders or default margins */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html,body{margin:0;padding:0;background:#0a0a0a}
              img{display:block;border:0}
              *, *::before, *::after { box-sizing: border-box; }
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
