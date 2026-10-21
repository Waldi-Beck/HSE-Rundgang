import { Check, Sparkle, Trash, WarningCircle, X } from '@phosphor-icons/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { ALL_ITEMS, FORM_AREAS, areaIdFromLabel, areaLabel } from '../data/checklist';
import { PRIORITIES, PRIORITY_KEY_TO_TEXT } from '../data/register';
import { db, deleteDefect, saveDefect } from '../db';
import { addDays } from '../lib/dates';
import { priorityDays } from '../lib/register';
import type { AiAcceptedField, AiAudit, AiProposal, Defect, PriorityKey, Walk } from '../lib/types';
import { defectMissingFields } from '../lib/walk';
import { aiFieldValue, applyAiFields } from '../lib/ai-accept';
import { analyzeDefectPhoto, AiAnalysisError } from '../lib/ai-analysis';
import { resizeForAi } from '../lib/ai-image';
import { useRegisterSettings } from './SettingsContext';
import { PhotoInput, type PhotoDraft } from './PhotoInput';
import { Field } from './ui';

export function DefectSheet({ walk, defect, onClose }: { walk: Walk; defect: Defect; onClose: (saved: boolean) => void }) {
  const settings = useRegisterSettings();
  const readOnly = walk.status === 'closed';
  const [d, setD] = useState<Defect>(() => ({
    ...defect,
    area: FORM_AREAS.some((area) => area.id === defect.area) ? defect.area : areaIdFromLabel(areaLabel(defect.area, settings.areas), settings.areas),
    due: defect.due || addDays(walk.date, priorityDays(settings, defect.priority)),
  }));
  const [newPhotos, setNewPhotos] = useState<PhotoDraft[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [aiAudit, setAiAudit] = useState<AiAudit>(() => defect.aiAudit ?? {
    used: false, analyzedAt: null, model: '', proposal: null, acceptedFields: [], reviewedBy: '',
  });
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const stored = useLiveQuery(() => db.photos.where('defectId').equals(defect.id).toArray(), [defect.id]);
  const isExisting = useLiveQuery(async () => !!(await db.defects.get(defect.id)), [defect.id]);
  const photos: PhotoDraft[] = [
    ...(stored ?? []).filter((photo) => !removed.includes(photo.id)).map((photo) => ({ ...photo, isNew: false })),
    ...newPhotos,
  ];
  const areaOptions = FORM_AREAS.map((area) => ({ id: area.id, label: area.label }));
  const missing = defectMissingFields(d);
  const checklistItem = ALL_ITEMS.find((item) => item.id === d.itemId);
  const aiEnabled = settings.aiEnabled === true;
  const canOfferAi = !readOnly && aiEnabled && online && photos.length > 0 && !aiAudit.used;
  const checklistIds = ALL_ITEMS.map((item) => item.id);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const set = (patch: Partial<Defect>) => setD((current) => ({ ...current, ...patch }));
  const setPriority = (priority: PriorityKey) => set({ priority, due: addDays(walk.date, priorityDays(settings, priority)) });

  const analyzePhoto = async () => {
    const photo = photos.at(-1);
    if (!photo) return;
    setAnalyzing(true);
    setAnalysisError('');
    try {
      const jpeg = await resizeForAi(photo.blob);
      const result = await analyzeDefectPhoto(jpeg, {
        area: areaLabel(d.area, settings.areas),
        itemId: d.itemId === 'SONSTIGES' ? '' : d.itemId,
        itemText: checklistItem?.text ?? '',
        basis: checklistItem?.basis ?? '',
        userText: [d.description, d.hazard].filter(Boolean).join('\n'),
        checklistItems: ALL_ITEMS.map(({ id, text, basis }) => ({ id, text, basis })),
        priorities: Object.fromEntries((Object.keys(PRIORITIES) as PriorityKey[]).map((key) => [key, { name: PRIORITIES[key].name, days: settings.priorityDays[key] }])) as Record<PriorityKey, { name: string; days: number }>,
      }, {
        enabled: aiEnabled,
        serverUrl: settings.aiServerUrl ?? '',
        accessCode: settings.aiAccessCode ?? '',
        consentAt: settings.aiConsentAt,
      });
      setAiAudit({ used: true, analyzedAt: new Date().toISOString(), model: result.model, proposal: result.proposal, acceptedFields: [], reviewedBy: '' });
    } catch (error) {
      setAnalysisError(error instanceof AiAnalysisError ? error.message : (error as Error).message || 'Fotoanalyse fehlgeschlagen. Bitte manuell weiterarbeiten.');
    } finally {
      setAnalyzing(false);
    }
  };

  const acceptAiFields = (fields: AiAcceptedField[]) => {
    if (!aiAudit.proposal) return;
    const applicable = fields.filter((field) => {
      const value = aiFieldValue(aiAudit.proposal!, field, checklistIds);
      return value !== null && value !== '';
    });
    setD((current) => {
      const updated = applyAiFields(current, aiAudit.proposal!, applicable, checklistIds);
      if (applicable.includes('priority') && aiAudit.proposal!.vorgeschlagenePrio) {
        updated.due = addDays(walk.date, priorityDays(settings, aiAudit.proposal!.vorgeschlagenePrio));
      }
      return updated;
    });
    setAiAudit((current) => ({ ...current, acceptedFields: [...new Set([...current.acceptedFields, ...applicable])] }));
  };

  const save = async () => {
    if (missing.length) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    const newOnes = newPhotos.map(({ id, blob, width, height, createdAt }) => ({ id, blob, width, height, createdAt }));
    await saveDefect({ ...d, aiAudit: aiAudit.used ? { ...aiAudit, reviewedBy: walk.inspector.trim() } : d.aiAudit ?? null }, newOnes, removed);
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
            <p className="text-sm text-muted">Nr. {d.nr}{d.itemId === 'SONSTIGES' ? ' · ausserhalb der Checkliste' : ''}{d.area ? ` · ${areaLabel(d.area, settings.areas)}` : ''}</p>
          </div>
          <button type="button" onClick={() => onClose(false)} aria-label="Schliessen" className="grid h-11 w-11 place-items-center rounded-lg"><X size={22} aria-hidden /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
          <Field label="Bereich" htmlFor="d-area" error={showErrors && !d.area ? 'Bitte Bereich wählen.' : undefined}>
            <select id="d-area" className="field" value={d.area} disabled={readOnly} onChange={(event) => set({ area: event.target.value })}>
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
          {canOfferAi && <button type="button" className="btn-secondary w-full" onClick={() => void analyzePhoto()} disabled={analyzing} data-testid="analyze-photo">
            <Sparkle size={19} aria-hidden />{analyzing ? 'Foto wird ausgewertet …' : 'Mit KI auswerten'}
          </button>}
          {aiAudit.used && <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-muted" role="status">Die Analyse wurde gespeichert. Der ursprüngliche Vorschlag bleibt unverändert.</p>}
          {!online && aiEnabled && <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted" role="status">Offline: KI-Analyse nicht verfügbar. Manuelles Erfassen funktioniert weiter.</p>}
          {analysisError && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{analysisError}</p>}
          {aiAudit.proposal && <AiProposalCard proposal={aiAudit.proposal} acceptedFields={aiAudit.acceptedFields} checklistIds={checklistIds} onAccept={acceptAiFields} />}
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

function AiProposalCard({ proposal, acceptedFields, checklistIds, onAccept }: {
  proposal: AiProposal;
  acceptedFields: AiAcceptedField[];
  checklistIds: string[];
  onAccept: (fields: AiAcceptedField[]) => void;
}) {
  const candidateFields: { id: AiAcceptedField; title: string; value: string }[] = [
    { id: 'hazard', title: 'Gefahren', value: String(aiFieldValue(proposal, 'hazard', checklistIds) ?? '') },
    { id: 'priority', title: `Priorität${proposal.begruendungPrio ? ` – ${proposal.begruendungPrio}` : ''}`, value: proposal.vorgeschlagenePrio ? `${proposal.vorgeschlagenePrio}: ${PRIORITY_KEY_TO_TEXT[proposal.vorgeschlagenePrio]}` : '' },
    { id: 'immediateAction', title: 'Sofortmassnahme', value: String(aiFieldValue(proposal, 'immediateAction', checklistIds) ?? '') },
    { id: 'action', title: 'Massnahmen nach STOP', value: String(aiFieldValue(proposal, 'action', checklistIds) ?? '') },
  ];
  const fields = candidateFields.filter((field) => field.value.trim());
  return <section className="space-y-3 rounded-xl border border-accent/40 bg-accent-soft/30 p-4" data-testid="ai-proposal">
    <header className="flex items-start gap-2"><Sparkle size={20} className="mt-0.5 shrink-0 text-accent" aria-hidden /><div><h3 className="font-semibold">KI-Vorschläge – bitte fachlich prüfen</h3><p className="text-sm text-muted">Die KI hat nichts automatisch eingetragen.</p></div></header>
    {(!proposal.mangelErkannt || proposal.sicherheit === 'niedrig') && <p className="flex gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger"><WarningCircle size={18} className="shrink-0" aria-hidden />{!proposal.mangelErkannt ? 'Auf dem Bild ist kein Mangel sicher erkennbar.' : 'Die Analyse ist unsicher. Bitte besonders sorgfältig prüfen.'} {proposal.hinweis}</p>}
    {proposal.gefahren.length > 0 && <div><h4 className="text-sm font-semibold">Mögliche Gefahren</h4><ul className="list-disc pl-5 text-sm">{proposal.gefahren.map((hazard, index) => <li key={`${index}-${hazard.beschreibung}`}>{hazard.beschreibung}{hazard.folge && ` – mögliche Folge: ${hazard.folge}`}</li>)}</ul></div>}
    {fields.map((field) => <div key={field.id} className="rounded-lg border border-line bg-surface p-3">
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h4 className="text-sm font-semibold">{field.title}</h4><p className="mt-1 whitespace-pre-line text-sm">{field.value}</p></div><button type="button" className="btn-secondary shrink-0" aria-label={`${field.title} übernehmen`} disabled={acceptedFields.includes(field.id)} onClick={() => onAccept([field.id])}>{acceptedFields.includes(field.id) ? <Check size={17} aria-hidden /> : 'Übernehmen'}</button></div>
    </div>)}
    {proposal.passenderKontrollpunkt && <p className="text-xs text-muted">Vorgeschlagener Kontrollpunkt: {proposal.passenderKontrollpunkt} (ändert die Verknüpfung dieses Mangels nicht)</p>}
    {proposal.passendeGrundlage && <p className="text-xs text-muted">Grundlage laut Checkliste: {proposal.passendeGrundlage}</p>}
    {proposal.hinweis && proposal.mangelErkannt && proposal.sicherheit !== 'niedrig' && <p className="text-sm text-muted">{proposal.hinweis}</p>}
    <p className="text-xs text-muted">Sicherheit: <strong>{proposal.sicherheit}</strong>. Vorschlag, kein Ersatz für die fachliche Beurteilung.</p>
    <button type="button" className="btn-primary w-full" data-testid="accept-all-ai" disabled={!fields.some((field) => !acceptedFields.includes(field.id))} onClick={() => onAccept(fields.map((field) => field.id))}>Alle übernehmen</button>
  </section>;
}
