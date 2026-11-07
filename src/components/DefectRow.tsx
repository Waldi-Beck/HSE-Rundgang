import { CheckCircle, ImageSquare, PencilSimple } from '@phosphor-icons/react';
import { useState } from 'react';
import { areaLabel } from '../data/checklist';
import { DEFECT_STATUS_LABELS, PRIORITY_KEY_TO_TEXT } from '../data/register';
import { resolveDefectWithEvidence, updateDefect } from '../db';
import { displayWalkNumber, formatDate, toISODate } from '../lib/dates';
import { defectDaysOpen, validDefectDue } from '../lib/register';
import type { Defect, DefectStatus, Photo, Walk } from '../lib/types';
import { defectItemLabel } from '../lib/walk';
import { useRegisterSettings } from './SettingsContext';
import { Badge, Field } from './ui';
import { PhotoInput, type PhotoDraft } from './PhotoInput';

export function DefectRow({
  defect,
  walk,
  resolutionWalkId,
  photoCount,
  onOpen,
  showOrigin = true,
}: {
  defect: Defect;
  walk?: Walk;
  resolutionWalkId?: string;
  photoCount?: number;
  onOpen?: () => void;
  showOrigin?: boolean;
}) {
  const settings = useRegisterSettings();
  const [editingFollowup, setEditingFollowup] = useState(false);
  const [status, setStatus] = useState<DefectStatus>(defect.status);
  const [recheckAt, setRecheckAt] = useState(defect.recheckAt ?? '');
  const [controlledBy, setControlledBy] = useState(defect.controlledBy);
  const [fixed, setFixed] = useState(defect.fixed === null ? '' : defect.fixed ? 'yes' : 'no');
  const [newDue, setNewDue] = useState(defect.newDue);
  const [note, setNote] = useState(defect.note);
  const [resolutionPhotos, setResolutionPhotos] = useState<PhotoDraft[]>([]);
  const [resolutionError, setResolutionError] = useState('');
  const [savingFollowup, setSavingFollowup] = useState(false);
  const walkDate = walk?.date ?? defect.createdAt.slice(0, 10);
  const validDue = validDefectDue(walkDate, defect, settings);
  const daysOpen = defectDaysOpen(walkDate, defect);
  const overdue = defect.status !== 'done' && validDue < new Date().toISOString().slice(0, 10);
  const resolving = status === 'done' || fixed === 'yes';
  const reasonRequired = status === 'inProgress' || fixed === 'no';
  const reasonMissing = reasonRequired && !note.trim();

  const saveFollowup = async () => {
    setSavingFollowup(true);
    setResolutionError('');
    try {
    if (reasonMissing) {
      setResolutionError('Bitte begründe in der Bemerkung, warum der Mangel noch nicht vollständig behoben ist.');
      return;
    }
    if (resolving) {
      if (!resolutionPhotos.length) {
        setResolutionError('Bitte zuerst mindestens ein Nachher-Foto aufnehmen oder auswählen.');
        return;
      }
      const evidence = resolutionPhotos.map(({ id, blob, width, height, createdAt }): Omit<Photo, 'defectId'> => ({ id, blob, width, height, createdAt }));
      await resolveDefectWithEvidence(defect.id, evidence, {
        recheckAt: recheckAt || toISODate(new Date()), controlledBy, newDue: '', resolvedInWalkId: resolutionWalkId ?? null,
      });
      setEditingFollowup(false);
      return;
    }
    await updateDefect(defect.id, {
      status,
      recheckAt: recheckAt || null,
      controlledBy,
      fixed: fixed === '' ? null : fixed === 'yes',
      newDue: fixed === 'no' ? newDue : '',
      doneAt: defect.doneAt,
      note,
    });
    setEditingFollowup(false);
    } catch (error) {
      setResolutionError((error as Error).message || 'Speichern fehlgeschlagen.');
    } finally {
      setSavingFollowup(false);
    }
  };

  return (
    <li className="px-4 py-3.5" data-testid={`defect-${defect.nr}`}>
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <span className="font-semibold tabular-nums">{defect.mangelId}</span>
        <span className="text-muted">Nr. {defect.nr} · {defectItemLabel(defect.itemId)}</span>
        {showOrigin && walk && <span className="text-muted">{displayWalkNumber(walk.date)}</span>}
        <span className="ml-auto flex items-center gap-1.5">
          <Badge tone={defect.priority === 'K' ? 'danger' : 'neutral'}>{PRIORITY_KEY_TO_TEXT[defect.priority]}</Badge>
          <Badge tone={defect.status === 'done' ? 'ok' : overdue ? 'danger' : defect.status === 'recheck' ? 'warn' : 'neutral'}>{DEFECT_STATUS_LABELS[defect.status]}</Badge>
        </span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
        <span>{formatDate(walkDate)}</span><span>{areaLabel(defect.area, settings.areas)}</span><span>{defectItemLabel(defect.itemId)}</span>
        <span className={overdue ? 'font-semibold text-danger' : ''}>Gültige Frist {formatDate(validDue)}</span><span>{daysOpen} Tage offen</span>
        {photoCount ? <span className="inline-flex items-center gap-1"><ImageSquare size={14} aria-hidden />{photoCount}</span> : null}
      </div>
      <p className="mt-2 text-[15px] font-medium">{defect.description}</p>
      {defect.hazard && <p className="mt-1 text-sm text-muted">Gefahr: {defect.hazard}</p>}
      <div className="mt-2 grid gap-x-3 gap-y-1 text-sm text-muted sm:grid-cols-2">
        {defect.immediateAction && <p>Sofortmassnahme: {defect.immediateAction}</p>}
        {defect.action && <p>Massnahme: {defect.action}</p>}
        {defect.responsible && <p>Verantwortlich: {defect.responsible}</p>}
        {defect.controlledBy && <p>Kontrolliert von: {defect.controlledBy}</p>}
        {defect.fixed !== null && <p>Mangel behoben: {defect.fixed ? 'Ja' : 'Nein'}</p>}
      </div>
      {defect.note && <p className="mt-1 text-sm text-muted">Bemerkung: {defect.note}</p>}

      {onOpen && (
        <button type="button" onClick={onOpen} className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-sm font-medium">
          <PencilSimple size={16} aria-hidden /> Mangel öffnen
        </button>
      )}
      {!editingFollowup ? (
        <button type="button" className="mt-2 ml-2 inline-flex min-h-10 items-center gap-1.5 px-2 text-sm font-medium text-accent" onClick={() => setEditingFollowup(true)} data-testid={`followup-${defect.id}`}>
          <CheckCircle size={17} aria-hidden /> Nachkontrolle aktualisieren
        </button>
      ) : (
        <div className="mt-3 grid gap-3 rounded-lg border border-line bg-surface-2 p-3 sm:grid-cols-2">
          <Field label="Status" htmlFor={`status-${defect.id}`}>
            <select id={`status-${defect.id}`} className="field" value={status} onChange={(event) => setStatus(event.target.value as DefectStatus)}>
              {Object.entries(DEFECT_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </Field>
          <Field label="Nachkontrolle am" htmlFor={`recheck-${defect.id}`}>
            <input id={`recheck-${defect.id}`} type="date" className="field" value={recheckAt} onChange={(event) => setRecheckAt(event.target.value)} />
          </Field>
          <Field label="Kontrolliert von" htmlFor={`controller-${defect.id}`}>
            <input id={`controller-${defect.id}`} className="field" value={controlledBy} onChange={(event) => setControlledBy(event.target.value)} />
          </Field>
          <Field label="Mangel behoben?" htmlFor={`fixed-${defect.id}`}>
            <select id={`fixed-${defect.id}`} className="field" value={fixed} onChange={(event) => setFixed(event.target.value)}>
              <option value="">Noch nicht kontrolliert</option><option value="yes">Ja</option><option value="no">Nein</option>
            </select>
          </Field>
          {resolving && <fieldset className="space-y-2 sm:col-span-2 rounded-lg border border-accent/30 bg-accent-soft/30 p-3">
            <legend className="label px-1">Behebung dokumentieren</legend>
            <p className="text-sm text-muted">Bitte fotografiere den behobenen Zustand. Das ursprüngliche Mängelfoto zählt nicht als Nachweis.</p>
            <PhotoInput photos={resolutionPhotos} onAdd={(added) => { setResolutionPhotos((current) => [...current, ...added]); setResolutionError(''); }} onRemove={(id) => setResolutionPhotos((current) => current.filter((photo) => photo.id !== id))} />
            <p className="text-sm font-medium text-accent">Nach dem Speichern ergänzen wir automatisch einen Dankessatz zur guten Behebung.</p>
          </fieldset>}
          {resolutionError && <p role="alert" className="text-sm text-danger sm:col-span-2" data-testid={`followup-error-${defect.id}`}>{resolutionError}</p>}
          {fixed === 'no' && <Field label="Neuer Termin" htmlFor={`newdue-${defect.id}`}><input id={`newdue-${defect.id}`} type="date" className="field" value={newDue} onChange={(event) => setNewDue(event.target.value)} /></Field>}
          <Field label={reasonRequired ? 'Bemerkung / Grund (Pflicht)' : 'Bemerkung'} htmlFor={`follow-note-${defect.id}`} hint={reasonRequired ? 'Bitte kurz erklären, was noch offen ist und warum.' : undefined}>
            <input id={`follow-note-${defect.id}`} className="field" value={note} required={reasonRequired} aria-required={reasonRequired} onChange={(event) => { setNote(event.target.value); setResolutionError(''); }} />
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setEditingFollowup(false)} disabled={savingFollowup}>Abbrechen</button>
            <button type="button" className="btn-primary flex-1" onClick={() => void saveFollowup()} disabled={savingFollowup || fixed === 'no' && !newDue || reasonMissing || resolving && !resolutionPhotos.length} data-testid={`save-followup-${defect.id}`}>{savingFollowup ? 'Speichert …' : 'Nachkontrolle speichern'}</button>
          </div>
        </div>
      )}
    </li>
  );
}
