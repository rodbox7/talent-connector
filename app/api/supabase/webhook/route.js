import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  try {
    const payload = await req.json();

    // Only handle final user creation event
    if (payload.event !== "SIGNED_UP") {
      return NextResponse.json({ ok: true });
    }

    const user = payload.record;
    if (!user) return NextResponse.json({ ok: false });

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { email, user_metadata } = user;

    const { error } = await supabaseAdmin.from("profiles").upsert(
      {
        id: user.id,
        email,
        role: user_metadata?.role || "client",
        org: user_metadata?.org || null,
        account_manager_email: user_metadata?.account_manager_email || null,
      },
      { onConflict: "id" }
    );

    if (error) throw error;

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("🔥 PROFILE WEBHOOK ERROR:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
