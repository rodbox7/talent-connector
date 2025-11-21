'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function run() {
      // Turn the URL params into a valid Supabase session
      const { data, error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );

      if (!error && data?.session) {
        // User is now logged in – send them to the password-setup page
        router.replace('/setup');
        return;
      }

      // If something went wrong, kick them back to the login page
      router.replace('/');
    }

    run();
  }, [router]);

  return <p>Finishing sign-in…</p>;
}
