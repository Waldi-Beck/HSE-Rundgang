import { describe, expect, it } from 'vitest';
import { AiProposalSchema } from '../../src/lib/ai-schema';

const valid = {
  mangelErkannt: true,
  mangelBeschreibung: 'Ein Kabel liegt quer über dem Gehweg.',
  gefahren: [{ beschreibung: 'Kabel liegt im Gehweg', folge: 'Stolpern und Sturz' }],
  vorgeschlagenePrio: 'H', begruendungPrio: 'Direkte Stolpergefahr im Verkehrsweg.',
  sofortmassnahme: 'Kabel sichern.', massnahmen: [{ text: 'Kabelbrücke montieren.', stopStufe: 'Technisch' }],
  passendeGrundlage: 'VUV Art. 19', passenderKontrollpunkt: 'R6', sicherheit: 'mittel', hinweis: 'Bitte vor Ort prüfen.',
};

describe('KI-Fotoanalyse Antwortschema', () => {
  it('accepts complete structured proposals', () => {
    expect(AiProposalSchema.parse(valid)).toEqual(valid);
  });
  it('rejects wrong enum values, unexpected fields, and incomplete results', () => {
    expect(AiProposalSchema.safeParse({ ...valid, sicherheit: 'vielleicht' }).success).toBe(false);
    expect(AiProposalSchema.safeParse({ ...valid, extra: 'must not be accepted' }).success).toBe(false);
    const { gefahren: _gefahren, ...incomplete } = valid;
    expect(AiProposalSchema.safeParse(incomplete).success).toBe(false);
  });
});
