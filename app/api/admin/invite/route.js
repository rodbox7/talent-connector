import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST body: { email, role, org, password, amEmail }
export async function POST(req) {
  try {
    const { email, role, org, password, amEmail } = await req.json();
    if (!email || !role || !password) {
      return NextResponse.json({ error: 'email, role, password are required' }, { status: 400 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY // SERVER-ONLY
    );

    // 1) Create Auth user (auto-confirm to avoid SMTP)
    const { data, error } = await admin.auth.admin.createUser({
      email: String(email).toLowerCase(),
      password,
      email_confirm: true
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // 2) Upsert profile (role/org/sales contact)
    const { error: upErr } = await admin.from('profiles').upsert({
      id: data.user.id,
      email: String(email).toLowerCase(),
      role,
      org: org || null,
      account_manager_email: amEmail || null
    }, { onConflict: 'id' });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, userId: data.user.id });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'unknown error' }, { status: 500 });
  }
}

