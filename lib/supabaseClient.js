// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Minimal guard to help spot misconfigured env vars at runtime
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars are missing. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
