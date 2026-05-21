import { NextResponse } from 'next/server';
import { fetchVuOneClient } from '@/lib/vuone';

export const dynamic = 'force-dynamic';

export type Group = 'core' | 'factor' | 'fingerprint';

export type CheckResult = {
  label: string;
  path: string;
  group: Group;
  status: number | null;
  ok: boolean;
};

type CheckDef = {
  label: string;
  path: string;
  group: 'core' | 'factor' | 'fingerprint';
  open?: boolean; // no auth headers needed
};

const CHECKS: CheckDef[] = [
  // Core API — open
  { label: 'Status',                     path: '/status',                                  group: 'core', open: true },
  { label: 'Version',                    path: '/version',                                 group: 'core', open: true },
  // Core API — auth
  { label: 'Accounts',                   path: '/api/v1/accounts',                         group: 'core' },
  { label: 'Businesses',                 path: '/api/v1/businesses',                       group: 'core' },
  { label: 'Channels',                   path: '/api/v1/channels',                         group: 'core' },
  { label: 'Channels by Status',         path: '/api/v1/channels/status',                  group: 'core' },
  { label: 'Roles',                      path: '/api/v1/roles',                             group: 'core' },
  { label: 'Identities',                 path: '/api/v1/identities',                       group: 'core' },
  { label: 'Groups',                     path: '/api/v1/groups',                           group: 'core' },
  { label: 'Permissions',                path: '/api/v1/permissions',                      group: 'core' },
  { label: 'Schema Types',               path: '/api/v1/schema/types',                     group: 'core' },
  { label: 'Claim Schema Sets',          path: '/api/v1/claim-schema-sets',                group: 'core' },
  { label: 'Identity Providers',         path: '/api/v1/identity-providers',               group: 'core' },
  { label: 'SCIM Tokens',                path: '/api/v1/scim/tokens',                      group: 'core' },
  { label: 'OAuth2 Auth by Token',       path: '/api/v1/oauth2/authorizations/by-token',   group: 'core' },
  { label: 'Business Search',            path: '/api/v1/businesses/search',                group: 'core' },
  { label: 'Channel Search',             path: '/api/v1/channels/search',                  group: 'core' },
  { label: 'Account Identifier Search',  path: '/api/v1/accounts/identifier',              group: 'core' },
  // Factor API
  { label: 'Face Policy',                path: '/api/v1/policies/face',                    group: 'factor' },
  { label: 'TOTP Policy',                path: '/api/v1/policies/totp',                    group: 'factor' },
  { label: 'Password Policy',            path: '/api/v1/policies/password',                group: 'factor' },
  { label: 'Email OTP Policy',           path: '/api/v1/policies/email',                   group: 'factor' },
  { label: 'SMS Policy',                 path: '/api/v1/policies/sms',                     group: 'factor' },
  { label: 'Magic Link Policy',          path: '/api/v1/policies/magic-link',              group: 'factor' },
  { label: 'All Face Policies',          path: '/api/v1/policies/face/all',                group: 'factor' },
  { label: 'All TOTP Policies',          path: '/api/v1/policies/totp/all',                group: 'factor' },
  { label: 'All Password Policies',      path: '/api/v1/policies/password/all',            group: 'factor' },
  { label: 'All Email Policies',         path: '/api/v1/policies/email/all',               group: 'factor' },
  { label: 'All SMS Policies',           path: '/api/v1/policies/sms/all',                 group: 'factor' },
  { label: 'All Magic Link Policies',    path: '/api/v1/policies/magic-link/all',          group: 'factor' },
  { label: 'All Face Factors',           path: '/api/v1/face/all',                         group: 'factor' },
  { label: 'All Email OTP Factors',      path: '/api/v1/otp/email/all',                    group: 'factor' },
  { label: 'All TOTP Factors',           path: '/api/v1/otp/time/all',                     group: 'factor' },
  { label: 'All Password Factors',       path: '/api/v1/passwords/all',                    group: 'factor' },
  { label: 'All SMS OTP Factors',        path: '/api/v1/otp/sms/all',                      group: 'factor' },
  { label: 'All Magic Link Factors',     path: '/api/v1/otp/magic-link/all',               group: 'factor' },
  { label: 'Factor Events',              path: '/api/v1/factors/events',                   group: 'factor' },
  { label: 'TOTP Enrolled Check',        path: '/api/v1/totp/time/enrolled',               group: 'factor' },
  // Fingerprint API
  { label: 'Fingerprint Devices',        path: '/api/v1/fingerprint/devices',              group: 'fingerprint' },
  { label: 'Fingerprint Rulesets',       path: '/api/v1/fingerprint/admin/rulesets',       group: 'fingerprint' },
  { label: 'Fingerprint Features',       path: '/api/v1/fingerprint/admin/feature',        group: 'fingerprint' },
  { label: 'Fingerprint Feature Stats',  path: '/api/v1/fingerprint/admin/feature/stats',  group: 'fingerprint' },
];

async function runCheck(
  def: CheckDef,
  baseUrl: string,
  authHeaders: Record<string, string>,
): Promise<CheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const headers = def.open ? { 'Content-Type': 'application/json' } : authHeaders;
    const res = await fetch(`${baseUrl}${def.path}`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    return { label: def.label, path: def.path, group: def.group, status: res.status, ok: res.ok };
  } catch {
    return { label: def.label, path: def.path, group: def.group, status: null, ok: false };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  try {
    const { baseUrl, headers } = await fetchVuOneClient();
    const results = await Promise.allSettled(
      CHECKS.map((def) => runCheck(def, baseUrl, headers)),
    );
    const data: CheckResult[] = results.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : { label: CHECKS[i].label, path: CHECKS[i].path, group: CHECKS[i].group, status: null, ok: false },
    );
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
