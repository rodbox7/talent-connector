import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const { id } = await req.json(); // this is the auth user id

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1️⃣ Delete from Supabase Auth
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authErr) throw authErr;

    // 2️⃣ Delete from profiles table
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileErr) throw profileErr;

    return NextResponse.json({ ok: true, removed: id });

  } catch (err) {
    console.error('Delete user error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
