import { REGISTER_AREA_DEFAULTS } from './register';
export { REGISTER_AREA_DEFAULTS } from './register';

/** Current checklist and exact form copy from the new QPS_HSE_00064 DOTX. */
export const SOP_META = {
  docId: 'QPS_HSE_00064',
  title: 'HSE Rundgang',
  version: '1.0',
  validFrom: '2026-10-05',
  company: 'QPS Engineering AG',
  author: 'HSE',
} as const;

export const FORM_TITLE = 'HSE Rundgang';
export const FORM_SUBTITLE = 'Formular';
export const INTERVAL_NOTICE = 'Intervall: mindestens alle 2 Wochen (max. 14 Tage), bei Bedarf häufiger.';
export const NOT_IN_WALK_TEXT = 'Nicht im Rundgang: Geräteprüfungen (Laser inkl. Schutzbrille, Maschinen, Cobots, LOTO, Elektrogeräte) → Geräte-SOPs, Wartung, Excel „Prüftermine“.';
export const FORM_INTRO = `${INTERVAL_NOTICE}   ${NOT_IN_WALK_TEXT}`;
export const RATING_LEGEND = 'OK = in Ordnung   Mangel = in Kapitel 3 erfassen (Punkt + Bereich)   n.a. = nicht vorhanden / nicht begangen / Digital: Feld anklicken und Wert wählen · Ausgedruckt: ✓ = OK, ✗ = Mangel, – = n.a.';
export const PRIORITY_NOTE = 'Prio: K sofort · H 48 Std. · M 1 Woche · N 1 Monat (Richtwerte) · weitere Mängel: Zeile kopieren · Nachkontrolle im Excel-Register';
export const MONTHLY_NOTICE = '2.2 Monatlich – zusätzlich beim ersten Rundgang im Kalendermonat (9 Punkte)';
export const WEEKLY_NOTICE = '2.1 Bei jedem Rundgang – alle Räume (15 Punkte je Bereich)';
export const SIGNATURE_TITLE = '4. Abschluss';

/** Fixed room columns in form section 2.1. */
export const FORM_AREAS = [
  { id: 'qps', label: 'QPS' },
  { id: 'qlabs', label: 'QLabs' },
  { id: 'xtec', label: 'xTec' },
] as const;
export type FormAreaId = (typeof FORM_AREAS)[number]['id'];

export type Rating = 'ok' | 'mangel' | 'na';
export type PriorityKey = 'K' | 'H' | 'M' | 'N';
export type ResultKey = 'none' | 'minor' | 'open' | 'critical';

export interface ChecklistItem {
  id: string;
  text: string;
  basis: string;
}

export interface FormArea {
  id: FormAreaId;
  label: string;
}

export const WEEKLY_ITEMS: ChecklistItem[] = [
  { id: 'R1', text: 'Fluchtwege frei, mind. 1,2 m breit', basis: 'ArGV 4 Art. 8 (Fluchtwege) und Art. 10 (Türen in Fluchtwegen) · Suva-Checkliste 67157 „Fluchtwege“' },
  { id: 'R2', text: 'Notausgänge frei, ohne Schlüssel zu öffnen', basis: 'ArGV 4 Art. 8 (Fluchtwege) und Art. 10 (Türen in Fluchtwegen) · Suva-Checkliste 67157 „Fluchtwege“' },
  { id: 'R3', text: 'Fluchtwegschilder sichtbar, Evakuationsplan hängt', basis: 'ArGV 4 Art. 8 (Fluchtwege) und Art. 10 (Türen in Fluchtwegen) · Suva-Checkliste 67157 „Fluchtwege“' },
  { id: 'R4', text: 'Feuerlöscher am Platz und frei zugänglich', basis: 'VKF-Brandschutzvorschriften (BSV 2015)' },
  { id: 'R5', text: 'Brandschutztüren nicht verkeilt oder blockiert', basis: 'VKF-Brandschutzvorschriften (BSV 2015)' },
  { id: 'R6', text: 'Verkehrswege frei, keine Stolperstellen oder Flüssigkeiten', basis: 'VUV Art. 19 (Verkehrswege) · Suva-Checkliste 67001 „Verkehrswege für Personen“' },
  { id: 'R7', text: 'Elektroverteilungen geschlossen und frei zugänglich', basis: 'NIV (Niederspannungs-Installationsverordnung)' },
  { id: 'R8', text: 'Kabel und Stecker intakt, keine Mehrfachstecker-Ketten', basis: 'NIV (Niederspannungs-Installationsverordnung)' },
  { id: 'R9', text: 'Sicherheitszeichen vorhanden, richtig und gut sichtbar (Warn-, Gebots-, Verbotszeichen)', basis: 'VUV Art. 5 (PSA) · UVG Art. 82 (Pflicht zum Tragen) · Suva-Checkliste 67091 „Persönliche Schutzausrüstungen“' },
  { id: 'R10', text: 'PSA wird getragen (wo vorgeschrieben)', basis: 'VUV Art. 5 (PSA) · UVG Art. 82 (Pflicht zum Tragen) · Suva-Checkliste 67091 „Persönliche Schutzausrüstungen“' },
  { id: 'R11', text: 'Chemikalien beschriftet, geschlossen, im Schrank', basis: 'ChemV · ArGV 3 Art. 24a' },
  { id: 'R12', text: 'Abfall getrennt, nicht überfüllt; Glasbruch im stichfesten Behälter', basis: 'VVEA / VVA (Abfälle, Sonderabfälle)' },
  { id: 'R13', text: 'Regale nicht überladen, nichts kann herabfallen', basis: 'VUV (sichere Lagerung, Arbeitsmittel)' },
  { id: 'R14', text: 'Erste-Hilfe-Kasten und Augenspülung zugänglich', basis: 'ArGV 3 Art. 36 (Erste Hilfe)' },
  { id: 'R15', text: 'Beleuchtung in Verkehrs- und Fluchtwegen in Ordnung', basis: 'ArGV 3 Art. 15 (Beleuchtung) · VUV Art. 19 (Verkehrswege)' },
];

export const MONTHLY_ITEMS: ChecklistItem[] = [
  { id: 'M1', text: 'Erste-Hilfe-Kasten und Augenspülung: Inhalt, Ablaufdaten', basis: 'ArGV 3 Art. 36 (Erste Hilfe)' },
  { id: 'M2', text: 'Feuerlöscher: Prüfplakette aktuell', basis: 'VKF-Brandschutzvorschriften (BSV 2015)' },
  { id: 'M3', text: 'Notbeleuchtung und Fluchtwegleuchten funktionieren', basis: 'ArGV 4 Art. 8 (Fluchtwege) und Art. 10 (Türen in Fluchtwegen) · Suva-Checkliste 67157 „Fluchtwege“' },
  { id: 'M4', text: 'Brandschutztüren schliessen selbsttätig', basis: 'VKF-Brandschutzvorschriften (BSV 2015)' },
  { id: 'M5', text: 'Alarmplan, Notrufnummern, Ersthelfer-Liste aktuell', basis: 'Notfallorganisation nach EKAS-Richtlinie 6508' },
  { id: 'M6', text: 'Sammelstelle gekennzeichnet', basis: 'Notfallorganisation nach EKAS-Richtlinie 6508' },
  { id: 'M7', text: 'PSA-Bestand ausreichend, PSA in gutem Zustand', basis: 'VUV Art. 5 (PSA) · UVG Art. 82 (Pflicht zum Tragen) · Suva-Checkliste 67091 „Persönliche Schutzausrüstungen“' },
  { id: 'M8', text: 'Regale und Leitern unbeschädigt', basis: 'VUV (sichere Lagerung, Arbeitsmittel)' },
  { id: 'M9', text: 'Gefahrstoffschrank geordnet, unverträgliche Stoffe getrennt', basis: 'ChemV · ArGV 3 Art. 24a' },
];

export const ALL_ITEMS = [...WEEKLY_ITEMS, ...MONTHLY_ITEMS];
export const CHECKLIST_ITEM_BY_ID = new Map(ALL_ITEMS.map((item) => [item.id, item]));

/** Display area names by stable id, including all register choices. */
const AREA_LABELS: Record<string, string> = Object.fromEntries([
  ...FORM_AREAS.map(({ id, label }) => [id, label]),
  ['engineering', 'QPS'],
  ['qmeasure', 'QPS'],
  ['xtec-lager', 'xTec'],
  ['xtec-werkstatt', 'xTec'],
  ['buero', 'Büro / Verwaltung'],
  ['aussenbereich', 'Aussenbereich'],
]);
export function areaLabel(id: string, editableAreas: string[] = [...REGISTER_AREA_DEFAULTS]): string {
  const fixed = AREA_LABELS[id];
  if (fixed) return fixed;
  if (editableAreas.includes(id)) return id;
  const idx = id.startsWith('custom-') ? Number(id.slice(7)) : -1;
  return idx >= 0 ? editableAreas[idx] ?? id : id;
}

export function areaIdFromLabel(label: string, editableAreas: string[] = [...REGISTER_AREA_DEFAULTS]): string {
  if (label === 'Engineering' || label === 'QMeasure') return 'qps';
  if (label === 'xTec Lager' || label === 'xTec Werkstatt') return 'xtec';
  const fixed = Object.entries(AREA_LABELS).find(([, value]) => value === label);
  if (fixed) return fixed[0];
  if (editableAreas.includes(label)) return label;
  const idx = editableAreas.indexOf(label);
  return idx >= 0 ? (FORM_AREAS[idx]?.id ?? (idx === 5 ? 'buero' : idx === 6 ? 'aussenbereich' : `custom-${idx}`)) : label;
}

export const RATING_LABELS: Record<Rating, string> = { ok: 'OK', mangel: 'Mangel', na: 'n.a.' };
