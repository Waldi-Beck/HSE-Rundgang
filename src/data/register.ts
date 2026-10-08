import type { PriorityKey, ResultKey } from './checklist';

/** Editable area values from the workbook sheet Listen, cells A2:A12. */
export const REGISTER_AREA_DEFAULTS = [
  'Engineering',
  'QLabs',
  'QMeasure',
  'xTec Lager',
  'xTec Werkstatt',
  'Büro / Verwaltung',
  'Aussenbereich',
] as const;

export const DEFECT_STATUS_LABELS = {
  open: 'Offen',
  inProgress: 'In Bearbeitung',
  done: 'Erledigt',
  recheck: 'Nachkontrolle erforderlich',
} as const;

export const PRIORITIES: Record<PriorityKey, { label: string; name: string; defaultDays: number }> = {
  K: { label: 'K', name: 'Kritisch', defaultDays: 0 },
  H: { label: 'H', name: 'Hoch', defaultDays: 2 },
  M: { label: 'M', name: 'Mittel', defaultDays: 7 },
  N: { label: 'N', name: 'Niedrig', defaultDays: 30 },
};

export const PRIORITY_TEXT_TO_KEY: Record<string, PriorityKey> = { Kritisch: 'K', Hoch: 'H', Mittel: 'M', Niedrig: 'N' };
export const PRIORITY_KEY_TO_TEXT: Record<PriorityKey, string> = { K: 'Kritisch', H: 'Hoch', M: 'Mittel', N: 'Niedrig' };

/** Excel worksheet Listen dropdown options in their original order. */
export const RESULT_LABELS: Record<ResultKey, string> = {
  none: 'ohne Beanstandung',
  minor: 'mit geringfügigen Mängeln',
  open: 'mit offenen Massnahmen',
  critical: 'kritische Mängel – Sofortmassnahmen',
};

export const DEFAULT_REGISTER_SETTINGS = {
  id: 'app' as const,
  areas: [...REGISTER_AREA_DEFAULTS],
  priorityDays: { K: 0, H: 2, M: 7, N: 30 },
  maxIntervalDays: 14,
};

/** Excel Prüftermine proposal rows 7-21, wording and starting intervals retained. */
export const INITIAL_INSPECTIONS = [
  { description: 'Sicherheitsdatenblätter auf Aktualität prüfen', area: 'alle / QLabs', intervalMonths: 12, note: '' },
  { description: 'Gefahrstoffverzeichnis aktualisieren', area: 'alle', intervalMonths: 12, note: '' },
  { description: 'Elektrische Prüfung ortsveränderlicher Geräte - Prüfnachweise vollständig', area: 'alle', intervalMonths: 12, note: 'Intervall intern festlegen' },
  { description: 'Wartungsnachweise Maschinen und Anlagen kontrollieren', area: 'xTec Werkstatt / QMeasure', intervalMonths: 3, note: '' },
  { description: 'Cobot-Risikobeurteilung überprüfen (zusätzlich bei jeder Änderung der Anwendung)', area: 'xTec Werkstatt', intervalMonths: 12, note: '' },
  { description: 'LOTO-Ausrüstung vollständig (Schlösser, Anhänger, Übersicht)', area: 'xTec Werkstatt', intervalMonths: 3, note: '' },
  { description: 'Laseranlage: Unterweisung SOP_0016 und Funktionsprüfung Interlock dokumentiert', area: 'QLabs', intervalMonths: 12, note: '' },
  { description: 'Bedienungsanleitungen und Konformitätserklärungen vollständig', area: 'alle', intervalMonths: 12, note: '' },
  { description: 'Regalinspektion (Stützen, Traversen, Verankerung, Traglastschilder)', area: 'xTec Lager', intervalMonths: 12, note: '' },
  { description: 'Ergonomie der Bildschirmarbeitsplätze', area: 'Engineering / Büro', intervalMonths: 12, note: '' },
  { description: 'Evakuierungsübung / Sammelstelle', area: 'alle', intervalMonths: 12, note: '' },
  { description: 'Ersthelfer: Anzahl und Ausbildung aktuell', area: 'alle', intervalMonths: 12, note: '' },
  { description: 'Feuerlöscher-Wartung durch Fachfirma', area: 'alle', intervalMonths: null, note: 'gemäss Wartungsvertrag / Herstellerangabe' },
  { description: 'Gefährdungsermittlung und ASA-Unterlagen überprüfen (EKAS 6508)', area: 'alle', intervalMonths: 12, note: '' },
  { description: 'PSA-Bedarf und -Auswahl überprüfen', area: 'alle', intervalMonths: 12, note: '' },
] as const;
