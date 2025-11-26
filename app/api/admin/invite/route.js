// app/api/admin/invite/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const { email, role, org, amEmail } = await req.json();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const em = (email || '').trim().toLowerCase();
    if (!em) {
      return NextResponse.json(
        { ok: false, error: 'Email is required.' },
        { status: 400 }
      );
    }

    // 1️⃣ Ensure user exists in auth.users
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    let authUser = (list?.users || []).find(
      (u) => (u.email || '').toLowerCase() === em
    );

    if (!authUser) {
      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: em,
          email_confirm: false,
          user_metadata: {
            role: role || 'client',
            org: org || null,
            account_manager_email: amEmail || null,
          },
        });

      if (createErr) throw createErr;
      authUser = created.user;
    }

    if (!authUser) {
      return NextResponse.json(
        { ok: false, error: 'Unable to create/find auth user.' },
        { status: 500 }
      );
    }

    // 2️⃣ Upsert into profiles
    const { error: profErr } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: authUser.id,
          email: authUser.email,
          role: role || 'client',
          org: org || null,
          account_manager_email: amEmail || null,
        },
        { onConflict: 'id' }
      );

    if (profErr) throw profErr;

    // 3️⃣ Done – Admin UI will build its own /set-password link
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('ADMIN /invite error:', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Server error.' },
      { status: 500 }
    );
  }
}
