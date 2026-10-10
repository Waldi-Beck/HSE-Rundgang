import { jsPDF } from 'jspdf';
import { autoTable, type CellHookData, type RowInput } from 'jspdf-autotable';
import { QPS_LOGO_PNG, QPS_LOGO_RATIO } from '../assets/qpsLogo';
import { FORM_AREAS, FORM_SUBTITLE, FORM_TITLE, INTERVAL_NOTICE, MONTHLY_ITEMS, MONTHLY_NOTICE, NOT_IN_WALK_TEXT, PRIORITY_NOTE, RATING_LABELS, RATING_LEGEND, SOP_META, WEEKLY_ITEMS, WEEKLY_NOTICE, areaLabel } from '../data/checklist';
import { DEFECT_STATUS_LABELS, PRIORITY_KEY_TO_TEXT, RESULT_LABELS } from '../data/register';
import { durationMinutes, formatDate, formatDuration } from './dates';
import { blobToDataUrl } from './image';
import { validDefectDue } from './register';
import type { Defect, Photo, RegisterSettings, ResultKey, Walk } from './types';
import { cellKey } from './walk';

const MARGIN = 8;
const INK: [number, number, number] = [38, 43, 47];
const MUTED: [number, number, number] = [97, 105, 111];
const LINE: [number, number, number] = [190, 196, 200];
const GREEN: [number, number, number] = [31, 105, 65];
const RED: [number, number, number] = [186, 35, 35];
const PALE: [number, number, number] = [244, 246, 245];
const SOFT_RED: [number, number, number] = [255, 242, 241];
const PAGE_TOP = 37;
const PAGE_BOTTOM = 15;

export interface PdfInput {
  walk: Walk;
  defects: Defect[];
  photos: Photo[];
  openFromPrevious: { defect: Defect; walk?: Walk }[];
  fileBaseName: string;
  settings: RegisterSettings;
}

const lastY = (doc: jsPDF): number => (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? PAGE_TOP;
const label = (content: string) => ({ content, styles: { fontStyle: 'bold' as const, fillColor: PALE } });

function vectorMark(doc: jsPDF, kind: 'ok' | 'mangel' | 'na', cx: number, cy: number, size = 2.8) {
  const half = size / 2;
  doc.setLineWidth(0.55);
  doc.setLineCap('round');
  doc.setLineJoin('round');
  doc.setDrawColor(...(kind === 'ok' ? GREEN : kind === 'mangel' ? RED : MUTED));
  if (kind === 'ok') {
    doc.lines([[half * 0.7, half * 0.7], [half * 1.25, -half * 1.6]], cx - half * 0.95, cy + half * 0.05);
  } else if (kind === 'mangel') {
    doc.line(cx - half * 0.75, cy - half * 0.75, cx + half * 0.75, cy + half * 0.75);
    doc.line(cx + half * 0.75, cy - half * 0.75, cx - half * 0.75, cy + half * 0.75);
  } else {
    doc.line(cx - half * 0.7, cy, cx + half * 0.7, cy);
  }
  doc.setLineCap('butt');
  doc.setLineJoin('miter');
  doc.setLineWidth(0.2);
}

function checkbox(doc: jsPDF, x: number, y: number, checked: boolean, color: [number, number, number] = INK, size = 3) {
  doc.setDrawColor(...LINE);
  doc.rect(x, y, size, size);
  if (!checked) return;
  doc.setDrawColor(...color);
  doc.setLineWidth(0.5);
  doc.line(x + 0.5, y + 0.5, x + size - 0.5, y + size - 0.5);
  doc.line(x + size - 0.5, y + 0.5, x + 0.5, y + size - 0.5);
  doc.setLineWidth(0.2);
}

function drawHeader(doc: jsPDF, walk: Walk, page: number, pageCount: number, fileBaseName: string) {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const logoW = 26;
  const logoH = logoW * QPS_LOGO_RATIO;
  const y = 10.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.setTextColor(25, 45, 72);
  doc.text(`Dokumenten ID: ${SOP_META.docId}`, MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...INK);
  doc.text(`Dokumententitel: ${SOP_META.title}`, MARGIN, y + 4.3);
  doc.text(`Version: ${SOP_META.version}`, MARGIN + 79, y);
  doc.text(`Gültig ab: ${formatDate(SOP_META.validFrom)}`, MARGIN + 79, y + 4.3);
  doc.addImage(QPS_LOGO_PNG, 'PNG', width - MARGIN - logoW, 5, logoW, logoH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Rundgang-Nr.: ${walk.docNr}`, MARGIN, y + 8.6);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.25);
  doc.line(MARGIN, 27, width - MARGIN, 27);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(`${fileBaseName} · ${walk.status === 'closed' ? 'Abgeschlossen' : 'Entwurf'}`, MARGIN, height - 7);
  doc.text(`Seite ${page} von ${pageCount}`, width - MARGIN, height - 7, { align: 'right' });
}

export async function buildReportPdf(input: PdfInput): Promise<jsPDF> {
  const { walk, defects, photos, openFromPrevious, fileBaseName, settings } = input;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const contentWidth = width - 2 * MARGIN;
  const photoData = new Map<string, string>();
  for (const photo of photos) photoData.set(photo.id, await blobToDataUrl(photo.blob));
  doc.setProperties({ title: fileBaseName, subject: `${SOP_META.docId} ${SOP_META.title}`, author: walk.inspector, creator: `${SOP_META.company}, HSE Rundgang App` });

  const common = {
    margin: { left: MARGIN, right: MARGIN, top: PAGE_TOP, bottom: PAGE_BOTTOM },
    theme: 'grid' as const,
    styles: { font: 'helvetica', fontSize: 7.2, cellPadding: 1.05, textColor: INK, lineColor: LINE, lineWidth: 0.16, valign: 'middle' as const },
    headStyles: { fillColor: PALE, textColor: INK, fontStyle: 'bold' as const, halign: 'center' as const },
  };
  let y = PAGE_TOP;
  const sectionTitle = (text: string, size = 10) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size);
    doc.setTextColor(...INK);
    doc.text(text, MARGIN, y + size * 0.35);
    y += size * 0.72;
  };

  // Page 1: form title, round data, legend, 2.1 matrix and optional 2.2 table.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...INK);
  doc.text(FORM_TITLE, MARGIN, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(FORM_SUBTITLE, MARGIN + doc.getTextWidth(FORM_TITLE) + 2, y + 6);
  y += 9;
  doc.setFontSize(6.8);
  const intro = doc.splitTextToSize(`${INTERVAL_NOTICE} ${NOT_IN_WALK_TEXT}`, contentWidth);
  doc.text(intro, MARGIN, y + 2);
  y += intro.length * 3.1 + 3;

  sectionTitle('1. Rundgangdaten');
  const prevText = (walk.openDefectSnapshot ?? openFromPrevious.map(({ defect, walk: source }) => {
    const sourceLabel = source ? `${source.docNr} ` : '';
    return `${sourceLabel}${defect.mangelId} (${defect.itemId} / ${areaLabel(defect.area, settings.areas)}): ${defect.description} [${DEFECT_STATUS_LABELS[defect.status]}]`;
  })).join('\n');
  autoTable(doc, {
    ...common,
    startY: y,
    body: [
      [label('Datum'), formatDate(walk.date), label('Kalenderwoche'), `${walk.isoYear}-KW${String(walk.week).padStart(2, '0')}`],
      [label('Uhrzeit'), `${walk.startTime || '–'} bis ${walk.endTime || '–'}`, label('Dauer'), formatDuration(durationMinutes(walk.startTime, walk.endTime)) || '–'],
      [label('Durchgeführt von'), walk.inspector, label('Begleitperson'), walk.companion || '–'],
      [label('Monatspunkte'), '', label('Rundgang-Nr.'), walk.docNr],
      [label('Offene Punkte letzter Rundgang'), { content: prevText || 'Keine offenen Mängel.', colSpan: 3 }],
    ],
    columnStyles: { 0: { cellWidth: 33 }, 2: { cellWidth: 29 } },
    didDrawCell: (cell) => {
      if (cell.section !== 'body' || cell.row.index !== 3 || cell.column.index !== 1) return;
      checkbox(doc, cell.cell.x + 1.6, cell.cell.y + (cell.cell.height - 3) / 2, walk.monthlyChecked, GREEN);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(...INK);
      doc.text('2.2 geprüft', cell.cell.x + 6, cell.cell.y + cell.cell.height / 2 + 1.2);
    },
  });
  y = lastY(doc) + 4;

  sectionTitle('2. Checkliste');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(...MUTED);
  const legend = doc.splitTextToSize(RATING_LEGEND, contentWidth);
  doc.text(legend, MARGIN, y + 1.7);
  y += legend.length * 2.9 + 2;

  sectionTitle(WEEKLY_NOTICE, 8.2);
  const head = ['Nr.', 'Kontrollpunkt', ...FORM_AREAS.map((area) => area.label)];
  const areaColStart = 2;
  const areaForColumn = (column: number) => FORM_AREAS[column - areaColStart];
  const areaW = 27.5;
  const pointCol = contentWidth - 8 - areaW * FORM_AREAS.length;
  autoTable(doc, {
    ...common,
    startY: y,
    showHead: 'everyPage',
    styles: { ...common.styles, fontSize: 6.8, cellPadding: 0.6, minCellHeight: 5.4 },
    head: [head],
    body: WEEKLY_ITEMS.map((item) => [item.id, item.text, ...FORM_AREAS.map(() => '')]),
    headStyles: { ...common.headStyles, fontSize: 6.2 },
    columnStyles: { 0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: pointCol }, ...Object.fromEntries(FORM_AREAS.map((_, index) => [index + 2, { cellWidth: areaW, halign: 'center' }])) },
    didParseCell: (cell) => {
      if (cell.section !== 'body') return;
      const area = areaForColumn(cell.column.index);
      if (!area) return;
      const key = cellKey(WEEKLY_ITEMS[cell.row.index].id, area.id);
      if (walk.ratings[key] === 'mangel') cell.cell.styles.fillColor = SOFT_RED;
    },
    didDrawCell: (cell) => {
      if (cell.section !== 'body' || cell.row.index >= WEEKLY_ITEMS.length) return;
      const area = areaForColumn(cell.column.index);
      if (!area) return;
      const item = WEEKLY_ITEMS[cell.row.index];
      if (!item) return;
      const key = cellKey(item.id, area.id);
      const rating = walk.ratings[key];
      const cx = cell.cell.x + cell.cell.width / 2;
      const cy = cell.cell.y + cell.cell.height / 2;
      if (!rating) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text('…', cx, cy + 1, { align: 'center' });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(...(rating === 'ok' ? GREEN : rating === 'mangel' ? RED : MUTED));
        doc.text(RATING_LABELS[rating], cx, cy + 1.1, { align: 'center' });
        const linked = defects.filter((defect) => defect.itemId === item.id && defect.area === area.id);
        if (linked.length) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.5);
          doc.setTextColor(...RED);
          doc.text(linked.map((defect) => String(defect.nr)).join(','), cx + 1.8, cy + 1.7);
        }
      }
    },
  });
  y = lastY(doc) + 3;

  if (walk.monthlyChecked) {
    sectionTitle(MONTHLY_NOTICE, 8.2);
    const monthlyHead = ['Nr.', 'Kontrollpunkt', 'OK', 'Mangel', 'n.a.', 'Bereich'];
    autoTable(doc, {
      ...common,
      startY: y,
      showHead: 'everyPage',
      styles: { ...common.styles, fontSize: 6, cellPadding: 0.4, minCellHeight: 4.5 },
      head: [monthlyHead],
      body: MONTHLY_ITEMS.map((item) => [item.id, item.text, '', '', '', walk.monthlyAreas[item.id] ?? '']),
      columnStyles: { 0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: contentWidth - 8 - 9 * 3 - 38 }, 2: { cellWidth: 9 }, 3: { cellWidth: 9 }, 4: { cellWidth: 9 }, 5: { cellWidth: 38 } },
      didDrawCell: (cell) => {
        if (cell.section !== 'body' || cell.row.index >= MONTHLY_ITEMS.length || cell.column.index < 2 || cell.column.index > 4) return;
        const item = MONTHLY_ITEMS[cell.row.index];
        if (!item) return;
        const kind = (['ok', 'mangel', 'na'] as const)[cell.column.index - 2];
        const rating = walk.ratings[item.id];
        if (rating === kind) vectorMark(doc, kind, cell.cell.x + cell.cell.width / 2, cell.cell.y + cell.cell.height / 2, 2.7);
      },
    });
    y = lastY(doc) + 3;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`${MONTHLY_NOTICE}: nicht geprüft.`, MARGIN, y + 2);
    y += 5;
  }
  if (walk.note) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(doc.splitTextToSize(`Bemerkung: ${walk.note}`, contentWidth), MARGIN, Math.min(y + 2, height - PAGE_BOTTOM - 2));
  }

  // Page 2: defects and close block. The register may create continuation pages when needed.
  doc.addPage();
  y = PAGE_TOP;
  sectionTitle('3. Mängel und Massnahmen');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(doc.splitTextToSize(PRIORITY_NOTE, contentWidth), MARGIN, y + 1.4);
  y += 5;
  const photosFor = (defectId: string) => photos.filter((photo) => photo.defectId === defectId);
  const photoSize = { width: 37, height: 28 };
  const defectRows: RowInput[] = defects.length ? defects.map((defect) => [
    '',
    `${defect.description}${defect.hazard ? `\nGefahr: ${defect.hazard}` : ''}`,
    `${defect.immediateAction ? `Sofortmassnahme: ${defect.immediateAction}\n` : ''}${defect.action || ''}`,
    `${defect.responsible || '–'}\n${PRIORITY_KEY_TO_TEXT[defect.priority]}\n${formatDate(validDefectDue(walk.date, defect, settings))}`,
    '',
  ]) : [[{ content: 'Keine Mängel erfasst.', colSpan: 5, styles: { textColor: MUTED } }]];
  autoTable(doc, {
    ...common,
    startY: y,
    head: [['Nr. / Pkt. / Bereich', 'Beschreibung / Gefahr', 'Sofortmassnahme / Massnahme', 'Verantwortlich / Frist / Prio', 'Foto']],
    body: defectRows,
    rowPageBreak: 'avoid',
    styles: { ...common.styles, valign: 'top', fontSize: 6.8, minCellHeight: photoSize.height + 3 },
    headStyles: { ...common.headStyles, fontSize: 6.4 },
    columnStyles: { 0: { cellWidth: 29 }, 1: { cellWidth: 51 }, 2: { cellWidth: 47 }, 3: { cellWidth: 37 }, 4: { cellWidth: contentWidth - 164, halign: 'center' } },
    didDrawCell: (cell) => {
      if (cell.section !== 'body' || defects.length === 0) return;
      const defect = defects[cell.row.index];
      if (!defect) return;
      if (cell.column.index === 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...INK);
        doc.text(String(defect.nr), cell.cell.x + 1.5, cell.cell.y + 4.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.8);
        doc.setTextColor(...MUTED);
        doc.text(`Mangel-ID: ${defect.mangelId}`, cell.cell.x + 1.5, cell.cell.y + 8);
        doc.text(`Pkt.: ${defect.itemId}`, cell.cell.x + 1.5, cell.cell.y + 12);
        const area = areaLabel(defect.area, settings.areas);
        doc.text(doc.splitTextToSize(`Bereich: ${area}`, cell.cell.width - 3), cell.cell.x + 1.5, cell.cell.y + 16);
      }
      if (cell.column.index === 4) {
        const firstPhoto = photosFor(defect.id)[0];
        const url = firstPhoto && photoData.get(firstPhoto.id);
        if (firstPhoto && url) {
          const scale = Math.min(photoSize.width / firstPhoto.width, photoSize.height / firstPhoto.height);
          const imageWidth = firstPhoto.width * scale;
          const imageHeight = firstPhoto.height * scale;
          doc.addImage(url, 'JPEG', cell.cell.x + (cell.cell.width - imageWidth) / 2, cell.cell.y + 1, imageWidth, imageHeight, undefined, 'FAST');
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          doc.setTextColor(...MUTED);
          doc.text('kein Foto', cell.cell.x + cell.cell.width / 2, cell.cell.y + cell.cell.height / 2, { align: 'center' });
        }
      }
    },
  });
  y = lastY(doc) + 4;

  for (const defect of defects) {
    const additional = photosFor(defect.id).slice(1);
    for (const [index, photo] of additional.entries()) {
      const imageW = Math.min(contentWidth / 2 - 4, 70);
      const scale = Math.min(imageW / photo.width, 50 / photo.height);
      const imageWidth = photo.width * scale;
      const imageHeight = photo.height * scale;
      if (y + imageHeight + 12 > height - PAGE_BOTTOM) {
        doc.addPage();
        y = PAGE_TOP;
      }
      if (index === 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...INK);
        doc.text(`Weitere Fotos zu ${defect.mangelId}`, MARGIN, y + 2);
        y += 5;
      }
      const url = photoData.get(photo.id);
      if (url) doc.addImage(url, 'JPEG', MARGIN, y, imageWidth, imageHeight, undefined, 'FAST');
      y += imageHeight + 3;
    }
  }

  if (y + 55 > height - PAGE_BOTTOM) {
    doc.addPage();
    y = PAGE_TOP;
  }
  y += 2;
  sectionTitle('4. Abschluss');
  const resultKeys = Object.keys(RESULT_LABELS) as ResultKey[];
  autoTable(doc, {
    ...common,
    startY: y,
    body: [resultKeys.map((key) => `     ${RESULT_LABELS[key]}`)],
    styles: { ...common.styles, fontSize: 7, fontStyle: 'bold', minCellHeight: 8 },
    didDrawCell: (cell) => {
      const key = resultKeys[cell.column.index];
      if (key) checkbox(doc, cell.cell.x + 1.5, cell.cell.y + (cell.cell.height - 3) / 2, walk.result === key, GREEN);
    },
  });
  y = lastY(doc) + 3;
  autoTable(doc, {
    ...common,
    startY: y,
    body: [['', '']],
    styles: { ...common.styles, minCellHeight: 29, valign: 'top' },
    didDrawCell: (cell: CellHookData) => {
      const signature = cell.column.index === 0 ? walk.signature : walk.acknowledgement;
      const x = cell.cell.x + 2;
      const top = cell.cell.y;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...INK);
      doc.text(cell.column.index === 0 ? 'Durchführende/r' : 'Kenntnisnahme (optional)', x, top + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(`Name: ${signature.name || ''}`, x, top + 9);
      doc.text(`Datum: ${signature.date ? formatDate(signature.date) : ''}`, x, top + 14);
      doc.text('Unterschrift:', x, top + 20);
      doc.setDrawColor(...LINE);
      doc.line(x + 17, top + 20, cell.cell.x + cell.cell.width - 3, top + 20);
      if (signature.image) doc.addImage(signature.image, 'PNG', x + 20, top + 10, 35, 10);
    },
  });

  // Repeat document-control header, logo, separate walk ID and page footer on every page.
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) drawHeader(doc, walk, page, pageCount, fileBaseName);
  return doc;
}
