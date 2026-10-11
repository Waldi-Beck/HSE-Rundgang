/** Date/time helpers. Calendar dates are local YYYY-MM-DD strings. */
const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseISODate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0);
}

/** ISO 8601 week number using the Thursday rule. */
export function isoWeek(dateStr: string): { year: number; week: number } {
  const date = parseISODate(dateStr);
  const day = (date.getDay() + 6) % 7;
  const thursday = new Date(date);
  thursday.setDate(date.getDate() - day + 3);
  const year = thursday.getFullYear();
  const firstThursday = new Date(year, 0, 4, 12);
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);
  return { year, week: 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 864e5)) };
}

export function weekLabel(year: number, week: number): string {
  return `${year}-KW${pad(week)}`;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '';
  const [year, month, day] = date.slice(0, 10).split('-');
  return `${day}.${month}.${year}`;
}

export function addDays(date: string, days: number): string {
  const next = parseISODate(date);
  next.setDate(next.getDate() + days);
  return toISODate(next);
}

/** Calendar-month addition, clamped to the last day in the target month. */
export function addMonths(date: string, months: number): string {
  const next = parseISODate(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  next.setDate(Math.min(day, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
  return toISODate(next);
}

export function minutesOfDay(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour < 24 && minute < 60 ? hour * 60 + minute : null;
}

export function durationMinutes(start: string, end: string): number | null {
  const from = minutesOfDay(start);
  const to = minutesOfDay(end);
  if (from === null || to === null) return null;
  return (to - from + 1440) % 1440;
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null) return '';
  return `${Math.floor(minutes / 60)}:${pad(minutes % 60)}`;
}

export function formatWalkNumber(year: number, sequence: number): string {
  return `HSE-RG-${year}-${String(sequence).padStart(3, '0')}`;
}

export function parseWalkNumber(docNr: string): { year: number; sequence: number } | null {
  const match = /^HSE-RG-(\d{4})-(\d{3,})$/.exec(docNr);
  return match ? { year: Number(match[1]), sequence: Number(match[2]) } : null;
}

export function createMangelId(date: string, formNumber: number): string {
  return `${date.slice(0, 10)}-M${String(formNumber).padStart(2, '0')}`;
}

export function reportBaseName(date: string, _docNr: string): string {
  return `HSE-RG_${date.slice(0, 10).replaceAll('-', '_')}`;
}

export function isOverdue(due: string | null | undefined, today = toISODate(new Date())): boolean {
  return !!due && due < today;
}
