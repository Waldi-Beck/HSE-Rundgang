/** Fachlogik zum Rundgang (reine Funktionen, ohne UI und Datenbank). */
import {
  AREAS,
  GENERAL_AREA,
  MONTHLY_ITEMS,
  WEEKLY_ITEMS,
  areaLabel,
  findItem,
  type AreaId,
} from '../data/checklist';
import { addDays, addMonths, formatDate, weekLabel } from './dates';
import type { Defect, Prio, Rating, ResultKey, Walk, WalkType } from './types';

/** Bewertungsschlüssel: Wochenpunkt je Bereich `W4@qlabs`, Monatspunkt `M1`. */
export function cellKey(itemId: string, area?: string): string {
  return area ? `${itemId}@${area}` : itemId;
}

export function parseCellKey(key: string): { itemId: string; area: string } {
  const [itemId, area = ''] = key.split('@');
  return { itemId, area };
}

export const isWeeklyItem = (itemId: string) => /^W\d+$/.test(itemId);

/** Schlüssel der 96 Zellen der Matrix 2.1 (je Bereich 16 Punkte). */
export function weeklyKeys(area?: AreaId): string[] {
  const areas = area ? [area] : AREAS.map((a) => a.id);
  return areas.flatMap((a) => WEEKLY_ITEMS.map((i) => cellKey(i.id, a)));
}

/** SOP 1/2: Wochenrundgang = 2.1 (96 Zellen); Monatsrundgang = 2.1 + 2.2 (96 + 9). */
export function ratableKeys(type: WalkType): string[] {
  const weekly = weeklyKeys();
  return type === 'monthly' ? [...weekly, ...MONTHLY_ITEMS.map((i) => i.id)] : weekly;
}

/** Zulässige Bereiche für einen Mangel zum Punkt: Wochenpunkt = 6 Bereiche, Monatspunkt zusätzlich "allgemein". */
export function areasForItem(itemId: string): { id: string; label: string }[] {
  const list: { id: string; label: string }[] = AREAS.map((a) => ({ id: a.id, label: a.label }));
  return isWeeklyItem(itemId) ? list : [...list, { id: GENERAL_AREA.id, label: GENERAL_AREA.label }];
}

export interface Counts {
  total: number;
  checked: number;
  ok: number;
  mangel: number;
  na: number;
}

/** Fortschritt und Verteilung über eine Menge von Zellen (Standard: alle des Rundgangs). */
export function countRatings(walk: Pick<Walk, 'type' | 'ratings'>, keys = ratableKeys(walk.type)): Counts {
  const c: Counts = { total: keys.length, checked: 0, ok: 0, mangel: 0, na: 0 };
  for (const k of keys) {
    const r: Rating | undefined = walk.ratings[k];
    if (!r) continue;
    c.checked++;
    c[r]++;
  }
  return c;
}

/** SOP 3: "Anzahl Mängel" (Einträge in Kapitel 4) und "davon kritisch (K)". */
export function defectCounts(defects: Pick<Defect, 'prio'>[]): { total: number; critical: number } {
  return { total: defects.length, critical: defects.filter((d) => d.prio === 'K').length };
}

/** SOP 4: K sofort, H 48 Std., M 1 Woche, N 1 Monat (Richtwerte). */
export function dueFromPrio(walkDate: string, prio: Prio): string {
  switch (prio) {
    case 'K':
      return walkDate;
    case 'H':
      return addDays(walkDate, 2);
    case 'M':
      return addDays(walkDate, 7);
    case 'N':
      return addMonths(walkDate, 1);
  }
}

/** FR-003: Monatsrundgang, wenn im selben Kalendermonat noch kein anderer Rundgang existiert. */
export function suggestType(date: string, otherWalkDates: string[]): WalkType {
  const month = date.slice(0, 7);
  return otherWalkDates.some((d) => d.slice(0, 7) === month) ? 'weekly' : 'monthly';
}

/**
 * FR-022 Ergebnis-Vorschlag:
 * keine Mängel -> Ohne Beanstandung; Prio K -> Kritischer Mangel;
 * offener Mangel Prio H -> Offene Massnahmen; sonst Geringfügige Mängel.
 */
export function suggestResult(defects: Pick<Defect, 'prio' | 'status'>[]): ResultKey {
  if (defects.length === 0) return 'none';
  if (defects.some((d) => d.prio === 'K')) return 'critical';
  if (defects.some((d) => d.prio === 'H' && d.status === 'open')) return 'open';
  return 'minor';
}

/** Mängel, die zu einer Zelle gehören: Wochenzelle = gleicher Punkt und Bereich, Monatspunkt = gleicher Punkt. */
export function defectsForCell<T extends Pick<Defect, 'itemId' | 'area'>>(key: string, defects: T[]): T[] {
  const { itemId, area } = parseCellKey(key);
  return defects.filter((d) => d.itemId === itemId && (!area || d.area === area));
}

/** Zellen "Mangel" ohne Mangel mit passendem Punkt und Bereich (FR-024). */
export function mangelWithoutDefect(walk: Pick<Walk, 'type' | 'ratings'>, defects: Pick<Defect, 'itemId' | 'area'>[]): string[] {
  return ratableKeys(walk.type).filter((k) => walk.ratings[k] === 'mangel' && defectsForCell(k, defects).length === 0);
}

/** Lesbare Bezeichnung einer Zelle, z. B. "W4 / QLabs". */
export function cellLabel(key: string): string {
  const { itemId, area } = parseCellKey(key);
  return area ? `${itemId} / ${areaLabel(area)}` : itemId;
}

export function defectMissingFields(d: Pick<Defect, 'itemId' | 'area' | 'hazard' | 'prio' | 'due'>): string[] {
  const missing: string[] = [];
  if (!d.itemId) missing.push('Pkt.');
  if (!d.area) missing.push('Bereich');
  if (!d.hazard.trim()) missing.push('Mangel/Gefahr');
  if (!d.prio) missing.push('Prio');
  if (!d.due) missing.push('Frist');
  return missing;
}

/** Punkt und Bereich passen zusammen (Wochenpunkt nur mit einem der 6 Bereiche). */
export function defectAreaValid(d: Pick<Defect, 'itemId' | 'area'>): boolean {
  return areasForItem(d.itemId).some((a) => a.id === d.area);
}

function summarize(list: string[], max = 8): string {
  return list.length > max ? `${list.slice(0, max).join(', ')} und ${list.length - max} weitere` : list.join(', ');
}

/** FR-024: Liste der Gründe, die den Abschluss verhindern (leer = abschliessbar). */
export function validateForClose(walk: Walk, defects: Defect[]): string[] {
  const errors: string[] = [];
  if (!walk.date) errors.push('Datum fehlt (Kapitel 1).');
  if (!walk.inspector.trim()) errors.push('"Durchgeführt von" fehlt (Kapitel 1).');
  const open = ratableKeys(walk.type).filter((k) => !walk.ratings[k]);
  if (open.length) {
    errors.push(`${open.length} Feld${open.length === 1 ? '' : 'er'} nicht bewertet: ${summarize(open.map(cellLabel))}.`);
  }
  for (const k of mangelWithoutDefect(walk, defects)) {
    errors.push(`${cellLabel(k)} ist "Mangel", aber ohne Eintrag in Kapitel 4.`);
  }
  for (const d of defects) {
    const m = defectMissingFields(d);
    if (m.length) errors.push(`Mangel Nr. ${d.nr}: ${m.join(', ')} fehlt.`);
    else if (!findItem(d.itemId)) errors.push(`Mangel Nr. ${d.nr}: Pkt. "${d.itemId}" unbekannt.`);
    else if (!defectAreaValid(d)) errors.push(`Mangel Nr. ${d.nr}: Bereich passt nicht zu Pkt. ${d.itemId}.`);
  }
  if (!walk.result) errors.push('Gesamtergebnis nicht gewählt (Kapitel 3).');
  if (!walk.signature.name.trim()) errors.push('Name Durchführende/r fehlt (Kapitel 3).');
  if (!walk.signature.image) errors.push('Unterschrift Durchführende/r fehlt (Kapitel 3).');
  return errors;
}

/** Nächste Mangel-Nr. innerhalb eines Rundgangs. */
export function nextDefectNr(defects: Pick<Defect, 'nr'>[]): number {
  return defects.reduce((m, d) => Math.max(m, d.nr), 0) + 1;
}

/** Bewertungen, die durch einen Wechsel auf "weekly" ausgeblendet würden (Monatsteil 2.2). */
export function hiddenRatingsOnWeekly(walk: Pick<Walk, 'ratings'>): string[] {
  const weekly = new Set(ratableKeys('weekly'));
  return Object.keys(walk.ratings).filter((k) => !weekly.has(k));
}

/** "W4 / QLabs" für einen Mangel */
export function defectPointLabel(d: Pick<Defect, 'itemId' | 'area'>): string {
  return d.area ? `${d.itemId} / ${areaLabel(d.area)}` : d.itemId;
}

/** Einzeilige Beschreibung eines offenen Punkts aus einem früheren Rundgang. */
export function openPointLabel({ defect, walk }: { defect: Defect; walk?: Walk }): string {
  const origin = walk ? `${weekLabel(walk.isoYear, walk.week)} ` : '';
  return `${origin}Nr. ${defect.nr} (${defectPointLabel(defect)}): ${defect.hazard}, Frist ${formatDate(defect.due)}, Prio ${defect.prio}`;
}
