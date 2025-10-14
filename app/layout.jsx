// app/layout.jsx — server component (no client-only libs)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Talent Connector',
  description: 'Invitation-only portal',
};

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
        }}
      >
        {children}
      </body>
    </html>
  );
}
