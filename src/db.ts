import Dexie, { type EntityTable } from 'dexie';
import { FORM_AREAS, WEEKLY_ITEMS, type Rating } from './data/checklist';
import { DEFAULT_REGISTER_SETTINGS } from './data/register';
import { formatWalkNumber, isoWeek, parseWalkNumber, toISODate, toTime, createMangelId } from './lib/dates';
import { inspectionSeeds } from './lib/register';
import type { Defect, Inspection, Photo, RegisterSettings, Walk } from './lib/types';
import { nextDefectNr, suggestMonthlyChecked } from './lib/walk';

interface WalkCounter {
  year: number;
  lastNumber: number;
}

export const db = new Dexie('hse-rundgang') as Dexie & {
  walks: EntityTable<Walk, 'id'>;
  defects: EntityTable<Defect, 'id'>;
  photos: EntityTable<Photo, 'id'>;
  counters: EntityTable<WalkCounter, 'year'>;
  inspections: EntityTable<Inspection, 'id'>;
  settings: EntityTable<RegisterSettings, 'id'>;
};

db.on('populate', async () => {
  await db.settings.put(DEFAULT_REGISTER_SETTINGS);
  await db.inspections.bulkPut(inspectionSeeds());
});

db.version(1).stores({
  walks: 'id, date, status',
  defects: 'id, walkId, status, itemId',
  photos: 'id, defectId',
});

db.version(2)
  .stores({ walks: 'id, date, status', defects: 'id, walkId, status, itemId, area', photos: 'id, defectId' })
  .upgrade(async (tx) => {
    await Promise.all([tx.table('walks').clear(), tx.table('defects').clear(), tx.table('photos').clear()]);
  });

db.version(3)
  .stores({ walks: 'id, date, status, &docNr', defects: 'id, walkId, status, itemId, area', photos: 'id, defectId', counters: '&year' })
  .upgrade(async (tx) => {
    const walks = (await tx.table('walks').toArray()) as (Walk & { docNr?: string })[];
    const yearlyMax = new Map<number, number>();
    for (const walk of walks) {
      const parsed = walk.docNr ? parseWalkNumber(walk.docNr) : null;
      if (parsed) yearlyMax.set(parsed.year, Math.max(yearlyMax.get(parsed.year) ?? 0, parsed.sequence));
    }
    const saved = (await tx.table('counters').toArray()) as WalkCounter[];
    for (const counter of saved) yearlyMax.set(counter.year, Math.max(yearlyMax.get(counter.year) ?? 0, counter.lastNumber));
    if (yearlyMax.size) await tx.table('counters').bulkPut([...yearlyMax].map(([year, lastNumber]) => ({ year, lastNumber })));
  });

/**
 * V4 is the new R1-R15 / M1-M9 form and register model. Prior local data was test-only;
 * remove incompatible form records safely but preserve annual walk counters/doc-number history.
 */
db.version(4)
  .stores({
    walks: 'id, date, status, &docNr',
    defects: 'id, walkId, status, itemId, area, mangelId',
    photos: 'id, defectId',
    counters: '&year',
    inspections: 'id, area',
    settings: '&id',
  })
  .upgrade(async (tx) => {
    const [walks, counters, inspectionCount, settings] = await Promise.all([
      tx.table('walks').toArray() as Promise<(Walk & { docNr?: string })[]>,
      tx.table('counters').toArray() as Promise<WalkCounter[]>,
      tx.table('inspections').count(),
      tx.table('settings').get('app'),
    ]);
    const yearlyMax = new Map<number, number>();
    for (const counter of counters) yearlyMax.set(counter.year, counter.lastNumber);
    for (const walk of walks) {
      const parsed = walk.docNr ? parseWalkNumber(walk.docNr) : null;
      if (parsed) yearlyMax.set(parsed.year, Math.max(yearlyMax.get(parsed.year) ?? 0, parsed.sequence));
    }
    if (yearlyMax.size) await tx.table('counters').bulkPut([...yearlyMax].map(([year, lastNumber]) => ({ year, lastNumber })));
    await Promise.all([tx.table('walks').clear(), tx.table('defects').clear(), tx.table('photos').clear()]);
    if (!settings) await tx.table('settings').put(DEFAULT_REGISTER_SETTINGS);
    if (!inspectionCount) await tx.table('inspections').bulkPut(inspectionSeeds());
  });

db.version(5)
  .stores({
    walks: 'id, date, status, &docNr',
    defects: 'id, walkId, status, itemId, area, mangelId',
    photos: 'id, defectId',
    counters: '&year',
    inspections: 'id, area',
    settings: '&id',
  })
  .upgrade(async (tx) => {
    const walks = await tx.table('walks').toArray() as Walk[];
    const defects = await tx.table('defects').toArray() as Defect[];
    const legacyTargets: Record<string, string> = {
      engineering: 'qps', qmeasure: 'qps', 'xtec-lager': 'xtec', 'xtec-werkstatt': 'xtec',
    };
    const rank = { ok: 1, na: 2, mangel: 3 } as const;
    await tx.table('walks').bulkPut(walks.map((walk) => {
      const ratings = { ...walk.ratings };
      for (const item of WEEKLY_ITEMS) {
        for (const target of FORM_AREAS) {
          const sourceIds = [target.id, ...Object.entries(legacyTargets).filter(([, mapped]) => mapped === target.id).map(([legacy]) => legacy)];
          const candidates = sourceIds.map((area) => ratings[`${item.id}@${area}`]).filter((value): value is Rating => !!value);
          const selected = candidates.sort((a, b) => rank[b] - rank[a])[0];
          for (const source of sourceIds) delete ratings[`${item.id}@${source}`];
          if (selected) ratings[`${item.id}@${target.id}`] = selected;
        }
      }
      return { ...walk, ratings };
    }));
    await tx.table('defects').bulkPut(defects.map((defect) => ({ ...defect, area: legacyTargets[defect.area] ?? defect.area })));
  });

export const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const emptySignature = () => ({ name: '', date: '', image: '' });

async function reserveWalkNumber(year: number): Promise<string> {
  const counter = await db.counters.get(year);
  const lastNumber = (counter?.lastNumber ?? 0) + 1;
  await db.counters.put({ year, lastNumber });
  return formatWalkNumber(year, lastNumber);
}

export async function createWalk(at = new Date()): Promise<Walk> {
  const date = toISODate(at);
  return db.transaction('rw', db.walks, db.counters, async () => {
    const existing = await db.walks.toArray();
    const last = [...existing].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0];
    const { year, week } = isoWeek(date);
    const walk: Walk = {
      id: uid(),
      docNr: await reserveWalkNumber(at.getFullYear()),
      date,
      isoYear: year,
      week,
      startTime: toTime(at),
      endTime: '',
      inspector: last?.inspector ?? '',
      companion: '',
      monthlyChecked: suggestMonthlyChecked(date, existing.map((item) => item.date)),
      ratings: {},
      monthlyAreas: {},
      openDefectSnapshot: null,
      result: null,
      note: '',
      signature: emptySignature(),
      acknowledgement: emptySignature(),
      status: 'draft',
      sopVersion: '1.0',
      createdAt: now(),
      updatedAt: now(),
      closedAt: null,
    };
    await db.walks.add(walk);
    return walk;
  });
}

export async function updateWalk(id: string, changes: Partial<Walk>): Promise<void> {
  return db.transaction('rw', db.walks, db.defects, async () => {
    const walk = await db.walks.get(id);
    if (!walk || walk.status === 'closed') return;
    const safe = { ...changes };
    delete safe.id;
    delete safe.docNr;
    delete safe.createdAt;
    delete safe.closedAt;
    if (safe.date) {
      const { year, week } = isoWeek(safe.date);
      safe.isoYear = year;
      safe.week = week;
      const defects = await db.defects.where('walkId').equals(id).toArray();
      await db.defects.bulkPut(defects.map((defect) => ({ ...defect, mangelId: createMangelId(safe.date!, defect.nr), updatedAt: now() })));
    }
    await db.walks.update(id, { ...safe, updatedAt: now() });
  });
}

export async function closeWalk(id: string, openDefectSnapshot: string[]): Promise<void> {
  await db.walks.update(id, { status: 'closed', closedAt: now(), updatedAt: now(), openDefectSnapshot });
}

export async function patchRatings(id: string, patch: Record<string, import('./data/checklist').Rating | undefined>): Promise<void> {
  await db.transaction('rw', db.walks, async () => {
    const walk = await db.walks.get(id);
    if (!walk || walk.status === 'closed') return;
    const ratings = { ...walk.ratings };
    for (const [key, value] of Object.entries(patch)) {
      if (value) ratings[key] = value;
      else delete ratings[key];
    }
    await db.walks.update(id, { ratings, updatedAt: now() });
  });
}

export async function patchMonthlyAreas(id: string, patch: Record<string, string | undefined>): Promise<void> {
  await db.transaction('rw', db.walks, async () => {
    const walk = await db.walks.get(id);
    if (!walk || walk.status === 'closed') return;
    const monthlyAreas = { ...walk.monthlyAreas };
    for (const [itemId, area] of Object.entries(patch)) {
      if (area) monthlyAreas[itemId] = area;
      else delete monthlyAreas[itemId];
    }
    await db.walks.update(id, { monthlyAreas, updatedAt: now() });
  });
}

export async function deleteWalk(id: string): Promise<void> {
  await db.transaction('rw', db.walks, db.defects, db.photos, async () => {
    const defects = await db.defects.where('walkId').equals(id).toArray();
    if (defects.length) await db.photos.where('defectId').anyOf(defects.map((defect) => defect.id)).delete();
    await db.defects.where('walkId').equals(id).delete();
    await db.walks.delete(id);
  });
}

export function newDefectDraft(walk: Walk, existing: Defect[], itemId = '', area = ''): Defect {
  const nr = nextDefectNr(existing);
  return {
    id: uid(),
    walkId: walk.id,
    nr,
    mangelId: createMangelId(walk.date, nr),
    itemId,
    area,
    description: '',
    hazard: '',
    immediateAction: '',
    action: '',
    responsible: '',
    priority: 'M',
    due: '',
    status: 'open',
    doneAt: null,
    recheckAt: null,
    controlledBy: '',
    fixed: null,
    newDue: '',
    note: '',
    createdAt: now(),
    updatedAt: now(),
  };
}

export async function saveDefect(defect: Defect, newPhotos: Omit<Photo, 'defectId'>[], removedPhotoIds: string[]): Promise<void> {
  await db.transaction('rw', db.defects, db.photos, async () => {
    await db.defects.put({ ...defect, updatedAt: now() });
    if (removedPhotoIds.length) await db.photos.bulkDelete(removedPhotoIds);
    if (newPhotos.length) await db.photos.bulkAdd(newPhotos.map((photo) => ({ ...photo, defectId: defect.id })));
  });
}

export async function updateDefect(id: string, changes: Partial<Defect>): Promise<void> {
  await db.transaction('rw', db.defects, db.walks, async () => {
    const defect = await db.defects.get(id);
    if (!defect) return;
    const walk = await db.walks.get(defect.walkId);
    const safe = { ...changes };
    delete safe.id;
    delete safe.walkId;
    delete safe.mangelId;
    delete safe.nr;
    delete safe.createdAt;
    if (walk?.status === 'closed') {
      const allowed: Partial<Defect> = {
        status: safe.status,
        doneAt: safe.doneAt,
        recheckAt: safe.recheckAt,
        controlledBy: safe.controlledBy,
        fixed: safe.fixed,
        newDue: safe.newDue,
        note: safe.note,
        updatedAt: now(),
      };
      await db.defects.update(id, allowed);
      return;
    }
    await db.defects.update(id, { ...safe, updatedAt: now() });
  });
}

export async function deleteDefect(id: string): Promise<void> {
  await db.transaction('rw', db.defects, db.photos, async () => {
    await db.photos.where('defectId').equals(id).delete();
    await db.defects.delete(id);
  });
}

export async function saveInspection(inspection: Inspection): Promise<void> {
  await db.inspections.put({ ...inspection, updatedAt: now() });
}

export async function deleteInspection(id: string): Promise<void> {
  await db.inspections.delete(id);
}

export async function saveSettings(settings: RegisterSettings): Promise<void> {
  await db.settings.put({ ...settings, id: 'app', updatedAt: now() });
}

export async function importBackupData(
  incomingWalks: Walk[],
  incomingDefects: Defect[],
  incomingPhotos: Photo[],
  incomingInspections: Inspection[],
  incomingSettings: RegisterSettings | undefined,
) {
  return db.transaction('rw', [db.walks, db.defects, db.photos, db.counters, db.inspections, db.settings], async () => {
    const local = await db.walks.toArray();
    const byId = new Map(local.map((walk) => [walk.id, walk]));
    const byNumber = new Map(local.map((walk) => [walk.docNr, walk.id]));
    const accepted = new Map<string, Walk>();
    const skipped = new Set<string>();
    const reserved = new Map<string, string>();
    const collisions: string[] = [];
    for (const incoming of incomingWalks) {
      const existing = byId.get(incoming.id);
      const docNr = existing?.docNr ?? incoming.docNr;
      const owner = byNumber.get(docNr) ?? reserved.get(docNr);
      if (owner && owner !== incoming.id) {
        collisions.push(docNr);
        skipped.add(incoming.id);
        continue;
      }
      reserved.set(docNr, incoming.id);
      accepted.set(incoming.id, { ...incoming, docNr });
      const parsed = parseWalkNumber(docNr);
      if (parsed) {
        const counter = await db.counters.get(parsed.year);
        if (parsed.sequence > (counter?.lastNumber ?? 0)) await db.counters.put({ year: parsed.year, lastNumber: parsed.sequence });
      }
    }
    if (accepted.size) await db.walks.bulkPut([...accepted.values()]);
    const defects = incomingDefects.filter((defect) => !skipped.has(defect.walkId));
    const ids = new Set(defects.map((defect) => defect.id));
    const photos = incomingPhotos.filter((photo) => ids.has(photo.defectId));
    if (defects.length) await db.defects.bulkPut(defects);
    if (photos.length) await db.photos.bulkPut(photos);
    if (incomingInspections.length) await db.inspections.bulkPut(incomingInspections);
    if (incomingSettings) await db.settings.put({ ...incomingSettings, id: 'app' });
    return { walks: accepted.size, defects: defects.length, photos: photos.length, inspections: incomingInspections.length, collisions };
  });
}

export async function openDefectsBefore(walk: Walk): Promise<{ defect: Defect; walk?: Walk }[]> {
  const [defects, walks] = await Promise.all([db.defects.toArray(), db.walks.toArray()]);
  const byId = new Map(walks.map((item) => [item.id, item]));
  return defects
    .filter((defect) => defect.status !== 'done' && defect.walkId !== walk.id)
    .map((defect) => ({ defect, walk: byId.get(defect.walkId) }))
    .filter(({ walk: source }) => !source || source.date < walk.date || (source.date === walk.date && source.createdAt < walk.createdAt))
    .sort((a, b) => (a.walk?.date ?? '').localeCompare(b.walk?.date ?? '') || a.defect.nr - b.defect.nr);
}
