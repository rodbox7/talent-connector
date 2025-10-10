// app/api/admin/invite/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs'; // ensure Node, not Edge

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Server-side Supabase client with service role (never expose this in browser)
const admin = url && service
  ? createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

// Simple health check so you can visit /api/admin/invite in a browser
export async function GET() {
  return NextResponse.json({
    ok: true,
    env: {
      url_present: Boolean(url),
      service_role_present: Boolean(service)
    }
  });
}

export async function POST(req) {
  try {
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: 'Server is missing SUPABASE env vars (URL or SERVICE_ROLE).' },
        { status: 500 }
      );
    }

    const { email, role = 'client', org = '', amEmail = '', password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Missing email or password' }, { status: 400 });
    }
    if (!['client','recruiter','admin'].includes(role)) {
      return NextResponse.json({ ok: false, error: `Invalid role: ${role}` }, { status: 400 });
    }

    // 1) Create the Auth user (email confirmed so they can sign in immediately)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    let userId;
    if (createErr) {
      // If user already exists, locate them
      if ((createErr.message || '').toLowerCase().includes('already')) {
        let found = null;
        let page = 1;
        while (!found && page <= 5) {
          const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 100 });
          if (listErr) {
            return NextResponse.json({ ok: false, error: `List users failed: ${listErr.message}` }, { status: 500 });
          }
          found = list.users.find(u => (u.email || '').toLowerCase() === email.toLowerCase()) || null;
          if (list.users.length < 100) break;
          page += 1;
        }
        if (!found) {
          return NextResponse.json({ ok: false, error: 'User exists in Auth but could not be located' }, { status: 409 });
        }
        userId = found.id;
      } else {
        return NextResponse.json({ ok: false, error: `Auth createUser: ${createErr.message}` }, { status: 400 });
      }
    } else {
      userId = created?.user?.id;
      if (!userId) {
        return NextResponse.json({ ok: false, error: 'Auth createUser returned no user id' }, { status: 500 });
      }
    }

    // 2) Upsert into public.profiles (requires the table + columns to exist)
    const { error: upsertErr } = await admin
      .from('profiles')
      .upsert(
        {
          id: userId,
          email,
          role,
          org,
          account_manager_email: amEmail || null,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (upsertErr) {
      return NextResponse.json({ ok: false, error: `Profiles upsert: ${upsertErr.message}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: userId });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || 'Server error' }, { status: 500 });
  }
}
