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
    <main className="flex flex-1 items-center justify-center bg-white px-4 py-12 dark:bg-black">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-white/10 bg-[#1C1D1E] p-8 shadow-2xl shadow-black/40">
        <header className="space-y-2 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#F15E37]">VU Newsroom</p>
          <h1 className="text-xl font-semibold tracking-tight text-white">Acceso interno</h1>
          <p className="text-sm text-[#B8B8B5]">
            {step === 'email'
              ? 'Ingresá tu email para recibir un código.'
              : `Te enviamos un código a ${email}.`}
          </p>
        </header>

        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-[#B8B8B5]">Email</span>
              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vos@vusecurity.com"
                className="w-full rounded-md border border-white/15 bg-[#25262A] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#F15E37] focus:outline-none focus:ring-1 focus:ring-[#F15E37]"
              />
            </label>
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full rounded-md bg-[#F15E37] px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-[#F15E37]/25 transition hover:bg-[#C44826] hover:-translate-y-px hover:shadow-[#F15E37]/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading ? 'Enviando…' : 'Enviar código'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerify} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-[#B8B8B5]">Código de 6 dígitos</span>
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
                placeholder="000000"
                className="w-full rounded-md border border-white/15 bg-[#25262A] px-3 py-2 text-center text-lg tracking-[0.5em] text-white placeholder:text-white/20 focus:border-[#F15E37] focus:outline-none focus:ring-1 focus:ring-[#F15E37]"
              />
            </label>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full rounded-md bg-[#F15E37] px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-[#F15E37]/25 transition hover:bg-[#C44826] hover:-translate-y-px hover:shadow-[#F15E37]/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
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
              className="w-full text-center text-xs text-[#B8B8B5] transition hover:text-white"
            >
              ← Usar otro email
            </button>
          </form>
        )}

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
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
