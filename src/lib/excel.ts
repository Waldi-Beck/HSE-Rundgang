import ExcelJS from 'exceljs';
import { areaLabel } from '../data/checklist';
import { DEFECT_STATUS_LABELS, PRIORITY_KEY_TO_TEXT, RESULT_LABELS } from '../data/register';
import { isoWeek } from './dates';
import { defectDaysOpen, roundRegisterRows, validDefectDue } from './register';
import type { Defect, RegisterSettings, Walk } from './types';

export interface RegisterWorkbookInput {
  walks: Walk[];
  defects: Defect[];
  settings: RegisterSettings;
}

const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F5F3B' } };
const whiteFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
const border: Partial<ExcelJS.Borders> = { bottom: { style: 'hair', color: { argb: 'FFD7DCE0' } } };

function setSheetHeader(sheet: ExcelJS.Worksheet, headers: string[], widths: number[]) {
  sheet.addRow(headers);
  const row = sheet.getRow(1);
  row.height = 32;
  row.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = whiteFont;
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = border;
  });
  widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
}

function styleDataRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.alignment = { vertical: 'top', wrapText: true };
    cell.border = border;
  });
}

function excelDate(value: string | null | undefined): Date | '' {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function excelTime(value: string): number | '' {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return match ? (Number(match[1]) * 60 + Number(match[2])) / 1440 : '';
}

export async function buildRegisterWorkbook(input: RegisterWorkbookInput): Promise<Uint8Array> {
  const { walks, defects, settings } = input;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HSE Rundgang App';
  workbook.subject = 'Registerdaten aus dem HSE Rundgang';
  workbook.title = 'HSE Rundgang Register';
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  const roundRows = roundRegisterRows(walks, defects, settings);
  const roundSheet = workbook.addWorksheet('Rundgänge');
  setSheetHeader(roundSheet, [
    'Nr.', 'Datum', 'KW', 'Tage seit letztem', 'Intervall', 'Monatspunkte 2.2 geprüft', 'Beginn', 'Ende', 'Dauer', 'Durchgeführt von', 'Begleitperson', 'Mängel erfasst', 'davon kritisch', 'davon noch offen', 'Gesamtbewertung', 'Ablage (PDF-Datei)', 'Bemerkung', 'Rundgang-Nr.',
  ], [8, 13, 12, 15, 16, 20, 11, 11, 12, 22, 22, 14, 14, 16, 35, 56, 35, 24]);
  for (const item of roundRows) {
    const walk = item.walk;
    const week = isoWeek(walk.date);
    const row = roundSheet.addRow([
      item.index,
      excelDate(walk.date),
      `${week.year}-KW${String(week.week).padStart(2, '0')}`,
      item.daysSincePrevious ?? '–',
      item.interval,
      walk.monthlyChecked ? 'Ja' : 'Nein',
      excelTime(walk.startTime),
      excelTime(walk.endTime),
      item.durationMinutes === null ? '' : item.durationMinutes / 1440,
      walk.inspector,
      walk.companion,
      item.defectCount,
      item.criticalCount,
      item.openCount,
      walk.result ? RESULT_LABELS[walk.result] : '',
      item.pdfFilename,
      walk.note,
      walk.docNr,
    ]);
    styleDataRow(row);
    row.getCell(2).numFmt = 'dd.mm.yyyy';
    row.getCell(7).numFmt = 'hh:mm';
    row.getCell(8).numFmt = 'hh:mm';
    row.getCell(9).numFmt = '[h]:mm';
    if (item.monthlyWarning) row.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE8B2' } };
    if (item.interval === 'überschritten') row.getCell(5).font = { bold: true, color: { argb: 'FFB45309' } };
  }

  const walkById = new Map(walks.map((walk) => [walk.id, walk]));
  const defectSheet = workbook.addWorksheet('Mängel');
  setSheetHeader(defectSheet, [
    'Mangel-ID', 'Datum', 'KW', 'Nr. im Formular', 'Bereich', 'Kontrollpunkt', 'Beschreibung des Mangels', 'Festgestellte Gefahr', 'Priorität', 'Sofortmassnahme', 'Massnahme', 'Verantwortlich', 'Frist', 'Status', 'Erledigt am', 'Nachkontrolle am', 'Kontrolliert von', 'Mangel behoben?', 'Neuer Termin (bei Nein)', 'Gültige Frist', 'Tage offen', 'Überfällig', 'Bemerkung', 'Rundgang-Nr.',
  ], [22, 13, 12, 14, 22, 14, 42, 38, 20, 34, 34, 24, 13, 30, 13, 16, 24, 15, 18, 14, 12, 16, 34, 24]);
  for (const defect of defects) {
    const walk = walkById.get(defect.walkId);
    const walkDate = walk?.date ?? defect.createdAt.slice(0, 10);
    const week = walk ? isoWeek(walk.date) : null;
    const due = validDefectDue(walkDate, defect, settings);
    const overdue = defect.status !== 'done' && due < new Date().toISOString().slice(0, 10);
    const row = defectSheet.addRow([
      defect.mangelId,
      excelDate(walkDate),
      week ? `${week.year}-KW${String(week.week).padStart(2, '0')}` : '',
      defect.nr,
      areaLabel(defect.area, settings.areas),
      defect.itemId,
      defect.description,
      defect.hazard,
      PRIORITY_KEY_TO_TEXT[defect.priority],
      defect.immediateAction,
      defect.action,
      defect.responsible,
      excelDate(defect.due),
      DEFECT_STATUS_LABELS[defect.status],
      excelDate(defect.doneAt),
      excelDate(defect.recheckAt),
      defect.controlledBy,
      defect.fixed === null ? '' : defect.fixed ? 'Ja' : 'Nein',
      excelDate(defect.newDue),
      excelDate(due),
      defectDaysOpen(walkDate, defect),
      overdue ? 'ÜBERFÄLLIG' : '',
      defect.note,
      walk?.docNr ?? '',
    ]);
    styleDataRow(row);
    for (const column of [2, 13, 15, 16, 19, 20]) row.getCell(column).numFmt = 'dd.mm.yyyy';
    if (overdue) row.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4E4' } }; });
    if (defect.priority === 'K') row.getCell(9).font = { bold: true, color: { argb: 'FFC00000' } };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}
