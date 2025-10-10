// app/api/admin/invite/route.js
export const runtime = 'nodejs';           // ensure Node runtime (required for service key)
export const dynamic = 'force-dynamic';    // don't cache this route

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

// POST /api/admin/invite  -> { email, password, role, org?, amEmail? }
export async function POST(req) {
  try {
    if (!url || !serviceRole) {
      return NextResponse.json(
        { ok: false, step: 'env', error: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      );
    }

    const { email, password, role, org, amEmail } = await req.json();

    if (!email || !password || !role) {
      return NextResponse.json(
        { ok: false, step: 'validate', error: 'email, password and role are required' },
        { status: 400 }
      );
    }

    // Server-side client (bypasses RLS)
    const admin = createClient(url, serviceRole);

    // 1) Create Auth user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) {
      return NextResponse.json({ ok: false, step: 'createUser', error: createErr.message }, { status: 400 });
    }

    const userId = created?.user?.id;
    if (!userId) {
      return NextResponse.json({ ok: false, step: 'createUser', error: 'No user id returned' }, { status: 500 });
    }

    // 2) Upsert profile
    const { error: upsertErr } = await admin.from('profiles').upsert({
      id: userId,
      email,
      role,
      org: org || null,
      account_manager_email: amEmail || null, // <-- make sure this column name matches your table
    });
    if (upsertErr) {
      // try to rollback auth user so we don't orphan it
      try { await admin.auth.admin.deleteUser(userId); } catch {}
      return NextResponse.json({ ok: false, step: 'upsertProfile', error: upsertErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, step: 'done', id: userId });
  } catch (e) {
    return NextResponse.json({ ok: false, step: 'catch', error: e?.message || 'Server error' }, { status: 500 });
  }
}

// GET /api/admin/invite  -> quick diagnostics to confirm which project we're pointed at
export async function GET() {
  try {
    if (!url || !serviceRole) {
      return NextResponse.json(
        { ok: false, error: 'Missing env vars', urlPresent: !!url, srPresent: !!serviceRole },
        { status: 500 }
      );
    }

    const admin = createClient(url, serviceRole);
    const { data, error } = await admin
      .from('profiles')
      .select('id,email,role,org,account_manager_email')
      .order('email', { ascending: true });

    if (error) throw error;

    // redact the project URL a bit (just for a quick sanity check)
    const redactedUrl = url.replace(/^https?:\/\//, '').slice(0, 28) + '…';

    return NextResponse.json({ ok: true, project: redactedUrl, count: data.length, users: data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
