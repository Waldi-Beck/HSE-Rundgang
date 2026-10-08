import { describe, expect, it } from 'vitest';
import { BACKUP_FORMAT, BACKUP_VERSION, parseBackup } from '../../src/lib/backup';
import type { Walk } from '../../src/lib/types';

const walk: Walk = {
  id: 'walk-1', docNr: 'HSE-RG-2026-001', date: '2026-10-08', isoYear: 2026, week: 41,
  startTime: '08:00', endTime: '08:30', inspector: 'Max Muster', companion: '', monthlyChecked: true,
  ratings: {}, monthlyAreas: {}, openDefectSnapshot: null, result: null, note: '',
  signature: { name: '', date: '', image: '' }, acknowledgement: { name: '', date: '', image: '' },
  status: 'draft', sopVersion: '1.0', createdAt: '', updatedAt: '', closedAt: null,
};

const backup = (overrides: Record<string, unknown> = {}) => JSON.stringify({
  format: BACKUP_FORMAT,
  formatVersion: BACKUP_VERSION,
  exportedAt: '',
  sop: { docId: 'QPS_HSE_00064', version: '1.0' },
  walks: [walk],
  defects: [],
  photos: [],
  inspections: [],
  settings: { id: 'app', areas: ['QLabs'], priorityDays: { K: 0, H: 2, M: 7, N: 30 }, maxIntervalDays: 14 },
  ...overrides,
});

describe('JSON backup format v4', () => {
  it('requires and parses all workbook replacement data', () => {
    expect(BACKUP_VERSION).toBe(4);
    expect(parseBackup(backup()).walks[0].docNr).toBe('HSE-RG-2026-001');
  });
  it('rejects old backups with a clear message', () => {
    expect(() => parseBackup(backup({ formatVersion: 3 }))).toThrow(/älteren Formular oder Register/);
  });
  it('rejects future formats and malformed documents', () => {
    expect(() => parseBackup(backup({ formatVersion: 5 }))).toThrow(/neuer als diese App-Version/);
    expect(() => parseBackup('{"x":1}')).toThrow(/Keine Sicherungsdatei/);
  });
  it('rejects walks without a valid immutable round number', () => {
    expect(() => parseBackup(backup({ walks: [{ ...walk, docNr: 'QPS_HSE_00064' }] }))).toThrow(/ungültige Rundgangnummer/);
  });
});
