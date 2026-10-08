import { describe, expect, it } from 'vitest';
import {
  ALL_ITEMS,
  AREAS,
  CHANGE_LOG,
  LEGAL_BASES,
  MONTHLY_ITEMS,
  SOP_META,
  WEEKLY_ITEMS,
  legalBasisOf,
} from '../../src/data/checklist';

describe('Checklisten-Definition (Formular vom 29.09.2026)', () => {
  it('Kopfdaten unverändert: Dokumenten ID, Version, Gültig ab', () => {
    expect(SOP_META).toMatchObject({
      docId: 'QPS_HSE_00064',
      title: 'HSE Wöchentlicher Rundgang',
      version: '1.0',
      validFrom: '2026-10-05',
    });
  });

  it('2.1: W1 bis W16, 2.2: M1 bis M9', () => {
    expect(WEEKLY_ITEMS.map((i) => i.id)).toEqual(Array.from({ length: 16 }, (_, i) => `W${i + 1}`));
    expect(MONTHLY_ITEMS.map((i) => i.id)).toEqual(Array.from({ length: 9 }, (_, i) => `M${i + 1}`));
    expect(new Set(ALL_ITEMS.map((i) => i.id)).size).toBe(25);
  });

  it('6 Bereiche in der Reihenfolge des Formulars, IDs ohne "@"', () => {
    expect(AREAS.map((a) => a.label)).toEqual(['Gänge / Treppen', 'Engineering', 'QLabs', 'QMeasure', 'xTec Lager', 'xTec Werkstatt']);
    for (const a of AREAS) expect(a.id).toMatch(/^[a-z-]+$/);
    expect(WEEKLY_ITEMS.length * AREAS.length + MONTHLY_ITEMS.length).toBe(105);
  });

  it('Stichproben Wortlaut', () => {
    expect(WEEKLY_ITEMS[0].text).toBe('Fluchtwege frei, mind. 1,2 m breit');
    expect(WEEKLY_ITEMS[11].text).toBe('Abfall getrennt, nicht überfüllt; Glasbruch im stichfesten Behälter');
    expect(MONTHLY_ITEMS[8].text).toBe('Gefahrstoffschrank geordnet, unverträgliche Stoffe getrennt');
    expect(CHANGE_LOG).toEqual([{ version: 'V1.0', description: 'Erstversion vom 29.09.2026' }]);
  });

  it('Schweizer Schreibweise: kein "ß"', () => {
    for (const i of ALL_ITEMS) expect(i.text).not.toContain('ß');
    for (const l of LEGAL_BASES) expect(l.text).not.toContain('ß');
  });

  it('Grundlagen: jeder Punkt genau einmal zugeordnet', () => {
    const mapped = LEGAL_BASES.flatMap((l) => l.ids);
    expect(new Set(mapped).size).toBe(mapped.length);
    expect([...mapped].sort()).toEqual(ALL_ITEMS.map((i) => i.id).sort());
    for (const i of ALL_ITEMS) expect(legalBasisOf(i.id)).not.toBe('');
  });

  it('Grundlagen: Spaltentext und ausgeschriebene IDs stimmen überein', () => {
    const expand = (points: string) =>
      points.split(', ').flatMap((p) => {
        const m = p.match(/^W(\d+)–W(\d+)$/);
        return m ? Array.from({ length: +m[2] - +m[1] + 1 }, (_, k) => `W${+m[1] + k}`) : [p];
      });
    for (const l of LEGAL_BASES) expect(expand(l.points)).toEqual(l.ids);
    expect(legalBasisOf('W2')).toMatch(/^ArGV 4 Art. 8/);
    expect(legalBasisOf('M7')).toMatch(/UVG Art. 82/);
  });
});
