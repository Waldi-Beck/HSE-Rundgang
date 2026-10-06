/**
 * PDF-Bericht gemäss SOP 5 (FR-050, FR-051, FR-053).
 * Layout nach der QPS-Vorlage QPS_HSE_00064 (Word): Kopfzeile mit Dokumenten-ID,
 * Titel, Version, Gültig ab und QPS-Logo, Kapitel 1 bis 5, Fusszeile "Seite x von y".
 * Farben und Füllungen sind direkt aus der Vorlage übernommen.
 */
import { jsPDF } from 'jspdf';
import { autoTable, type CellHookData, type RowInput } from 'jspdf-autotable';
import { QPS_LOGO_PNG, QPS_LOGO_RATIO } from '../assets/qpsLogo';
import { PRIO, RESULT_LABELS, SOP_META } from '../data/checklist';
import { formatDate, weekLabel } from './dates';
import { blobToDataUrl } from './image';
import type { Defect, Photo, Prio, ResultKey, Walk } from './types';
import { countRatings, openPointLabel, visibleSections } from './walk';

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];

// Farben der Vorlage
const C = {
  ink: hex('000000'),
  title: hex('215E99'),
  heading: hex('0F4761'),
  docId: hex('2503F3'),
  muted: hex('595959'),
  green: hex('375623'),
  orange: hex('C55A11'),
  red: hex('C00000'),
  amber: hex('7F6000'),
  line: hex('808080'),
  fillLabel: hex('F2F2F2'),
  fillHead: hex('D9D9D9'),
  fillSection: hex('DEEAF6'),
  fillOkHead: hex('E2EFDA'),
  fillNokHead: hex('FBE3E3'),
  fillOk: hex('F3F9F0'),
  fillNok: hex('FDF4F4'),
  fillNa: hex('F8F8F8'),
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

/** Wortlaut der Referenzen aus Kapitel 5 der Vorlage */
const SOP_REFERENCES_TEXT =
  'VUV · ArGV 3 · ArGV 4 · MaschV · NIV · ChemV · VVEA/VVA · VKF-Brandschutzvorschriften · EKAS 6508 · intern: SOP_0016, HSE-Konzept xTec – massgebend sind die gültigen Fassungen (fedlex.admin.ch); ersetzt keine Rechtsberatung.';

/** Rubrikentitel wie in der SOP (App nutzt Doppelpunkt, Vorlage Gedankenstrich). */
const sopTitle = (t: string) => t.replace(': ', ' – ');

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
  const h1 = (text: string) => {
    ensure(30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(17);
    doc.setTextColor(...C.heading);
    doc.text(text, ML, y + 6);
    y += 10;
  };
  const h3 = (text: string) => {
    ensure(18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C.heading);
    doc.text(text, ML, y + 4);
    y += 6.5;
  };

  // Titel
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(25);
  doc.setTextColor(...C.title);
  doc.text('HSE Rundgang', ML, y + 8);
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text(
    `${weekLabel(walk.isoYear, walk.week)}  ·  Status: ${walk.status === 'closed' ? 'abgeschlossen' : 'Entwurf'}`,
    W - MR,
    y + 8,
    { align: 'right' },
  );
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
      [label('Begleitperson'), walk.companion, label('Bereich'), walk.area],
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
      for (const [type, text] of [
        ['weekly', 'Wochenrundgang (A, C, F, G)'],
        ['monthly', 'Monatsrundgang (A–G + M)'],
      ] as const) {
        checkbox(doc, x, by, walk.type === type);
        doc.text(text, x + 4, by + 2.3);
        x += 4 + doc.getTextWidth(text) + 8;
      }
    },
  });
  y = lastY(doc) + 7;

  // ── 2. Checkliste ───────────────────────────────────────────────────
  h1('2. Checkliste');
  type Seg = [string, RGB, boolean] | 'arrow';
  const drawSegs = (segs: Seg[], x: number, by: number) => {
    doc.setFontSize(7.5);
    for (const sg of segs) {
      if (sg === 'arrow') {
        doc.setDrawColor(...C.ink);
        doc.setLineWidth(0.25);
        doc.line(x + 0.4, by - 0.9, x + 3, by - 0.9);
        doc.line(x + 2.2, by - 1.7, x + 3, by - 0.9);
        doc.line(x + 2.2, by - 0.1, x + 3, by - 0.9);
        x += 3.6;
        continue;
      }
      const [t, col, bold] = sg;
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setTextColor(...col);
      doc.text(t, x, by);
      x += doc.getTextWidth(t);
    }
  };
  const legend: Seg[][][] = [
    [
      [
        ['OK', C.green, true],
        [' = in Ordnung   ', C.ink, false],
        ['Nicht OK', C.red, true],
        [' = Mangel ', C.ink, false],
        'arrow',
        [' Kapitel 4 (Mangel-Nr. eintragen)   ', C.ink, false],
      ],
      [
        ['N/A', C.muted, true],
        [' = nicht geprüft / nicht vorhanden', C.ink, false],
      ],
    ],
    [
      [
        ['wöchentlich', C.green, true],
        [': A, C, F, G   ', C.ink, false],
        ['monatlich', C.orange, true],
        [' (erster Rundgang im Monat): zusätzlich B, D, E und M', C.ink, false],
      ],
    ],
  ];
  autoTable(doc, {
    ...tableBase,
    startY: y,
    styles: { ...tableBase.styles, fontSize: 7.5 },
    body: [
      [label('Bewertung'), { content: '', styles: { minCellHeight: 8 } }],
      [label('Rhythmus'), { content: '', styles: { minCellHeight: 5 } }],
    ],
    columnStyles: { 0: { cellWidth: 29 } },
    didDrawCell: (d: CellHookData) => {
      if (d.section !== 'body' || d.column.index !== 1) return;
      const lines = legend[d.row.index];
      lines.forEach((segs, i) => drawSegs(segs, d.cell.x + 1.4, d.cell.y + 3.6 + i * 3.4));
    },
  });
  y = lastY(doc) + 5;

  const defectNrs = (itemId: string) =>
    defects
      .filter((d) => d.itemId === itemId)
      .map((d) => d.nr)
      .join(', ');
  type RowMeta = { kind: 'section'; title: string; rhythm: 'weekly' | 'monthly'; legal: string } | { kind: 'item'; id: string } | { kind: 'free' };
  const meta: RowMeta[] = [];
  const body: RowInput[] = [];
  for (const s of visibleSections(walk.type)) {
    meta.push({ kind: 'section', title: `${s.id}   ${sopTitle(s.title)}`, rhythm: s.rhythm, legal: s.legal.join(' · ') });
    body.push([{ content: '', colSpan: 6, styles: { fillColor: C.fillSection, minCellHeight: 5.2 } }]);
    for (const it of s.items) {
      if (it.freeText) {
        meta.push({ kind: 'free' });
        body.push([it.id, { content: walk.observations || '–', colSpan: 5 }]);
        continue;
      }
      meta.push({ kind: 'item', id: it.id });
      body.push([it.id, it.text, '', '', '', defectNrs(it.id)]);
    }
  }
  const ratingCols = { 2: 'ok', 3: 'nok', 4: 'na' } as const;
  autoTable(doc, {
    ...tableBase,
    startY: y,
    showHead: 'everyPage',
    styles: { ...tableBase.styles, cellPadding: 0.9 },
    head: [['Nr.', 'Kontrollpunkt', 'OK', 'Nicht\nOK', 'N/A', 'Mangel-Nr.']],
    body,
    headStyles: { ...tableBase.headStyles, fontSize: 7.5, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 10, fontStyle: 'bold', fontSize: 7, halign: 'center' },
      1: { fontSize: 8.5 },
      2: { cellWidth: 12, fillColor: C.fillOk },
      3: { cellWidth: 12, fillColor: C.fillNok },
      4: { cellWidth: 12, fillColor: C.fillNa },
      5: { cellWidth: 17, halign: 'center', fontStyle: 'bold', textColor: C.red },
    },
    didParseCell: (d: CellHookData) => {
      if (d.section === 'head') {
        const i = d.column.index;
        if (i === 1) d.cell.styles.halign = 'left';
        if (i === 2) Object.assign(d.cell.styles, { fillColor: C.fillOkHead, textColor: C.green });
        if (i === 3) Object.assign(d.cell.styles, { fillColor: C.fillNokHead, textColor: C.red, fontSize: 6.5 });
        if (i === 4) Object.assign(d.cell.styles, { fillColor: C.fillLabel, textColor: C.muted });
        if (i === 5) d.cell.styles.fontSize = 6.5;
        return;
      }
      const m = meta[d.row.index];
      if (m?.kind === 'free' && d.column.index === 1 && !walk.observations) d.cell.styles.textColor = C.muted;
    },
    didDrawCell: (d: CellHookData) => {
      if (d.section !== 'body') return;
      const m = meta[d.row.index];
      if (!m) return;
      if (m.kind === 'section' && d.column.index === 0) {
        const cy = d.cell.y + d.cell.height / 2 + 1.1;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...C.heading);
        doc.text(m.title, d.cell.x + 2, cy);
        const tw = doc.getTextWidth(m.title);
        doc.setFontSize(6.5);
        doc.setTextColor(...(m.rhythm === 'weekly' ? C.green : C.orange));
        doc.text(`· ${m.rhythm === 'weekly' ? 'wöchentlich' : 'monatlich'}`, d.cell.x + 2 + tw + 2.5, cy);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(...C.muted);
        if (m.legal) doc.text(m.legal, d.cell.x + d.cell.width - 1.5, cy, { align: 'right' });
        return;
      }
      if (m.kind === 'item' && d.column.index in ratingCols) {
        const key = ratingCols[d.column.index as 2 | 3 | 4];
        const color = key === 'ok' ? C.green : key === 'nok' ? C.red : C.muted;
        checkbox(doc, d.cell.x + d.cell.width / 2 - 1.4, d.cell.y + d.cell.height / 2 - 1.4, walk.ratings[m.id] === key, color);
      }
    },
  });
  y = lastY(doc) + 7;

  // ── 3. Ergebnis und Abschluss ───────────────────────────────────────
  h1('3. Ergebnis und Abschluss');
  const c = countRatings(walk);
  autoTable(doc, {
    ...tableBase,
    startY: y,
    body: [
      [
        label('Kontrolliert'),
        { content: String(c.checked), styles: { halign: 'center' } },
        { content: 'OK', styles: { fontStyle: 'bold', fillColor: C.fillOk, textColor: C.green } },
        { content: String(c.ok), styles: { halign: 'center' } },
        { content: 'Nicht OK', styles: { fontStyle: 'bold', fillColor: C.fillNok, textColor: C.red } },
        { content: String(c.nok), styles: { halign: 'center' } },
        { content: 'N/A', styles: { fontStyle: 'bold', fillColor: C.fillNa, textColor: C.muted } },
        { content: String(c.na), styles: { halign: 'center' } },
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
  ensure(30);
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
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.ink);
  let px = ML;
  for (const [t, col] of [
    ['Prio: ', C.ink],
    ['K', C.red],
    [' sofort · ', C.ink],
    ['H', C.orange],
    [' 48 Std. · ', C.ink],
    ['M', C.amber],
    [' 1 Woche · ', C.ink],
    ['N', C.ink],
    [' 1 Monat (Richtwerte) · weitere Mängel: Zeile kopieren · Nachkontrolle im Excel-Register', C.ink],
  ] as [string, RGB][]) {
    doc.setTextColor(...col);
    doc.text(t, px, y);
    px += doc.getTextWidth(t);
  }
  y += 2.5;

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
    head: [['Nr. / Pkt.', 'Mangel / Gefahr', 'Massnahme', 'Verantw. / Frist / Prio', 'Foto']],
    headStyles: { ...tableBase.headStyles, fontSize: 7.5, halign: 'center' },
    body: defectBody,
    rowPageBreak: 'avoid',
    styles: { ...tableBase.styles, valign: 'top', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 15 },
      3: { cellWidth: 27, fontSize: 7.5 },
      4: { cellWidth: PHOTO_W + 3, fontSize: 6, textColor: C.muted, halign: 'center' },
    },
    didParseCell: (d: CellHookData) => {
      if (d.section === 'body' && defects.length) d.cell.styles.minCellHeight = PHOTO_H + 3;
      if (d.section === 'head' && d.column.index === 3) d.cell.styles.fontSize = 6.5;
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
        doc.setTextColor(...C.ink);
        doc.setFontSize(8);
        doc.text(def.itemId, x + 1.5, top + 13.5);
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
    h3(`Weitere Fotos zu Mangel Nr. ${d.nr} (${d.itemId})`);
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
  ensure(95);
  h1('5. Hinweise und Dokumentenlenkung');
  autoTable(doc, {
    ...tableBase,
    startY: y,
    styles: { ...tableBase.styles, fontSize: 7.5, valign: 'top' },
    body: [
      [
        label('Ablauf'),
        '1. Vorlage öffnen (Doppelklick), Kapitel 1 ausfüllen.  2. Checkliste prüfen, Mängel mit Foto in Kapitel 4.\n3. Als „HSE-Rundgang_JJJJ-KWxx“ speichern, PDF exportieren, im Excel-Register eintragen (dort auch Prüftermine Quartal/Jahr).',
      ],
    ],
    columnStyles: { 0: { cellWidth: 29 } },
  });
  y = lastY(doc) + 4;
  h3('Referenzen');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  const refLines = doc.splitTextToSize(SOP_REFERENCES_TEXT, CW - 1);
  doc.text(refLines, ML, y + 1);
  y += refLines.length * 3 + 4;

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
  ensure(30);
  h3('Genehmigung');
  autoTable(doc, {
    ...lined,
    startY: y,
    head: [['Name', 'Position', 'Unterschrift/Datum']],
    headStyles: { ...lined.headStyles, halign: 'center' },
    body: [
      [SOP_META.author.replace(/ \(.*\)$/, ''), 'HSE (Ersteller)', ''],
      ['', '', ''],
    ],
  });
  y = lastY(doc) + 5;
  ensure(20);
  h3('Änderungsverzeichnis');
  autoTable(doc, {
    ...lined,
    startY: y,
    tableWidth: 92,
    head: [['Versionsnummer', 'Beschreibung']],
    body: [[`V${SOP_META.version}`, `Erstversion vom ${formatDate(SOP_META.validFrom)}`]],
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 37 } },
  });

  // ── Kopf- und Fusszeile auf jeder Seite (wie Vorlage) ───────────────
  const pages = doc.getNumberOfPages();
  const logoW = 28.3;
  const logoH = logoW * QPS_LOGO_RATIO;
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
    doc.text(fileBaseName, ML, H - 10);
  }
  return doc;
}
