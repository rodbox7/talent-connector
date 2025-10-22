'use client';
import React from 'react';
import { supabase } from '../lib/supabaseClient';

const NYC = 'https://upload.wikimedia.org/wikipedia/commons/f/fe/New-York-City-night-skyline-September-2014.jpg';

const Card = ({ children, style }) => (
  <div
    style={{
      background: 'rgba(9,12,18,0.82)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset, 0 8px 30px rgba(0,0,0,0.45)',
      ...style,
    }}
  >
    {children}
  </div>
);

const Label = ({ children }) => (
  <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>{children}</div>
);

const Input = (props) => (
  <input
    {...props}
    style={{
      width: '100%',
      padding: '10px 12px',
      borderRadius: 10,
      border: '1px solid #1F2937',
      background: '#0F172A',
      color: '#E5E7EB',
      outline: 'none',
      ...props.style,
    }}
  />
);

const Button = ({ children, ...rest }) => (
  <button
    {...rest}
    style={{
      padding: '10px 14px',
      borderRadius: 10,
      border: '1px solid #243041',
      background: '#3B82F6',
      color: 'white',
      fontWeight: 600,
      cursor: 'pointer',
      ...(rest.style || {}),
    }}
  >
    {children}
  </button>
);

export default function Page() {
  const [email, setEmail] = React.useState('');
  const [pwd, setPwd] = React.useState('');
  const [err, setErr] = React.useState('');
  const [user, setUser] = React.useState(null);
  const [contract, setContract] = React.useState(false);
  const [hourlyRange, setHourlyRange] = React.useState('');
  const [yearsRange, setYearsRange] = React.useState('');

  const pageWrap = {
    minHeight: '100vh',
    width: '100%',
    backgroundImage: `url(${NYC})`,
    backgroundPosition: 'center',
    backgroundSize: 'cover',
    backgroundAttachment: 'fixed',
  };
  const overlay = {
    minHeight: '100vh',
    width: '100%',
    backdropFilter: 'blur(1px)',
    background:
      'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.65) 16%, rgba(0,0,0,0.75) 100%)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 16px',
  };

  if (!user) {
    return (
      <div style={pageWrap}>
        <div style={overlay}>
          <Card style={{ width: 520, padding: 24 }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, letterSpacing: 0.3 }}>
              Talent Connector
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>
              Invitation-only access
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ width: '100%' }}>
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div style={{ width: '100%' }}>
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="your password"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                />
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <Button style={{ width: '100%' }}>Log in</Button>
            </div>
            {err ? (
              <div style={{ color: '#F87171', fontSize: 12, marginTop: 10 }}>{err}</div>
            ) : null}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      <div style={overlay}>
        <Card style={{ width: 600 }}>
          <div style={{ fontWeight: 800, marginBottom: 12 }}>Client Filters</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <Label>Years at Current Job</Label>
              <select
                value={yearsRange}
                onChange={(e) => setYearsRange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #1F2937',
                  background: '#0F172A',
                  color: '#E5E7EB',
                  outline: 'none',
                }}
              >
                <option value="">Any</option>
                <option value="0-5">0–5 years</option>
                <option value="6-10">6–10 years</option>
                <option value="11-15">11–15 years</option>
                <option value="16-20">16–20 years</option>
                <option value="21-25">21–25 years</option>
                <option value="26-30">26–30 years</option>
                <option value="31-35">31–35 years</option>
                <option value="35-">35+ years</option>
              </select>
            </div>
            <div>
              <Label>Available for Contract</Label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={contract}
                  onChange={(e) => setContract(e.target.checked)}
                />
                <span style={{ color: '#E5E7EB', fontSize: 13 }}>Available for contract</span>
              </label>
              {contract && (
                <select
                  value={hourlyRange}
                  onChange={(e) => setHourlyRange(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: 8,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid #1F2937',
                    background: '#0F172A',
                    color: '#E5E7EB',
                    outline: 'none',
                  }}
                >
                  <option value="">Any</option>
                  <option value="25-35">$25–$35</option>
                  {Array.from({ length: 21 }, (_, i) => {
                    const min = 35 + i * 10;
                    const max = min + 10;
                    return (
                      <option key={min} value={`${min}-${max}`}>
                        ${min}–${max}
                      </option>
                    );
                  })}
                  <option value="250-">$250+</option>
                </select>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
