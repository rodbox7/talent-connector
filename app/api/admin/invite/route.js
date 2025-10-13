// app/api/admin/invite/route.js
// Force Node runtime so the Admin SDK can run
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
// relative path from /app/api/admin/invite to /lib
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function POST(req) {
  try {
    const { email, password, role = 'client', org = '', amEmail = '' } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Email and temporary password are required.' }, { status: 400 });
    }
    if (!['admin','recruiter','client'].includes(role)) {
      return NextResponse.json({ ok: false, error: 'Invalid role.' }, { status: 400 });
    }

    // 1) Create the Auth user
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // let them log in immediately
    });
    if (createErr) {
      return NextResponse.json({ ok: false, error: createErr.message }, { status: 400 });
    }

    const userId = created?.user?.id;
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'User creation returned no id.' }, { status: 500 });
    }

    // 2) Upsert the matching profile row
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: userId,
          email,
          role,
          org,
          account_manager_email: amEmail || null,
        },
        { onConflict: 'id' }
      );

    if (profileErr) {
      return NextResponse.json({ ok: false, error: profileErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: userId });
  } catch (e) {
    console.error('invite route error:', e);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
