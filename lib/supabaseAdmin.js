// lib/supabaseAdmin.js
import { createClient } from '@supabase/supabase-js';

// Service role bypasses RLS; NEVER expose this key to the client.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false }
});
