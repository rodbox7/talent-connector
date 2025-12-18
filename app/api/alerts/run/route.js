import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Simple protection so only cron (or you) can run this
function isAuthorized(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  return token && token === process.env.ALERTS_CRON_TOKEN;
}

// Placeholder email sender (safe — logs only)
async function sendEmail({ to, subject, body }) {
  console.log('EMAIL PREVIEW:', { to, subject, body });
}

export async function GET(req) {
  try {
    // 🔒 Protect the route
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 1️⃣ Fetch saved searches with alerts enabled
    const { data: searches, error } = await supabase
      .from('saved_searches')
      .select('id, user_id, name, filters, last_checked_at')
      .eq('alert_enabled', true);

    if (error) throw error;

    let processed = 0;
    let emailed = 0;

    for (const search of searches) {
      const since =
        search.last_checked_at || '1970-01-01T00:00:00.000Z';
      const filters = search.filters || {};

      // 2️⃣ Query new candidates (VIEW)
      let query = supabase
        .from('v_candidates')
        .select('id, first_name, last_name, city, created_at')
        .gt('created_at', since);

      // Apply filters (MVP)
      if (filters.city) query = query.ilike('city', filters.city);
      if (filters.role) query = query.eq('role', filters.role);
      if (filters.practice_area)
        query = query.eq('practice_area', filters.practice_area);

      const { data: matches, error: matchErr } = await query;
      if (matchErr) throw matchErr;

      // 3️⃣ Look up user email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', search.user_id)
        .maybeSingle();

      // 4️⃣ Send email (log only for now)
      if (matches?.length > 0 && profile?.email) {
        const preview = matches.slice(0, 5).map((m) => {
          const name =
            [m.first_name, m.last_name].filter(Boolean).join(' ') ||
            'Candidate';
          return `• ${name} (${m.city || 'City n/a'})`;
        });

        await sendEmail({
          to: profile.email,
          subject: `Talent Connector: ${matches.length} new match(es) for "${search.name}"`,
          body:
            `New candidates added:\n\n` +
            preview.join('\n') +
            `\n\nLog into Talent Connector to view all results.`,
        });

        emailed++;
      }

      // 5️⃣ Update last_checked_at
      await supabase
        .from('saved_searches')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('id', search.id);

      processed++;
    }

    return NextResponse.json({
      ok: true,
      processed,
      emailed,
    });
  } catch (err) {
    console.error('ALERT RUN ERROR:', err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
