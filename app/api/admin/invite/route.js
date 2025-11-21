import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  try {
    const { email, role, org, amEmail, resend } = await req.json();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const em = email.toLowerCase().trim();

    // 1️⃣ Get existing Auth user
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    let authUser = list.users.find(
      (u) => u.email && u.email.toLowerCase() === em
    );

    // 2️⃣ CREATE IF MISSING — RESEND IF FLAGGED
    if (!authUser) {
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        em,
        {
          data: {
            role,
            org,
            account_manager_email: amEmail || null,
          },
        }
      );
      if (error) throw error;
      authUser = data.user;

   } else if (resend && !authUser.confirmed_at) {
  const { error: resendErr } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(em, {
      data: {
        role,
        org,
        account_manager_email: amEmail || null,
      },
    });

  if (resendErr) throw resendErr;
  console.log("🔁 Resent invite to:", em);
} else if (resend) {
  console.log("⚠ User already confirmed — no invite sent");
}


    // 3️⃣ Update auth metadata regardless
    const { error: updateMetaErr } =
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        user_metadata: {
          role,
          org,
          account_manager_email: amEmail || null,
        },
      });

    if (updateMetaErr) throw updateMetaErr;

    // 4️⃣ Sync to profiles table
    const { error: upsertErr } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: authUser.id,
          email: em,
          role,
          org,
          account_manager_email: amEmail || null,
        },
        { onConflict: "id" }
      );

    if (upsertErr) throw upsertErr;

    return NextResponse.json({ ok: true, user: authUser });

  } catch (err) {
    console.error("🔥 Invite user error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
