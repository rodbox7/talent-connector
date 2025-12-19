import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

/* ---------- Clients ---------- */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

/* ---------- Email Helper ---------- */

async function sendEmail({ to, subject, body }) {
  if (!process.env.RESEND_API_KEY) {
    console.log('RESEND_API_KEY missing — skipping email send');
    return;
  }

  await resend.emails.send({
    from: 'Talent Connector <onboarding@resend.dev>', // safe default
    to,
    subject,
    text: body,
  });
}

/* ---------- API Handler ---------- */

export default async function handler(req, res) {
  const token = req.query.token;

  // 🔒 Protect the endpoint
  if (!token || token !== process.env.ALERTS_CRON_TOKEN) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    // 1️⃣ Fetch saved searches with alerts enabled
    const { data: searches, error } = await supabase
      .from('saved_searches')
      .select('id, user_id, name, filters, last_checked_at')
      .eq('alert_enabled', true);

    if (error) throw error;

    let processed = 0;

    for (const search of searches) {
      const since =
        search.last_checked_at || '1970-01-01T00:00:00.000Z';

      // 2️⃣ Look for new candidates since last run
      const { data: matches, error: matchErr } = await supabase
        .from('v_candidates')
        .select('id, first_name, last_name, city')
        .gt('created_at', since);

      if (matchErr) throw matchErr;

      // 3️⃣ Get user email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', search.user_id)
        .maybeSingle();

      // 4️⃣ Send email if there are matches
      if (matches?.length > 0 && profile?.email) {
        const preview = matches.slice(0, 5).map((m) => {
          const name =
            [m.first_name, m.last_name].filter(Boolean).join(' ') ||
            'Candidate';
          return `• ${name}${m.city ? ` (${m.city})` : ''}`;
        });

        await sendEmail({
          to: profile.email,
          subject: `Talent Connector: ${matches.length} new match(es) for "${search.name}"`,
          body:
            `New candidates were added that match your saved search:\n\n` +
            preview.join('\n') +
            `\n\nLog into Talent Connector to view all results.`,
        });
      }

      // 5️⃣ Update last_checked_at
      await supabase
        .from('saved_searches')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('id', search.id);

      processed++;
    }

    return res.json({ ok: true, processed });
  } catch (err) {
    console.error('ALERT RUN ERROR:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
