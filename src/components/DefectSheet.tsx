import { X } from '@phosphor-icons/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { PRIO } from '../data/checklist';
import { db, deleteDefect, saveDefect } from '../db';
import type { Defect, Prio, Walk } from '../lib/types';
import { defectMissingFields, dueFromPrio, visibleSections } from '../lib/walk';
import { PhotoInput, type PhotoDraft } from './PhotoInput';
import { Field } from './ui';

/** Formular Kapitel 4: Mangel / Gefahr, Massnahme, Verantwortlich, Frist, Prio, Fotos (FR-030 bis FR-034). */
export function DefectSheet({ walk, defect, onClose }: { walk: Walk; defect: Defect; onClose: (saved: boolean) => void }) {
  const readOnly = walk.status === 'closed';
  const [d, setD] = useState<Defect>(defect);
  const [newPhotos, setNewPhotos] = useState<PhotoDraft[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  const stored = useLiveQuery(() => db.photos.where('defectId').equals(defect.id).toArray(), [defect.id]);
  const isExisting = useLiveQuery(async () => !!(await db.defects.get(defect.id)), [defect.id]);

  const photos: PhotoDraft[] = [
    ...(stored ?? []).filter((p) => !removed.includes(p.id)).map((p) => ({ ...p, isNew: false })),
    ...newPhotos,
  ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const set = (patch: Partial<Defect>) => setD((cur) => ({ ...cur, ...patch }));
  const setPrio = (prio: Prio) => set({ prio, due: dueFromPrio(walk.date, prio) });
  const missing = defectMissingFields(d);

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
    if (!confirm(`Mangel Nr. ${d.nr} mit allen Fotos löschen?`)) return;
    await deleteDefect(d.id);
    onClose(true);
  };

  const items = visibleSections(walk.type).flatMap((s) => s.items);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="defect-title" className="fixed inset-0 z-40 flex flex-col bg-bg">
      <div className="border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <h2 id="defect-title" className="text-lg font-semibold">
            Mangel Nr. {d.nr}
            {d.itemId && <span className="font-normal text-muted"> zu {d.itemId}</span>}
          </h2>
          <button type="button" onClick={() => onClose(false)} aria-label="Schliessen" className="grid h-11 w-11 place-items-center rounded-lg">
            <X size={22} aria-hidden />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
          <Field label="Pkt. (Checklistenpunkt)" htmlFor="d-item" error={showErrors && !d.itemId ? 'Bitte Punkt wählen.' : undefined}>
            <select id="d-item" className="field" value={d.itemId} disabled={readOnly} onChange={(e) => set({ itemId: e.target.value })}>
              <option value="">Bitte wählen</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.id}: {i.text}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Mangel / Gefahr" htmlFor="d-hazard" error={showErrors && !d.hazard.trim() ? 'Bitte Mangel beschreiben.' : undefined}>
            <textarea id="d-hazard" rows={3} className="field" value={d.hazard} disabled={readOnly} onChange={(e) => set({ hazard: e.target.value })} />
          </Field>

          <Field label="Massnahme" htmlFor="d-action">
            <textarea id="d-action" rows={2} className="field" value={d.action} disabled={readOnly} onChange={(e) => set({ action: e.target.value })} />
          </Field>

          <Field label="Verantwortlich" htmlFor="d-resp">
            <input id="d-resp" className="field" value={d.responsible} disabled={readOnly} onChange={(e) => set({ responsible: e.target.value })} autoComplete="name" />
          </Field>

          <fieldset>
            <legend className="label">Prio</legend>
            <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Prio">
              {(Object.keys(PRIO) as Prio[]).map((p) => {
                const active = d.prio === p;
                const tone = p === 'K' ? 'bg-danger text-white border-danger dark:text-zinc-950' : 'bg-ink text-bg border-ink';
                return (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-testid={`prio-${p}`}
                    disabled={readOnly}
                    onClick={() => setPrio(p)}
                    className={`flex min-h-14 flex-col items-center justify-center rounded-lg border leading-tight ${active ? tone : 'border-line-strong bg-surface'}`}
                  >
                    <span className="text-base font-semibold">{p}</span>
                    <span className={`text-xs ${active ? '' : 'text-muted'}`}>{PRIO[p].hint}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <Field label="Frist" htmlFor="d-due" hint="Vorschlag aus der Prio (Richtwert gemäss SOP), anpassbar.">
            <input id="d-due" type="date" className="field" value={d.due} disabled={readOnly} onChange={(e) => set({ due: e.target.value })} />
          </Field>

          <fieldset>
            <legend className="label">Fotos</legend>
            <PhotoInput
              photos={photos}
              disabled={readOnly}
              onAdd={(p) => setNewPhotos((cur) => [...cur, ...p])}
              onRemove={(id) => {
                setNewPhotos((cur) => cur.filter((p) => p.id !== id));
                if (stored?.some((p) => p.id === id)) setRemoved((r) => [...r, id]);
              }}
            />
          </fieldset>

          {showErrors && missing.length > 0 && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">Fehlt: {missing.join(', ')}</p>
          )}
        </div>
      </div>

      <div className="border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-3xl gap-2 px-4 py-3">
          {readOnly ? (
            <button type="button" className="btn-secondary flex-1" onClick={() => onClose(false)}>
              Schliessen
            </button>
          ) : (
            <>
              {isExisting && (
                <button type="button" className="btn-danger" onClick={remove}>
                  Löschen
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={() => onClose(false)}>
                Abbrechen
              </button>
              <button type="button" className="btn-primary flex-1" disabled={saving} onClick={save} data-testid="defect-save">
                {saving ? 'Speichert' : 'Mangel speichern'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
