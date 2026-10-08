import { areaLabel } from '../data/checklist';
import { INITIAL_INSPECTIONS, PRIORITY_KEY_TO_TEXT, PRIORITIES, RESULT_LABELS } from '../data/register';
import { addDays, addMonths, durationMinutes, isOverdue, toISODate } from './dates';
import type { Defect, DerivedInspection, Inspection, RegisterSettings, RoundRegisterRow, Walk } from './types';

export function priorityDays(settings: RegisterSettings, priority: Defect['priority']): number {
  return settings.priorityDays[priority] ?? PRIORITIES[priority].defaultDays;
}

export function validDefectDue(walkDate: string, defect: Pick<Defect, 'priority' | 'due' | 'newDue'>, settings: RegisterSettings): string {
  return defect.newDue || defect.due || addDays(walkDate, priorityDays(settings, defect.priority));
}

export function defectDaysOpen(walkDate: string, defect: Pick<Defect, 'doneAt'>, today = toISODate(new Date())): number {
  const end = defect.doneAt || today;
  return Math.max(0, Math.floor((new Date(`${end}T12:00:00`).getTime() - new Date(`${walkDate}T12:00:00`).getTime()) / 864e5));
}

export function deriveInspection(inspection: Inspection, today = toISODate(new Date())): DerivedInspection {
  let status: DerivedInspection['status'];
  let nextDue = '';
  if (!inspection.lastInspection) status = 'Datum fehlt';
  else if (!inspection.intervalMonths || inspection.intervalMonths < 1) status = 'Intervall fehlt';
  else {
    nextDue = addMonths(inspection.lastInspection, inspection.intervalMonths);
    status = today > nextDue ? 'überfällig' : (new Date(`${nextDue}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 864e5 <= 30 ? 'bald fällig' : 'ok';
  }
  return { ...inspection, nextDue, status };
}

export function inspectionSeeds(now = new Date()): Inspection[] {
  const stamp = now.toISOString();
  return INITIAL_INSPECTIONS.map((seed, index) => ({
    id: `inspection-${String(index + 1).padStart(2, '0')}`,
    description: seed.description,
    area: seed.area,
    intervalMonths: seed.intervalMonths,
    lastInspection: '',
    responsible: '',
    evidence: '',
    note: seed.note,
    createdAt: stamp,
    updatedAt: stamp,
  }));
}

export function orderedWalks(walks: Walk[]): Walk[] {
  return [...walks].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export function roundRegisterRows(walks: Walk[], defects: Defect[], settings: RegisterSettings): RoundRegisterRow[] {
  const ordered = orderedWalks(walks);
  return ordered.map((walk, index) => {
    const previous = ordered[index - 1];
    const daysSincePrevious = previous
      ? Math.max(0, Math.floor((new Date(`${walk.date}T12:00:00`).getTime() - new Date(`${previous.date}T12:00:00`).getTime()) / 864e5))
      : null;
    const ownDefects = defects.filter((defect) => defect.walkId === walk.id);
    const firstOfMonth = !ordered.some((other) => other.id !== walk.id && other.date.slice(0, 7) === walk.date.slice(0, 7) &&
      (other.date < walk.date || (other.date === walk.date && (other.createdAt < walk.createdAt || (other.createdAt === walk.createdAt && other.id < walk.id)))));
    return {
      index: index + 1,
      walk,
      daysSincePrevious,
      interval: daysSincePrevious === null ? '' : daysSincePrevious > settings.maxIntervalDays ? 'überschritten' : 'eingehalten',
      durationMinutes: durationMinutes(walk.startTime, walk.endTime),
      defectCount: ownDefects.length,
      criticalCount: ownDefects.filter((defect) => defect.priority === 'K').length,
      openCount: ownDefects.filter((defect) => defect.status !== 'done').length,
      pdfFilename: `HSE-Rundgang_${walk.date}_${walk.docNr}.pdf`,
      firstOfMonth,
      monthlyWarning: firstOfMonth && !walk.monthlyChecked,
    };
  });
}

export interface OverviewMetrics {
  walkCount: number;
  lastWalk: Walk | null;
  daysSinceLastWalk: number | null;
  nextLatestDate: string | null;
  intervalExceeded: boolean;
  monthlyCheckedThisMonth: boolean;
  defectCount: number;
  openDefectCount: number;
  overdueDefectCount: number;
  criticalOrHighOpenCount: number;
  recheckCount: number;
  doneCount: number;
  defectsByArea: { area: string; total: number; open: number; done: number; overdue: number }[];
  defectsByPriority: { priority: Defect['priority']; label: string; total: number; open: number }[];
  roundWarning: boolean;
}

export function overviewMetrics(
  walks: Walk[],
  defects: Defect[],
  settings: RegisterSettings,
  today = toISODate(new Date()),
): OverviewMetrics {
  const ordered = orderedWalks(walks);
  const lastWalk = ordered.at(-1) ?? null;
  const daysSinceLastWalk = lastWalk
    ? Math.max(0, Math.floor((new Date(`${today}T12:00:00`).getTime() - new Date(`${lastWalk.date}T12:00:00`).getTime()) / 864e5))
    : null;
  const nextLatestDate = lastWalk ? addDays(lastWalk.date, settings.maxIntervalDays) : null;
  const currentMonth = today.slice(0, 7);
  const currentMonthWalks = ordered.filter((walk) => walk.date.slice(0, 7) === currentMonth);
  const monthlyCheckedThisMonth = currentMonthWalks.some((walk) => walk.monthlyChecked);
  const defectsByArea = settings.areas.map((area) => {
    const inArea = defects.filter((defect) => areaLabel(defect.area, settings.areas) === area);
    return {
      area,
      total: inArea.length,
      open: inArea.filter((defect) => defect.status !== 'done').length,
      done: inArea.filter((defect) => defect.status === 'done').length,
      overdue: inArea.filter((defect) => defect.status !== 'done' && isOverdue(validDefectDue(walks.find((walk) => walk.id === defect.walkId)?.date ?? defect.createdAt.slice(0, 10), defect, settings), today)).length,
    };
  });
  const defectsByPriority = (Object.keys(PRIORITIES) as Defect['priority'][]).map((priority) => {
    const withPriority = defects.filter((defect) => defect.priority === priority);
    return { priority, label: PRIORITY_KEY_TO_TEXT[priority], total: withPriority.length, open: withPriority.filter((defect) => defect.status !== 'done').length };
  });
  return {
    walkCount: walks.length,
    lastWalk,
    daysSinceLastWalk,
    nextLatestDate,
    intervalExceeded: daysSinceLastWalk !== null && daysSinceLastWalk > settings.maxIntervalDays,
    monthlyCheckedThisMonth,
    defectCount: defects.length,
    openDefectCount: defects.filter((defect) => defect.status !== 'done').length,
    overdueDefectCount: defects.filter((defect) => defect.status !== 'done' && isOverdue(validDefectDue(walks.find((walk) => walk.id === defect.walkId)?.date ?? defect.createdAt.slice(0, 10), defect, settings), today)).length,
    criticalOrHighOpenCount: defects.filter((defect) => defect.status !== 'done' && ['K', 'H'].includes(defect.priority)).length,
    recheckCount: defects.filter((defect) => defect.status === 'recheck').length,
    doneCount: defects.filter((defect) => defect.status === 'done').length,
    defectsByArea,
    defectsByPriority,
    roundWarning: !!lastWalk && daysSinceLastWalk !== null && daysSinceLastWalk > settings.maxIntervalDays,
  };
}

export function suggestedResult(defects: Defect[]): keyof typeof RESULT_LABELS {
  if (!defects.length) return 'none';
  if (defects.some((defect) => defect.priority === 'K')) return 'critical';
  if (defects.some((defect) => defect.status !== 'done' && defect.priority === 'H')) return 'open';
  return 'minor';
}
