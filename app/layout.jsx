export const metadata = { title: 'Talent Connector', description: 'Smoke test' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0a0a0a', color: '#e5e5e5' }}>
        {children}
      </body>
    </html>
  );
}
