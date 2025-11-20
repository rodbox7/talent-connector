import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const { email, role, org, amEmail } = await req.json();

    if (!email) {
      return NextResponse.json({ ok: false, error: 'Email required.' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists (may not exist until they accept)
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw listErr;

    const existing = list.users.find((u) => u.email.toLowerCase() === normalizedEmail);

    // If user doesn't exist yet, send invite
    if (!existing) {
      const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
        data: {
          role,
          org,
          account_manager_email: amEmail
        }
      });

      if (error) throw error;
    }

    return NextResponse.json({
      ok: true,
      message: `Invite sent to ${normalizedEmail}`
    });

  } catch (err) {
    console.error("🔥 INVITE ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Invite failed." },
      { status: 500 }
    );
  }
}
