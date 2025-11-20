import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1️⃣ Load all profile rows
    const { data: profiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("*");

    if (profErr) throw profErr;

    // 2️⃣ Load Auth users
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (authErr) throw authErr;

    const authUsers = authData.users || [];

    // 3️⃣ Merge profile rows with auth metadata
    const merged = profiles.map((p) => {
      const authUser = authUsers.find(
        (u) =>
          u.id === p.id ||
          (u.email && p.email && u.email.toLowerCase() === p.email.toLowerCase())
      );

      return {
        id: p.id,
        email: p.email,
        role: p.role,
        org: p.org,
        account_manager_email: p.account_manager_email,
        created_at: p.created_at,

        email_confirmed_at: authUser?.confirmed_at || null,
        last_sign_in_at: authUser?.last_sign_in_at || null,

        // useful for debugging
        _source: "profiles",
      };
    });

    // 4️⃣ Add Auth-only users (but do NOT overwrite the ones above)
    const missingProfiles = authUsers
      .filter(
        (u) =>
          !profiles.some(
            (p) =>
              p.id === u.id ||
              (p.email &&
                u.email &&
                p.email.toLowerCase() === u.email.toLowerCase())
          )
      )
      .map((u) => ({
        id: u.id,
        email: u.email,
        role: null,
        org: null,
        account_manager_email: null,
        created_at: u.created_at,
        email_confirmed_at: u.confirmed_at,
        last_sign_in_at: u.last_sign_in_at,
        unlinked: true,
        _source: "auth_only",
      }));

    // 5️⃣ Only include auth-only rows that truly don't exist in profiles
    const final = [
      ...merged,
      ...missingProfiles.filter((u) => !merged.some((m) => m.id === u.id)),
    ];

    // 🧪 Debugging so we know which array users came from
    console.log("MERGED USERS:", merged);
    console.log("MISSING USERS:", missingProfiles);
    console.log("FINAL RETURNED USERS:", final);

    return NextResponse.json({ ok: true, users: final });

  } catch (err) {
    console.error("🔥 Load users error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
