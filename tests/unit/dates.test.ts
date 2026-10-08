import { describe, expect, it } from 'vitest';
import { addDays, addMonths, createMangelId, durationMinutes, formatDate, formatDuration, formatWalkNumber, isoWeek, parseWalkNumber, reportBaseName } from '../../src/lib/dates';

describe('ISO week', () => {
  it.each([
    ['2026-10-05', 2026, 41], ['2026-10-08', 2026, 41], ['2026-12-31', 2026, 53],
    ['2027-01-01', 2026, 53], ['2027-01-04', 2027, 1], ['2024-12-30', 2025, 1],
  ])('%s -> %i-KW%i', (date, year, week) => expect(isoWeek(date)).toEqual({ year, week }));
});

describe('Clock and duration', () => {
  it('calculates ordinary and midnight-crossing durations', () => {
    expect(durationMinutes('08:15', '09:45')).toBe(90);
    expect(formatDuration(durationMinutes('08:15', '09:45'))).toBe('1:30');
    expect(durationMinutes('23:30', '00:15')).toBe(45);
    expect(durationMinutes('', '12:00')).toBeNull();
  });
});

describe('Register date IDs and report filenames', () => {
  it('formats Mangel-ID with a two-digit form number', () => {
    expect(createMangelId('2026-10-08', 1)).toBe('2026-10-08-M01');
    expect(createMangelId('2026-10-08', 10)).toBe('2026-10-08-M10');
  });
  it('formats/parses annual walk numbers separately from SOP ID', () => {
    expect(formatWalkNumber(2026, 1)).toBe('HSE-RG-2026-001');
    expect(parseWalkNumber('HSE-RG-2026-012')).toEqual({ year: 2026, sequence: 12 });
    expect(parseWalkNumber('QPS_HSE_00064')).toBeNull();
  });
  it('uses round date and immutable document number in the PDF name', () => {
    expect(reportBaseName('2026-10-08', 'HSE-RG-2026-001')).toBe('HSE-Rundgang_2026-10-08_HSE-RG-2026-001');
  });
});

describe('Date helpers', () => {
  it('formats German dates', () => expect(formatDate('2026-10-05')).toBe('05.10.2026'));
  it('adds days and calendar months at month-end', () => {
    expect(addDays('2026-10-08', 2)).toBe('2026-10-10');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
  });
});
