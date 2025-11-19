import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const { email, role, organization, salesContact } = await req.json();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Check if user already exists in auth
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
    let authUser = userList.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    // If not found, invite them
    if (!authUser) {
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { role }
      });
      if (error) throw error;
      authUser = data.user;
    }

    // Upsert into profiles table
    const { error: upsertError } = await supabaseAdmin.from('profiles').upsert({
      uuid: authUser.id,          // Link to auth user
      email,
      role,
      org: organization || null,
      account_manager_email: salesContact || null
    }, { onConflict: 'uuid' });

    if (upsertError) throw upsertError;

    return NextResponse.json({
      message: 'User created and linked successfully',
      authId: authUser.id
    });

  } catch (err) {
    console.error('Invite user error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
