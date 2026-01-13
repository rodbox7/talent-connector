import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const config = {
  runtime: 'nodejs',
};


/* ---------------- Clients ---------------- */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

/* ---------------- Helpers ---------------- */

function hoursBetween(a, b) {
  return Math.abs(a - b) / 36e5;
}

/* ---------------- API Handler ---------------- */

export default async function handler(req, res) {
  console.log('🚨 ALERT CRON HIT', {
    time: new Date().toISOString(),
    headers: req.headers,
    query: req.query,
    path: req.url,
  });

  try {

 /* 🔐 AUTH — allow Vercel Cron OR secret token */

// Vercel cron reliably identifies itself via user-agent
const userAgent = req.headers['user-agent'] || '';
const isVercelCron = userAgent.startsWith('vercel-cron');

// Optional manual override (keep this)
const queryToken = req.query.token;
const headerToken = req.headers['x-cron-token'];

const hasValidToken =
  (queryToken && queryToken === process.env.ALERTS_CRON_TOKEN) ||
  (headerToken && headerToken === process.env.ALERTS_CRON_TOKEN);

if (!isVercelCron && !hasValidToken) {
  console.log('❌ ALERT CRON UNAUTHORIZED', {
    userAgent,
    headers: req.headers,
  });
  return res.status(401).json({ ok: false, error: 'Unauthorized' });
}



    /* 🔎 Get enabled saved searches */
    const { data: searches, error: searchError } = await supabase
      .from('saved_searches')
     .select(
  'id, name, roles, practice_areas, city, state, created_at'
)
      .eq('alerts_enabled', true);

    if (searchError) throw searchError;

    let processed = 0;
    let emailsSent = 0;

    for (const search of searches) {
      const now = new Date();

      /* ⏱ Throttle alerts (12 hours) */
      if (
        search.last_alert_sent_at &&
        hoursBetween(now, new Date(search.last_alert_sent_at)) < 12
      ) {
        processed++;
        continue;
      }

      const since =
        search.last_checked_at || '1970-01-01T00:00:00.000Z';

      /* 🔎 Find new candidates */
      const { data: candidates, error: candidateError } = await supabase
        .from('v_candidates')
        .select(
  'id, name, roles, practice_areas, city, state, created_at'
)
        .gt('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5);

      if (candidateError) throw candidateError;

      if (!candidates || candidates.length === 0) {
        await supabase
          .from('saved_searches')
          .update({ last_checked_at: now.toISOString() })
          .eq('id', search.id);

        processed++;
        continue;
      }

      /* 👤 Get user email */
      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('id', search.user_id)
        .single();

      if (!user?.email) {
        processed++;
        continue;
      }

      /* 🧠 Build preview */
      const preview = candidates.slice(0, 3).map((c) => {
       const displayName = c.name || 'Candidate';
const role =
  c.roles ||
  c.practice_areas ||
  'Role N/A';

const location =
  [c.city, c.state].filter(Boolean).join(', ') || 'Location N/A';

return `
  <li style="margin-bottom: 6px;">
    <strong>${displayName}</strong>
    — ${role}
    — ${location}
  </li>
`;
      });

      /* ✉️ Send email */
      await resend.emails.send({
        from: 'Talent Connector <alerts@bhltalentconnector.com>',
        to: user.email,
        subject: `${candidates.length} new candidates for "${search.name}"`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
            <h2>New Talent Alert</h2>

            <p>
              <strong>${candidates.length}</strong> new candidates match your saved search:
            </p>

            <p><strong>${search.name}</strong></p>

            <ul style="padding-left: 18px;">
              ${preview.join('')}
            </ul>

            <p>
              <a
                href="${process.env.NEXT_PUBLIC_SITE_URL}/search?saved=${search.id}"
                style="
                  display: inline-block;
                  margin-top: 12px;
                  padding: 10px 16px;
                  background: #1f2937;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 6px;
                  font-weight: 600;
                "
              >
                View All Matches
              </a>
            </p>

            <hr style="margin: 24px 0;" />

            <small style="color: #6b7280;">
              You’re receiving this email because alerts are enabled for this saved search.
            </small>
          </div>
        `,
      });

      /* 🕒 Update timestamps */
      await supabase
        .from('saved_searches')
        .update({
          last_checked_at: now.toISOString(),
          last_alert_sent_at: now.toISOString(),
        })
        .eq('id', search.id);

      processed++;
      emailsSent++;
    }

    return res.json({
      ok: true,
      processed,
      emailsSent,
    });
  } catch (err) {
    console.error('ALERT RUN ERROR:', err);
    return res.status(500).json({
      ok: false,
      error: err.message || 'Unknown error',
    });
  }
}
