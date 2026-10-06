/** Datumshilfen. Alle Daten als lokale Kalendertage im Format YYYY-MM-DD. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parst YYYY-MM-DD als lokales Datum (Mittag, um DST-Effekte zu vermeiden). */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

/** ISO-8601-Kalenderwoche: Woche mit dem ersten Donnerstag des Jahres ist KW 1. */
export function isoWeek(dateStr: string): { year: number; week: number } {
  const d = parseISODate(dateStr);
  const day = (d.getDay() + 6) % 7; // Mo=0 .. So=6
  const thursday = new Date(d);
  thursday.setDate(d.getDate() - day + 3);
  const year = thursday.getFullYear();
  const firstThursday = new Date(year, 0, 4, 12);
  const firstDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 864e5));
  return { year, week };
}

export function addDays(dateStr: string, days: number): string {
  const d = parseISODate(dateStr);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Addiert Monate; am Monatsende wird auf den letzten Tag begrenzt (31.01. + 1 = 28./29.02.). */
export function addMonths(dateStr: string, months: number): string {
  const d = parseISODate(dateStr);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISODate(d);
}

/** 2026-10-06 -> 06.10.2026 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

export function weekLabel(year: number, week: number): string {
  return `${year}-KW${pad(week)}`;
}

/** Dateiname gemäss SOP 5: HSE-Rundgang_JJJJ-KWxx (bei mehreren Rundgängen pro KW: _2, _3 ...). */
export function reportBaseName(year: number, week: number, indexInWeek = 1): string {
  return `HSE-Rundgang_${weekLabel(year, week)}${indexInWeek > 1 ? `_${indexInWeek}` : ''}`;
}

export function isOverdue(due: string, today: string): boolean {
  return !!due && due < today;
}
