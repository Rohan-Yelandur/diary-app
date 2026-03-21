/**
 * Date utility functions for the diary app.
 * Uses local timezone ISO strings instead of UTC to keep dates human-readable.
 */

/**
 * Get a local ISO string with timezone offset (e.g. 2026-03-20T23:04:17-05:00)
 * instead of UTC (2026-03-21T04:04:17.000Z), so the date in the string
 * always matches the user's local date.
 */
export function toLocalISOString(date = new Date()) {
  const offset = date.getTimezoneOffset();
  const sign = offset <= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  const oh = String(Math.floor(absOffset / 60)).padStart(2, '0');
  const om = String(absOffset % 60).padStart(2, '0');

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${oh}:${om}`;
}
