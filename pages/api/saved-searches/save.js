// pages/api/saved-searches/save.js
import { createClient } from '@supabase/supabase-js';

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
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Missing auth token' });
    }

    const { data: auth, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !auth?.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const user = auth.user;
    const { name, filters } = req.body || {};

    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ ok: false, error: 'Name is required' });
    }

    if (!filters || typeof filters !== 'object') {
      return res.status(400).json({ ok: false, error: 'Filters must be an object' });
    }

    const { data, error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: user.id,
        name: String(name).trim(),
        filters,
        alerts_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ ok: true, search: data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
