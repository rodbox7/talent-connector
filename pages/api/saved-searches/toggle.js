// pages/api/saved-searches/toggle.js
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

export default function handler(req, res) {
  return res.status(200).json({
    ok: true,
    marker: 'PAGES_API_TOGGLE_HIT',
  });
}


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getBearer(req) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const token = getBearer(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Missing auth token' });

    const { data: auth, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !auth?.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const user = auth.user;
    const { id, enabled } = req.body || {};

    if (!id) return res.status(400).json({ ok: false, error: 'Missing saved search id' });
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ ok: false, error: 'enabled must be boolean' });
    }

    // IMPORTANT: only allow toggling searches owned by this user
    const { data, error } = await supabase
      .from('saved_searches')
      .update({
        alerts_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ ok: true, search: data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
