import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';

describe('Migration der KI-Mangelbeschreibung', () => {
  it('ergänzt alte gespeicherte KI-Vorschläge rückwärtskompatibel', async () => {
    const old = new Dexie('hse-rundgang');
    old.version(6).stores({
      walks: 'id, date, status, &docNr',
      defects: 'id, walkId, status, itemId, area, mangelId',
      photos: 'id, defectId',
      counters: '&year',
      inspections: 'id, area',
      settings: '&id',
    });
    const { db } = await import('../../src/db');
    await old.table('defects').put({
      id: 'legacy-ai-defect', walkId: 'walk', nr: 1, mangelId: 'M-1', itemId: 'R1', area: 'qlabs',
      description: 'Manuell erfasster Mangel', hazard: '', immediateAction: '', action: '', responsible: '', priority: 'M',
      due: '', status: 'open', doneAt: null, recheckAt: null, controlledBy: '', fixed: null, newDue: '', note: '',
      aiAudit: { used: true, analyzedAt: '2026-10-25T12:00:00.000Z', reviewedAt: null, model: 'legacy-model',
        proposal: { mangelErkannt: true, gefahren: [], vorgeschlagenePrio: null, begruendungPrio: '', sofortmassnahme: '', massnahmen: [], passendeGrundlage: '', passenderKontrollpunkt: null, sicherheit: 'mittel', hinweis: '' },
        acceptedFields: [], reviewedBy: '' },
      createdAt: '2026-10-25T12:00:00.000Z', updatedAt: '2026-10-25T12:00:00.000Z',
    });
    old.close();
    await db.open();
    const defect = await db.defects.get('legacy-ai-defect');
    expect(db.verno).toBe(7);
    expect(defect?.aiAudit?.proposal).toMatchObject({ mangelBeschreibung: '' });
    db.close();
  });
});
