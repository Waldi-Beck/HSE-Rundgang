/** PDF-Bericht gemäss SOP 5 (FR-050, FR-051). Aufbau folgt den Kapiteln 1 bis 4 der Vorlage. */
import { jsPDF } from 'jspdf';
import { autoTable, type RowInput } from 'jspdf-autotable';
import { PRIO, RATING_HELP, RESULT_LABELS, SOP_META, TYPE_LABELS } from '../data/checklist';
import { formatDate, weekLabel } from './dates';
import { blobToDataUrl } from './image';
import type { Defect, Photo, Walk } from './types';
import { countRatings, openPointLabel, visibleSections } from './walk';

const M = 14; // Seitenrand mm
const INK: [number, number, number] = [24, 24, 27];
const MUTED: [number, number, number] = [113, 113, 122];
const LINE: [number, number, number] = [212, 212, 216];
const HEAD_FILL: [number, number, number] = [244, 244, 245];

export interface PdfInput {
  walk: Walk;
  defects: Defect[];
  photos: Photo[];
  openFromPrevious: { defect: Defect; walk?: Walk }[];
  fileBaseName: string;
}

const lastY = (doc: jsPDF): number =>
  (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? M;

export async function buildReportPdf(input: PdfInput): Promise<jsPDF> {
  const { walk, defects, photos, openFromPrevious, fileBaseName } = input;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  doc.setProperties({
    title: fileBaseName,
    subject: `${SOP_META.docId} ${SOP_META.title}`,
    author: walk.inspector,
    creator: 'HSE-Rundgang App',
  });

  const tableBase = {
    margin: { left: M, right: M, top: 30, bottom: 16 },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.6, textColor: INK, lineColor: LINE, lineWidth: 0.2 },
    headStyles: { fillColor: HEAD_FILL, textColor: INK, fontStyle: 'bold' as const },
    theme: 'grid' as const,
  };

  let y = 34;
  const heading = (text: string) => {
    if (y > H - 40) {
      doc.addPage();
      y = 34;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...INK);
    doc.text(text, M, y);
    y += 3;
  };

  // Titel
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('HSE Rundgang', M, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`${weekLabel(walk.isoYear, walk.week)}   ${TYPE_LABELS[walk.type]}   Status: ${walk.status === 'closed' ? 'abgeschlossen' : 'Entwurf'}`, M, y + 5);
  y += 12;

  // 1. Rundgangdaten
  heading('1. Rundgangdaten');
  const openText = [
    ...(walk.openPointsSnapshot ?? openFromPrevious.map(openPointLabel)),
    walk.openPointsNote,
  ]
    .filter(Boolean)
    .join('\n');
  autoTable(doc, {
    ...tableBase,
    startY: y,
    body: [
      [{ content: 'Datum', styles: { fontStyle: 'bold' } }, formatDate(walk.date), { content: 'Kalenderwoche', styles: { fontStyle: 'bold' } }, `KW ${walk.week} / ${walk.isoYear}`],
      [{ content: 'Durchgeführt von', styles: { fontStyle: 'bold' } }, walk.inspector, { content: 'Uhrzeit', styles: { fontStyle: 'bold' } }, walk.time],
      [{ content: 'Begleitperson', styles: { fontStyle: 'bold' } }, walk.companion, { content: 'Bereich', styles: { fontStyle: 'bold' } }, walk.area],
      [
        { content: 'Rundgangsart', styles: { fontStyle: 'bold' } },
        {
          content: `[${walk.type === 'weekly' ? 'X' : ' '}] Wochenrundgang (A, C, F, G)     [${walk.type === 'monthly' ? 'X' : ' '}] Monatsrundgang (A bis G + M)`,
          colSpan: 3,
        },
      ],
      [{ content: 'Offene Punkte Vorwoche', styles: { fontStyle: 'bold' } }, { content: openText || 'keine', colSpan: 3 }],
    ],
    columnStyles: { 0: { cellWidth: 38 }, 2: { cellWidth: 30 } },
  });
  y = lastY(doc) + 9;

  // 2. Checkliste
  heading('2. Checkliste');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(RATING_HELP, M, y + 1);
  y += 4;
  const defectNrs = (itemId: string) =>
    defects.filter((d) => d.itemId === itemId).map((d) => d.nr).join(', ');
  const body: RowInput[] = [];
  for (const s of visibleSections(walk.type)) {
    body.push([
      {
        content: `${s.id}   ${s.title}   (${s.rhythm === 'weekly' ? 'wöchentlich' : 'monatlich'})${s.legal.length ? `   ${s.legal.join(', ')}` : ''}`,
        colSpan: 6,
        styles: { fillColor: HEAD_FILL, fontStyle: 'bold' },
      },
    ]);
    for (const it of s.items) {
      if (it.freeText) {
        body.push([it.id, { content: walk.observations || '-', colSpan: 5 }]);
        continue;
      }
      const r = walk.ratings[it.id];
      body.push([
        it.id,
        it.text,
        r === 'ok' ? 'X' : '',
        r === 'nok' ? 'X' : '',
        r === 'na' ? 'X' : '',
        defectNrs(it.id),
      ]);
    }
  }
  autoTable(doc, {
    ...tableBase,
    startY: y,
    head: [['Nr.', 'Kontrollpunkt', 'OK', 'Nicht OK', 'N/A', 'Mangel-Nr.']],
    body,
    columnStyles: {
      0: { cellWidth: 11 },
      2: { cellWidth: 11, halign: 'center' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 11, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3 && data.cell.raw === 'X') {
        data.cell.styles.textColor = [185, 28, 28];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
  y = lastY(doc) + 9;

  // 3. Ergebnis und Abschluss
  heading('3. Ergebnis und Abschluss');
  const c = countRatings(walk);
  autoTable(doc, {
    ...tableBase,
    startY: y,
    body: [
      ['Kontrolliert', String(c.checked), 'OK', String(c.ok), 'Nicht OK', String(c.nok), 'N/A', String(c.na)],
      [
        {
          content: (Object.keys(RESULT_LABELS) as (keyof typeof RESULT_LABELS)[])
            .map((k) => `[${walk.result === k ? 'X' : ' '}] ${RESULT_LABELS[k]}`)
            .join('      '),
          colSpan: 8,
        },
      ],
    ],
    columnStyles: { 0: { fontStyle: 'bold' }, 2: { fontStyle: 'bold' }, 4: { fontStyle: 'bold' }, 6: { fontStyle: 'bold' } },
  });
  y = lastY(doc) + 4;
  if (y > H - 50) {
    doc.addPage();
    y = 34;
  }
  const sigW = (W - 2 * M - 6) / 2;
  const drawSig = (x: number, label: string, s: Walk['signature']) => {
    doc.setDrawColor(...LINE);
    doc.rect(x, y, sigW, 34);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(label, x + 2, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${s.name}`, x + 2, y + 10);
    doc.text(`Datum: ${formatDate(s.date)}`, x + 2, y + 15);
    doc.text('Unterschrift:', x + 2, y + 20);
    if (s.image) doc.addImage(s.image, 'PNG', x + 22, y + 17, 50, 15);
  };
  drawSig(M, 'Durchführende/r', walk.signature);
  drawSig(M + sigW + 6, 'Kenntnisnahme (optional)', walk.acknowledgement);
  y += 44;

  // 4. Mängel und Massnahmen
  heading('4. Mängel und Massnahmen');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('Prio: K sofort, H 48 Std., M 1 Woche, N 1 Monat (Richtwerte)', M, y + 1);
  y += 4;
  const photosOf = (id: string) => photos.filter((p) => p.defectId === id);
  autoTable(doc, {
    ...tableBase,
    startY: y,
    head: [['Nr.', 'Pkt.', 'Mangel / Gefahr', 'Massnahme', 'Verantw. / Frist / Prio', 'Status', 'Fotos']],
    body: defects.length
      ? defects.map((d) => [
          String(d.nr),
          d.itemId,
          d.hazard,
          d.action,
          `${d.responsible || '-'}\n${formatDate(d.due)}\n${d.prio} (${PRIO[d.prio].hint})`,
          d.status === 'done' ? `erledigt ${formatDate(d.doneAt)}${d.doneNote ? `\n${d.doneNote}` : ''}` : 'offen',
          String(photosOf(d.id).length),
        ])
      : [[{ content: 'Keine Mängel erfasst.', colSpan: 7 }]],
    columnStyles: { 0: { cellWidth: 9 }, 1: { cellWidth: 11 }, 4: { cellWidth: 32 }, 5: { cellWidth: 22 }, 6: { cellWidth: 12, halign: 'center' } },
  });
  y = lastY(doc) + 8;

  // Fotos je Mangel
  const colW = (W - 2 * M - 6) / 2;
  for (const d of defects) {
    const ps = photosOf(d.id);
    if (!ps.length) continue;
    let col = 0;
    let rowH = 0;
    const startBlock = () => {
      if (y > H - 60) {
        doc.addPage();
        y = 34;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      doc.text(`Fotos zu Mangel Nr. ${d.nr} (${d.itemId})`, M, y);
      y += 3;
    };
    startBlock();
    for (const p of ps) {
      const h = Math.min(colW * (p.height / p.width), 90);
      const w = h * (p.width / p.height);
      if (y + h > H - 18) {
        doc.addPage();
        y = 34;
        col = 0;
        rowH = 0;
      }
      const dataUrl = await blobToDataUrl(p.blob);
      doc.addImage(dataUrl, 'JPEG', M + col * (colW + 6), y, w, h, undefined, 'FAST');
      rowH = Math.max(rowH, h);
      col++;
      if (col === 2) {
        col = 0;
        y += rowH + 4;
        rowH = 0;
      }
    }
    if (col !== 0) y += rowH + 4;
    y += 4;
  }

  // Kopf und Fuss auf jeder Seite (FR-053)
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.rect(M, 8, W - 2 * M, 16);
    doc.line(W - M - 52, 8, W - M - 52, 24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(`Dokumenten ID: ${SOP_META.docId}`, M + 2, 14);
    doc.text(`Dokumententitel: ${SOP_META.title}`, M + 2, 20);
    doc.text(`Version: ${SOP_META.version}`, W - M - 50, 14);
    doc.text(`Gültig ab: ${formatDate(SOP_META.validFrom)}`, W - M - 50, 20);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`${fileBaseName}   ${SOP_META.company}`, M, H - 8);
    doc.text(`Seite ${i} von ${pages}`, W - M, H - 8, { align: 'right' });
  }
  return doc;
}
