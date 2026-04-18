'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get('token');
    const err = params.get('error');
    const returnTo = params.get('returnTo') || '/';

    if (err) { setError(err); return; }
    if (!token) { setError('Missing token'); return; }

    try {
      localStorage.setItem('jovie_token', token);
      router.replace(returnTo);
    } catch {
      setError('Could not store session. Enable localStorage and try again.');
    }
  }, [params, router]);

  return (
    <div className="page" style={{ padding: '80px 32px', textAlign: 'center' }}>
      {error ? (
        <>
          <h1 className="display" style={{ fontSize: 40 }}>Sign-in hiccup</h1>
          <p style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>{error}</p>
          <Link href="/" className="btn">Back home →</Link>
        </>
      ) : (
        <>
          <h1 className="display" style={{ fontSize: 40 }}>Signing you in…</h1>
          <p style={{ color: 'var(--ink-soft)' }}>One moment.</p>
        </>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return <Suspense fallback={null}><CallbackInner /></Suspense>;
}
