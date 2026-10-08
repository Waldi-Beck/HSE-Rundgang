/** JSON-Sicherung und CSV-Mängelregister (contracts/backup-format.md). */
import { SOP_META, areaLabel } from '../data/checklist';
import { formatDate, weekLabel } from './dates';
import { blobToDataUrl, dataUrlToBlob } from './image';
import type { Defect, Photo, Walk } from './types';

export const BACKUP_FORMAT = 'qps-hse-rundgang-backup';
/**
 * 2 = Formular mit Matrix 2.1 je Bereich, 2.2 Monatlich, Bewertung OK / Mangel / n.a., Mangel mit Bereich.
 * Version 1 (alte Checkliste A bis G, M1 bis M12) kann nicht eingelesen werden.
 */
export const BACKUP_VERSION = 2;

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
}

export async function buildBackup(walks: Walk[], defects: Defect[], photos: Photo[]): Promise<BackupFile> {
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    sop: { docId: SOP_META.docId, version: SOP_META.version },
    walks,
    defects,
    photos: await Promise.all(
      photos.map(async ({ blob, ...rest }) => ({ ...rest, dataUrl: await blobToDataUrl(blob) })),
    ),
  };
}

export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Datei ist kein gültiges JSON.');
  }
  const b = data as Partial<BackupFile>;
  if (b?.format !== BACKUP_FORMAT) throw new Error('Keine Sicherungsdatei der HSE-Rundgang App.');
  if (typeof b.formatVersion !== 'number') throw new Error('Sicherungsdatei ist unvollständig (Formatversion fehlt).');
  if (b.formatVersion < BACKUP_VERSION)
    throw new Error(
      'Diese Sicherung stammt aus der alten Checkliste (Rubriken A bis G) und kann nicht eingelesen werden. Die App verwendet das neue Formular mit Bereichen (2.1 / 2.2).',
    );
  if (b.formatVersion > BACKUP_VERSION)
    throw new Error('Sicherungsformat ist neuer als diese App-Version. Bitte die App aktualisieren.');
  if (!Array.isArray(b.walks) || !Array.isArray(b.defects) || !Array.isArray(b.photos))
    throw new Error('Sicherungsdatei ist unvollständig.');
  return b as BackupFile;
}

export async function backupPhotosToBlobs(photos: BackupPhoto[]): Promise<Photo[]> {
  return Promise.all(photos.map(async ({ dataUrl, ...rest }) => ({ ...rest, blob: await dataUrlToBlob(dataUrl) })));
}

const csvCell = (v: string | number | null | undefined) => {
  const s = String(v ?? '');
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const CSV_HEADER = [
  'Rundgang', 'Datum', 'Nr', 'Pkt', 'Bereich', 'Mangel/Gefahr', 'Massnahme', 'Verantwortlich', 'Prio', 'Frist', 'Status', 'Erledigt am', 'Vermerk',
];

/** Excel-kompatibel: UTF-8 mit BOM, Semikolon, CRLF. */
export function defectsToCsv(defects: Defect[], walksById: Map<string, Walk>): string {
  const rows = defects.map((d) => {
    const w = walksById.get(d.walkId);
    return [
      w ? weekLabel(w.isoYear, w.week) : '',
      w ? formatDate(w.date) : '',
      d.nr, d.itemId, areaLabel(d.area), d.hazard, d.action, d.responsible, d.prio, formatDate(d.due),
      d.status === 'done' ? 'erledigt' : 'offen', formatDate(d.doneAt), d.doneNote,
    ].map(csvCell).join(';');
  });
  return '﻿' + [CSV_HEADER.join(';'), ...rows].join('\r\n') + '\r\n';
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
