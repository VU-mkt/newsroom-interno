// components/HealthCheckClient.tsx
'use client';
import { useEffect, useState } from 'react';
import type { CheckResult, Group } from '@/app/api/health-check/route';

const GROUP_LABELS: Record<Group, string> = {
  core:        'Core API',
  factor:      'Factor API',
  fingerprint: 'Fingerprint API',
};

const GROUPS: Group[] = ['core', 'factor', 'fingerprint'];

function StatusDot({ ok }: { ok: boolean }) {
  const color = ok ? 'bg-green-500' : 'bg-red-500';
  return <span className={`inline-block w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0 ${color}`} />;
}

export default function HealthCheckClient() {
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runAt, setRunAt] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/health-check', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`Health check API failed: ${r.status}`);
        return r.json();
      })
      .then((data: CheckResult[]) => {
        setResults(data);
        setRunAt(new Date().toLocaleTimeString());
      })
      .catch((e: unknown) => {
        if ((e as { name?: string }).name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Unknown error');
      });
    return () => controller.abort();
  }, []);

  if (error) {
    return (
      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
        {error}
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-12 sm:py-16">
        <svg className="animate-spin w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Running checks…
      </div>
    );
  }

  const passed = results.filter((r) => r.ok).length;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <p className="text-xs sm:text-sm text-gray-500">
        {passed}/{results.length} passed
        {runAt && <> · last run {runAt}</>}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 items-start">
        {GROUPS.map((group) => {
          const items = results.filter((r) => r.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100">
                <h2 className="text-xs sm:text-sm font-semibold text-gray-700">{GROUP_LABELS[group]}</h2>
              </div>
              <ul>
                {items.map((item) => (
                  <li
                    key={item.path}
                    className="flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      <StatusDot ok={item.ok} />
                      <span className="text-xs sm:text-sm font-mono text-gray-700 truncate">{item.path}</span>
                    </div>
                    <span className="text-xs sm:text-sm text-gray-400 flex-shrink-0">
                      {item.status ?? 'timeout'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
