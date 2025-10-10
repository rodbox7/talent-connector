// app/layout.jsx
import './globals.css'; // ← THIS is the important bit

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Inter font */}
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin=""/>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Talent Connector</title>
      </head>
      <body>
        <header className="app-header">
          <div className="app-header-inner">
            <div className="brand">
              Talent Connector
              <small>Powered by Beacon Hill Legal</small>
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
