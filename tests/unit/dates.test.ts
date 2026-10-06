import { describe, expect, it } from 'vitest';
import { addMonths, formatDate, isoWeek, reportBaseName } from '../../src/lib/dates';

describe('isoWeek (ISO 8601)', () => {
  it.each([
    ['2026-10-05', 2026, 41], // Gültig ab der SOP, Montag
    ['2026-10-06', 2026, 41],
    ['2026-10-11', 2026, 41], // Sonntag
    ['2026-10-12', 2026, 42],
    ['2026-01-01', 2026, 1], // Donnerstag
    ['2026-12-31', 2026, 53],
    ['2027-01-01', 2026, 53], // gehört noch zur KW 53/2026
    ['2027-01-04', 2027, 1],
    ['2024-12-30', 2025, 1], // Montag gehört zu 2025-KW01
    ['2021-01-03', 2020, 53],
  ])('%s -> %i-KW%i', (date, year, week) => {
    expect(isoWeek(date)).toEqual({ year, week });
  });
});

describe('Dateiname SOP 5', () => {
  it('HSE-Rundgang_JJJJ-KWxx mit zweistelliger KW', () => {
    expect(reportBaseName(2026, 41)).toBe('HSE-Rundgang_2026-KW41');
    expect(reportBaseName(2027, 3)).toBe('HSE-Rundgang_2027-KW03');
    expect(reportBaseName(2026, 41, 2)).toBe('HSE-Rundgang_2026-KW41_2');
  });
});

describe('Hilfen', () => {
  it('formatDate', () => expect(formatDate('2026-10-05')).toBe('05.10.2026'));
  it('addMonths begrenzt am Monatsende', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-10-06', 1)).toBe('2026-11-06');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
  });
});
