/**
 * Deterministic Date Formatting Utility for Feeder.life
 *
 * Prevents React hydration mismatches caused by:
 * 1. Node.js server locale vs browser client locale differences (e.g. "Sep 13" vs "13 Sept")
 * 2. Node.js server timezone vs user local timezone differences
 * 3. Non-deterministic Intl / toLocaleDateString() outputs
 */

const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function parseDate(dateInput: string | number | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  // Handle SQL/ISO timestamp formats like "2026-09-13 18:30:00" or ISO-8601 strings
  let parsedInput = dateInput;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(dateInput)) {
    parsedInput = dateInput.replace(' ', 'T') + 'Z';
  }
  const d = new Date(parsedInput);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Returns deterministic short date: e.g. "Sep 13"
 * Renders identically on Node.js SSR and Browser CSR.
 */
export function formatShortDate(dateInput: string | number | Date | null | undefined): string {
  const d = parseDate(dateInput);
  if (!d) return '';
  return `${MONTH_NAMES_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/**
 * Returns deterministic full date: e.g. "Sep 13, 2026"
 * Renders identically on Node.js SSR and Browser CSR.
 */
export function formatFullDate(dateInput: string | number | Date | null | undefined): string {
  const d = parseDate(dateInput);
  if (!d) return '';
  return `${MONTH_NAMES_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/**
 * Returns deterministic time: e.g. "05:30 PM"
 * Renders identically on Node.js SSR and Browser CSR.
 */
export function formatTime(dateInput: string | number | Date | null | undefined): string {
  const d = parseDate(dateInput);
  if (!d) return '';
  let hours = d.getUTCHours();
  const minutes = d.getUTCMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

/**
 * Returns deterministic date & time: e.g. "Sep 13, 2026, 05:30 PM"
 */
export function formatDateTime(dateInput: string | number | Date | null | undefined): string {
  const d = parseDate(dateInput);
  if (!d) return '';
  return `${formatFullDate(d)}, ${formatTime(d)}`;
}
