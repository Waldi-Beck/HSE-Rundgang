import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_REGISTER_SETTINGS, INITIAL_INSPECTIONS } from '../../src/data/register';
import { buildRegisterWorkbook } from '../../src/lib/excel';
import type { Walk } from '../../src/lib/types';

const walk: Walk = {
  id: 'round-test', docNr: 'HSE-RG-2026-001', date: '2026-10-08', isoYear: 2026, week: 41,
  startTime: '08:00', endTime: '08:30', inspector: 'Max Muster', companion: 'Max Muster', monthlyChecked: true,
  ratings: {}, monthlyAreas: {}, openDefectSnapshot: null, result: 'none', note: 'Beispiel',
  signature: { name: 'Max Muster', date: '2026-10-08', image: '' }, acknowledgement: { name: '', date: '', image: '' },
  status: 'closed', sopVersion: '1.0', createdAt: '2026-10-08T08:00:00Z', updatedAt: '', closedAt: '2026-10-08T08:30:00Z',
};

describe('Excel register export', () => {
  it('contains the three register sheets and workbook-compatible column ordering', async () => {
    const bytes = await buildRegisterWorkbook({ walks: [walk], defects: [], inspections: [], settings: DEFAULT_REGISTER_SETTINGS });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(bytes) as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const header = (sheet: string) => (workbook.getWorksheet(sheet)?.getRow(1).values as unknown[]).slice(1);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Rundgänge', 'Mängel', 'Prüftermine']);
    expect(header('Rundgänge')).toEqual([
      'Nr.', 'Datum', 'KW', 'Tage seit letztem', 'Intervall', 'Monatspunkte 2.2 geprüft', 'Beginn', 'Ende', 'Dauer', 'Durchgeführt von', 'Begleitperson', 'Mängel erfasst', 'davon kritisch', 'davon noch offen', 'Gesamtbewertung', 'Ablage (PDF-Datei)', 'Bemerkung', 'Rundgang-Nr.',
    ]);
    expect(header('Mängel')).toEqual([
      'Mangel-ID', 'Datum', 'KW', 'Nr. im Formular', 'Bereich', 'Kontrollpunkt', 'Beschreibung des Mangels', 'Festgestellte Gefahr', 'Priorität', 'Sofortmassnahme', 'Massnahme', 'Verantwortlich', 'Frist', 'Status', 'Erledigt am', 'Nachkontrolle am', 'Kontrolliert von', 'Mangel behoben?', 'Neuer Termin (bei Nein)', 'Gültige Frist', 'Tage offen', 'Überfällig', 'Bemerkung', 'Rundgang-Nr.',
    ]);
    expect(header('Prüftermine')).toEqual([
      'Nr.', 'Prüfung', 'Bereich', 'Intervall (Monate)', 'Letzte Prüfung', 'Nächste Fälligkeit', 'Status', 'Verantwortlich', 'Nachweis / Ablage', 'Bemerkung',
    ]);
    expect(workbook.getWorksheet('Rundgänge')?.getRow(2).getCell(18).value).toBe('HSE-RG-2026-001');
  });

  it('seeds all 15 periodical-check proposals from the source workbook', () => {
    expect(INITIAL_INSPECTIONS).toHaveLength(15);
    expect(INITIAL_INSPECTIONS[0].description).toBe('Sicherheitsdatenblätter auf Aktualität prüfen');
    expect(INITIAL_INSPECTIONS.at(-1)?.description).toBe('PSA-Bedarf und -Auswahl überprüfen');
  });
});
