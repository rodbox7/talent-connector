// app/api/admin/invite/route.js
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'; // <-- four levels up

export async function POST(req) {
  try {
    const { email, password, role = 'client', org = '', amEmail = '' } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Email and temporary password are required.' }, { status: 400 });
    }
    if (!['admin', 'recruiter', 'client'].includes(role)) {
      return NextResponse.json({ ok: false, error: 'Invalid role.' }, { status: 400 });
    }

    // 1) Create the Auth user
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) {
      return NextResponse.json({ ok: false, error: createErr.message }, { status: 400 });
    }

    const userId = created?.user?.id;
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'User creation returned no id.' }, { status: 500 });
    }

    // 2) Upsert matching profile row
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
