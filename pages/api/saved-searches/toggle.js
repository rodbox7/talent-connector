// pages/api/saved-searches/toggle.js
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'nodejs',
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed',
    });
  }

  try {
    const { id, enabled } = req.body;

    if (!id || typeof enabled !== 'boolean') {
      return res.status(400).json({
        ok: false,
        error: 'Missing id or enabled flag',
      });
    }

    // ✅ IMPORTANT: use alerts_enabled (plural)
    const { data, error } = await supabase
      .from('saved_searches')
      .update({
        alerts_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, alerts_enabled')
      .single();

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      id: data.id,
      alerts_enabled: data.alerts_enabled,
    });
  } catch (err) {
    console.error('TOGGLE ALERT ERROR:', err);
    return res.status(500).json({
      ok: false,
      error: err.message || 'Unknown error',
    });
  }
}
