import { describe, expect, it } from 'vitest';
import { ALL_ITEMS, SECTIONS } from '../../src/data/checklist';
import type { Defect, Walk } from '../../src/lib/types';
import {
  countRatings,
  dueFromPrio,
  nextDefectNr,
  nokWithoutDefect,
  ratableItemIds,
  suggestResult,
  suggestType,
  validateForClose,
  visibleSections,
} from '../../src/lib/walk';

function walk(partial: Partial<Walk> = {}): Walk {
  return {
    id: 'w1', date: '2026-10-06', isoYear: 2026, week: 41, time: '09:00', inspector: 'Waldemar Becker',
    companion: '', area: '', type: 'weekly', openPointsNote: '', openPointsSnapshot: null, ratings: {}, observations: '', result: null,
    signature: { name: '', date: '', image: '' }, acknowledgement: { name: '', date: '', image: '' },
    status: 'draft', sopVersion: '1.0', createdAt: '', updatedAt: '', closedAt: null, ...partial,
  };
}
function defect(partial: Partial<Defect> = {}): Defect {
  return {
    id: 'd1', walkId: 'w1', nr: 1, itemId: 'A1', hazard: 'Fluchtweg mit Paletten verstellt', action: '',
    responsible: '', prio: 'H', due: '2026-10-08', status: 'open', doneAt: null, doneNote: '',
    createdAt: '', updatedAt: '', ...partial,
  };
}

describe('Checklisten-Definition (SOP V1.0)', () => {
  it('enthält alle Punkte der SOP', () => {
    const counts = Object.fromEntries(SECTIONS.map((s) => [s.id, s.items.length]));
    expect(counts).toEqual({ A: 16, B: 3, C: 5, D: 2, E: 3, F: 6, G: 1, M: 12 });
    expect(ALL_ITEMS).toHaveLength(48);
    expect(new Set(ALL_ITEMS.map((i) => i.id)).size).toBe(48);
  });
  it('enthält keine Gedankenstriche in Anzeigetexten', () => {
    for (const s of SECTIONS) {
      expect(s.title).not.toMatch(/[–—]/);
      for (const i of s.items) expect(i.text).not.toMatch(/[–—]/);
    }
  });
});

describe('Rubriken je Rundgangsart', () => {
  it('Woche: A, C, F, G', () => expect(visibleSections('weekly').map((s) => s.id)).toEqual(['A', 'C', 'F', 'G']));
  it('Monat: A bis G und M', () =>
    expect(visibleSections('monthly').map((s) => s.id)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'M']));
  it('bewertbare Punkte ohne G1', () => {
    expect(ratableItemIds('weekly')).toHaveLength(27);
    expect(ratableItemIds('monthly')).toHaveLength(47);
    expect(ratableItemIds('monthly')).not.toContain('G1');
  });
});

describe('Zähler (SOP 3)', () => {
  it('zählt nur angezeigte Punkte', () => {
    const c = countRatings(walk({ ratings: { A1: 'ok', A2: 'nok', C1: 'na', M1: 'ok' } }));
    expect(c).toEqual({ total: 27, checked: 3, ok: 1, nok: 1, na: 1 });
  });
  it('Monat zählt M mit', () => {
    const c = countRatings(walk({ type: 'monthly', ratings: { A1: 'ok', M1: 'ok' } }));
    expect(c.checked).toBe(2);
    expect(c.total).toBe(47);
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

describe('Abschluss-Validierung', () => {
  const allOk = Object.fromEntries(ratableItemIds('weekly').map((id) => [id, 'ok' as const]));
  const signed = { name: 'Waldemar Becker', date: '2026-10-06', image: 'data:image/png;base64,x' };

  it('vollständiger Rundgang ist abschliessbar', () => {
    expect(validateForClose(walk({ ratings: allOk, result: 'none', signature: signed }), [])).toEqual([]);
  });
  it('meldet unbewertete Punkte, fehlende Unterschrift und Ergebnis', () => {
    const errs = validateForClose(walk({ ratings: { A1: 'ok' } }), []);
    expect(errs.join(' ')).toMatch(/26 Punkte nicht bewertet/);
    expect(errs.join(' ')).toMatch(/Unterschrift/);
    expect(errs.join(' ')).toMatch(/Gesamtergebnis/);
  });
  it('"Nicht OK" ohne Mangel verhindert Abschluss', () => {
    const w = walk({ ratings: { ...allOk, A1: 'nok' }, result: 'minor', signature: signed });
    expect(nokWithoutDefect(w, [])).toEqual(['A1']);
    expect(validateForClose(w, [])).toEqual(['A1 ist "Nicht OK", aber ohne Mangel in Kapitel 4.']);
    expect(validateForClose(w, [defect()])).toEqual([]);
  });
  it('unvollständiger Mangel wird gemeldet', () => {
    const w = walk({ ratings: { ...allOk, A1: 'nok' }, result: 'minor', signature: signed });
    expect(validateForClose(w, [defect({ hazard: ' ' })])[0]).toMatch(/Mangel Nr. 1: Mangel\/Gefahr fehlt/);
  });
  it('nächste Mangel-Nr.', () => {
    expect(nextDefectNr([])).toBe(1);
    expect(nextDefectNr([{ nr: 1 }, { nr: 3 }])).toBe(4);
  });
});
