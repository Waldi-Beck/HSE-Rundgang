/** Export-Aktionen, die Datenbank und Fachlogik verbinden. */
import { db, openDefectsBefore } from './db';
import { defectsToCsv, buildBackup, downloadBlob } from './lib/backup';
import { reportBaseName, toISODate } from './lib/dates';
import type { Walk } from './lib/types';

export async function reportFileBase(walk: Walk): Promise<string> {
  const sameWeek = (await db.walks.toArray())
    .filter((w) => w.isoYear === walk.isoYear && w.week === walk.week)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const idx = sameWeek.findIndex((w) => w.id === walk.id) + 1;
  return reportBaseName(walk.isoYear, walk.week, Math.max(1, idx));
}

/** PDF-Bericht erzeugen und herunterladen (FR-050, FR-051). Gibt den Dateinamen zurück. */
export async function exportWalkPdf(walkId: string): Promise<string> {
  const walk = await db.walks.get(walkId);
  if (!walk) throw new Error('Rundgang nicht gefunden.');
  const defects = (await db.defects.where('walkId').equals(walkId).toArray()).sort((a, b) => a.nr - b.nr);
  const photos = await db.photos.where('defectId').anyOf(defects.map((d) => d.id)).toArray();
  photos.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const openFromPrevious = walk.openPointsSnapshot ? [] : await openDefectsBefore(walk);
  const base = await reportFileBase(walk);
  const { buildReportPdf } = await import('./lib/pdf'); // jsPDF nur bei Bedarf laden
  const doc = await buildReportPdf({ walk, defects, photos, openFromPrevious, fileBaseName: base });
  const filename = `${base}.pdf`;
  downloadBlob(doc.output('blob'), filename);
  return filename;
}

export async function exportRegisterCsv(): Promise<string> {
  const [walks, defects] = await Promise.all([db.walks.toArray(), db.defects.toArray()]);
  const byId = new Map(walks.map((w) => [w.id, w]));
  defects.sort((a, b) => {
    const wa = byId.get(a.walkId)?.date ?? '';
    const wb = byId.get(b.walkId)?.date ?? '';
    return wa.localeCompare(wb) || a.nr - b.nr;
  });
  const filename = `HSE-Maengelregister_${toISODate(new Date())}.csv`;
  downloadBlob(new Blob([defectsToCsv(defects, byId)], { type: 'text/csv;charset=utf-8' }), filename);
  return filename;
}

export const LAST_BACKUP_KEY = 'hse-rundgang:lastBackup';

export async function exportBackupJson(): Promise<string> {
  const [walks, defects, photos] = await Promise.all([db.walks.toArray(), db.defects.toArray(), db.photos.toArray()]);
  const data = await buildBackup(walks, defects, photos);
  const filename = `hse-rundgang-backup_${toISODate(new Date())}.json`;
  downloadBlob(new Blob([JSON.stringify(data)], { type: 'application/json' }), filename);
  try {
    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
  } catch {
    /* Speicher nicht verfügbar: nur Komfortfunktion */
  }
  return filename;
}
