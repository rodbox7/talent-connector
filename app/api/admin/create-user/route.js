// app/api/admin/create-user/route.js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';


export async function POST(req) {
  try {
    const body = await req.json();
    const {
      email,
      password,                 // temporary password
      role,                     // 'admin' | 'recruiter' | 'client'
      org = null,
      account_manager_email = null,
    } = body || {};

    if (!email || !password || !role) {
      return NextResponse.json(
        { ok: false, error: 'Missing email, password, or role' },
        { status: 400 }
      );
    }

    // 1) Create auth user
    const { data: authRes, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password,
      email_confirm: true, // skip confirmation for admin-created accounts
    });
    if (authErr) {
      return NextResponse.json({ ok: false, error: authErr.message }, { status: 500 });
    }
    const newUser = authRes?.user;
    if (!newUser?.id) {
      return NextResponse.json({ ok: false, error: 'Auth user not returned' }, { status: 500 });
    }

    // 2) Upsert profile row
    const profile = {
      id: newUser.id,
      email: String(email).trim().toLowerCase(),
      role,
      org,
      account_manager_email,
    };
    const { error: profErr } = await supabaseAdmin.from('profiles').upsert(profile, { onConflict: 'id' });
    if (profErr) {
      // attempt rollback (best-effort)
      await supabaseAdmin.auth.admin.deleteUser(newUser.id);
      return NextResponse.json({ ok: false, error: profErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: newUser.id });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || 'Server error' }, { status: 500 });
  }
}

