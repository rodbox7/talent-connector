import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1️⃣ Get Auth users (email, verification state, timestamps)
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
if (authErr) throw authErr;

const authUsers = authData.users || [];

// 👇 TEMP: log one user so we can see real fields like confirmed_at, etc.
console.log('Sample auth user:', authUsers[0]);


    // 2️⃣ Get Profiles table rows
    const { data: profiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("*");
    if (profErr) throw profErr;

    // 3️⃣ Merge profiles onto auth users by ID
    const merged = authUsers.map((authUser) => {
      const p = profiles.find((row) => row.id === authUser.id);

      return {
        id: authUser.id,
        email: authUser.email,
        email_confirmed_at: authUser.email_confirmed_at,
        last_sign_in_at: authUser.last_sign_in_at,

        // profile fields if exist
        role: p?.role || null,
        org: p?.org || null,
        account_manager_email: p?.account_manager_email || null,
        created_at: p?.created_at || authUser.created_at,
      };
    });

    return NextResponse.json({ ok: true, users: merged });

  } catch (err) {
    console.error("Load users error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
