import { describe, expect, it, vi } from 'vitest';
import { jsPDF } from 'jspdf';
import { QPS_LOGO_PNG } from '../../src/assets/qpsLogo';
import { SOP_META } from '../../src/data/checklist';
import { buildReportPdf } from '../../src/lib/pdf';
import type { Walk } from '../../src/lib/types';

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

describe('PDF Kopfzeile (SOP QPS_HSE_00064)', () => {
  it('druckt die neue 2.1-Matrix mit den drei Bereichen und Textbewertungen', async () => {
    const pdf = await buildReportPdf({
      walk: { ...walk, ratings: { 'R1@qps': 'ok', 'R1@qlabs': 'mangel', 'R1@xtec': 'na' } },
      defects: [], photos: [], openFromPrevious: [], fileBaseName: 'matrix-test',
      settings: { id: 'app', areas: ['Engineering', 'QLabs'], priorityDays: { K: 0, H: 2, M: 7, N: 30 }, maxIntervalDays: 14 },
    });
    const output = pdf.output();
    for (const text of ['QPS', 'QLabs', 'xTec', 'OK', 'Mangel', 'n.a.']) expect(output).toContain(text);
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
        walk,
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
      const output = pdf.output();
      for (const headerText of [
        `Dokumenten ID: ${SOP_META.docId}`,
        `Dokumententitel: ${SOP_META.title}`,
        `Version: ${SOP_META.version}`,
        'Gültig ab: 05.10.2026',
        `Rundgang-Nr.: ${walk.docNr}`,
      ]) {
        expect(output.match(new RegExp(headerText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))).toHaveLength(pageCount);
      }
    } finally {
      addImage.mockRestore();
    }
  });
});
