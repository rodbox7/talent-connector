'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function finish() {
      try {
        console.log("🔥 CALLBACK PAGE LOADED:", window.location.href);

        // Let Supabase process the token in the URL
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);

        if (error) {
          console.error("❌ Supabase callback error:", error);
          alert("There was a problem verifying your login link. Please request a new link.");
          router.replace('/auth/login');
          return;
        }

        console.log("✅ Supabase session established:", data?.session);

        // Fetch the user's profile (to determine role)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .single();

        console.log("📌 User role:", profile?.role);

        // 🎯 ROLE-BASED REDIRECT
        if (profile?.role === 'admin') {
          router.replace('/admin');
        } else if (profile?.role === 'client') {
          router.replace('/client');
        } else if (profile?.role === 'recruiter') {
          router.replace('/recruiter');
        } else {
          router.replace('/');
        }

      } catch (e) {
        console.error("⚠️ CALLBACK exception:", e);
        router.replace('/auth/login');
      }
    }

    finish();
  }, [router]);

  return (
    <div style={{
      padding: 40,
      color: 'white',
      fontSize: 18,
      textAlign: 'center'
    }}>
      Processing your sign-in link…
    </div>
  );
}
