import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const { email, role, org, amEmail } = await req.json();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1️⃣ Check if user already exists in Supabase Auth
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    let authUser = list.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    // 2️⃣ If not, create/invite
    if (!authUser) {
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { role }
      });
      if (error) throw error;
      authUser = data.user;
    }

    // 3️⃣ Upsert into profiles table using the "id" column
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: authUser.id,  // <-- correct linkage column
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

    // 4️⃣ Return profile so the UI can update immediately
    return NextResponse.json({
      ok: true,
      profile
    });

  } catch (err) {
    console.error('Invite user error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
