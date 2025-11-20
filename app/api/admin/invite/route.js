import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const { email, role, org, amEmail } = await req.json();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1️⃣ Check if user already exists
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    let authUser = list.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    // 2️⃣ If not, invite them via email (verification required)
    if (!authUser) {
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          role,
          org,
          account_manager_email: amEmail
        }
      });

      if (error) throw error;
      authUser = data.user;
    }

    // 3️⃣ Upsert into profiles table using the user ID
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: authUser.id,
          email,
          role,
          org: org || null,
          account_manager_email: amEmail || null
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (profileErr) throw profileErr;

    // 4️⃣ Return success response
    return NextResponse.json({
      ok: true,
      profile,
      user: authUser
    });

  } catch (err) {
    console.error('Invite user error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
