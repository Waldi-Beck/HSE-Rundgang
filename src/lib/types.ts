import type { PRIO, RESULT_LABELS } from '../data/checklist';

export type Rating = 'ok' | 'nok' | 'na';
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
  area: string;
  type: WalkType;
  openPointsNote: string;
  /** Beim Abschluss eingefrorene Liste offener Punkte aus früheren Rundgängen */
  openPointsSnapshot: string[] | null;
  ratings: Record<string, Rating>;
  observations: string;
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
