/**
 * PDF-Bericht gemäss SOP 5 (FR-050, FR-051, FR-053).
 * Layout nach dem QPS-Formular QPS_HSE_00064 (Word, Stand 29.09.2026): Kopfzeile mit Dokumenten-ID,
 * Titel, Version, Gültig ab und QPS-Logo, Kapitel 1 bis 5, Fusszeile "Seite x von y".
 * Farben und Füllungen sind direkt aus der Vorlage übernommen.
 * Zeichen ausserhalb WinAnsi (✓ ✗ ☐ →) werden als Vektorgrafik gezeichnet, weil Helvetica sie nicht enthält.
 */
import { jsPDF } from 'jspdf';
import { autoTable, type CellHookData, type RowInput } from 'jspdf-autotable';
import { QPS_LOGO_PNG, QPS_LOGO_RATIO } from '../assets/qpsLogo';
import {
  APPROVAL,
  AREAS,
  CHANGE_LOG,
  LEGAL_BASES,
  LEGAL_FOOTNOTE,
  MONTHLY_ITEMS,
  MONTHLY_TITLE,
  NOT_IN_WALK_TEXT,
  PRIO,
  PROCEDURE_TEXT,
  RESULT_LABELS,
  SOP_META,
  TYPE_FORM_LABELS,
  WEEKLY_ITEMS,
  WEEKLY_TITLE,
  areaLabel,
} from '../data/checklist';
import { formatDate } from './dates';
import { blobToDataUrl } from './image';
import type { Defect, Photo, Prio, Rating, ResultKey, Walk } from './types';
import { cellKey, defectCounts, defectsForCell, openPointLabel } from './walk';

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];

// Farben der Vorlage
const C = {
  ink: hex('000000'),
  title: hex('215E99'),
  heading: hex('0F4761'),
  docId: hex('2503F3'),
  muted: hex('595959'),
  grey: hex('8C8C8C'),
  green: hex('375623'),
  orange: hex('C55A11'),
  red: hex('C00000'),
  amber: hex('7F6000'),
  line: hex('808080'),
  fillLabel: hex('F2F2F2'),
  fillHead: hex('D9D9D9'),
  fillOkHead: hex('E2EFDA'),
  fillNokHead: hex('FBE3E3'),
  fillNok: hex('FDF4F4'),
  fillMinor: hex('FFF2CC'),
  fillOpen: hex('FCE4D6'),
};

// Seitenränder der Vorlage (2.5 cm links/rechts)
const ML = 25;
const MR = 25;
const TOP = 30; // Inhalt beginnt unter der Kopfzeile
const BOTTOM = 22;

const RESULT_STYLE: Record<ResultKey, { fill: RGB; text: RGB }> = {
  none: { fill: C.fillOkHead, text: C.green },
  minor: { fill: C.fillMinor, text: C.amber },
  open: { fill: C.fillOpen, text: C.orange },
  critical: { fill: C.fillNokHead, text: C.red },
};
const PRIO_COLOR: Record<Prio, RGB> = { K: C.red, H: C.orange, M: C.amber, N: C.ink };

/** Spaltenköpfe der Matrix 2.1 (Umbruch wie im Formular) */
const AREA_HEADS: Record<string, string> = { gaenge: 'Gänge /\nTreppen', 'xtec-werkstatt': 'xTec\nWerkstatt' };

export interface PdfInput {
  walk: Walk;
  defects: Defect[];
  photos: Photo[];
  openFromPrevious: { defect: Defect; walk?: Walk }[];
  fileBaseName: string;
}

const lastY = (doc: jsPDF): number =>
  (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? TOP;

/** Kästchen wie ☐ / ☒ der Vorlage */
function checkbox(doc: jsPDF, x: number, y: number, checked: boolean, color: RGB = C.ink, s = 2.8) {
  doc.setDrawColor(...C.ink);
  doc.setLineWidth(0.2);
  doc.rect(x, y, s, s);
  if (checked) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.45);
    doc.line(x + 0.55, y + 0.55, x + s - 0.55, y + s - 0.55);
    doc.line(x + s - 0.55, y + 0.55, x + 0.55, y + s - 0.55);
    doc.setLineWidth(0.2);
  }
}

type Sym = 'check' | 'cross' | 'dash';
const SYM_COLOR: Record<Sym, RGB> = { check: C.green, cross: C.red, dash: C.grey };
const RATING_SYM: Record<Rating, Sym> = { ok: 'check', mangel: 'cross', na: 'dash' };

/** ✓ / ✗ / – als Vektorgrafik, (cx, cy) = Mitte, s = Kantenlänge */
function symbol(doc: jsPDF, kind: Sym, cx: number, cy: number, s = 2.6) {
  const h = s / 2;
  doc.setDrawColor(...SYM_COLOR[kind]);
  doc.setLineCap('round');
  doc.setLineJoin('round');
  if (kind === 'check') {
    doc.setLineWidth(0.5);
    doc.lines(
      [
        [h * 0.75, h * 0.75],
        [h * 1.15, -h * 1.6],
      ],
      cx - h * 0.95,
      cy + h * 0.1,
    );
  } else if (kind === 'cross') {
    doc.setLineWidth(0.5);
    doc.line(cx - h * 0.8, cy - h * 0.8, cx + h * 0.8, cy + h * 0.8);
    doc.line(cx + h * 0.8, cy - h * 0.8, cx - h * 0.8, cy + h * 0.8);
  } else {
    doc.setLineWidth(0.4);
    doc.line(cx - h * 0.7, cy, cx + h * 0.7, cy);
  }
  doc.setLineCap('butt');
  doc.setLineJoin('miter');
  doc.setLineWidth(0.2);
}

/** Textstück für Fliesstext mit Farben, Schnitt und gezeichneten Symbolen */
type Seg = { t: string; color?: RGB; style?: 'normal' | 'bold' | 'italic' } | { sym: Sym };

/**
 * Fliesstext mit Zeilenumbruch an Wortgrenzen. Gibt die Anzahl Zeilen zurück.
 * Mit draw = false wird nur gemessen.
 */
function richText(doc: jsPDF, segs: Seg[], x0: number, y0: number, maxW: number, size: number, lineH: number, draw = true): number {
  doc.setFontSize(size);
  let x = x0;
  let line = 0;
  const symW = size * 0.3;
  for (const sg of segs) {
    if ('sym' in sg) {
      if (x + symW > x0 + maxW && x > x0) {
        line++;
        x = x0;
      }
      if (draw) symbol(doc, sg.sym, x + symW / 2, y0 + line * lineH - size * 0.12, symW * 0.85);
      x += symW;
      continue;
    }
    doc.setFont('helvetica', sg.style ?? 'normal');
    doc.setTextColor(...(sg.color ?? C.ink));
    for (const tok of sg.t.split(/(\s+)/)) {
      if (!tok) continue;
      const w = doc.getTextWidth(tok);
      const space = /^\s+$/.test(tok);
      if (!space && x + w > x0 + maxW && x > x0) {
        line++;
        x = x0;
      }
      if (space && x === x0) continue;
      if (draw) doc.text(tok, x, y0 + line * lineH);
      x += w;
    }
  }
  return line + 1;
}

function fitImage(w: number, h: number, maxW: number, maxH: number) {
  const k = Math.min(maxW / w, maxH / h);
  return { w: w * k, h: h * k };
}

export async function buildReportPdf(input: PdfInput): Promise<jsPDF> {
  const { walk, defects, photos, openFromPrevious, fileBaseName } = input;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const CW = W - ML - MR;
  doc.setProperties({
    title: fileBaseName,
    subject: `${SOP_META.docId} ${SOP_META.title}`,
    author: walk.inspector,
    creator: `${SOP_META.company}, HSE-Rundgang App`,
  });

  const tableBase = {
    margin: { left: ML, right: MR, top: TOP, bottom: BOTTOM },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 1.4,
      textColor: C.ink,
      lineColor: C.line,
      lineWidth: 0.2,
      valign: 'middle' as const,
    },
    headStyles: { fillColor: C.fillHead, textColor: C.ink, fontStyle: 'bold' as const },
    theme: 'grid' as const,
  };
  const label = (content: string) => ({ content, styles: { fontStyle: 'bold' as const, fillColor: C.fillLabel } });

  let y = TOP + 2;
  const ensure = (need: number) => {
    if (y + need > H - BOTTOM) {
      doc.addPage();
      y = TOP + 2;
    }
  };
  const h1 = (text: string, need = 30) => {
    ensure(need);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(17);
    doc.setTextColor(...C.heading);
    doc.text(text, ML, y + 6);
    y += 10;
  };
  const h3 = (text: string, need = 18) => {
    ensure(need);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...C.heading);
    doc.text(text, ML, y + 4);
    y += 6;
  };

  // Titel wie Formular: "HSE Wöchentlicher Rundgang" + klein "Formular"
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(25);
  doc.setTextColor(...C.title);
  doc.text(SOP_META.title, ML, y + 8);
  const tw = doc.getTextWidth(SOP_META.title);
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text('Formular', ML + tw + 2.5, y + 8);
  y += 13;

  // ── 1. Rundgangdaten ────────────────────────────────────────────────
  h1('1. Rundgangdaten');
  const openText = [...(walk.openPointsSnapshot ?? openFromPrevious.map(openPointLabel)), walk.openPointsNote]
    .filter(Boolean)
    .join('\n');
  autoTable(doc, {
    ...tableBase,
    startY: y,
    body: [
      [label('Datum'), formatDate(walk.date), label('Kalenderwoche'), `KW ${walk.week} / ${walk.isoYear}`],
      [label('Durchgeführt von'), walk.inspector, label('Uhrzeit'), walk.time],
      [label('Begleitperson'), { content: walk.companion, colSpan: 3 }],
      [label('Rundgangsart'), { content: '', colSpan: 3, styles: { minCellHeight: 6.5 } }],
      [label('Offene Punkte\nVorwoche'), { content: openText || 'keine', colSpan: 3 }],
    ],
    columnStyles: { 0: { cellWidth: 29 }, 2: { cellWidth: 29 } },
    didDrawCell: (d: CellHookData) => {
      if (d.section !== 'body' || d.row.index !== 3 || d.column.index !== 1) return;
      const by = d.cell.y + d.cell.height / 2 - 1.4;
      let x = d.cell.x + 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.ink);
      for (const type of ['weekly', 'monthly'] as const) {
        const text = TYPE_FORM_LABELS[type];
        checkbox(doc, x, by, walk.type === type);
        doc.text(text, x + 4, by + 2.3);
        x += 4 + doc.getTextWidth(text) + 10;
      }
    },
  });
  y = lastY(doc) + 7;

  // ── 2. Checkliste ───────────────────────────────────────────────────
  h1('2. Checkliste');
  const legend: Seg[][] = [
    [
      { t: 'OK', color: C.green, style: 'bold' },
      { t: ' = in Ordnung   ' },
      { t: 'Mangel', color: C.red, style: 'bold' },
      { t: ' = in Kapitel 4 erfassen (Punkt + Bereich)   ' },
      { t: 'n.a.', color: C.muted, style: 'bold' },
      { t: ' = nicht vorhanden / nicht begangen' },
    ],
    [
      { t: 'Digital: Feld anklicken und Wert wählen · Ausgedruckt: ', color: C.muted, style: 'italic' },
      { sym: 'check' },
      { t: ' = OK, ', color: C.muted, style: 'italic' },
      { sym: 'cross' },
      { t: ' = Mangel, ', color: C.muted, style: 'italic' },
      { sym: 'dash' },
      { t: ' = n.a.', color: C.muted, style: 'italic' },
    ],
  ];
  const LEG_W = CW - 29 - 2.8;
  const legSizes = [7.5, 6.5];
  const legLines = legend.map((l, i) => richText(doc, l, 0, 0, LEG_W, legSizes[i], 3.2, false));
  autoTable(doc, {
    ...tableBase,
    startY: y,
    body: [[label('Bewertung'), { content: '', styles: { minCellHeight: (legLines[0] + legLines[1]) * 3.2 + 2.6 } }]],
    columnStyles: { 0: { cellWidth: 29 } },
    didDrawCell: (d: CellHookData) => {
      if (d.section !== 'body' || d.column.index !== 1) return;
      let ly = d.cell.y + 3.6;
      legend.forEach((segs, i) => {
        ly += (richText(doc, segs, d.cell.x + 1.4, ly, LEG_W, legSizes[i], 3.2) - 0) * 3.2;
      });
    },
  });
  y = lastY(doc) + 4;

  // 2.1 Matrix: Punkt x Bereich
  h3(WEEKLY_TITLE, 40);
  const AREA_W = 14.2;
  const matrixHead = ['Nr.', 'Kontrollpunkt', ...AREAS.map((a) => AREA_HEADS[a.id] ?? a.label)];
  const areaOfCol = (col: number) => AREAS[col - 2]?.id;
  const areaCols = Object.fromEntries(AREAS.map((_, i) => [i + 2, { cellWidth: AREA_W }]));
  autoTable(doc, {
    ...tableBase,
    startY: y,
    showHead: 'everyPage',
    styles: { ...tableBase.styles, cellPadding: 0.9, fontSize: 7.8 },
    head: [matrixHead],
    body: WEEKLY_ITEMS.map((it) => [it.id, it.text, ...AREAS.map(() => '')]),
    headStyles: { ...tableBase.headStyles, fontSize: 5.6, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 9, fontStyle: 'bold', fontSize: 7, halign: 'center' },
      ...areaCols,
    },
    didParseCell: (d: CellHookData) => {
      if (d.section === 'head') {
        if (d.column.index === 1) Object.assign(d.cell.styles, { halign: 'left', fontSize: 7.5 });
        if (d.column.index === 0) d.cell.styles.fontSize = 6.5;
        return;
      }
      const area = areaOfCol(d.column.index);
      if (area && walk.ratings[cellKey(WEEKLY_ITEMS[d.row.index].id, area)] === 'mangel') d.cell.styles.fillColor = C.fillNok;
    },
    didDrawCell: (d: CellHookData) => {
      if (d.section !== 'body') return;
      const area = areaOfCol(d.column.index);
      if (!area) return;
      const key = cellKey(WEEKLY_ITEMS[d.row.index].id, area);
      const r = walk.ratings[key];
      const cx = d.cell.x + d.cell.width / 2;
      const cy = d.cell.y + d.cell.height / 2;
      if (!r) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...C.grey);
        doc.text('…', cx, cy + 0.6, { align: 'center' });
        return;
      }
      const nrs = r === 'mangel' ? defectsForCell(key, defects).map((x) => x.nr) : [];
      const sx = nrs.length ? cx - 2 : cx;
      symbol(doc, RATING_SYM[r], sx, cy, 2.6);
      if (nrs.length) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(...C.red);
        doc.text(nrs.join(','), sx + 2.1, cy + 1);
      }
    },
  });
  y = lastY(doc) + 5;

  // 2.2 Monatlich
  if (walk.type === 'monthly') {
    h3(MONTHLY_TITLE, 60);
    const ratingCols = { 2: 'ok', 3: 'mangel', 4: 'na' } as const;
    const areasText = (itemId: string) =>
      defectsForCell(itemId, defects)
        .map((x) => `${areaLabel(x.area)} (Nr. ${x.nr})`)
        .join('\n');
    autoTable(doc, {
      ...tableBase,
      startY: y,
      showHead: 'everyPage',
      styles: { ...tableBase.styles, cellPadding: 0.9, fontSize: 7.8 },
      head: [['Nr.', 'Kontrollpunkt', 'OK', 'Mangel', 'n.a.', 'Bereich']],
      body: MONTHLY_ITEMS.map((it) => [it.id, it.text, '', '', '', areasText(it.id)]),
      headStyles: { ...tableBase.headStyles, fontSize: 6.5, halign: 'center' },
      columnStyles: {
        0: { cellWidth: 9, fontStyle: 'bold', fontSize: 7, halign: 'center' },
        2: { cellWidth: 10 },
        3: { cellWidth: 11.5 },
        4: { cellWidth: 10 },
        5: { cellWidth: 40, fontSize: 6.5 },
      },
      didParseCell: (d: CellHookData) => {
        if (d.section !== 'head') return;
        const i = d.column.index;
        if (i === 1) Object.assign(d.cell.styles, { halign: 'left', fontSize: 7.5 });
        if (i === 2) Object.assign(d.cell.styles, { fillColor: C.fillOkHead, textColor: C.green });
        if (i === 3) Object.assign(d.cell.styles, { fillColor: C.fillNokHead, textColor: C.red });
        if (i === 4) Object.assign(d.cell.styles, { fillColor: C.fillLabel, textColor: C.muted, fontStyle: 'normal' });
      },
      didDrawCell: (d: CellHookData) => {
        if (d.section !== 'body' || !(d.column.index in ratingCols)) return;
        const key = ratingCols[d.column.index as 2 | 3 | 4];
        const color = key === 'ok' ? C.green : key === 'mangel' ? C.red : C.muted;
        const id = MONTHLY_ITEMS[d.row.index].id;
        checkbox(doc, d.cell.x + d.cell.width / 2 - 1.4, d.cell.y + d.cell.height / 2 - 1.4, walk.ratings[id] === key, color);
      },
    });
    y = lastY(doc) + 7;
  } else {
    h3(MONTHLY_TITLE, 12);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.muted);
    doc.text(`Entfällt: ${TYPE_FORM_LABELS.weekly}.`, ML, y + 1.5);
    y += 9;
  }

  // ── 3. Ergebnis und Abschluss ───────────────────────────────────────
  h1('3. Ergebnis und Abschluss', 66); // Kapitel 3 nicht trennen (Zähler, Ergebnis, Unterschriften)
  const dc = defectCounts(defects);
  autoTable(doc, {
    ...tableBase,
    startY: y,
    body: [
      [
        label('Anzahl Mängel'),
        { content: String(dc.total), styles: { halign: 'center' } },
        { content: 'davon kritisch (K)', styles: { fontStyle: 'bold', fillColor: C.fillLabel, textColor: C.red } },
        { content: String(dc.critical), styles: { halign: 'center', textColor: dc.critical ? C.red : C.ink, fontStyle: dc.critical ? 'bold' : 'normal' } },
      ],
    ],
  });
  y = lastY(doc) + 3;
  const resultKeys = Object.keys(RESULT_LABELS) as ResultKey[];
  autoTable(doc, {
    ...tableBase,
    startY: y,
    body: [resultKeys.map((k) => `       ${RESULT_LABELS[k]}`)],
    styles: { ...tableBase.styles, fontSize: 7.5, fontStyle: 'bold', minCellHeight: 6.5 },
    didParseCell: (d: CellHookData) => {
      const st = RESULT_STYLE[resultKeys[d.column.index]];
      Object.assign(d.cell.styles, { fillColor: st.fill, textColor: st.text });
    },
    didDrawCell: (d: CellHookData) => {
      const k = resultKeys[d.column.index];
      checkbox(doc, d.cell.x + 1.6, d.cell.y + d.cell.height / 2 - 1.4, walk.result === k, RESULT_STYLE[k].text);
    },
  });
  y = lastY(doc) + 3;
  autoTable(doc, {
    ...tableBase,
    startY: y,
    body: [['', '']],
    styles: { ...tableBase.styles, minCellHeight: 26, valign: 'top' },
    didDrawCell: (d: CellHookData) => {
      const s = d.column.index === 0 ? walk.signature : walk.acknowledgement;
      const x = d.cell.x + 2;
      const top = d.cell.y;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.ink);
      doc.text(d.column.index === 0 ? 'Durchführende/r' : 'Kenntnisnahme (optional)', x, top + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.muted);
      doc.text(`Name: `, x, top + 9.5);
      doc.text(`Datum: `, x + d.cell.width / 2, top + 9.5);
      doc.setTextColor(...C.ink);
      doc.text(s.name || '', x + 10, top + 9.5);
      doc.text(s.date ? formatDate(s.date) : '', x + d.cell.width / 2 + 11, top + 9.5);
      doc.setFontSize(7);
      doc.setTextColor(...C.muted);
      doc.text('Unterschrift:', x, top + 23.5);
      doc.setDrawColor(...C.line);
      doc.line(x + 15, top + 23.8, d.cell.x + d.cell.width - 3, top + 23.8);
      if (s.image) doc.addImage(s.image, 'PNG', x + 18, top + 11.5, 40, 12);
    },
  });
  y = lastY(doc) + 7;

  // ── 4. Mängel und Massnahmen ────────────────────────────────────────
  const photosOf = (id: string) => photos.filter((p) => p.defectId === id);
  const photoUrls = new Map<string, string>();
  for (const p of photos) photoUrls.set(p.id, await blobToDataUrl(p.blob));

  ensure(60);
  h1('4. Mängel und Massnahmen');
  const prioSegs: Seg[] = [
    { t: 'Prio: ', style: 'bold' },
    { t: 'K', color: C.red, style: 'bold' },
    { t: ' sofort · ' },
    { t: 'H', color: C.orange, style: 'bold' },
    { t: ' 48 Std. · ' },
    { t: 'M', color: C.amber, style: 'bold' },
    { t: ' 1 Woche · ' },
    { t: 'N', style: 'bold' },
    { t: ' 1 Monat (Richtwerte) · weitere Mängel: Zeile kopieren · Nachkontrolle im Excel-Register' },
  ];
  y += 3.2 * richText(doc, prioSegs, ML, y, CW, 7, 3.2) - 0.5;

  const PHOTO_W = 44;
  const PHOTO_H = 31;
  const defectBody: RowInput[] = defects.length
    ? defects.map((d) => {
        const extra = photosOf(d.id).length - 1;
        const status =
          d.status === 'done' ? `\nStatus: erledigt ${formatDate(d.doneAt)}${d.doneNote ? `, ${d.doneNote}` : ''}` : '\nStatus: offen';
        return [
          '',
          d.hazard || '–',
          `${d.action || '–'}${status}`,
          `${d.responsible || '–'}\n${formatDate(d.due)}\n`,
          extra > 0 ? `\n\n\n\n\n\n\n+${extra} weitere(s) Foto(s) im Anhang` : '',
        ];
      })
    : [[{ content: 'Keine Mängel erfasst.', colSpan: 5, styles: { textColor: C.muted } }]];
  autoTable(doc, {
    ...tableBase,
    startY: y,
    showHead: 'everyPage',
    head: [['Nr. / Pkt. / Bereich', 'Mangel / Gefahr', 'Massnahme', 'Verantw. / Frist / Prio', 'Foto']],
    headStyles: { ...tableBase.headStyles, fontSize: 7.5, halign: 'center' },
    body: defectBody,
    rowPageBreak: 'avoid',
    styles: { ...tableBase.styles, valign: 'top', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 21 },
      1: { cellWidth: (CW - 21 - 26 - PHOTO_W - 3) / 2 },
      2: { cellWidth: (CW - 21 - 26 - PHOTO_W - 3) / 2 },
      3: { cellWidth: 26, fontSize: 7.5 },
      4: { cellWidth: PHOTO_W + 3, fontSize: 6, textColor: C.muted, halign: 'center' },
    },
    didParseCell: (d: CellHookData) => {
      if (d.section === 'body' && defects.length) d.cell.styles.minCellHeight = PHOTO_H + 3;
      if (d.section === 'head' && (d.column.index === 0 || d.column.index === 3)) d.cell.styles.fontSize = 6;
    },
    didDrawCell: (d: CellHookData) => {
      if (d.section !== 'body' || !defects.length) return;
      const def = defects[d.row.index];
      if (!def) return;
      const x = d.cell.x;
      const top = d.cell.y;
      if (d.column.index === 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...C.ink);
        doc.text(String(def.nr), x + 1.5, top + 5.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...C.muted);
        doc.text('Pkt.', x + 1.5, top + 10);
        doc.text('Bereich', x + 1.5, top + 17.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.ink);
        doc.setFontSize(8);
        doc.text(def.itemId, x + 1.5, top + 13.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(doc.splitTextToSize(areaLabel(def.area), d.cell.width - 2.5), x + 1.5, top + 21);
      }
      if (d.column.index === 3) {
        let bx = x + 1.4;
        const by = top + 12;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        for (const p of Object.keys(PRIO) as Prio[]) {
          checkbox(doc, bx, by, def.prio === p, PRIO_COLOR[p], 2.5);
          doc.setTextColor(...PRIO_COLOR[p]);
          doc.text(p, bx + 2.9, by + 2.1);
          bx += 6;
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(...C.muted);
        doc.text(PRIO[def.prio].hint, x + 1.4, by + 5.6);
      }
      if (d.column.index === 4) {
        const first = photosOf(def.id)[0];
        const url = first && photoUrls.get(first.id);
        if (first && url) {
          const f = fitImage(first.width, first.height, PHOTO_W, PHOTO_H);
          doc.addImage(url, 'JPEG', x + (d.cell.width - f.w) / 2, top + 1.5, f.w, f.h, undefined, 'FAST');
        } else {
          doc.setFontSize(6.5);
          doc.setTextColor(...C.muted);
          doc.text('kein Foto', x + d.cell.width / 2, top + PHOTO_H / 2 + 2, { align: 'center' });
        }
      }
    },
  });
  y = lastY(doc) + 6;

  // Weitere Fotos (ab dem zweiten Foto je Mangel)
  const colW = (CW - 6) / 2;
  for (const d of defects) {
    const ps = photosOf(d.id).slice(1);
    if (!ps.length) continue;
    ensure(50);
    h3(`Weitere Fotos zu Mangel Nr. ${d.nr} (${d.itemId} / ${areaLabel(d.area)})`);
    let col = 0;
    let rowH = 0;
    for (const p of ps) {
      const f = fitImage(p.width, p.height, colW, 80);
      if (y + f.h > H - BOTTOM) {
        doc.addPage();
        y = TOP + 2;
        col = 0;
        rowH = 0;
      }
      const url = photoUrls.get(p.id);
      if (url) doc.addImage(url, 'JPEG', ML + col * (colW + 6), y, f.w, f.h, undefined, 'FAST');
      rowH = Math.max(rowH, f.h);
      if (++col === 2) {
        col = 0;
        y += rowH + 4;
        rowH = 0;
      }
    }
    if (col !== 0) y += rowH + 4;
    y += 2;
  }

  // ── 5. Hinweise und Dokumentenlenkung ───────────────────────────────
  ensure(150);
  h1('5. Hinweise und Dokumentenlenkung');
  autoTable(doc, {
    ...tableBase,
    startY: y,
    styles: { ...tableBase.styles, fontSize: 7.5, valign: 'top' },
    body: [
      [label('Ablauf'), PROCEDURE_TEXT.join('\n')],
      [label('Nicht im Rundgang'), NOT_IN_WALK_TEXT],
    ],
    columnStyles: { 0: { cellWidth: 29 } },
  });
  y = lastY(doc) + 4;
  h3('Grundlagen je Kontrollpunkt', 50);
  autoTable(doc, {
    ...tableBase,
    startY: y,
    styles: { ...tableBase.styles, fontSize: 6.5, cellPadding: 1.1 },
    body: LEGAL_BASES.map((l) => [l.points, l.text]),
    columnStyles: { 0: { cellWidth: 29, fontStyle: 'bold', fillColor: C.fillLabel } },
  });
  y = lastY(doc) + 1;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.muted);
  const foot = doc.splitTextToSize(LEGAL_FOOTNOTE, CW);
  doc.text(foot, ML, y + 2.6);
  y += foot.length * 2.8 + 4;

  const lined = {
    ...tableBase,
    theme: 'plain' as const,
    styles: { ...tableBase.styles, fontSize: 9, lineWidth: 0 },
    headStyles: { fillColor: C.fillHead, textColor: C.ink, fontStyle: 'bold' as const },
    didDrawCell: (d: CellHookData) => {
      doc.setDrawColor(...C.ink);
      doc.setLineWidth(d.section === 'head' ? 0.6 : 0.3);
      doc.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height);
      if (d.section === 'head' && d.row.index === 0) doc.line(d.cell.x, d.cell.y, d.cell.x + d.cell.width, d.cell.y);
      if (d.column.index > 0) {
        doc.setLineWidth(0.2);
        doc.line(d.cell.x, d.cell.y, d.cell.x, d.cell.y + d.cell.height);
      }
    },
  };
  h3('Genehmigung', 30);
  autoTable(doc, {
    ...lined,
    startY: y,
    head: [['Name', 'Position', 'Unterschrift/Datum']],
    headStyles: { ...lined.headStyles, halign: 'center' },
    body: [...APPROVAL.map((a) => [a.name, a.position, '']), ['', '', '']],
  });
  y = lastY(doc) + 5;
  h3('Änderungsverzeichnis', 20);
  autoTable(doc, {
    ...lined,
    startY: y,
    head: [['Versionsnummer', 'Beschreibung']],
    body: CHANGE_LOG.map((c) => [c.version, c.description]),
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 37 } },
  });

  // ── Kopf- und Fusszeile auf jeder Seite (wie Vorlage) ───────────────
  const pages = doc.getNumberOfPages();
  const logoW = 28.3;
  const logoH = logoW * QPS_LOGO_RATIO;
  const footLeft = `${fileBaseName} · ${walk.status === 'closed' ? 'abgeschlossen' : 'Entwurf'}`;
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const hy = 12.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.ink);
    doc.text('Dokumenten ID: ', ML, hy);
    doc.setTextColor(...C.docId);
    doc.text(SOP_META.docId, ML + doc.getTextWidth('Dokumenten ID: '), hy);
    doc.setTextColor(...C.ink);
    doc.text(`Dokumententitel: ${SOP_META.title}`, ML, hy + 3.8);
    const vx = ML + 72;
    doc.text(`Version: ${SOP_META.version}`, vx, hy);
    doc.text(`Gültig ab: ${formatDate(SOP_META.validFrom)}`, vx, hy + 3.8);
    doc.addImage(QPS_LOGO_PNG, 'PNG', W - MR - logoW + 4, 6, logoW, logoH);

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...C.ink);
    const parts: [string, 'normal' | 'bold'][] = [
      ['Seite ', 'normal'],
      [String(i), 'bold'],
      [' von ', 'normal'],
      [String(pages), 'bold'],
    ];
    let total = 0;
    for (const [t, st] of parts) {
      doc.setFont('times', st);
      total += doc.getTextWidth(t);
    }
    let fx = W / 2 - total / 2;
    for (const [t, st] of parts) {
      doc.setFont('times', st);
      doc.text(t, fx, H - 10);
      fx += doc.getTextWidth(t);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    doc.text(footLeft, ML, H - 10);
  }
  return doc;
}
