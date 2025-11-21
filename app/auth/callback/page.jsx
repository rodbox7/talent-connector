'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function run() {
      const { data, error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );

      if (!error && data?.session) {
        router.replace('/setup');
        return;
      }

      router.replace('/');
    }

    run();
  }, [router]);

  return <p>Finishing sign-in…</p>;
}
