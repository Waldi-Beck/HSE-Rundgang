import { describe, expect, it } from 'vitest';
import { ALL_ITEMS, FORM_AREAS, MONTHLY_ITEMS, SOP_META, WEEKLY_ITEMS } from '../../src/data/checklist';
import { REGISTER_AREA_DEFAULTS } from '../../src/data/register';

describe('Checklist source from current form and Excel Grundlagen', () => {
  it('keeps the requested SOP metadata and new title', () => {
    expect(SOP_META).toMatchObject({ docId: 'QPS_HSE_00064', title: 'HSE Rundgang', version: '1.0', validFrom: '2026-10-05' });
  });

  it('contains exactly fifteen R points in each of three areas and nine M points', () => {
    expect(FORM_AREAS.map((area) => area.label)).toEqual(['QPS', 'QLabs', 'QxTec']);
    expect(WEEKLY_ITEMS.map((item) => item.id)).toEqual(Array.from({ length: 15 }, (_, i) => `R${i + 1}`));
    expect(MONTHLY_ITEMS.map((item) => item.id)).toEqual(Array.from({ length: 9 }, (_, i) => `M${i + 1}`));
    expect(WEEKLY_ITEMS.length * FORM_AREAS.length).toBe(45);
    expect(ALL_ITEMS).toHaveLength(24);
  });

  it('includes exactly the seven populated Excel register-area defaults', () => {
    expect(REGISTER_AREA_DEFAULTS).toEqual(['Engineering', 'QLabs', 'QMeasure', 'xTec Lager', 'xTec Werkstatt', 'Büro / Verwaltung', 'Aussenbereich']);
  });

  it('has non-empty literal Excel foundation text on every checklist point', () => {
    expect(ALL_ITEMS.every((item) => item.basis.trim().length > 0)).toBe(true);
    expect(new Set(ALL_ITEMS.map((item) => item.id)).size).toBe(24);
    expect(WEEKLY_ITEMS[3]).toMatchObject({ id: 'R4', text: 'Feuerlöscher am Platz und frei zugänglich', basis: 'VKF-Brandschutzvorschriften (BSV 2015)' });
    expect(WEEKLY_ITEMS[8].text).toBe('Sicherheitszeichen vorhanden, richtig und gut sichtbar (Warn-, Gebots-, Verbotszeichen)');
    expect(MONTHLY_ITEMS[8].id).toBe('M9');
  });

  it('maps each R/M point to the literal basis copied from Excel Grundlagen', () => {
    expect(ALL_ITEMS.map(({ id, basis }) => [id, basis])).toEqual([
      ['R1', 'ArGV 4 Art. 8 (Fluchtwege) und Art. 10 (Türen in Fluchtwegen) · Suva-Checkliste 67157 „Fluchtwege“'],
      ['R2', 'ArGV 4 Art. 8 (Fluchtwege) und Art. 10 (Türen in Fluchtwegen) · Suva-Checkliste 67157 „Fluchtwege“'],
      ['R3', 'ArGV 4 Art. 8 (Fluchtwege) und Art. 10 (Türen in Fluchtwegen) · Suva-Checkliste 67157 „Fluchtwege“'],
      ['R4', 'VKF-Brandschutzvorschriften (BSV 2015)'],
      ['R5', 'VKF-Brandschutzvorschriften (BSV 2015)'],
      ['R6', 'VUV Art. 19 (Verkehrswege) · Suva-Checkliste 67001 „Verkehrswege für Personen“'],
      ['R7', 'NIV (Niederspannungs-Installationsverordnung)'],
      ['R8', 'NIV (Niederspannungs-Installationsverordnung)'],
      ['R9', 'VUV Art. 5 (PSA) · UVG Art. 82 (Pflicht zum Tragen) · Suva-Checkliste 67091 „Persönliche Schutzausrüstungen“'],
      ['R10', 'VUV Art. 5 (PSA) · UVG Art. 82 (Pflicht zum Tragen) · Suva-Checkliste 67091 „Persönliche Schutzausrüstungen“'],
      ['R11', 'ChemV · ArGV 3 Art. 24a'],
      ['R12', 'VVEA / VVA (Abfälle, Sonderabfälle)'],
      ['R13', 'VUV (sichere Lagerung, Arbeitsmittel)'],
      ['R14', 'ArGV 3 Art. 36 (Erste Hilfe)'],
      ['R15', 'ArGV 3 Art. 15 (Beleuchtung) · VUV Art. 19 (Verkehrswege)'],
      ['M1', 'ArGV 3 Art. 36 (Erste Hilfe)'],
      ['M2', 'VKF-Brandschutzvorschriften (BSV 2015)'],
      ['M3', 'ArGV 4 Art. 8 (Fluchtwege) und Art. 10 (Türen in Fluchtwegen) · Suva-Checkliste 67157 „Fluchtwege“'],
      ['M4', 'VKF-Brandschutzvorschriften (BSV 2015)'],
      ['M5', 'Notfallorganisation nach EKAS-Richtlinie 6508'],
      ['M6', 'Notfallorganisation nach EKAS-Richtlinie 6508'],
      ['M7', 'VUV Art. 5 (PSA) · UVG Art. 82 (Pflicht zum Tragen) · Suva-Checkliste 67091 „Persönliche Schutzausrüstungen“'],
      ['M8', 'VUV (sichere Lagerung, Arbeitsmittel)'],
      ['M9', 'ChemV · ArGV 3 Art. 24a'],
    ]);
  });
});
