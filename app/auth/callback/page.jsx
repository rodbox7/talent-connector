'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    async function run() {
      const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);

      const next = params.get('next') || '/';

      if (!error && data?.session) {
        router.replace(next);
        return;
      }

      router.replace('/');
    }

    run();
  }, [router, params]);

  return <p>Finishing sign-in…</p>;
}
