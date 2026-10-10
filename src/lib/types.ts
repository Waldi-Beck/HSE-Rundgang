import type { PriorityKey, Rating, ResultKey } from '../data/checklist';
export type { PriorityKey, Rating, ResultKey } from '../data/checklist';

export type WalkStatus = 'draft' | 'closed';

export interface Signature {
  name: string;
  date: string;
  image: string;
}

export interface Walk {
  id: string;
  /** Immutable annual app ID, independent of SOP_META.docId. */
  docNr: string;
  date: string;
  isoYear: number;
  week: number;
  startTime: string;
  endTime: string;
  inspector: string;
  companion: string;
  monthlyChecked: boolean;
  /** R4@qlabs / R2@qps / M2@Engineering -> status */
  ratings: Record<string, Rating>;
  /** One selected area per monthly checklist item M1-M9. */
  monthlyAreas: Record<string, string>;
  openDefectSnapshot: string[] | null;
  result: ResultKey | null;
  note: string;
  signature: Signature;
  acknowledgement: Signature;
  status: WalkStatus;
  sopVersion: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export type DefectStatus = 'open' | 'inProgress' | 'done' | 'recheck';

export interface Defect {
  id: string;
  walkId: string;
  nr: number;
  mangelId: string;
  itemId: string;
  area: string;
  description: string;
  hazard: string;
  immediateAction: string;
  action: string;
  responsible: string;
  priority: PriorityKey;
  due: string;
  status: DefectStatus;
  doneAt: string | null;
  recheckAt: string | null;
  controlledBy: string;
  fixed: boolean | null;
  newDue: string;
  note: string;
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

export interface Inspection {
  id: string;
  description: string;
  area: string;
  intervalMonths: number | null;
  lastInspection: string;
  responsible: string;
  evidence: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterSettings {
  id: 'app';
  areas: string[];
  priorityDays: Record<PriorityKey, number>;
  maxIntervalDays: number;
  updatedAt?: string;
}

export interface DerivedInspection extends Inspection {
  nextDue: string;
  status: 'überfällig' | 'bald fällig' | 'ok' | 'Datum fehlt' | 'Intervall fehlt';
}

export interface RoundRegisterRow {
  index: number;
  walk: Walk;
  daysSincePrevious: number | null;
  interval: 'eingehalten' | 'überschritten' | '';
  durationMinutes: number | null;
  defectCount: number;
  criticalCount: number;
  openCount: number;
  pdfFilename: string;
  firstOfMonth: boolean;
  monthlyWarning: boolean;
}
