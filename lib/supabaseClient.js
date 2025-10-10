app/
  layout.jsx
  page.jsx
  globals.css
lib/
  supabaseClient.js
next.config.js        (leave as-is if you have one)
package.json          (leave as-is)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
