import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeWalk, createWalk, db, deleteWalk, importBackupData, updateWalk } from '../../src/db';
import { formatWalkNumber, parseWalkNumber } from '../../src/lib/dates';
import { assignLegacyWalkNumbers } from '../../src/lib/walk-number';
import type { Walk } from '../../src/lib/types';

function backupWalk(id: string, docNr: string): Walk {
  return {
    id,
    docNr,
    date: '2026-10-06',
    isoYear: 2026,
    week: 41,
    startTime: '09:00',
    endTime: '',
    inspector: '',
    companion: '',
    monthlyChecked: false,
    ratings: {},
    monthlyAreas: {},
    openDefectSnapshot: null,
    result: null,
    note: '',
    signature: { name: '', date: '', image: '' },
    acknowledgement: { name: '', date: '', image: '' },
    status: 'draft',
    sopVersion: '1.0',
    createdAt: '2026-10-06T09:00:00.000Z',
    updatedAt: '2026-10-06T09:00:00.000Z',
    closedAt: null,
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe('Rundgang-Nummer', () => {
  it('formatiert und parst Jahr und Sequenz', () => {
    expect(formatWalkNumber(2026, 1)).toBe('HSE-RG-2026-001');
    expect(parseWalkNumber('HSE-RG-2026-012')).toEqual({ year: 2026, sequence: 12 });
    expect(parseWalkNumber('QPS_HSE_00064')).toBeNull();
  });

  it('vergibt fortlaufende Nummern und beginnt beim Jahreswechsel neu', async () => {
    expect((await createWalk(new Date(2026, 9, 6))).docNr).toBe('HSE-RG-2026-001');
    expect((await createWalk(new Date(2026, 9, 7))).docNr).toBe('HSE-RG-2026-002');
    expect((await createWalk(new Date(2027, 0, 2))).docNr).toBe('HSE-RG-2027-001');
  });

  it('verwendet gelöschte Nummern nicht erneut', async () => {
    const first = await createWalk(new Date(2026, 9, 6));
    await deleteWalk(first.id);
    expect((await createWalk(new Date(2026, 9, 7))).docNr).toBe('HSE-RG-2026-002');
  });

  it('bleibt bei Bearbeitung und Abschluss unverändert', async () => {
    const walk = await createWalk(new Date(2026, 9, 6));
    await updateWalk(walk.id, { docNr: 'HSE-RG-2026-777', inspector: 'Test' });
    expect((await db.walks.get(walk.id))?.docNr).toBe(walk.docNr);
    await closeWalk(walk.id, []);
    await updateWalk(walk.id, { docNr: 'HSE-RG-2026-778' });
    expect((await db.walks.get(walk.id))?.docNr).toBe(walk.docNr);
  });

  it('migriert Legacy-Rundgänge stabil nach createdAt und bildet Zähler je Jahr', () => {
    const legacy = [
      { id: 'late', date: '2026-10-06', createdAt: '2026-10-06T10:00:00Z' },
      { id: 'old', date: '2026-12-30', createdAt: '2025-12-30T10:00:00Z' },
      { id: 'early', date: '2026-10-05', createdAt: '2026-10-06T09:00:00Z' },
    ];
    const migrated = assignLegacyWalkNumbers(legacy);
    expect(migrated.walks.map(({ id, docNr }) => [id, docNr])).toEqual([
      ['old', 'HSE-RG-2025-001'],
      ['early', 'HSE-RG-2026-001'],
      ['late', 'HSE-RG-2026-002'],
    ]);
    expect([...migrated.counters]).toEqual([[2025, 1], [2026, 2]]);
  });

  it('führt die Datenbankmigration auf vorhandenen Daten fehlerfrei aus und seedet Prüftermine', async () => {
    db.close();
    await db.delete();
    const legacy = new Dexie('hse-rundgang');
    legacy.version(2).stores({
      walks: 'id, date, status',
      defects: 'id, walkId, status, itemId, area',
      photos: 'id, defectId',
    });
    await legacy.table('walks').bulkAdd([
      { id: 'later', date: '2026-10-06', createdAt: '2026-10-06T10:00:00.000Z', status: 'draft' },
      { id: 'earlier', date: '2026-10-05', createdAt: '2026-10-06T09:00:00.000Z', status: 'draft' },
    ]);
    await legacy.close();

    await db.open();
    expect(await db.walks.count()).toBe(0);
    expect(db.verno).toBe(4);
    expect(await db.inspections.count()).toBe(15);
    expect(await db.settings.get('app')).toMatchObject({ maxIntervalDays: 14 });
    const fresh = await createWalk(new Date(2026, 9, 6));
    expect(fresh.docNr).toBe('HSE-RG-2026-001');
  });

  it('überspringt Import-Kollisionen und behält existierende Nummern bei Upsert', async () => {
    const existing = await createWalk(new Date(2026, 9, 6));
    const result = await importBackupData(
      [
        backupWalk(existing.id, 'HSE-RG-2026-888'),
        backupWalk('collision', existing.docNr),
        backupWalk('imported', 'HSE-RG-2026-004'),
      ],
      [],
      [],
      [],
      undefined,
    );
    expect(result).toEqual({ walks: 2, defects: 0, photos: 0, inspections: 0, collisions: [existing.docNr] });
    expect((await db.walks.get(existing.id))?.docNr).toBe(existing.docNr);
    expect(await db.walks.get('collision')).toBeUndefined();
    expect((await db.walks.get('imported'))?.docNr).toBe('HSE-RG-2026-004');
    expect((await createWalk(new Date(2026, 9, 7))).docNr).toBe('HSE-RG-2026-005');
  });
});
