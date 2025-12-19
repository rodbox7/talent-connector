const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  const token = req.query.token;

  // 🔐 Simple auth
  if (!token || token !== process.env.ALERTS_CRON_TOKEN) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const { data: searches, error } = await supabase
      .from('saved_searches')
      .select('id, last_checked_at')
      .eq('alert_enabled', true);

    if (error) throw error;

    let processed = 0;

    for (const search of searches) {
      const since =
        search.last_checked_at || '1970-01-01T00:00:00.000Z';

      // 🔍 Just checking for new candidates
      const { data: newCandidates } = await supabase
        .from('v_candidates')
        .select('id')
        .gt('created_at', since)
        .limit(1);

      await supabase
        .from('saved_searches')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('id', search.id);

      if (newCandidates && newCandidates.length > 0) {
        processed++;
      }
    }

    // ✉️ SEND ONE TEST EMAIL (ONLY IF SOMETHING WAS PROCESSED)
if (processed > 0) {
  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: ['tarboxjohnd@gmail.com'],
    subject: '✅ Talent Connector Alert Test',
    html: `
      <h2>Alert system is working</h2>
      <p>${processed} saved search(es) detected new candidates.</p>
      <p>This is a test email confirming the alert pipeline is live.</p>
    `,
  });
}


    return res.json({ ok: true, processed });
  } catch (err) {
    console.error('ALERT RUN ERROR:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
