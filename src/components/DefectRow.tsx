import { CheckCircle, ArrowCounterClockwise, ImageSquare } from '@phosphor-icons/react';
import { useState } from 'react';
import { PRIO } from '../data/checklist';
import { setDefectDone } from '../db';
import { formatDate, isOverdue, toISODate, weekLabel } from '../lib/dates';
import type { Defect, Walk } from '../lib/types';
import { defectPointLabel } from '../lib/walk';
import { Badge } from './ui';

/** Ein Mangel mit Nachkontrolle (FR-040). Wird in "Offene Punkte Vorwoche" und im Register verwendet. */
export function DefectRow({
  defect,
  walk,
  photoCount,
  onOpen,
  showOrigin = true,
}: {
  defect: Defect;
  walk?: Walk;
  photoCount?: number;
  onOpen?: () => void;
  showOrigin?: boolean;
}) {
  const [closing, setClosing] = useState(false);
  const [note, setNote] = useState('');
  const overdue = defect.status === 'open' && isOverdue(defect.due, toISODate(new Date()));

  return (
    <li className="px-4 py-3.5" data-testid={`defect-${defect.nr}`}>
      <button type="button" onClick={onOpen} disabled={!onOpen} className="block w-full text-left">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="font-semibold">Nr. {defect.nr}</span>
          <span className="text-muted">{defectPointLabel(defect)}</span>
          {showOrigin && walk && <span className="text-muted">{weekLabel(walk.isoYear, walk.week)}</span>}
          <span className="ml-auto flex items-center gap-1.5">
            <Badge tone={defect.prio === 'K' ? 'danger' : 'neutral'}>
              Prio {defect.prio} ({PRIO[defect.prio].hint})
            </Badge>
            {defect.status === 'done' ? <Badge tone="ok">erledigt</Badge> : overdue ? <Badge tone="warn">überfällig</Badge> : <Badge tone="neutral">offen</Badge>}
          </span>
        </div>
        <p className="mt-1 text-[15px]">{defect.hazard}</p>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted">
          {defect.action && <span>Massnahme: {defect.action}</span>}
          {defect.responsible && <span>Verantwortlich: {defect.responsible}</span>}
          <span className={overdue ? 'font-medium text-warn' : ''}>Frist {formatDate(defect.due)}</span>
          {!!photoCount && (
            <span className="inline-flex items-center gap-1">
              <ImageSquare size={14} aria-hidden /> {photoCount}
            </span>
          )}
        </div>
        {defect.status === 'done' && (
          <p className="mt-1 text-sm text-accent">
            Erledigt am {formatDate(defect.doneAt)}
            {defect.doneNote ? `: ${defect.doneNote}` : ''}
          </p>
        )}
      </button>

      <div className="mt-2.5">
        {defect.status === 'done' ? (
          <button type="button" className="text-sm font-medium text-muted underline underline-offset-2" onClick={() => setDefectDone(defect.id, false)}>
            <ArrowCounterClockwise size={14} className="mr-1 inline" aria-hidden />
            Wieder öffnen
          </button>
        ) : closing ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor={`note-${defect.id}`}>
              Vermerk zur Erledigung
            </label>
            <input
              id={`note-${defect.id}`}
              className="field"
              placeholder="Vermerk (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={() => setClosing(false)}>
                Abbrechen
              </button>
              <button type="button" className="btn-primary flex-1" onClick={() => setDefectDone(defect.id, true, note.trim())}>
                Bestätigen
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn-secondary min-h-10 text-sm" onClick={() => setClosing(true)}>
            <CheckCircle size={18} aria-hidden />
            Als erledigt markieren
          </button>
        )}
      </div>
    </li>
  );
}
