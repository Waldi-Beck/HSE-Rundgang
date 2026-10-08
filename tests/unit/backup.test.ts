import { describe, expect, it } from 'vitest';
import { BACKUP_FORMAT, BACKUP_VERSION, CSV_HEADER, defectsToCsv, parseBackup } from '../../src/lib/backup';
import type { Defect, Walk } from '../../src/lib/types';

const file = (formatVersion: number) =>
  JSON.stringify({ format: BACKUP_FORMAT, formatVersion, exportedAt: '', sop: {}, walks: [], defects: [], photos: [] });

describe('JSON-Sicherung', () => {
  it('aktuelle Formatversion ist 2', () => expect(BACKUP_VERSION).toBe(2));
  it('liest Version 2', () => expect(parseBackup(file(2)).walks).toEqual([]));
  it('weist alte Sicherungen (Version 1) mit verständlicher Meldung ab', () => {
    expect(() => parseBackup(file(1))).toThrow(/alten Checkliste \(Rubriken A bis G\)/);
  });
  it('weist neuere Formate ab', () => expect(() => parseBackup(file(3))).toThrow(/neuer als diese App-Version/));
  it('weist fremde Dateien ab', () => expect(() => parseBackup('{"a":1}')).toThrow(/Keine Sicherungsdatei/));
});

describe('CSV-Mängelregister', () => {
  it('enthält die Spalte Bereich nach Pkt.', () => {
    expect(CSV_HEADER.slice(3, 5)).toEqual(['Pkt', 'Bereich']);
    const w = { id: 'w1', isoYear: 2026, week: 41, date: '2026-10-06' } as Walk;
    const d = {
      id: 'd1', walkId: 'w1', nr: 1, itemId: 'M2', area: 'alle', hazard: 'Plakette abgelaufen', action: '', responsible: '',
      prio: 'M', due: '2026-10-13', status: 'open', doneAt: null, doneNote: '', createdAt: '', updatedAt: '',
    } as Defect;
    const row = defectsToCsv([d], new Map([['w1', w]])).split('\r\n')[1];
    expect(row).toBe('2026-KW41;06.10.2026;1;M2;Alle Bereiche / allgemein;Plakette abgelaufen;;;M;13.10.2026;offen;;');
  });
});
