/**
 * UTC day helpers. A crypt's dayId is its UTC date, yyyy-mm-dd (BRIEF 4.4, 4.8, 6.1).
 */

const MS_DAY = 86_400_000;
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Crypt #1 is this date; the number counts days since. */
export const EPOCH_DAY = '2026-11-25';

/** The UTC dayId for a moment. */
export function dayIdOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Midnight UTC of a dayId as epoch ms. */
export function dayStart(dayId: string): number {
  const t = Date.parse(`${dayId}T00:00:00Z`);
  if (Number.isNaN(t)) throw new Error(`Bad dayId: ${dayId}`);
  return t;
}

/** dayId shifted by n days. */
export function addDays(dayId: string, n: number): string {
  return dayIdOf(new Date(dayStart(dayId) + n * MS_DAY));
}

/** 0 = Sunday ... 6 = Saturday (UTC). */
export function weekdayOf(dayId: string): number {
  return new Date(dayStart(dayId)).getUTCDay();
}

/** Whole days between two dayIds (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((dayStart(b) - dayStart(a)) / MS_DAY);
}

/** Sequential crypt number (1 on EPOCH_DAY). */
export function cryptNumber(dayId: string): number {
  return Math.max(1, daysBetween(EPOCH_DAY, dayId) + 1);
}

/** ISO week id like "2026-W48" (weekly leaderboards). */
export function isoWeek(dayId: string): string {
  const d = new Date(dayStart(dayId));
  const wd = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - wd);
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d.getTime() - Date.UTC(year, 0, 1)) / MS_DAY + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** The 7 dayIds of the ISO week (Monday first) that contains dayId. */
export function weekDays(dayId: string): string[] {
  const wd = weekdayOf(dayId) || 7;
  const monday = addDays(dayId, 1 - wd);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
