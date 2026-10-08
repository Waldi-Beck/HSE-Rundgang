import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';

describe('Datenbank-Upgrade Version 1 -> 2', () => {
  it('verwirft Testdaten im alten Aufbau ohne Absturz', async () => {
    const old = new Dexie('hse-rundgang');
    old.version(1).stores({ walks: 'id, date, status', defects: 'id, walkId, status, itemId', photos: 'id, defectId' });
    await old.table('walks').add({ id: 'alt', date: '2026-10-06', status: 'draft', area: 'Lager', ratings: { A1: 'nok' } });
    await old.table('defects').add({ id: 'd', walkId: 'alt', status: 'open', itemId: 'A1' });
    old.close();

    const { db, createWalk } = await import('../../src/db');
    expect(await db.walks.count()).toBe(0);
    expect(await db.defects.count()).toBe(0);
    expect(db.verno).toBe(2);
    const w = await createWalk(new Date('2026-10-06T09:00:00'));
    expect(w.type).toBe('monthly');
    expect(w).not.toHaveProperty('area');
  });
});
