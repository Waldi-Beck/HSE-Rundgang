/**
 * Checklisten-Definition gemäss SOP QPS_HSE_00064 "HSE Wöchentlicher Rundgang" (Formular, Stand 29.09.2026).
 *
 * EINZIGE QUELLE der Checkliste und aller Formulartexte. Bei einer neuen SOP-Version:
 *  1. SOP_META.version / validFrom anpassen
 *  2. Bereiche, Punkte und Texte hier ändern (IDs bestehender Punkte und Bereiche nicht umnummerieren)
 *  3. Tests laufen lassen (tests/unit/checklist.test.ts prüft Vollständigkeit und Grundlagen-Zuordnung)
 * Abgeschlossene Rundgänge speichern die SOP-Version, mit der sie erstellt wurden.
 *
 * Texte in Anführungszeichen sind wörtlich aus docs/sop/QPS_HSE_00064_HSE_Rundgang_V1.0.docx übernommen.
 */

export const SOP_META = {
  docId: 'QPS_HSE_00064',
  title: 'HSE Wöchentlicher Rundgang',
  version: '1.0',
  validFrom: '2026-10-05',
  company: 'QPS Engineering AG',
  author: 'Waldemar Becker (HSE)',
} as const;

/** Bereiche = Spalten der Matrix 2.1 (stabile IDs, Reihenfolge wie im Formular). */
export const AREAS = [
  { id: 'gaenge', label: 'Gänge / Treppen' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'qlabs', label: 'QLabs' },
  { id: 'qmeasure', label: 'QMeasure' },
  { id: 'xtec-lager', label: 'xTec Lager' },
  { id: 'xtec-werkstatt', label: 'xTec Werkstatt' },
] as const;
export type AreaId = (typeof AREAS)[number]['id'];

/** Zusätzliche Bereichsangabe für Monatspunkte (2.2, Spalte "Bereich"). */
export const GENERAL_AREA = { id: 'alle', label: 'Alle Bereiche / allgemein' } as const;
export type DefectArea = AreaId | typeof GENERAL_AREA.id;

export function areaLabel(id: string): string {
  if (id === GENERAL_AREA.id) return GENERAL_AREA.label;
  return AREAS.find((a) => a.id === id)?.label ?? id;
}

export type Rhythm = 'weekly' | 'monthly';

export interface ChecklistItem {
  id: string;
  text: string;
  rhythm: Rhythm;
}

const items = (prefix: string, rhythm: Rhythm, texts: string[]): ChecklistItem[] =>
  texts.map((text, i) => ({ id: `${prefix}${i + 1}`, text, rhythm }));

export const WEEKLY_TITLE = '2.1 Wöchentlich – alle Räume (16 Punkte je Bereich)';
export const MONTHLY_TITLE = '2.2 Monatlich – zusätzlich beim ersten Rundgang im Monat (9 Punkte)';

/** 2.1: jeder Punkt wird je Bereich (6 Spalten) bewertet. */
export const WEEKLY_ITEMS: ChecklistItem[] = items('W', 'weekly', [
  'Fluchtwege frei, mind. 1,2 m breit',
  'Notausgänge frei, ohne Schlüssel zu öffnen',
  'Fluchtwegschilder sichtbar, Evakuationsplan hängt',
  'Feuerlöscher am Platz und frei zugänglich',
  'Brandschutztüren nicht verkeilt oder blockiert',
  'Verkehrswege frei, keine Stolperstellen oder Flüssigkeiten',
  'Elektroverteilungen geschlossen und frei zugänglich',
  'Kabel und Stecker intakt, keine Mehrfachstecker-Ketten',
  'PSA-Gebotszeichen vorhanden (wo PSA-Pflicht)',
  'PSA wird getragen (wo vorgeschrieben)',
  'Chemikalien beschriftet, geschlossen, im Schrank',
  'Abfall getrennt, nicht überfüllt; Glasbruch im stichfesten Behälter',
  'Regale nicht überladen, nichts kann herabfallen',
  'Erste-Hilfe-Kasten und Augenspülung zugänglich',
  'Beleuchtung in Verkehrs- und Fluchtwegen in Ordnung',
  'Druckgasflaschen gesichert (falls vorhanden)',
]);

/** 2.2: je Punkt eine Bewertung plus Bereich. */
export const MONTHLY_ITEMS: ChecklistItem[] = items('M', 'monthly', [
  'Erste-Hilfe-Kasten und Augenspülung: Inhalt, Ablaufdaten',
  'Feuerlöscher: Prüfplakette aktuell',
  'Notbeleuchtung und Fluchtwegleuchten funktionieren',
  'Brandschutztüren schliessen selbsttätig',
  'Alarmplan, Notrufnummern, Ersthelfer-Liste aktuell',
  'Sammelstelle gekennzeichnet',
  'PSA-Bestand ausreichend, PSA in gutem Zustand',
  'Regale und Leitern unbeschädigt',
  'Gefahrstoffschrank geordnet, unverträgliche Stoffe getrennt',
]);

export const ALL_ITEMS: ChecklistItem[] = [...WEEKLY_ITEMS, ...MONTHLY_ITEMS];

export function findItem(id: string): ChecklistItem | undefined {
  return ALL_ITEMS.find((i) => i.id === id);
}

/** Kapitel 5 "Grundlagen je Kontrollpunkt" (Wortlaut der Tabelle; `ids` = ausgeschriebene Punkte der Spalte 1). */
export const LEGAL_BASES: { points: string; ids: string[]; text: string }[] = [
  {
    points: 'W1–W3, M3',
    ids: ['W1', 'W2', 'W3', 'M3'],
    text: 'ArGV 4 Art. 8 (Fluchtwege) und Art. 10 (Türen in Fluchtwegen) · Suva-Checkliste 67157 „Fluchtwege“',
  },
  { points: 'W4, W5, M2, M4', ids: ['W4', 'W5', 'M2', 'M4'], text: 'VKF-Brandschutzvorschriften' },
  {
    points: 'W6, W15',
    ids: ['W6', 'W15'],
    text: 'VUV Art. 19 (Verkehrswege) · ArGV 3 Art. 15 (Beleuchtung) · Suva-Checkliste 67001 „Verkehrswege für Personen“',
  },
  { points: 'W7, W8', ids: ['W7', 'W8'], text: 'NIV (Niederspannungs-Installationsverordnung)' },
  {
    points: 'W9, W10, M7',
    ids: ['W9', 'W10', 'M7'],
    text: 'VUV Art. 5 (PSA) · UVG Art. 82 (Pflicht zum Tragen) · Suva-Checkliste 67091 „Persönliche Schutzausrüstungen“',
  },
  { points: 'W11, M9', ids: ['W11', 'M9'], text: 'ChemV · ArGV 3 Art. 24a' },
  { points: 'W12', ids: ['W12'], text: 'VVEA / VVA (Abfälle, Sonderabfälle)' },
  { points: 'W13, W16, M8', ids: ['W13', 'W16', 'M8'], text: 'VUV (sichere Lagerung, Arbeitsmittel)' },
  {
    points: 'W14, M1, M5, M6',
    ids: ['W14', 'M1', 'M5', 'M6'],
    text: 'ArGV 3 Art. 36 (Erste Hilfe) · Notfallorganisation nach EKAS-Richtlinie 6508',
  },
];

/** Rechtsgrundlage eines Punkts aus der Tabelle "Grundlagen je Kontrollpunkt". */
export function legalBasisOf(itemId: string): string {
  return LEGAL_BASES.find((l) => l.ids.includes(itemId))?.text ?? '';
}

export const LEGAL_FOOTNOTE =
  'Massgebend sind die jeweils gültigen Fassungen (fedlex.admin.ch, suva.ch). Das Formular ist ein internes Kontrollinstrument und ersetzt keine Rechtsberatung.';

export const RATING_LABELS = {
  ok: 'OK',
  mangel: 'Mangel',
  na: 'n.a.',
} as const;

/** Kapitel 2 "Bewertung", Zeile 1 (wörtlich) */
export const RATING_LEGEND = 'OK = in Ordnung   Mangel = in Kapitel 4 erfassen (Punkt + Bereich)   n.a. = nicht vorhanden / nicht begangen';
/** Kapitel 2 "Bewertung", Zeile 2 (wörtlich; ✓ ✗ – werden im PDF als Vektorgrafik gezeichnet) */
export const RATING_LEGEND_PRINT = 'Digital: Feld anklicken und Wert wählen · Ausgedruckt: ✓ = OK, ✗ = Mangel, – = n.a.';

export const PRIO = {
  K: { label: 'K', name: 'Kritisch', hint: 'sofort' },
  H: { label: 'H', name: 'Hoch', hint: '48 Std.' },
  M: { label: 'M', name: 'Mittel', hint: '1 Woche' },
  N: { label: 'N', name: 'Niedrig', hint: '1 Monat' },
} as const;

/** Kapitel 4, Zeile über der Tabelle (wörtlich) */
export const PRIO_LINE =
  'Prio: K sofort · H 48 Std. · M 1 Woche · N 1 Monat (Richtwerte) · weitere Mängel: Zeile kopieren · Nachkontrolle im Excel-Register';

export const RESULT_LABELS = {
  none: 'Ohne Beanstandung',
  minor: 'Geringfügige Mängel',
  open: 'Offene Massnahmen',
  critical: 'Kritischer Mangel',
} as const;

export const TYPE_LABELS = {
  weekly: 'Wochenrundgang',
  monthly: 'Monatsrundgang',
} as const;

/** Wortlaut der Rundgangsart im Formular (Kapitel 1) */
export const TYPE_FORM_LABELS = {
  weekly: 'Wochenrundgang (2.1)',
  monthly: 'Monatsrundgang (2.1 + 2.2)',
} as const;

export const TYPE_HINT = {
  weekly: '2.1: 16 Punkte in 6 Bereichen',
  monthly: '2.1 und zusätzlich 2.2 (erster Rundgang im Monat)',
} as const;

/** Kapitel 5 "Ablauf" (wörtlich, zwei Absätze) */
export const PROCEDURE_TEXT = [
  '1. Vorlage öffnen (Doppelklick), Kapitel 1 ausfüllen.  2. Raum für Raum prüfen: in 2.1 je Bereich OK / Mangel / n.a.; beim ersten Rundgang im Monat zusätzlich 2.2.',
  '3. Mängel mit Foto in Kapitel 4 (Punkt + Bereich).  4. Als „HSE-Rundgang_JJJJ-KWxx“ speichern, PDF exportieren, im Excel-Register eintragen.',
];

/** Kapitel 5 "Nicht im Rundgang" (wörtlich) */
export const NOT_IN_WALK_TEXT =
  'Gerätebezogene Prüfungen (Laser inkl. Laserschutzbrille, Maschinen, Messmaschinen, Cobots, LOTO, Elektro- und Prüfgeräte) laufen über die Geräte-SOPs (z. B. SOP_0016), die Wartung und das Blatt „Prüftermine“ im Excel-Register.';

/** Kapitel 5 "Genehmigung" */
export const APPROVAL = [{ name: 'Waldemar Becker', position: 'HSE (Ersteller)' }];

/** Kapitel 5 "Änderungsverzeichnis" (wörtlich) */
export const CHANGE_LOG = [{ version: 'V1.0', description: 'Erstversion vom 29.09.2026' }];
