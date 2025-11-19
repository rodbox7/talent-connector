import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const { email, role } = await req.json();

    // Use service role client — required for admin actions
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Create user without domain restrictions
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { role },
    });

    if (error) throw error;

    return NextResponse.json({ message: 'Invite sent', user: data.user });
  } catch (err) {
    console.error('Invite user error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
