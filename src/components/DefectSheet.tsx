import { Trash, X } from '@phosphor-icons/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { FORM_AREAS, MONTHLY_ITEMS, WEEKLY_ITEMS, areaLabel } from '../data/checklist';
import { PRIORITIES, PRIORITY_KEY_TO_TEXT } from '../data/register';
import { db, deleteDefect, saveDefect } from '../db';
import { addDays } from '../lib/dates';
import { priorityDays } from '../lib/register';
import type { Defect, PriorityKey, Walk } from '../lib/types';
import { defectMissingFields, isWeeklyItem } from '../lib/walk';
import { useRegisterSettings } from './SettingsContext';
import { PhotoInput, type PhotoDraft } from './PhotoInput';
import { Field } from './ui';

export function DefectSheet({ walk, defect, onClose }: { walk: Walk; defect: Defect; onClose: (saved: boolean) => void }) {
  const settings = useRegisterSettings();
  const readOnly = walk.status === 'closed';
  const [d, setD] = useState<Defect>(() => ({ ...defect, due: defect.due || addDays(walk.date, priorityDays(settings, defect.priority)) }));
  const [newPhotos, setNewPhotos] = useState<PhotoDraft[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const stored = useLiveQuery(() => db.photos.where('defectId').equals(defect.id).toArray(), [defect.id]);
  const isExisting = useLiveQuery(async () => !!(await db.defects.get(defect.id)), [defect.id]);
  const photos: PhotoDraft[] = [
    ...(stored ?? []).filter((photo) => !removed.includes(photo.id)).map((photo) => ({ ...photo, isNew: false })),
    ...newPhotos,
  ];
  const items = walk.monthlyChecked ? [...WEEKLY_ITEMS, ...MONTHLY_ITEMS] : WEEKLY_ITEMS;
  const weekly = d.itemId ? isWeeklyItem(d.itemId) : true;
  const monthlyAreaOptions = settings.areas.map((id) => ({ id, label: areaLabel(id, settings.areas) })).filter((area, index, all) =>
    all.findIndex((candidate) => candidate.label === area.label) === index || area.id === d.area);
  const areaOptions = weekly ? FORM_AREAS.map((area) => ({ id: area.id, label: area.label })) : monthlyAreaOptions;
  const missing = defectMissingFields(d);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const set = (patch: Partial<Defect>) => setD((current) => ({ ...current, ...patch }));
  const setItem = (itemId: string) => {
    const monthly = itemId.startsWith('M');
    set({ itemId, area: monthly ? (settings.areas.includes(d.area) ? d.area : '') : (FORM_AREAS.some((area) => area.id === d.area) ? d.area : '') });
  };
  const setPriority = (priority: PriorityKey) => set({ priority, due: addDays(walk.date, priorityDays(settings, priority)) });

  const save = async () => {
    if (missing.length) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    const newOnes = newPhotos.map(({ id, blob, width, height, createdAt }) => ({ id, blob, width, height, createdAt }));
    await saveDefect(d, newOnes, removed);
    setSaving(false);
    onClose(true);
  };

  const remove = async () => {
    if (!confirm(`Mangel-ID ${d.mangelId} mit allen Fotos löschen?`)) return;
    await deleteDefect(d.id);
    onClose(true);
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="defect-title" className="fixed inset-0 z-40 flex flex-col bg-bg">
      <div className="border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div>
            <h2 id="defect-title" className="text-lg font-semibold">Mangel {d.mangelId}</h2>
            <p className="text-sm text-muted">Nr. {d.nr} · {d.itemId || 'Kontrollpunkt wählen'}{d.area ? ` · ${areaLabel(d.area, settings.areas)}` : ''}</p>
          </div>
          <button type="button" onClick={() => onClose(false)} aria-label="Schliessen" className="grid h-11 w-11 place-items-center rounded-lg"><X size={22} aria-hidden /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
          <Field label="Kontrollpunkt" htmlFor="d-item" error={showErrors && !d.itemId ? 'Bitte Kontrollpunkt wählen.' : undefined}>
            <select id="d-item" className="field" value={d.itemId} disabled={readOnly} onChange={(event) => setItem(event.target.value)}>
              <option value="">Bitte wählen</option>
              {items.map((item) => <option key={item.id} value={item.id}>{item.id}: {item.text}</option>)}
            </select>
          </Field>
          <Field label="Bereich" htmlFor="d-area" error={showErrors && !d.area ? 'Bitte Bereich wählen.' : undefined}>
            <select id="d-area" className="field" value={d.area} disabled={readOnly || !d.itemId} onChange={(event) => set({ area: event.target.value })}>
              <option value="">Bereich wählen</option>
              {areaOptions.map((area) => <option key={area.id} value={area.id}>{area.label}</option>)}
            </select>
          </Field>
          <Field label="Beschreibung des Mangels" htmlFor="d-description" error={showErrors && !d.description.trim() ? 'Bitte den Mangel beschreiben.' : undefined}>
            <textarea id="d-description" rows={2} className="field" value={d.description} disabled={readOnly} onChange={(event) => set({ description: event.target.value })} />
          </Field>
          <Field label="Festgestellte Gefahr" htmlFor="d-hazard" error={showErrors && !d.hazard.trim() ? 'Bitte die Gefahr beschreiben.' : undefined}>
            <textarea id="d-hazard" rows={2} className="field" value={d.hazard} disabled={readOnly} onChange={(event) => set({ hazard: event.target.value })} />
          </Field>
          <Field label="Sofortmassnahme" htmlFor="d-immediate">
            <textarea id="d-immediate" rows={2} className="field" value={d.immediateAction} disabled={readOnly} onChange={(event) => set({ immediateAction: event.target.value })} />
          </Field>
          <Field label="Massnahme" htmlFor="d-action">
            <textarea id="d-action" rows={2} className="field" value={d.action} disabled={readOnly} onChange={(event) => set({ action: event.target.value })} />
          </Field>
          <Field label="Verantwortlich" htmlFor="d-responsible">
            <input id="d-responsible" className="field" value={d.responsible} disabled={readOnly} onChange={(event) => set({ responsible: event.target.value })} />
          </Field>

          <fieldset>
            <legend className="label">Priorität</legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Priorität">
              {(Object.keys(PRIORITIES) as PriorityKey[]).map((priority) => {
                const active = d.priority === priority;
                return <button key={priority} type="button" role="radio" aria-checked={active} data-testid={`prio-${priority}`} disabled={readOnly} onClick={() => setPriority(priority)} className={`flex min-h-12 items-center justify-between rounded-lg border px-3 ${active ? (priority === 'K' ? 'border-danger bg-danger-soft text-danger' : 'border-accent bg-accent-soft text-ink') : 'border-line-strong bg-surface'}`}><span className="font-semibold">{PRIORITY_KEY_TO_TEXT[priority]}</span><span className="text-sm">{settings.priorityDays[priority]} Tage</span></button>;
              })}
            </div>
          </fieldset>
          <Field label="Frist" htmlFor="d-due" hint="Vorschlag aus den Einstellungen. Bei leerer Frist gilt automatisch die Richtfrist.">
            <input id="d-due" type="date" className="field" value={d.due} disabled={readOnly} onChange={(event) => set({ due: event.target.value })} />
          </Field>
          <fieldset>
            <legend className="label">Fotos</legend>
            <PhotoInput photos={photos} disabled={readOnly} onAdd={(added) => setNewPhotos((current) => [...current, ...added])} onRemove={(id) => {
              setNewPhotos((current) => current.filter((photo) => photo.id !== id));
              if (stored?.some((photo) => photo.id === id)) setRemoved((current) => [...current, id]);
            }} />
          </fieldset>
          {showErrors && missing.length > 0 && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">Fehlt: {missing.join(', ')}</p>}
        </div>
      </div>

      <div className="border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-3xl gap-2 px-4 py-3">
          {readOnly ? <button type="button" className="btn-secondary flex-1" onClick={() => onClose(false)}>Schliessen</button> : <>
            {isExisting && <button type="button" className="btn-danger" onClick={() => void remove()} aria-label="Mangel löschen"><Trash size={18} aria-hidden /></button>}
            <button type="button" className="btn-secondary" onClick={() => onClose(false)}>Abbrechen</button>
            <button type="button" className="btn-primary flex-1" disabled={saving} onClick={() => void save()} data-testid="defect-save">{saving ? 'Speichert' : 'Mangel speichern'}</button>
          </>}
        </div>
      </div>
    </div>
  );
}
