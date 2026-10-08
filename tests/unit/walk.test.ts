import { describe, expect, it } from 'vitest';
import type { Defect, Walk } from '../../src/lib/types';
import {
  areasForItem,
  cellKey,
  countRatings,
  defectCounts,
  defectsForCell,
  dueFromPrio,
  hiddenRatingsOnWeekly,
  mangelWithoutDefect,
  nextDefectNr,
  openPointLabel,
  parseCellKey,
  ratableKeys,
  suggestResult,
  suggestType,
  validateForClose,
  weeklyKeys,
} from '../../src/lib/walk';

function walk(partial: Partial<Walk> = {}): Walk {
  return {
    id: 'w1', date: '2026-10-06', isoYear: 2026, week: 41, time: '09:00', inspector: 'Waldemar Becker',
    companion: '', type: 'weekly', openPointsNote: '', openPointsSnapshot: null, ratings: {}, result: null,
    signature: { name: '', date: '', image: '' }, acknowledgement: { name: '', date: '', image: '' },
    status: 'draft', sopVersion: '1.0', createdAt: '', updatedAt: '', closedAt: null, ...partial,
  };
}
function defect(partial: Partial<Defect> = {}): Defect {
  return {
    id: 'd1', walkId: 'w1', nr: 1, itemId: 'W4', area: 'qlabs', hazard: 'Feuerlöscher mit Karton verstellt', action: '',
    responsible: '', prio: 'H', due: '2026-10-08', status: 'open', doneAt: null, doneNote: '',
    createdAt: '', updatedAt: '', ...partial,
  };
}

describe('Bewertungsschlüssel', () => {
  it('Wochenpunkt je Bereich, Monatspunkt ohne Bereich', () => {
    expect(cellKey('W4', 'qlabs')).toBe('W4@qlabs');
    expect(cellKey('M1')).toBe('M1');
    expect(parseCellKey('W4@xtec-lager')).toEqual({ itemId: 'W4', area: 'xtec-lager' });
    expect(parseCellKey('M2')).toEqual({ itemId: 'M2', area: '' });
  });
  it('Woche = 96 Zellen, Monat = 96 + 9', () => {
    expect(ratableKeys('weekly')).toHaveLength(96);
    expect(new Set(ratableKeys('weekly')).size).toBe(96);
    expect(ratableKeys('monthly')).toHaveLength(105);
    expect(ratableKeys('monthly')).toContain('M9');
    expect(ratableKeys('weekly')).not.toContain('M1');
    expect(weeklyKeys('qlabs')).toHaveLength(16);
    expect(weeklyKeys('qlabs')[3]).toBe('W4@qlabs');
  });
  it('Bereiche für Mängel: Wochenpunkt 6, Monatspunkt 6 + allgemein', () => {
    expect(areasForItem('W4').map((a) => a.id)).not.toContain('alle');
    expect(areasForItem('W4')).toHaveLength(6);
    expect(areasForItem('M1')).toHaveLength(7);
    expect(areasForItem('M1').at(-1)).toEqual({ id: 'alle', label: 'Alle Bereiche / allgemein' });
  });
});

describe('Zähler', () => {
  it('Fortschritt zählt nur Zellen des Rundgangs', () => {
    const c = countRatings(walk({ ratings: { 'W1@qlabs': 'ok', 'W2@qlabs': 'mangel', 'W3@gaenge': 'na', M1: 'ok' } }));
    expect(c).toEqual({ total: 96, checked: 3, ok: 1, mangel: 1, na: 1 });
  });
  it('Monat zählt 2.2 mit', () => {
    const c = countRatings(walk({ type: 'monthly', ratings: { 'W1@qlabs': 'ok', M1: 'ok' } }));
    expect(c.checked).toBe(2);
    expect(c.total).toBe(105);
  });
  it('je Bereich', () => {
    const w = walk({ ratings: { 'W1@qlabs': 'ok', 'W1@engineering': 'ok' } });
    expect(countRatings(w, weeklyKeys('qlabs'))).toMatchObject({ total: 16, checked: 1 });
  });
  it('SOP 3: Anzahl Mängel und davon kritisch (K)', () => {
    expect(defectCounts([])).toEqual({ total: 0, critical: 0 });
    expect(defectCounts([{ prio: 'K' }, { prio: 'H' }, { prio: 'K' }])).toEqual({ total: 3, critical: 2 });
  });
  it('Wechsel auf Woche blendet nur 2.2 aus', () => {
    expect(hiddenRatingsOnWeekly(walk({ ratings: { 'W1@qlabs': 'ok', M1: 'ok', M2: 'na' } }))).toEqual(['M1', 'M2']);
  });
});

describe('Prio -> Frist (SOP 4)', () => {
  it.each([
    ['K', '2026-10-06'],
    ['H', '2026-10-08'],
    ['M', '2026-10-13'],
    ['N', '2026-11-06'],
  ] as const)('%s -> %s', (prio, due) => expect(dueFromPrio('2026-10-06', prio)).toBe(due));
});

describe('Rundgangsart-Vorschlag', () => {
  it('erster Rundgang im Monat -> Monat', () => expect(suggestType('2026-10-06', ['2026-09-29'])).toBe('monthly'));
  it('weiterer Rundgang im Monat -> Woche', () =>
    expect(suggestType('2026-10-13', ['2026-10-06', '2026-09-29'])).toBe('weekly'));
});

describe('Ergebnis-Vorschlag', () => {
  it('keine Mängel', () => expect(suggestResult([])).toBe('none'));
  it('K -> kritisch', () => expect(suggestResult([{ prio: 'N', status: 'open' }, { prio: 'K', status: 'done' }])).toBe('critical'));
  it('offener H -> offene Massnahmen', () => expect(suggestResult([{ prio: 'H', status: 'open' }])).toBe('open'));
  it('H erledigt / M / N -> geringfügig', () =>
    expect(suggestResult([{ prio: 'H', status: 'done' }, { prio: 'M', status: 'open' }])).toBe('minor'));
});

describe('Mangel mit Bereich', () => {
  it('Wochenzelle braucht Mangel mit gleichem Punkt UND Bereich', () => {
    const w = walk({ ratings: { 'W4@qlabs': 'mangel' } });
    expect(mangelWithoutDefect(w, [defect({ area: 'engineering' })])).toEqual(['W4@qlabs']);
    expect(mangelWithoutDefect(w, [defect({ itemId: 'W5' })])).toEqual(['W4@qlabs']);
    expect(mangelWithoutDefect(w, [defect()])).toEqual([]);
    expect(defectsForCell('W4@qlabs', [defect(), defect({ id: 'd2', area: 'gaenge' })])).toHaveLength(1);
  });
  it('Monatspunkt: Mangel mit beliebigem Bereich genügt', () => {
    const w = walk({ type: 'monthly', ratings: { M2: 'mangel' } });
    expect(mangelWithoutDefect(w, [])).toEqual(['M2']);
    expect(mangelWithoutDefect(w, [defect({ itemId: 'M2', area: 'alle' })])).toEqual([]);
  });
  it('Offene Punkte Vorwoche zeigen Punkt und Bereich', () => {
    expect(openPointLabel({ defect: defect(), walk: walk() })).toBe(
      '2026-KW41 Nr. 1 (W4 / QLabs): Feuerlöscher mit Karton verstellt, Frist 08.10.2026, Prio H',
    );
  });
});

describe('Abschluss-Validierung', () => {
  const allOk = (type: Walk['type'] = 'weekly') => Object.fromEntries(ratableKeys(type).map((k) => [k, 'ok' as const]));
  const signed = { name: 'Waldemar Becker', date: '2026-10-06', image: 'data:image/png;base64,x' };

  it('vollständiger Wochenrundgang ist abschliessbar', () => {
    expect(validateForClose(walk({ ratings: allOk(), result: 'none', signature: signed }), [])).toEqual([]);
  });
  it('Monatsrundgang verlangt zusätzlich 2.2', () => {
    const errs = validateForClose(walk({ type: 'monthly', ratings: allOk(), result: 'none', signature: signed }), []);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/^9 Felder nicht bewertet: M1, M2/);
  });
  it('meldet unbewertete Felder, fehlende Unterschrift und Ergebnis', () => {
    const errs = validateForClose(walk({ ratings: { 'W1@gaenge': 'ok' } }), []);
    expect(errs.join(' ')).toMatch(/95 Felder nicht bewertet: W2 \/ Gänge \/ Treppen/);
    expect(errs.join(' ')).toMatch(/und 87 weitere/);
    expect(errs.join(' ')).toMatch(/Unterschrift/);
    expect(errs.join(' ')).toMatch(/Gesamtergebnis/);
  });
  it('"Mangel" ohne Eintrag mit passendem Bereich verhindert Abschluss', () => {
    const w = walk({ ratings: { ...allOk(), 'W4@qlabs': 'mangel' }, result: 'minor', signature: signed });
    expect(validateForClose(w, [])).toEqual(['W4 / QLabs ist "Mangel", aber ohne Eintrag in Kapitel 4.']);
    expect(validateForClose(w, [defect({ area: 'qmeasure' })])).toEqual(['W4 / QLabs ist "Mangel", aber ohne Eintrag in Kapitel 4.']);
    expect(validateForClose(w, [defect()])).toEqual([]);
  });
  it('unvollständiger Mangel wird gemeldet (Bereich ist Pflicht)', () => {
    const w = walk({ ratings: { ...allOk(), 'W4@qlabs': 'mangel' }, result: 'minor', signature: signed });
    expect(validateForClose(w, [defect(), defect({ id: 'd2', nr: 2, area: '', hazard: ' ' })])).toEqual([
      'Mangel Nr. 2: Bereich, Mangel/Gefahr fehlt.',
    ]);
  });
  it('Wochenpunkt mit "Alle Bereiche / allgemein" ist ungültig', () => {
    const w = walk({ ratings: allOk(), result: 'minor', signature: signed });
    expect(validateForClose(w, [defect({ area: 'alle' })])).toEqual(['Mangel Nr. 1: Bereich passt nicht zu Pkt. W4.']);
  });
  it('nächste Mangel-Nr.', () => {
    expect(nextDefectNr([])).toBe(1);
    expect(nextDefectNr([{ nr: 1 }, { nr: 3 }])).toBe(4);
  });
});
