/** Fachlogik zum Rundgang (reine Funktionen, ohne UI und Datenbank). */
import { SECTIONS, findItem, type Section } from '../data/checklist';
import { addDays, addMonths, formatDate, weekLabel } from './dates';
import type { Defect, Prio, ResultKey, Walk, WalkType } from './types';

/** SOP 1/2: Wochenrundgang = A, C, F, G; Monatsrundgang = A bis G + M. */
export function visibleSections(type: WalkType): Section[] {
  return type === 'monthly' ? SECTIONS : SECTIONS.filter((s) => s.rhythm === 'weekly');
}

/** Bewertbare Punkte (ohne Freitext G1) der angezeigten Rubriken. */
export function ratableItemIds(type: WalkType): string[] {
  return visibleSections(type)
    .flatMap((s) => s.items)
    .filter((i) => !i.freeText)
    .map((i) => i.id);
}

export interface Counts {
  total: number;
  checked: number;
  ok: number;
  nok: number;
  na: number;
}

/** SOP 3: Kontrolliert / OK / Nicht OK / N/A über die angezeigten Punkte. */
export function countRatings(walk: Pick<Walk, 'type' | 'ratings'>): Counts {
  const ids = ratableItemIds(walk.type);
  const c: Counts = { total: ids.length, checked: 0, ok: 0, nok: 0, na: 0 };
  for (const id of ids) {
    const r = walk.ratings[id];
    if (!r) continue;
    c.checked++;
    c[r]++;
  }
  return c;
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

/** Punkte "Nicht OK" ohne verknüpften Mangel. */
export function nokWithoutDefect(walk: Pick<Walk, 'type' | 'ratings'>, defects: Pick<Defect, 'itemId'>[]): string[] {
  const linked = new Set(defects.map((d) => d.itemId));
  return ratableItemIds(walk.type).filter((id) => walk.ratings[id] === 'nok' && !linked.has(id));
}

export function defectMissingFields(d: Pick<Defect, 'itemId' | 'hazard' | 'prio' | 'due'>): string[] {
  const missing: string[] = [];
  if (!d.itemId) missing.push('Pkt.');
  if (!d.hazard.trim()) missing.push('Mangel/Gefahr');
  if (!d.prio) missing.push('Prio');
  if (!d.due) missing.push('Frist');
  return missing;
}

/** FR-024: Liste der Gründe, die den Abschluss verhindern (leer = abschliessbar). */
export function validateForClose(walk: Walk, defects: Defect[]): string[] {
  const errors: string[] = [];
  if (!walk.date) errors.push('Datum fehlt (Kapitel 1).');
  if (!walk.inspector.trim()) errors.push('"Durchgeführt von" fehlt (Kapitel 1).');
  const ids = ratableItemIds(walk.type);
  const open = ids.filter((id) => !walk.ratings[id]);
  if (open.length) {
    errors.push(`${open.length} Punkt${open.length === 1 ? '' : 'e'} nicht bewertet: ${open.join(', ')}.`);
  }
  for (const id of nokWithoutDefect(walk, defects)) {
    errors.push(`${id} ist "Nicht OK", aber ohne Mangel in Kapitel 4.`);
  }
  for (const d of defects) {
    const m = defectMissingFields(d);
    if (m.length) errors.push(`Mangel Nr. ${d.nr}: ${m.join(', ')} fehlt.`);
    else if (!findItem(d.itemId)) errors.push(`Mangel Nr. ${d.nr}: Pkt. "${d.itemId}" unbekannt.`);
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

/** Ratings, die durch einen Wechsel auf "weekly" ausgeblendet würden. */
export function hiddenRatingsOnWeekly(walk: Pick<Walk, 'ratings'>): string[] {
  const weekly = new Set(ratableItemIds('weekly'));
  return Object.keys(walk.ratings).filter((id) => !weekly.has(id));
}

/** Einzeilige Beschreibung eines offenen Punkts aus einem früheren Rundgang. */
export function openPointLabel({ defect, walk }: { defect: Defect; walk?: Walk }): string {
  const origin = walk ? `${weekLabel(walk.isoYear, walk.week)} ` : '';
  return `${origin}Nr. ${defect.nr} (${defect.itemId}): ${defect.hazard}, Frist ${formatDate(defect.due)}, Prio ${defect.prio}`;
}
