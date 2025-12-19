import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  const token = req.query.token;

  if (!token || token !== process.env.ALERTS_CRON_TOKEN) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  // 🔍 ENV CHECK (this is critical)
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({
      ok: false,
      error: 'Missing RESEND_API_KEY in production',
    });
  }

  try {
    // 🔔 HARD TEST EMAIL (no Supabase, no loops)
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: ['tarboxjohnd@gmail.com'],
      subject: 'Talent Connector – Resend Test',
      html: '<p>This is a direct Resend test from production.</p>',
    });

    console.log('RESEND RESULT:', result);

    return res.json({
      ok: true,
      resendResult: result,
    });
  } catch (err) {
    console.error('RESEND ERROR:', err);

    return res.status(500).json({
      ok: false,
      message: err?.message,
      name: err?.name,
      stack: err?.stack,
      raw: err,
    });
  }
}
