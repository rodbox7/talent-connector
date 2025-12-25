// pages/api/saved-searches/list.js
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'nodejs',
};

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
    if (req.method !== 'GET') {
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

    const { data, error } = await supabase
      .from('saved_searches')
      .select(
        'id, name, filters, alerts_enabled, created_at, updated_at'
      )
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      searches: data || [],
    });
  } catch (err) {
    console.error('LIST SAVED SEARCHES ERROR:', err);
    return res.status(500).json({
      ok: false,
      error: err.message || 'Unknown error',
    });
  }
}
