// app/layout.jsx
import './globals.css';

export const metadata = {
  title: 'Talent Connector',
  description: 'Invitation-only legal talent hub',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
