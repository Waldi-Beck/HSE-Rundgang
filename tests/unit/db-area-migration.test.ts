import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it, vi } from 'vitest';

describe('Migration der Checklistenbereiche auf QPS, QLabs und xTec', () => {
  it('führt alte Bereichsbewertungen zusammen und erhält die strengste Bewertung', async () => {
    const old = new Dexie('hse-rundgang');
    old.version(4).stores({
      walks: 'id, date, status, &docNr',
      defects: 'id, walkId, status, itemId, area, mangelId',
      photos: 'id, defectId',
      counters: '&year',
      inspections: 'id, area',
      settings: '&id',
    });
    await old.table('walks').add({
      id: 'legacy-walk', docNr: 'HSE-RG-2026-001', date: '2026-10-08', isoYear: 2026, week: 41,
      startTime: '08:00', endTime: '', inspector: 'Max Muster', companion: '', monthlyChecked: false,
      ratings: { 'R4@engineering': 'ok', 'R4@qmeasure': 'mangel', 'R4@xtec-lager': 'na', 'R4@xtec-werkstatt': 'ok', 'R4@qlabs': 'ok' },
      monthlyAreas: {}, openDefectSnapshot: null, result: null, note: '', signature: { name: '', date: '', image: '' },
      acknowledgement: { name: '', date: '', image: '' }, status: 'draft', sopVersion: '1.0',
      createdAt: '2026-10-08T08:00:00.000Z', updatedAt: '', closedAt: null,
    });
    await old.table('defects').add({ id: 'legacy-defect', walkId: 'legacy-walk', nr: 1, mangelId: '2026-10-08-M01', itemId: 'R4', area: 'xtec-werkstatt', status: 'open' });
    old.close();

    vi.resetModules();
    const { db } = await import('../../src/db');
    try {
      await db.open();
      const walk = await db.walks.get('legacy-walk');
      expect(db.verno).toBe(5);
      expect(walk?.ratings).toMatchObject({ 'R4@qps': 'mangel', 'R4@qlabs': 'ok', 'R4@xtec': 'na' });
      expect(walk?.ratings).not.toHaveProperty('R4@engineering');
      expect(walk?.ratings).not.toHaveProperty('R4@qmeasure');
      expect((await db.defects.get('legacy-defect'))?.area).toBe('xtec');
    } finally {
      db.close();
      await Dexie.delete('hse-rundgang');
    }
  });
});
