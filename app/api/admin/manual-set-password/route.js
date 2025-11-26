// app/api/admin/manual-set-password/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    const em = (email || '').trim().toLowerCase();
    if (!em) {
      return NextResponse.json(
        { ok: false, error: 'Email is required.' },
        { status: 400 }
      );
    }
    if (!password || password.length < 8) {
      return NextResponse.json(
        { ok: false, error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1️⃣ Find existing user by email
    const { data: list, error: listErr } =
      await supabaseAdmin.auth.admin.listUsers();

    if (listErr) throw listErr;

    let authUser = (list?.users || []).find(
      (u) => (u.email || '').toLowerCase() === em
    );

    // 2️⃣ If not found, create the user
    if (!authUser) {
      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: em,
          email_confirm: true,
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

    // 3️⃣ Set password + confirm email
    const { error: updateErr } =
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password,
        email_confirm: true,
      });

    if (updateErr) throw updateErr;

    // (Optional) profiles upsert here if you want, but invite route should have done it.

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('manual-set-password error:', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Server error.' },
      { status: 500 }
    );
  }
}
