import type { PRIO, RESULT_LABELS } from '../data/checklist';

/** SOP 2 "Bewertung": OK / Mangel / n.a. */
export type Rating = 'ok' | 'mangel' | 'na';
export type WalkType = 'weekly' | 'monthly';
export type WalkStatus = 'draft' | 'closed';
export type Prio = keyof typeof PRIO;
export type ResultKey = keyof typeof RESULT_LABELS;

export interface Signature {
  name: string;
  date: string; // YYYY-MM-DD
  image: string; // PNG data URL, '' wenn noch nicht gezeichnet
}

export interface Walk {
  id: string;
  date: string; // YYYY-MM-DD
  isoYear: number;
  week: number;
  time: string; // HH:MM
  inspector: string;
  companion: string;
  type: WalkType;
  openPointsNote: string;
  /** Beim Abschluss eingefrorene Liste offener Punkte aus früheren Rundgängen */
  openPointsSnapshot: string[] | null;
  /** Schlüssel: Wochenpunkt je Bereich `W4@qlabs`, Monatspunkt `M1` */
  ratings: Record<string, Rating>;
  result: ResultKey | null;
  signature: Signature;
  acknowledgement: Signature;
  status: WalkStatus;
  sopVersion: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface Defect {
  id: string;
  walkId: string;
  nr: number;
  itemId: string;
  /** Bereich (SOP 4 "Nr. / Pkt. / Bereich"): AreaId, bei Monatspunkten auch 'alle' */
  area: string;
  hazard: string;
  action: string;
  responsible: string;
  prio: Prio;
  due: string; // YYYY-MM-DD
  status: 'open' | 'done';
  doneAt: string | null;
  doneNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  defectId: string;
  blob: Blob;
  width: number;
  height: number;
  createdAt: string;
}
