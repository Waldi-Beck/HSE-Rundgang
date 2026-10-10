import { describe, expect, it } from 'vitest';
import { FORM_AREAS } from '../../src/data/checklist';
import { DEFAULT_REGISTER_SETTINGS } from '../../src/data/register';
import type { Defect, Walk } from '../../src/lib/types';
import { deriveInspection, defectDaysOpen, overviewMetrics, roundRegisterRows, suggestedResult, validDefectDue } from '../../src/lib/register';
import { addDays } from '../../src/lib/dates';
import { countRatings, defectAreaValid, firstWalkOfMonth, mangelWithoutDefect, newMangelId, requiredRatingKeys, validateForClose } from '../../src/lib/walk';

function makeWalk(patch: Partial<Walk> = {}): Walk {
  return {
    id: 'round-1', docNr: 'HSE-RG-2026-001', date: '2026-10-08', isoYear: 2026, week: 41,
    startTime: '08:00', endTime: '08:30', inspector: 'Max Muster', companion: '', monthlyChecked: false,
    ratings: {}, monthlyAreas: {}, openDefectSnapshot: null, result: null, note: '',
    signature: { name: 'Max Muster', date: '2026-10-08', image: 'data:image/png;base64,test' },
    acknowledgement: { name: '', date: '', image: '' }, status: 'draft', sopVersion: '1.0',
    createdAt: '2026-10-08T08:00:00.000Z', updatedAt: '', closedAt: null, ...patch,
  };
}

function makeDefect(patch: Partial<Defect> = {}): Defect {
  return {
    id: 'defect-1', walkId: 'round-1', nr: 1, mangelId: '2026-10-08-M01', itemId: 'R4', area: 'qlabs',
    description: 'Feuerlöscher verstellt', hazard: 'Zugriff behindert', immediateAction: 'Zugang freigeräumt', action: 'Markierung erneuern',
    responsible: 'Max Muster', priority: 'H', due: '2026-10-10', status: 'open', doneAt: null, recheckAt: null,
    controlledBy: '', fixed: null, newDue: '', note: '', createdAt: '2026-10-08T08:00:00.000Z', updatedAt: '', ...patch,
  };
}

describe('New checklist and closure', () => {
  it('requires exactly 45 weekly ratings and adds nine only when 2.2 is checked', () => {
    expect(requiredRatingKeys(false)).toHaveLength(45);
    expect(requiredRatingKeys(true)).toHaveLength(54);
    expect(requiredRatingKeys(false).every((key) => /^R\d+@/.test(key))).toBe(true);
  });

  it('counts required ratings and verifies area-linked defects', () => {
    const walk = makeWalk({ ratings: { 'R1@qps': 'ok', 'R4@qlabs': 'mangel', M1: 'na' }, monthlyChecked: false });
    expect(countRatings(walk)).toMatchObject({ total: 45, checked: 2, ok: 1, mangel: 1, na: 0 });
    expect(mangelWithoutDefect(walk, [makeDefect()])).toEqual([]);
    expect(mangelWithoutDefect(walk, [])).toEqual(['R4@qlabs']);
    expect(defectAreaValid(makeDefect())).toBe(true);
    expect(defectAreaValid(makeDefect({ itemId: 'R4', area: 'Büro / Verwaltung' }))).toBe(false);
  });

  it('validates that monthly ratings have an area when 2.2 is active', () => {
    const all = Object.fromEntries(requiredRatingKeys(true).map((key) => [key, 'ok' as const]));
    const errors = validateForClose(makeWalk({ monthlyChecked: true, ratings: all }), []);
    expect(errors.join(' ')).toContain('Bereich fehlt für Monatspunkte');
    const monthlyAreas = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`M${i + 1}`, FORM_AREAS[0].id]));
    expect(validateForClose(makeWalk({ monthlyChecked: true, ratings: all, monthlyAreas, result: 'none' }), [])).toEqual([]);
  });
});

describe('Workbook deadline and inspection calculations', () => {
  it('uses new recheck date before explicit date before priority guidance', () => {
    const defect = makeDefect();
    expect(validDefectDue('2026-10-08', defect, DEFAULT_REGISTER_SETTINGS)).toBe('2026-10-10');
    expect(validDefectDue('2026-10-08', { ...defect, due: '' }, DEFAULT_REGISTER_SETTINGS)).toBe('2026-10-10');
    expect(validDefectDue('2026-10-08', { ...defect, due: '', newDue: '2026-10-20' }, DEFAULT_REGISTER_SETTINGS)).toBe('2026-10-20');
    expect(addDays('2026-10-08', DEFAULT_REGISTER_SETTINGS.priorityDays.K)).toBe('2026-10-08');
    expect(addDays('2026-10-08', DEFAULT_REGISTER_SETTINGS.priorityDays.H)).toBe('2026-10-10');
  });

  it('calculates inspection status for missing dates/intervals, overdue, due soon and ok', () => {
    const base = { id: 'i1', description: 'Test', area: 'QLabs', intervalMonths: 12, lastInspection: '', responsible: '', evidence: '', note: '', createdAt: '', updatedAt: '' };
    expect(deriveInspection(base, '2026-10-08').status).toBe('Datum fehlt');
    expect(deriveInspection({ ...base, lastInspection: '2025-01-01', intervalMonths: null }, '2026-10-08').status).toBe('Intervall fehlt');
    expect(deriveInspection({ ...base, lastInspection: '2025-01-01' }, '2026-10-08').status).toBe('überfällig');
    expect(deriveInspection({ ...base, lastInspection: '2025-10-20' }, '2026-10-08').status).toBe('bald fällig');
    expect(deriveInspection({ ...base, lastInspection: '2026-01-01' }, '2026-10-08').status).toBe('ok');
  });

  it('creates Mangel IDs, first-of-month recommendation and summary rows', () => {
    expect(newMangelId('2026-10-08', 1)).toBe('2026-10-08-M01');
    expect(firstWalkOfMonth('2026-10-08', ['2026-09-30'])).toBe(true);
    expect(firstWalkOfMonth('2026-10-08', ['2026-10-07'])).toBe(false);
    expect(suggestedResult([makeDefect({ priority: 'K' })])).toBe('critical');
    expect(defectDaysOpen('2026-10-01', makeDefect(), '2026-10-08')).toBe(7);
    const rows = roundRegisterRows([makeWalk()], [makeDefect()], DEFAULT_REGISTER_SETTINGS);
    expect(rows[0]).toMatchObject({ defectCount: 1, criticalCount: 0, openCount: 1, pdfFilename: 'HSE-Rundgang_2026-10-08_HSE-RG-2026-001.pdf' });
  });

  it('groups legacy area labels under the three checklist headings on the dashboard', () => {
    const defects = [
      makeDefect({ id: 'old-engineering', area: 'engineering' }),
      makeDefect({ id: 'old-qmeasure', area: 'qmeasure', status: 'done' }),
      makeDefect({ id: 'labs', area: 'qlabs' }),
      makeDefect({ id: 'old-xtec', area: 'xtec-werkstatt' }),
    ];
    const metrics = overviewMetrics([], defects, DEFAULT_REGISTER_SETTINGS, '2026-10-08');
    expect(metrics.defectsByArea.map(({ area, total, open, done }) => ({ area, total, open, done }))).toEqual([
      { area: 'QPS', total: 2, open: 1, done: 1 },
      { area: 'QLabs', total: 1, open: 1, done: 0 },
      { area: 'QxTec', total: 1, open: 1, done: 0 },
    ]);
  });
});
