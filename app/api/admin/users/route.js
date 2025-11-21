import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Disable caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1️⃣ Load ALL auth users using pagination
    let page = 1;
    let allAuthUsers = [];

    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 100,
      });

      if (error) throw error;

      allAuthUsers.push(...data.users);

      // Stop when there are no more pages
      if (!data.users.length || data.users.length < 100) break;

      page++;
    }

    // 2️⃣ Load profiles
    const { data: profiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("*");

    if (profErr) throw profErr;

    // 3️⃣ Merge profiles with auth users
    const merged = profiles.map((p) => {
      const authUser = allAuthUsers.find(
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

        _source: "profiles",
      };
    });

    // 4️⃣ Add any auth-only users not in profiles
    const authOnly = allAuthUsers
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
        _source: "auth_only",
      }));

    const final = [...merged, ...authOnly];

    return NextResponse.json({ ok: true, users: final });

  } catch (err) {
    console.error("Load users error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
