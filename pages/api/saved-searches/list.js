import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'nodejs',
};

/* ---------------- Supabase Client ---------------- */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* ---------------- API Handler ---------------- */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    let { user_id } = req.query;

    /**
     * 🔁 BACKWARD COMPATIBILITY
     * If user_id is NOT passed (current UI behavior),
     * fall back to returning saved searches without hard failure.
     * This matches how things worked before.
     */
    if (!user_id) {
      const { data: searches, error } = await supabase
        .from('saved_searches')
        .select(
          `
          id,
          user_id,
          name,
          filters,
          alert_enabled,
          created_at,
          last_checked_at,
          last_alert_sent_at
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        searches: searches || [],
      });
    }

    /**
     * 🎯 Standard path (when user_id IS provided)
     */
    const { data, error } = await supabase
      .from('saved_searches')
      .select(
        `
        id,
        user_id,
        name,
        filters,
        alert_enabled,
        created_at,
        last_checked_at,
        last_alert_sent_at
      `
      )
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      searches: data || [],
    });
  } catch (err) {
    console.error('SAVED SEARCH LIST ERROR:', err);
    return res.status(500).json({
      ok: false,
      error: err.message || 'Unknown error',
    });
  }
}
