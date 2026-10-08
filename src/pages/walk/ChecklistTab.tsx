import { CheckCircle, Plus } from '@phosphor-icons/react';
import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { FORM_AREAS, MONTHLY_ITEMS, MONTHLY_NOTICE, RATING_LEGEND, WEEKLY_ITEMS, WEEKLY_NOTICE, areaLabel, type ChecklistItem, type FormAreaId } from '../../data/checklist';
import { patchMonthlyAreas, patchRatings } from '../../db';
import type { Defect, Rating, Walk } from '../../lib/types';
import { cellKey, countRatings, defectsForCell, weeklyKeys } from '../../lib/walk';
import { RatingControl } from '../../components/RatingControl';
import { useRegisterSettings } from '../../components/SettingsContext';
import { useToast } from '../../components/ui';

type StepId = FormAreaId | 'monatlich';

export function ChecklistTab({
  walk,
  defects,
  onNewDefect,
  onEditDefect,
}: {
  walk: Walk;
  defects: Defect[];
  onNewDefect: (itemId: string, area?: string) => void;
  onEditDefect: (defect: Defect) => void;
}) {
  const settings = useRegisterSettings();
  const readOnly = walk.status === 'closed';
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const steps: { id: StepId; label: string; keys: string[] }[] = [
    ...FORM_AREAS.map((area) => ({ id: area.id, label: area.label, keys: weeklyKeys(area.id) })),
    ...(walk.monthlyChecked ? [{ id: 'monatlich' as const, label: '2.2 Monatlich', keys: MONTHLY_ITEMS.map((item) => item.id) }] : []),
  ];
  const requested = params.get('bereich');
  const step = steps.find((candidate) => candidate.id === requested) ?? steps.find((candidate) => candidate.keys.some((key) => !walk.ratings[key])) ?? steps[0];
  const next = steps[steps.indexOf(step) + 1];
  useEffect(() => {
    if (requested !== step.id) setParams({ bereich: step.id }, { replace: true });
  }, [requested, step.id, setParams]);
  const areaId = step.id === 'monatlich' ? undefined : step.id;
  const items: ChecklistItem[] = areaId ? WEEKLY_ITEMS : MONTHLY_ITEMS;
  const unrated = step.keys.filter((key) => !walk.ratings[key]);
  const areaLabelForStep = areaId ? FORM_AREAS.find((area) => area.id === areaId)?.label ?? areaId : '2.2 Monatlich';

  const goTo = (id: StepId) => {
    setParams({ bereich: id }, { replace: true });
    window.scrollTo({ top: 0 });
  };

  const rate = (itemId: string, selectedArea: string, value: Rating | undefined) => {
    const key = areaId ? cellKey(itemId, areaId) : itemId;
    const previous = walk.ratings[key];
    void patchRatings(walk.id, { [key]: value });
    const linked = defectsForCell(areaId ? key : cellKey(itemId, selectedArea), defects);
    if (value === 'mangel' && linked.length === 0) onNewDefect(itemId, selectedArea);
    if (previous === 'mangel' && value !== 'mangel' && linked.length) {
      toast(`Mangel-ID ${linked.map((defect) => defect.mangelId).join(', ')} bleibt bestehen. Im Register nachführen.`);
    }
  };

  const restOk = () => {
    const patch = Object.fromEntries(unrated.map((key) => [key, 'ok' as const]));
    void patchRatings(walk.id, patch);
  };

  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-surface-2 px-3 py-2.5 text-sm leading-relaxed text-muted">{RATING_LEGEND}</p>

      <nav aria-label="Bereiche" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {steps.map((candidate) => {
          const counts = countRatings(walk, candidate.keys);
          const active = candidate.id === step.id;
          const complete = counts.checked === counts.total;
          return (
            <button
              key={candidate.id}
              type="button"
              aria-current={active ? 'step' : undefined}
              data-testid={`area-tab-${candidate.id}`}
              onClick={() => goTo(candidate.id)}
              className={`flex min-h-14 flex-col items-start justify-center rounded-lg border px-3 py-2 text-left leading-tight ${candidate.id === 'monatlich' ? 'col-span-2 sm:col-span-3' : ''} ${active ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface'}`}
            >
              <span className="w-full truncate text-sm font-semibold">{candidate.label}</span>
              <span className="flex items-center gap-1 text-xs tabular-nums text-muted">
                {complete && <CheckCircle size={13} weight="fill" className="text-accent" aria-hidden />}
                {counts.checked}/{counts.total}
                {counts.mangel > 0 && ` · ${counts.mangel} Mängel`}
              </span>
            </button>
          );
        })}
      </nav>

      <section aria-labelledby="checklist-step-title" className="overflow-hidden rounded-xl border border-line bg-surface">
        <header className="border-b border-line bg-surface-2 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <h2 id="checklist-step-title" className="text-base font-semibold">{areaLabelForStep}</h2>
            <span className="shrink-0 text-sm tabular-nums text-muted">{step.keys.length - unrated.length}/{step.keys.length}</span>
          </div>
          <p className="mt-1 text-sm text-muted">{areaId ? WEEKLY_NOTICE : MONTHLY_NOTICE}</p>
          {!readOnly && unrated.length > 0 && (
            <button type="button" onClick={restOk} className="mt-2 min-h-11 font-medium text-accent underline underline-offset-2" data-testid="rest-ok">
              Rest OK ({unrated.length})
            </button>
          )}
        </header>
        <ul className="divide-y divide-line">
          {items.map((item) => {
            const key = areaId ? cellKey(item.id, areaId) : item.id;
            const selectedArea = areaId ?? walk.monthlyAreas[item.id] ?? '';
            const linked = selectedArea ? defectsForCell(cellKey(item.id, selectedArea), defects) : defects.filter((defect) => defect.itemId === item.id);
            return (
              <li key={key} id={`item-${key.replace('@', '-')}`} className={`px-4 py-4 ${walk.ratings[key] === 'mangel' ? 'bg-danger-soft/45' : ''}`}>
                <p className="text-[15px] font-medium leading-snug"><span className="mr-1.5 font-semibold tabular-nums">{item.id}</span>{item.text}</p>
                <p className="mb-3 mt-1 text-xs leading-relaxed text-muted">{item.basis}</p>
                {!areaId && (
                  <label className="mb-3 block">
                    <span className="label">Bereich</span>
                    <select
                      className="field"
                      value={walk.monthlyAreas[item.id] ?? ''}
                      disabled={readOnly}
                      onChange={(event) => {
                        void patchMonthlyAreas(walk.id, { [item.id]: event.target.value || undefined });
                      }}
                      aria-label={`Bereich ${item.id}`}
                      data-testid={`monthly-area-${item.id}`}
                    >
                      <option value="">Bereich wählen</option>
                      {settings.areas.map((label) => <option key={label} value={label}>{label}</option>)}
                    </select>
                  </label>
                )}
                <RatingControl
                  itemId={key}
                  label={`${item.id} ${selectedArea ? areaLabel(selectedArea, settings.areas) : ''}`}
                  value={walk.ratings[key]}
                  disabled={readOnly || (!areaId && !selectedArea)}
                  onChange={(value) => rate(item.id, selectedArea, value)}
                />
                {(walk.ratings[key] === 'mangel' || linked.length > 0) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted">Mangel-ID</span>
                    {linked.map((defect) => (
                      <button key={defect.id} type="button" onClick={() => onEditDefect(defect)} className="min-h-10 rounded-md border border-line-strong bg-surface px-2.5 font-medium">
                        {defect.mangelId}{!areaId && <span className="ml-1 text-muted">{defect.area}</span>}
                      </button>
                    ))}
                    {linked.length === 0 && <span className="font-medium text-danger">Fehlt</span>}
                    {!readOnly && selectedArea && (
                      <button type="button" onClick={() => onNewDefect(item.id, selectedArea)} className="inline-flex min-h-10 items-center gap-1 px-2 font-medium text-accent">
                        <Plus size={15} aria-hidden /> Mangel erfassen
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {next ? (
        <button type="button" className="btn-primary w-full" onClick={() => goTo(next.id)} data-testid="next-area">Weiter: {next.label}</button>
      ) : (
        <Link to={`/rundgang/${walk.id}/abschluss`} replace className="btn-primary w-full" data-testid="continue-to-close">Weiter zum Abschluss</Link>
      )}
    </div>
  );
}
