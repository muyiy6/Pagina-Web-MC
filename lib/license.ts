// License validation has been removed from this build.
// This stub keeps the original module interface so that existing
// imports (middleware, status route, etc.) keep working without changes.

export type LicenseValidationStatus = 'disabled' | 'valid' | 'invalid' | 'unconfigured' | 'error';

export type LicenseValidationResult = {
  ok: boolean;
  status: LicenseValidationStatus;
  message: string;
  reason?: string;
  checkedAt: number;
  expiresAt?: string | null;
  meta?: Record<string, unknown>;
};

type LicenseValidationOptions = {
  origin?: string;
  host?: string;
  pathname?: string;
  userAgent?: string;
};

export function isLicenseBypassPath(pathname: string) {
  const path = String(pathname || '').trim();

  if (!path) return false;
  if (path === '/licencia' || path.startsWith('/licencia/')) return true;
  if (path === '/api/license/status') return true;
  return false;
}

export async function validateLicense(_options: LicenseValidationOptions = {}): Promise<LicenseValidationResult> {
  return {
    ok: true,
    status: 'disabled',
    message: 'License check has been removed from this build.',
    reason: 'license-check-removed',
    checkedAt: Date.now(),
    expiresAt: null,
  };
}
