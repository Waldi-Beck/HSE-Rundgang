import { CHECKLIST_ITEM_BY_ID, FORM_AREAS, MONTHLY_ITEMS, REGISTER_AREA_DEFAULTS, WEEKLY_ITEMS, areaLabel } from '../data/checklist';
import { createMangelId, weekLabel } from './dates';
import { priorityDays, validDefectDue } from './register';
import type { Defect, Walk } from './types';

export function cellKey(itemId: string, area?: string): string {
  return area ? `${itemId}@${area}` : itemId;
}

export function parseCellKey(key: string): { itemId: string; area: string } {
  const separator = key.indexOf('@');
  return separator < 0 ? { itemId: key, area: '' } : { itemId: key.slice(0, separator), area: key.slice(separator + 1) };
}

export const isWeeklyItem = (itemId: string) => /^R(?:[1-9]|1[0-5])$/.test(itemId);
export const isMonthlyItem = (itemId: string) => /^M[1-9]$/.test(itemId);
export const isOtherFinding = (itemId: string) => itemId === 'SONSTIGES';
export const defectItemLabel = (itemId: string) => isOtherFinding(itemId) ? 'Sonstiges (nicht in Checkliste)' : itemId;

export function weeklyKeys(area?: string): string[] {
  const areas = area ? [area] : FORM_AREAS.map((formArea) => formArea.id);
  return areas.flatMap((areaId) => WEEKLY_ITEMS.map((item) => cellKey(item.id, areaId)));
}

export function requiredRatingKeys(monthlyChecked: boolean): string[] {
  return [...weeklyKeys(), ...(monthlyChecked ? MONTHLY_ITEMS.map((item) => item.id) : [])];
}

export interface RatingCounts {
  total: number;
  checked: number;
  ok: number;
  mangel: number;
  na: number;
}

export function countRatings(walk: Pick<Walk, 'ratings' | 'monthlyChecked'>, keys = requiredRatingKeys(walk.monthlyChecked)): RatingCounts {
  const count: RatingCounts = { total: keys.length, checked: 0, ok: 0, mangel: 0, na: 0 };
  for (const key of keys) {
    const rating = walk.ratings[key];
    if (!rating) continue;
    count.checked++;
    count[rating]++;
  }
  return count;
}

export function firstWalkOfMonth(date: string, otherDates: string[]): boolean {
  const month = date.slice(0, 7);
  return !otherDates.some((otherDate) => otherDate.slice(0, 7) === month && otherDate <= date);
}

export function suggestMonthlyChecked(date: string, otherDates: string[]): boolean {
  return firstWalkOfMonth(date, otherDates);
}

export function areasForItem(itemId: string, registerAreas: string[] = [...REGISTER_AREA_DEFAULTS]): { id: string; label: string }[] {
  if (isWeeklyItem(itemId)) return FORM_AREAS.map((area) => ({ id: area.id, label: area.label }));
  return registerAreas.map((label) => ({ id: label, label }));
}

export function defectsForCell<T extends Pick<Defect, 'itemId' | 'area'>>(key: string, defects: T[]): T[] {
  const { itemId, area } = parseCellKey(key);
  return defects.filter((defect) => defect.itemId === itemId && defect.area === area);
}

export function mangelWithoutDefect(walk: Pick<Walk, 'ratings' | 'monthlyChecked' | 'monthlyAreas'>, defects: Pick<Defect, 'itemId' | 'area'>[]): string[] {
  return requiredRatingKeys(walk.monthlyChecked).flatMap((key) => {
    if (walk.ratings[key] !== 'mangel') return [];
    if (isMonthlyItem(key)) return defects.some((defect) => defect.itemId === key) ? [] : [key];
    return defectsForCell(key, defects).length ? [] : [key];
  });
}

export function cellLabel(key: string): string {
  const { itemId, area } = parseCellKey(key);
  const formArea = FORM_AREAS.find((candidate) => candidate.id === area);
  return area ? `${itemId} / ${formArea?.label ?? areaLabel(area)}` : itemId;
}

export function defectPointLabel(defect: Pick<Defect, 'itemId' | 'area'>): string {
  const formArea = FORM_AREAS.find((candidate) => candidate.id === defect.area);
  const itemLabel = defectItemLabel(defect.itemId);
  return defect.area ? `${itemLabel} / ${formArea?.label ?? areaLabel(defect.area)}` : itemLabel;
}

export function nextDefectNr(defects: Pick<Defect, 'nr'>[]): number {
  return defects.reduce((max, defect) => Math.max(max, defect.nr), 0) + 1;
}

export function newMangelId(date: string, nr: number): string {
  return createMangelId(date, nr);
}

export function defectMissingFields(defect: Pick<Defect, 'itemId' | 'area' | 'description' | 'hazard' | 'priority'>): string[] {
  const missing: string[] = [];
  if (!defect.itemId) missing.push('Kontrollpunkt');
  if (!defect.area) missing.push('Bereich');
  if (!defect.description.trim()) missing.push('Beschreibung des Mangels');
  if (!defect.hazard.trim()) missing.push('Festgestellte Gefahr');
  if (!defect.priority) missing.push('Priorität');
  return missing;
}

export function defectAreaValid(defect: Pick<Defect, 'itemId' | 'area'>, registerAreas: string[] = [...REGISTER_AREA_DEFAULTS]): boolean {
  if (isOtherFinding(defect.itemId)) {
    return FORM_AREAS.some((area) => area.id === defect.area);
  }
  if (isMonthlyItem(defect.itemId)) {
    return FORM_AREAS.some((area) => area.id === defect.area) || registerAreas.includes(defect.area);
  }
  return areasForItem(defect.itemId, registerAreas).some((area) => area.id === defect.area);
}

function summarize(values: string[], max = 8): string {
  return values.length > max ? `${values.slice(0, max).join(', ')} und ${values.length - max} weitere` : values.join(', ');
}

export function validateForClose(walk: Walk, defects: Defect[], registerAreas: string[] = [...REGISTER_AREA_DEFAULTS]): string[] {
  const errors: string[] = [];
  if (!walk.date) errors.push('Datum fehlt (Kapitel 1).');
  if (!walk.startTime) errors.push('Beginn fehlt (Kapitel 1).');
  if (!walk.endTime) errors.push('Ende fehlt (Kapitel 1).');
  if (!walk.inspector.trim()) errors.push('Durchgeführt von fehlt (Kapitel 1).');
  const incomplete = requiredRatingKeys(walk.monthlyChecked).filter((key) => !walk.ratings[key]);
  if (incomplete.length) errors.push(`${incomplete.length} Felder nicht bewertet: ${summarize(incomplete.map(cellLabel))}.`);
  if (walk.monthlyChecked) {
    const missingMonthlyAreas = MONTHLY_ITEMS.filter((item) => !walk.monthlyAreas[item.id]);
    if (missingMonthlyAreas.length) errors.push(`Bereich fehlt für Monatspunkte: ${summarize(missingMonthlyAreas.map((item) => item.id))}.`);
  }
  for (const key of mangelWithoutDefect(walk, defects)) errors.push(`${cellLabel(key)} ist Mangel, aber ohne Eintrag in Kapitel 3.`);
  for (const defect of defects) {
    const missing = defectMissingFields(defect);
    if (missing.length) errors.push(`Mangel Nr. ${defect.nr}: ${missing.join(', ')} fehlt.`);
    else if (!isOtherFinding(defect.itemId) && !CHECKLIST_ITEM_BY_ID.has(defect.itemId)) errors.push(`Mangel Nr. ${defect.nr}: Kontrollpunkt ${defect.itemId} unbekannt.`);
    else if (!defectAreaValid(defect, registerAreas)) errors.push(`Mangel Nr. ${defect.nr}: Bereich passt nicht zu ${defect.itemId}.`);
  }
  if (!walk.result) errors.push('Gesamtbewertung fehlt (Kapitel 4).');
  if (!walk.signature.name.trim()) errors.push('Name Durchführende/r fehlt (Kapitel 4).');
  if (!walk.signature.image) errors.push('Unterschrift Durchführende/r fehlt (Kapitel 4).');
  return errors;
}

export function openPointLabel(defect: Defect, walk?: Walk): string {
  const origin = walk ? `${weekLabel(walk.isoYear, walk.week)} ` : '';
  return `${origin}${defect.mangelId} (${defectPointLabel(defect)}): ${defect.description}, Status ${defect.status}`;
}

export function isRequiredMonthlyRating(itemId: string, monthlyChecked: boolean): boolean {
  return isMonthlyItem(itemId) && monthlyChecked;
}

export { priorityDays, validDefectDue };
