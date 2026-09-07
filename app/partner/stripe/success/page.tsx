'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Card, Badge } from '@/components/ui';

export default function PartnerStripeSuccessPage() {
  const sp = useSearchParams();
  const bookingId = String(sp?.get('bookingId') || '').trim();
  const sessionId = String(sp?.get('session_id') || '').trim();

  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState<string>('确认支付中…');

  useEffect(() => {
    const run = async () => {
      if (!bookingId || !sessionId) {
        setStatus('error');
        setMessage('缺少支付参数。');
        return;
      }
      try {
        const res = await fetch('/api/partner/checkout/stripe/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId, sessionId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));
        setStatus('ok');
        const next = String((data as any)?.status || '').toUpperCase();
        if (next === 'ACTIVE') {
          setMessage('支付已确认，你的展示位已激活。');
        } else {
          setMessage('支付已确认，你的申请正在等待批准，通过后将自动激活。');
        }
      } catch (e: any) {
        setStatus('error');
        setMessage(String(e?.message || 'Error'));
      }
    };
    void run();
  }, [bookingId, sessionId]);

  return (
    <main className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Stripe</h1>
      <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
        <div className="flex items-center justify-between mb-3">
          <div className="text-gray-900 dark:text-white font-semibold">Resultado</div>
          {status === 'ok' ? <Badge variant="success">OK</Badge> : status === 'error' ? <Badge variant="danger">ERROR</Badge> : <Badge variant="info">...</Badge>}
        </div>
        <div className="text-gray-700 dark:text-gray-300">{message}</div>
        <div className="mt-5 flex items-center gap-2">
          <Link href="/partner/publicar" className="inline-flex">
            <Button variant="primary" size="sm">Ir a mi anuncio</Button>
          </Link>
          <Link href="/partner" className="inline-flex">
            <Button variant="secondary" size="sm">Ver Partners</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
