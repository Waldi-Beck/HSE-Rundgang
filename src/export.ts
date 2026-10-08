/** Client-side export actions connecting Dexie and report generators. */
import { db, openDefectsBefore } from './db';
import { buildBackup, downloadBlob } from './lib/backup';
import { reportBaseName, toISODate } from './lib/dates';
import { DEFAULT_REGISTER_SETTINGS } from './data/register';
import type { Walk } from './lib/types';

export const LAST_BACKUP_KEY = 'hse-rundgang:lastBackup';

export async function reportFileBase(walk: Walk): Promise<string> {
  return reportBaseName(walk.date, walk.docNr);
}

export async function exportWalkPdf(walkId: string): Promise<string> {
  const walk = await db.walks.get(walkId);
  if (!walk) throw new Error('Rundgang nicht gefunden.');
  const defects = (await db.defects.where('walkId').equals(walkId).toArray()).sort((a, b) => a.nr - b.nr);
  const photos = await db.photos.where('defectId').anyOf(defects.map((defect) => defect.id)).toArray();
  photos.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const openFromPrevious = walk.openDefectSnapshot ? [] : await openDefectsBefore(walk);
  const fileBaseName = await reportFileBase(walk);
  const { buildReportPdf } = await import('./lib/pdf');
  const [settings] = await Promise.all([db.settings.get('app')]);
  const pdf = await buildReportPdf({ walk, defects, photos, openFromPrevious, fileBaseName, settings: settings ?? DEFAULT_REGISTER_SETTINGS });
  const filename = `${fileBaseName}.pdf`;
  downloadBlob(pdf.output('blob'), filename);
  return filename;
}

export async function exportRegisterXlsx(): Promise<string> {
  const [walks, defects, inspections, savedSettings] = await Promise.all([
    db.walks.toArray(), db.defects.toArray(), db.inspections.toArray(), db.settings.get('app'),
  ]);
  const settings = savedSettings ?? DEFAULT_REGISTER_SETTINGS;
  const { buildRegisterWorkbook } = await import('./lib/excel');
  const buffer = await buildRegisterWorkbook({ walks, defects, inspections, settings });
  const filename = `HSE-Rundgang_Register_${toISODate(new Date())}.xlsx`;
  const blobPart = new Uint8Array(buffer).buffer;
  downloadBlob(new Blob([blobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
  return filename;
}

export async function exportBackupJson(): Promise<string> {
  const [walks, defects, photos, inspections, savedSettings] = await Promise.all([
    db.walks.toArray(), db.defects.toArray(), db.photos.toArray(), db.inspections.toArray(), db.settings.get('app'),
  ]);
  const backup = await buildBackup(walks, defects, photos, inspections, savedSettings ?? DEFAULT_REGISTER_SETTINGS);
  const filename = `hse-rundgang-backup_${toISODate(new Date())}.json`;
  downloadBlob(new Blob([JSON.stringify(backup)], { type: 'application/json' }), filename);
  try { localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString()); } catch { /* localStorage may be unavailable */ }
  return filename;
}
