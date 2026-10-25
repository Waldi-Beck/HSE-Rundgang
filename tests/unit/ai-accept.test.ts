import { describe, expect, it } from 'vitest';
import { applyAiFields, aiFieldValue } from '../../src/lib/ai-accept';
import type { AiProposal, Defect } from '../../src/lib/types';

const proposal: AiProposal = {
  mangelErkannt: true, mangelBeschreibung: 'Ein Kabel liegt quer über dem Gehweg.', gefahren: [{ beschreibung: 'Stolperstelle', folge: 'Sturz' }], vorgeschlagenePrio: 'H',
  begruendungPrio: 'Direkter Verkehrsweg.', sofortmassnahme: 'Absperren.',
  massnahmen: [{ text: 'Kabelbrücke einbauen.', stopStufe: 'Technisch' }], passendeGrundlage: 'VUV Art. 19',
  passenderKontrollpunkt: 'R6', sicherheit: 'mittel', hinweis: 'Vor Ort prüfen.',
};
const defect = { hazard: 'eigene Gefahr', priority: 'M', immediateAction: '', action: '', itemId: 'SONSTIGES' } as Defect;

describe('explizite Feldübernahme', () => {
  it('converts an AI field into editable form content', () => {
    expect(aiFieldValue(proposal, 'hazard')).toBe('Stolperstelle (Mögliche Folge: Sturz)');
    expect(aiFieldValue(proposal, 'description')).toBe('Ein Kabel liegt quer über dem Gehweg.');
    expect(aiFieldValue(proposal, 'action')).toBe('Technisch: Kabelbrücke einbauen.');
    expect(aiFieldValue(proposal, 'itemId', ['R1', 'R6'])).toBe('R6');
    expect(aiFieldValue({ ...proposal, passenderKontrollpunkt: 'R99' }, 'itemId', ['R1', 'R6'])).toBeNull();
  });
  it('changes only fields explicitly selected and leaves the proposal untouched', () => {
    const original = structuredClone(proposal);
    const changed = applyAiFields(defect, proposal, ['description', 'hazard', 'priority']);
    expect(changed.description).toBe('Ein Kabel liegt quer über dem Gehweg.');
    expect(changed.hazard).toBe('Stolperstelle (Mögliche Folge: Sturz)');
    expect(changed.priority).toBe('H');
    expect(changed.action).toBe('');
    expect(changed.immediateAction).toBe('');
    expect(proposal).toEqual(original);
  });
});
