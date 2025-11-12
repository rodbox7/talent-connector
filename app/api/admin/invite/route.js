import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';

export async function POST(req) {
  try {
    const { email, role } = await req.json();

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { role },
    });

    if (error) throw error;

    return NextResponse.json({ message: 'Invite sent', user: data.user });
  } catch (err) {
    console.error('Invite user error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
