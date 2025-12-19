import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const token = req.query.token;

  if (!token || token !== process.env.ALERTS_CRON_TOKEN) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const { data: searches, error: searchErr } = await supabase
      .from('saved_searches')
      .select('id, filters, last_checked_at')
      .eq('alert_enabled', true);

    if (searchErr) throw searchErr;

    let processed = 0;

    for (const search of searches) {
      const since =
        search.last_checked_at || '1970-01-01T00:00:00.000Z';

      // 🔒 SAFE QUERY — only fields that exist
      const { data: newCandidates, error: candErr } = await supabase
        .from('v_candidates')
        .select('id')
        .gt('created_at', since);

      if (candErr) throw candErr;

      // Update last_checked_at only if query succeeds
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
