
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req) {
  try {
    if (!url || !serviceRole) {
      return NextResponse.json({ ok: false, error: 'Missing environment variables' }, { status: 500 });
    }

    const { email, password, role } = await req.json();
    if (!email || !password || !role) {
      return NextResponse.json({ ok: false, error: 'email, password, and role are required' }, { status: 400 });
    }

    const admin = createClient(url, serviceRole);
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (createErr) return NextResponse.json({ ok: false, error: createErr.message }, { status: 400 });

    const userId = created?.user?.id;
    if (!userId) return NextResponse.json({ ok: false, error: 'No user ID returned' }, { status: 500 });

    await admin.from('profiles').upsert({ id: userId, email, role });
    return NextResponse.json({ ok: true, id: userId });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!url || !serviceRole) {
      return NextResponse.json({ ok: false, error: 'Missing environment variables' }, { status: 500 });
    }

    const admin = createClient(url, serviceRole);
    const { data, error } = await admin.from('profiles').select('id,email,role').order('email', { ascending: true });
    if (error) throw error;

    return NextResponse.json({ ok: true, count: data.length, users: data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
