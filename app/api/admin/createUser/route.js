import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';
export async function POST(req) {
  try {
    const { email, password, role } = await req.json();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { role },
    });

    if (error) throw error;

    return NextResponse.json({ user: data.user, message: 'User created successfully' });
  } catch (err) {
    console.error('Create user error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
