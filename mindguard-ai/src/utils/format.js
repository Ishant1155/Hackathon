/**
 * Formatting helpers shared across pages, charts and the mock backend.
 * Dates are ISO `YYYY-MM-DD` strings interpreted in UTC so output never
 * shifts with the viewer's timezone.
 */

export function isNil(value) {
  return value === null || value === undefined || Number.isNaN(value);
}

/** Format a number with a fixed number of decimals. Returns an en dash for empty values. */
export function fmt(value, digits = 1) {
  if (isNil(value)) return '–';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Format a number with an explicit +/− sign. */
export function formatSigned(value, digits = 1) {
  if (isNil(value)) return '–';
  const abs = fmt(Math.abs(value), digits);
  if (Number(value) > 0) return `+${abs}`;
  if (Number(value) < 0) return `−${abs}`;
  return abs;
}

/** Percentage change from `previous` to `current`. Returns 0 when previous is 0 or missing. */
export function pctChange(current, previous) {
  if (isNil(current) || isNil(previous) || previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function toDate(iso) {
  return new Date(`${iso}T00:00:00Z`);
}

/** "Oct 30" by default; pass Intl options to extend. */
export function formatDate(iso, options = {}) {
  if (!iso) return '–';
  return toDate(iso).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

/** "Sat, Oct 24" */
export function formatWeekday(iso) {
  return formatDate(iso, { weekday: 'short' });
}

/** "Oct 1 – Oct 30, 2026" */
export function formatRange(start, end) {
  if (!start || !end) return '–';
  return `${formatDate(start)} – ${formatDate(end, { year: 'numeric' })}`;
}

export function getInitials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function pluralise(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
