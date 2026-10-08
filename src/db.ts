import Dexie, { type EntityTable } from 'dexie';
import { SOP_META } from './data/checklist';
import { isoWeek, toISODate, toTime } from './lib/dates';
import type { Defect, Photo, Rating, Walk } from './lib/types';
import { dueFromPrio, nextDefectNr, suggestType } from './lib/walk';

export const db = new Dexie('hse-rundgang') as Dexie & {
  walks: EntityTable<Walk, 'id'>;
  defects: EntityTable<Defect, 'id'>;
  photos: EntityTable<Photo, 'id'>;
};

db.version(1).stores({
  walks: 'id, date, status',
  defects: 'id, walkId, status, itemId',
  photos: 'id, defectId',
});

/**
 * Version 2: neues Formular (Matrix 2.1 je Bereich, 2.2 Monatlich, Bewertung OK / Mangel / n.a., Mangel mit Bereich).
 * Die App war vorher nicht produktiv im Einsatz: Testdaten im alten Aufbau werden verworfen,
 * weil sie sich nicht sinnvoll auf die neue Checkliste abbilden lassen.
 */
db.version(2)
  .stores({
    walks: 'id, date, status',
    defects: 'id, walkId, status, itemId, area',
    photos: 'id, defectId',
  })
  .upgrade(async (tx) => {
    await Promise.all([tx.table('walks').clear(), tx.table('defects').clear(), tx.table('photos').clear()]);
  });

export const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const emptySig = () => ({ name: '', date: '', image: '' });

export async function createWalk(at = new Date()): Promise<Walk> {
  const date = toISODate(at);
  const others = await db.walks.orderBy('date').toArray();
  const last = others[others.length - 1];
  const { year, week } = isoWeek(date);
  const walk: Walk = {
    id: uid(),
    date,
    isoYear: year,
    week,
    time: toTime(at),
    inspector: last?.inspector ?? '',
    companion: '',
    type: suggestType(date, others.map((w) => w.date)),
    openPointsNote: '',
    openPointsSnapshot: null,
    ratings: {},
    result: null,
    signature: emptySig(),
    acknowledgement: emptySig(),
    status: 'draft',
    sopVersion: SOP_META.version,
    createdAt: now(),
    updatedAt: now(),
    closedAt: null,
  };
  await db.walks.add(walk);
  return walk;
}

export async function updateWalk(id: string, changes: Partial<Walk>): Promise<void> {
  const w = await db.walks.get(id);
  if (!w || w.status === 'closed') return; // Schreibschutz (Prinzip III)
  if (changes.date) {
    const { year, week } = isoWeek(changes.date);
    changes = { ...changes, isoYear: year, week };
  }
  await db.walks.update(id, { ...changes, updatedAt: now() });
}

/** Bewertungen atomar ändern (schnelles Tippen darf keine Bewertung verlieren). */
export async function patchRatings(id: string, patch: Record<string, Rating | undefined>): Promise<void> {
  await db.transaction('rw', db.walks, async () => {
    const w = await db.walks.get(id);
    if (!w || w.status === 'closed') return;
    const ratings = { ...w.ratings };
    for (const [k, v] of Object.entries(patch)) {
      if (v) ratings[k] = v;
      else delete ratings[k];
    }
    await db.walks.update(id, { ratings, updatedAt: now() });
  });
}

export async function closeWalk(id: string, openPointsSnapshot: string[]): Promise<void> {
  await db.walks.update(id, { status: 'closed', closedAt: now(), updatedAt: now(), openPointsSnapshot });
}

/** Offene Mängel aus früheren Rundgängen (FR-005). */
export async function openDefectsBefore(walk: Walk): Promise<{ defect: Defect; walk?: Walk }[]> {
  const [defects, walks] = await Promise.all([db.defects.where('status').equals('open').toArray(), db.walks.toArray()]);
  const byId = new Map(walks.map((w) => [w.id, w]));
  return defects
    .filter((d) => d.walkId !== walk.id)
    .map((d) => ({ defect: d, walk: byId.get(d.walkId) }))
    .filter(({ walk: w }) => !w || w.date < walk.date || (w.date === walk.date && w.createdAt < walk.createdAt))
    .sort((a, b) => a.defect.due.localeCompare(b.defect.due));
}

export async function deleteWalk(id: string): Promise<void> {
  await db.transaction('rw', db.walks, db.defects, db.photos, async () => {
    const defects = await db.defects.where('walkId').equals(id).toArray();
    await db.photos.where('defectId').anyOf(defects.map((d) => d.id)).delete();
    await db.defects.where('walkId').equals(id).delete();
    await db.walks.delete(id);
  });
}

export function newDefectDraft(walk: Walk, existing: Defect[], itemId = '', area = ''): Defect {
  return {
    id: uid(),
    walkId: walk.id,
    nr: nextDefectNr(existing),
    itemId,
    area,
    hazard: '',
    action: '',
    responsible: '',
    prio: 'M',
    due: dueFromPrio(walk.date, 'M'),
    status: 'open',
    doneAt: null,
    doneNote: '',
    createdAt: now(),
    updatedAt: now(),
  };
}

export async function saveDefect(defect: Defect, newPhotos: Omit<Photo, 'defectId'>[], removedPhotoIds: string[]) {
  await db.transaction('rw', db.defects, db.photos, async () => {
    await db.defects.put({ ...defect, updatedAt: now() });
    if (removedPhotoIds.length) await db.photos.bulkDelete(removedPhotoIds);
    if (newPhotos.length) await db.photos.bulkAdd(newPhotos.map((p) => ({ ...p, defectId: defect.id })));
  });
}

export async function deleteDefect(id: string) {
  await db.transaction('rw', db.defects, db.photos, async () => {
    await db.photos.where('defectId').equals(id).delete();
    await db.defects.delete(id);
  });
}

/** Nachkontrolle: auch bei abgeschlossenen Rundgängen erlaubt (FR-040). */
export async function setDefectDone(id: string, done: boolean, note = '') {
  await db.defects.update(id, {
    status: done ? 'done' : 'open',
    doneAt: done ? toISODate(new Date()) : null,
    doneNote: done ? note : '',
    updatedAt: now(),
  });
}
