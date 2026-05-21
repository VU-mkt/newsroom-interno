'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

type Step = 'email' | 'otp';

function LoginInner() {
  const params = useSearchParams();
  const from = params.get('from') || '/';

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error enviando el código');
        return;
      }
      setAccountId(data.accountId);
      setStep('otp');
    } catch {
      setError('Error de red. Reintentá.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, email: email.trim(), otpCode: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Código inválido');
        return;
      }
      // Hard navigation: el destino puede ser un .html estático (newsroom),
      // no una ruta Next.js. window.location asegura un GET completo del browser.
      window.location.href = from;
    } catch {
      setError('Error de red. Reintentá.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <header className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">VU ONE Demo</h1>
          <p className="text-sm text-gray-500">
            {step === 'email'
              ? 'Ingresá tu email para recibir un código.'
              : `Te enviamos un código a ${email}.`}
          </p>
        </header>

        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Email</span>
              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vos@vusecurity.com"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </label>
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Enviando…' : 'Enviar código'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerify} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Código de 6 dígitos</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg tracking-[0.5em] focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </label>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Verificando…' : 'Verificar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setOtp('');
                setError(null);
              }}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-700"
            >
              ← Usar otro email
            </button>
          </form>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
