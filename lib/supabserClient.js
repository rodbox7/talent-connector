// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// This client is safe for the browser (uses the anon key)
export const supabase = createClient(url, anon);

