// app/api/admin/invite/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

// POST /api/admin/invite  -> { email, password, role, org?, amEmail? }
export async function POST(req) {
  try {
    if (!url || !serviceRole) {
      return NextResponse.json(
        { ok: false, error: 'Missing Supabase env vars (URL or SERVICE ROLE)' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { email, password, role, org, amEmail } = body || {};

    if (!email || !password || !role) {
      return NextResponse.json(
        { ok: false, error: 'email, password and role are required' },
        { status: 400 }
      );
    }

    // Server-side Supabase client (service role)
    const admin = createClient(url, serviceRole);

    // 1) Create Auth user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) {
      return NextResponse.json({ ok: false, error: createErr.message }, { status: 400 });
    }

    const userId = created.user.id;

    // 2) Upsert profile row for that user id
    const { error: upsertErr } = await admin.from('profiles').upsert({
      id: userId,
      email,
      role,
      org: org || null,
      account_manager_email: amEmail || null, // must match your column name
    });
    if (upsertErr) {
      // Rollback auth user so we don't orphan it
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ ok: false, error: upsertErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: userId });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Server error' },
      { status: 500 }
    );
  }
}

// Optional: quick list endpoint for debugging
export async function GET() {
  try {
    const admin = createClient(url, serviceRole);
    const { data, error } = await admin
      .from('profiles')
      .select('id,email,role,org,account_manager_email')
      .order('email');
    if (error) throw error;
    return NextResponse.json({ ok: true, users: data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
