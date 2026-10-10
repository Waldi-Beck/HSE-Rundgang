import { describe, expect, it, vi } from 'vitest';
import { jsPDF } from 'jspdf';
import { QPS_LOGO_PNG } from '../../src/assets/qpsLogo';
import { SOP_META } from '../../src/data/checklist';
import { buildReportPdf, pdfResultForWalk, safePdfDescription } from '../../src/lib/pdf';
import type { Defect, Walk } from '../../src/lib/types';

const walk: Walk = {
  id: 'pdf-walk',
  docNr: 'HSE-RG-2026-001',
  date: '2026-10-06',
  isoYear: 2026,
  week: 41,
  startTime: '09:00',
  endTime: '09:30',
  inspector: 'Max Muster',
  companion: '',
  monthlyChecked: false,
  ratings: {},
  monthlyAreas: {},
  openDefectSnapshot: null,
  result: null,
  note: '',
  signature: { name: '', date: '', image: '' },
  acknowledgement: { name: '', date: '', image: '' },
  status: 'draft',
  sopVersion: '1.0',
  createdAt: '2026-10-06T09:00:00.000Z',
  updatedAt: '2026-10-06T09:00:00.000Z',
  closedAt: null,
};

function makeDefect(patch: Partial<Defect> = {}): Defect {
  return {
    id: 'pdf-defect', walkId: 'pdf-walk', nr: 1, mangelId: '2026-10-06-M01', itemId: 'R1', area: 'qps',
    description: 'Fluchtweg durch Material blockiert', hazard: 'Flucht im Notfall erschwert', immediateAction: 'Material entfernt',
    action: 'Bodenbereich markieren', responsible: 'Max Muster', priority: 'H', due: '2026-10-09', status: 'open',
    doneAt: null, recheckAt: null, controlledBy: '', fixed: null, newDue: '', note: '',
    createdAt: '2026-10-06T09:00:00.000Z', updatedAt: '2026-10-06T09:00:00.000Z', ...patch,
  };
}

describe('PDF Kopfzeile (SOP QPS_HSE_00064)', () => {
  it('druckt die neue 2.1-Matrix mit den drei Bereichen und Textbewertungen', async () => {
    const pdf = await buildReportPdf({
      walk: { ...walk, ratings: { 'R1@qps': 'ok', 'R1@qlabs': 'mangel', 'R1@xtec': 'na' } },
      defects: [], photos: [], openFromPrevious: [], fileBaseName: 'matrix-test',
      settings: { id: 'app', areas: ['Engineering', 'QLabs'], priorityDays: { K: 0, H: 2, M: 7, N: 30 }, maxIntervalDays: 14 },
    });
    const output = pdf.output();
    for (const text of ['QPS', 'QLabs', 'QxTec', 'OK', 'Mangel', 'n.a.']) expect(output).toContain(text);
  });

  it('separates old open measures from current-round defects and uses current-only outcome', async () => {
    const previousWalk = { ...walk, id: 'previous-walk', docNr: 'HSE-RG-2026-019', date: '2026-10-01', status: 'closed' as const };
    const previousDefect = makeDefect({ walkId: previousWalk.id, nr: 1, mangelId: '2026-10-01-M01', area: 'xtec-werkstatt', description: 'Fluchtweg durch Material blockiert', due: '2026-10-03' });
    const currentWalk = { ...walk, docNr: 'HSE-RG-2026-020', status: 'closed' as const, result: 'open' as const, closedAt: '2026-10-10T10:00:00.000Z' };
    const pdf = await buildReportPdf({
      walk: currentWalk, defects: [], photos: [], openFromPrevious: [{ defect: previousDefect, walk: previousWalk }],
      fileBaseName: 'previous-actions-test',
      settings: { id: 'app', areas: ['Engineering', 'QLabs', 'xTec Lager', 'xTec Werkstatt'], priorityDays: { K: 0, H: 2, M: 7, N: 30 }, maxIntervalDays: 14 },
    });
    const output = pdf.output();
    for (const text of ['Keine neuen Mängel festgestellt.', 'Offene Massnahmen aus vorherigen', '(1)', 'HSE-RG-2026-019', 'M01', 'R1', 'QxTec', 'Fluchtweg durch Material blockiert', 'Status: ABGESCHLOSSEN']) expect(output).toContain(text);
    expect(pdfResultForWalk('open', [])).toBe('none');
    expect(pdfResultForWalk('none', [makeDefect({ priority: 'M' })])).toBe('minor');
    expect(pdfResultForWalk('none', [makeDefect({ priority: 'K' })])).toBe('critical');
  });

  it('replaces internal placeholders and empty defect descriptions with safe text', async () => {
    expect(safePdfDescription('drek')).toBe('Beschreibung nicht hinterlegt');
    expect(safePdfDescription('bbxv')).toBe('Beschreibung nicht hinterlegt');
    expect(safePdfDescription('')).toBe('Beschreibung nicht hinterlegt');
    const previousDefect = makeDefect({ walkId: 'previous', description: 'bbxv' });
    const pdf = await buildReportPdf({
      walk: { ...walk, ratings: { 'R1@xtec': 'mangel' } },
      defects: [makeDefect({ description: 'drek', area: 'xtec' })],
      photos: [], openFromPrevious: [{ defect: previousDefect, walk: { ...walk, id: 'previous', docNr: 'HSE-RG-2026-019', date: '2026-10-01' } }],
      fileBaseName: 'placeholder-safety-test',
      settings: { id: 'app', areas: ['Engineering', 'QLabs', 'xTec Lager'], priorityDays: { K: 0, H: 2, M: 7, N: 30 }, maxIntervalDays: 14 },
    });
    const output = pdf.output();
    expect(output).not.toContain('drek');
    expect(output).not.toContain('bbxv');
    expect(output.match(/Beschreibung nicht hinterlegt/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('druckt QPS-Logo und unveränderte SOP-Dokumenten-ID auf mindestens drei Seiten', async () => {
    const api = jsPDF.API as unknown as { addImage: (...args: unknown[]) => unknown };
    const addImage = vi.spyOn(api, 'addImage');
    try {
      const defects = Array.from({ length: 30 }, (_, i) => ({
        id: `defect-${i}`,
        walkId: walk.id,
        nr: i + 1,
        mangelId: `2026-10-06-M${String(i + 1).padStart(2, '0')}`,
        itemId: 'R4',
        area: 'qlabs',
        description: `Beispielmangel mit ausführlicher Beschreibung ${i + 1}`,
        hazard: `Beispielmangel mit ausführlicher Beschreibung ${i + 1}`,
        immediateAction: 'Zugang freigeräumt',
        action: 'Beheben und kontrollieren',
        responsible: 'Max Muster',
        priority: 'M' as const,
        due: '2026-10-13',
        status: 'open' as const,
        doneAt: null,
        recheckAt: null,
        controlledBy: '',
        fixed: null,
        newDue: '',
        note: '',
        createdAt: '',
        updatedAt: '',
      }));
      const pdf = await buildReportPdf({
        walk: { ...walk, status: 'closed', closedAt: '2026-10-06T10:00:00.000Z' },
        defects,
        photos: [],
        openFromPrevious: [],
        fileBaseName: 'HSE-Rundgang_2026-KW41_HSE-RG-2026-001',
        settings: { id: 'app', areas: ['Engineering', 'QLabs'], priorityDays: { K: 0, H: 2, M: 7, N: 30 }, maxIntervalDays: 14 },
      });
      const pageCount = pdf.getNumberOfPages();
      expect(pageCount).toBeGreaterThanOrEqual(3);
      expect(addImage.mock.calls.filter(([image]) => image === QPS_LOGO_PNG)).toHaveLength(pageCount);
      expect(SOP_META.docId).toBe('QPS_HSE_00064');
      expect(SOP_META.version).toBe('1.0');
      expect(SOP_META.validFrom).toBe('2026-10-05');
      const pageStreams = (pdf as unknown as { internal: { pages: string[][] } }).internal.pages.slice(1).map((commands) => commands.join('\n'));
      for (const headerText of [
        `Dokumenten ID: ${SOP_META.docId}`,
        `Dokumententitel: ${SOP_META.title}`,
        `Version: ${SOP_META.version}`,
        'Gültig ab: 05.10.2026',
        `Rundgang-Nr.: ${walk.docNr}`,
        'Status: ABGESCHLOSSEN',
      ]) {
        expect(pageStreams.every((stream) => stream.includes(headerText)), `missing on a page: ${headerText}`).toBe(true);
      }
    } finally {
      addImage.mockRestore();
    }
  });
});
