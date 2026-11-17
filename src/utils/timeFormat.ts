/**
 * Detects the visitor's browser IANA timezone (e.g., "Europe/Helsinki")
 * and short abbreviation (e.g., "EET", "GMT+2", "EST").
 */
export function getClientTimezoneInfo(): { timeZone: string; shortName: string } {
  const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZoneName: 'short',
  }).formatToParts(new Date());

  const shortName = parts.find((p) => p.type === 'timeZoneName')?.value || resolved;
  return { timeZone: resolved, shortName };
}

/**
 * Formats an ISO UTC timestamp into the visitor's local chart axis/tooltip label
 * (e.g., "17 Nov, 16:00").
 */
export function formatLocalChartLabel(isoUtc: string): string {
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) return isoUtc;

  return d.toLocaleString('en-GB', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats an ISO UTC timestamp into a full local date-time string with timezone
 * for the header sync badge (e.g., "17 Nov 2026, 16:15 EET").
 */
export function formatLocalDateTimeWithTz(isoUtc?: string): string {
  if (!isoUtc) return '—';
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) return isoUtc;

  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}
