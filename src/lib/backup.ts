/** Complete local backup, including the round register, follow-up fields, inspection plan, settings and photos. */
import { SOP_META } from '../data/checklist';
import { parseWalkNumber } from './dates';
import { blobToDataUrl, dataUrlToBlob } from './image';
import type { Defect, Inspection, Photo, RegisterSettings, Walk } from './types';

export const BACKUP_FORMAT = 'qps-hse-rundgang-backup';
export const BACKUP_VERSION = 4;

export interface BackupPhoto extends Omit<Photo, 'blob'> {
  dataUrl: string;
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  exportedAt: string;
  sop: { docId: string; version: string };
  walks: Walk[];
  defects: Defect[];
  photos: BackupPhoto[];
  inspections: Inspection[];
  settings: RegisterSettings;
}

export async function buildBackup(
  walks: Walk[],
  defects: Defect[],
  photos: Photo[],
  inspections: Inspection[],
  settings: RegisterSettings,
): Promise<BackupFile> {
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    sop: { docId: SOP_META.docId, version: SOP_META.version },
    walks,
    defects,
    photos: await Promise.all(photos.map(async ({ blob, ...rest }) => ({ ...rest, dataUrl: await blobToDataUrl(blob) }))),
    inspections,
    settings,
  };
}

export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try { data = JSON.parse(text); }
  catch { throw new Error('Datei ist kein gültiges JSON.'); }
  const backup = data as Partial<BackupFile>;
  if (backup.format !== BACKUP_FORMAT) throw new Error('Keine Sicherungsdatei der HSE Rundgang App.');
  if (typeof backup.formatVersion !== 'number') throw new Error('Sicherungsdatei ist unvollständig (Formatversion fehlt).');
  if (backup.formatVersion < BACKUP_VERSION) throw new Error('Diese Sicherung stammt aus einem älteren Formular oder Register und enthält nicht alle aktuellen Daten. Bitte aus der neuen App erneut sichern.');
  if (backup.formatVersion > BACKUP_VERSION) throw new Error('Sicherungsformat ist neuer als diese App-Version. Bitte die App aktualisieren.');
  if (!Array.isArray(backup.walks) || !Array.isArray(backup.defects) || !Array.isArray(backup.photos) || !Array.isArray(backup.inspections) || !backup.settings) {
    throw new Error('Sicherungsdatei ist unvollständig. Rundgänge, Mängel, Fotos, Prüftermine und Einstellungen müssen enthalten sein.');
  }
  if (backup.walks.some((walk) => !walk.docNr || !parseWalkNumber(walk.docNr))) throw new Error('Sicherungsdatei enthält eine ungültige Rundgangnummer.');
  return backup as BackupFile;
}

export async function backupPhotosToBlobs(photos: BackupPhoto[]): Promise<Photo[]> {
  return Promise.all(photos.map(async ({ dataUrl, ...rest }) => ({ ...rest, blob: await dataUrlToBlob(dataUrl) })));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
