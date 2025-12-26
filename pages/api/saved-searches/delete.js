// pages/api/saved-searches/delete.js
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
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ ok: false, error: 'Missing id' });
    }

    const token = getBearer(req);
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Missing auth token' });
    }

    const { data: auth, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !auth?.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.user.id); // safety check

    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('DELETE SAVED SEARCH ERROR:', err);
    return res.status(500).json({
      ok: false,
      error: err.message || 'Unknown error',
    });
  }
}
