import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import type { Defect, Photo } from '../../src/lib/types';
import { db, resolveDefectWithEvidence } from '../../src/db';

const defect: Defect = {
  id: 'resolve-defect', walkId: 'closed-walk', nr: 1, mangelId: '2026-10-09-M01', itemId: 'R4', area: 'qps',
  description: 'Feuerlöscher nicht erreichbar', hazard: 'Im Notfall verzögerte Brandbekämpfung', immediateAction: '', action: 'Zugang freihalten',
  responsible: 'Team', priority: 'H', due: '2026-10-11', status: 'open', doneAt: null, recheckAt: null, controlledBy: '',
  fixed: null, newDue: '', note: 'Vorheriger Hinweis bleibt erhalten.', createdAt: '2026-10-09T12:00:00.000Z', updatedAt: '2026-10-09T12:00:00.000Z',
};
const evidence: Omit<Photo, 'defectId'> = {
  id: 'resolution-photo', blob: new Blob(['after photo'], { type: 'image/jpeg' }), width: 10, height: 10, createdAt: '2026-11-05T12:00:00.000Z',
};

afterEach(async () => {
  await db.transaction('rw', db.defects, db.photos, async () => {
    await db.defects.clear();
    await db.photos.clear();
  });
});

describe('Behebung mit Foto-Nachweis', () => {
  it('requires at least one new photo before changing the defect', async () => {
    await db.defects.put(defect);
    await expect(resolveDefectWithEvidence(defect.id, [])).rejects.toThrow(/Foto der behobenen Stelle/);
    expect(await db.defects.get(defect.id)).toMatchObject({ status: 'open', fixed: null });
    expect(await db.photos.count()).toBe(0);
  });

  it('saves a separate resolution, preserves the source defect, and appends the automatic thank-you', async () => {
    await db.defects.put(defect);
    await resolveDefectWithEvidence(defect.id, [evidence], { resolvedInWalkId: 'current-walk' });
    expect(await db.defects.get(defect.id)).toEqual(defect);
    const [resolution] = await db.resolutions.toArray();
    expect(resolution).toMatchObject({ defectId: defect.id, walkId: 'current-walk', note: expect.stringContaining('Gut gemacht') });
    const savedPhoto = await db.photos.where('defectId').equals(defect.id).first();
    expect(savedPhoto).toMatchObject({ purpose: 'resolution', resolutionId: expect.any(String), width: evidence.width, height: evidence.height });
  });
});
