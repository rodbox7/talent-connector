// app/api/admin/delete-user/route.js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function POST(req) {
  try {
    const body = await req.json();
    const { id } = body || {};
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing user id' }, { status: 400 });
    }

    // 1) delete from auth
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authErr) {
      return NextResponse.json({ ok: false, error: authErr.message }, { status: 500 });
    }

    // 2) clean up profile (optional)
    const { error: profErr } = await supabaseAdmin.from('profiles').delete().eq('id', id);
    if (profErr) {
      return NextResponse.json({ ok: false, error: profErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || 'Server error' }, { status: 500 });
  }
}
