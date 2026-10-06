/**
 * Checklisten-Definition gemäss SOP QPS_HSE_00064 "HSE Wöchentlicher Rundgang".
 *
 * EINZIGE QUELLE der Checkliste. Bei einer neuen SOP-Version:
 *  1. SOP_META.version / validFrom anpassen
 *  2. Rubriken/Punkte hier ändern (IDs bestehender Punkte nicht umnummerieren)
 *  3. Tests laufen lassen (tests/unit/checklist.test.ts prüft Vollständigkeit)
 * Abgeschlossene Rundgänge speichern die SOP-Version, mit der sie erstellt wurden.
 */

export const SOP_META = {
  docId: 'QPS_HSE_00064',
  title: 'HSE Wöchentlicher Rundgang',
  version: '1.0',
  validFrom: '2026-10-05',
  company: 'QPS Engineering AG',
  author: 'Waldemar Becker (HSE)',
  references:
    'VUV, ArGV 3, ArGV 4, MaschV, NIV, ChemV, VVEA/VVA, VKF-Brandschutzvorschriften, EKAS 6508, intern: SOP_0016, HSE-Konzept xTec. Massgebend sind die gültigen Fassungen (fedlex.admin.ch); ersetzt keine Rechtsberatung.',
} as const;

export type SectionId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'M';
export type Rhythm = 'weekly' | 'monthly';

export interface ChecklistItem {
  id: string;
  text: string;
  /** G1: Freitext statt Bewertung */
  freeText?: boolean;
}

export interface Section {
  id: SectionId;
  title: string;
  rhythm: Rhythm;
  legal: string[];
  items: ChecklistItem[];
}

const items = (prefix: string, texts: string[]): ChecklistItem[] =>
  texts.map((text, i) => ({ id: `${prefix}${i + 1}`, text }));

export const SECTIONS: Section[] = [
  {
    id: 'A',
    title: 'Alle Bereiche',
    rhythm: 'weekly',
    legal: ['VUV', 'ArGV 3', 'NIV', 'VKF'],
    items: items('A', [
      'Flucht- und Verkehrswege frei, nicht eingeengt',
      'Notausgänge frei, nicht verschlossen oder verstellt',
      'Feuerlöscher am Platz und frei zugänglich',
      'Brandschutztüren nicht verkeilt oder verstellt',
      'Nichts vor Löschern, Hydranten, Elektroverteilungen',
      'Keine Stolperstellen, Kabel oder Material am Boden',
      'Böden sauber, keine Flüssigkeiten (Öl, Wasser)',
      'Kabel und Stecker intakt, keine Mehrfachstecker-Ketten',
      'Schaltschränke geschlossen und frei zugänglich',
      'Defekte Geräte gesperrt und gekennzeichnet',
      'Vorgeschriebene PSA wird getragen',
      'Chemikalien beschriftet, geschlossen, keine Leckage',
      'Abfall getrennt, Behälter nicht überfüllt',
      'Regale nicht überladen, nichts kann herabfallen',
      'Beleuchtung in Verkehrswegen in Ordnung',
      'Erste-Hilfe-Kasten und Augenspülung zugänglich',
    ]),
  },
  {
    id: 'B',
    title: 'Engineering',
    rhythm: 'monthly',
    legal: ['NIV'],
    items: items('B', [
      'Versuchsaufbauten gesichert und gekennzeichnet',
      'Prototypen kippsicher, nicht in Verkehrswegen',
      'Akkus unbeschädigt, Laden nur beaufsichtigt',
    ]),
  },
  {
    id: 'C',
    title: 'QLabs: Labor und UV-Laser',
    rhythm: 'weekly',
    legal: ['VUV', 'ChemV', 'Suva'],
    items: items('C', [
      'Laser: Gehäuse zu, Warnleuchte und Interlock in Ordnung',
      'Laserschutzbrillen (355 nm) vorhanden und intakt',
      'Absaugung für Laserrauch / Abzug in Betrieb',
      'Glasbruch im stichfesten Behälter',
      'Druckgasflaschen gesichert (falls vorhanden)',
    ]),
  },
  {
    id: 'D',
    title: 'QMeasure: Messtechnik',
    rhythm: 'monthly',
    legal: ['VUV'],
    items: items('D', [
      'Messmaschinen: Schutz und Not-Halt in Ordnung',
      'Bewegte Achsen / Quetschstellen gesichert',
    ]),
  },
  {
    id: 'E',
    title: 'xTec: Lager',
    rhythm: 'monthly',
    legal: ['VUV'],
    items: items('E', [
      'Wareneingang und Fahrwege für Hubwagen frei',
      'Keine improvisierten Tritte, nur Leitern und Tritte',
      'Verpackung entsorgt, Akkus getrennt gelagert',
    ]),
  },
  {
    id: 'F',
    title: 'xTec: Werkstatt und Prototypenbau',
    rhythm: 'weekly',
    legal: ['VUV', 'MaschV', 'NIV'],
    items: items('F', [
      'Schutzeinrichtungen vorhanden, nicht überbrückt',
      'Not-Halt erreichbar und gekennzeichnet',
      'Cobots: Bereich markiert, Schutzfunktionen aktiv',
      'LOTO: laufende Arbeiten mit Schloss gesichert',
      'Elektro-Prototypen bei Tests abgegrenzt',
      'Druckluft: keine Leckagen, Schläuche intakt',
    ]),
  },
  {
    id: 'G',
    title: 'Weitere Beobachtungen',
    rhythm: 'weekly',
    legal: [],
    items: [{ id: 'G1', text: 'Weitere Beobachtungen (Freitext)', freeText: true }],
  },
  {
    id: 'M',
    title: 'Monatsteil: alle Bereiche',
    rhythm: 'monthly',
    legal: ['ArGV 3 Art. 36', 'VKF'],
    items: items('M', [
      'Erste-Hilfe-Kasten und Augenspülung: Inhalt, Ablaufdaten',
      'Feuerlöscher: Prüfplakette aktuell',
      'Fluchtwegschilder und Notbeleuchtung in Ordnung',
      'Brandschutztüren schliessen selbsttätig, Brandmelder frei',
      'Notrufnummern, Alarmplan, Ersthelfer, Sammelstelle aktuell',
      'Regale, Leitern und Tritte unbeschädigt',
      'Hand- und Elektrowerkzeuge unbeschädigt',
      'PSA-Bestand ausreichend, in gutem Zustand',
      'Gefahrstoffschrank geordnet, Stoffe getrennt',
      'Laser-Absaugung: Filterwechsel nicht überfällig',
      'AED einsatzbereit (falls vorhanden)',
      'Sicherheitszeichen vorhanden und lesbar',
    ]),
  },
];

export const ALL_ITEMS: ChecklistItem[] = SECTIONS.flatMap((s) => s.items);

export function findItem(id: string): ChecklistItem | undefined {
  return ALL_ITEMS.find((i) => i.id === id);
}

export const RATING_LABELS = {
  ok: 'OK',
  nok: 'Nicht OK',
  na: 'N/A',
} as const;

export const RATING_HELP =
  'OK = in Ordnung. Nicht OK = Mangel, wird in Kapitel 4 erfasst. N/A = nicht geprüft / nicht vorhanden.';

export const PRIO = {
  K: { label: 'K', name: 'Kritisch', hint: 'sofort' },
  H: { label: 'H', name: 'Hoch', hint: '48 Std.' },
  M: { label: 'M', name: 'Mittel', hint: '1 Woche' },
  N: { label: 'N', name: 'Niedrig', hint: '1 Monat' },
} as const;

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

export const TYPE_HINT = {
  weekly: 'Rubriken A, C, F, G',
  monthly: 'Rubriken A bis G und M (erster Rundgang im Monat)',
} as const;
