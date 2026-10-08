import { CheckCircle, Plus } from '@phosphor-icons/react';
import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AREAS, MONTHLY_ITEMS, RATING_LEGEND, WEEKLY_ITEMS, areaLabel, legalBasisOf, type AreaId, type ChecklistItem } from '../../data/checklist';
import { patchRatings } from '../../db';
import type { Defect, Rating, Walk } from '../../lib/types';
import { cellKey, countRatings, defectsForCell, weeklyKeys } from '../../lib/walk';
import { RatingControl } from '../../components/RatingControl';
import { useToast } from '../../components/ui';

type Step = AreaId | 'monatlich';

/** Kapitel 2 Checkliste, Raum für Raum (FR-010 bis FR-016). */
export function ChecklistTab({
  walk,
  defects,
  onNewDefect,
  onEditDefect,
}: {
  walk: Walk;
  defects: Defect[];
  onNewDefect: (itemId: string, area?: string) => void;
  onEditDefect: (d: Defect) => void;
}) {
  const ro = walk.status === 'closed';
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const steps: { id: Step; label: string; keys: string[] }[] = [
    ...AREAS.map((a) => ({ id: a.id as Step, label: a.label, keys: weeklyKeys(a.id) })),
    ...(walk.type === 'monthly' ? [{ id: 'monatlich' as Step, label: '2.2 Monatlich', keys: MONTHLY_ITEMS.map((i) => i.id) }] : []),
  ];
  const requested = params.get('bereich');
  const step =
    steps.find((s) => s.id === requested) ?? steps.find((s) => s.keys.some((k) => !walk.ratings[k])) ?? steps[0];
  const stepIdx = steps.indexOf(step);
  const next = steps[stepIdx + 1];
  // gewählten Bereich festhalten, damit die Ansicht nicht springt, sobald ein Bereich vollständig ist
  useEffect(() => {
    if (requested !== step.id) setParams({ bereich: step.id }, { replace: true });
  }, [requested, step.id, setParams]);
  const goTo = (id: Step) => {
    setParams({ bereich: id }, { replace: true });
    window.scrollTo({ top: 0 });
  };

  const area = step.id === 'monatlich' ? undefined : step.id;
  const items: ChecklistItem[] = area ? WEEKLY_ITEMS : MONTHLY_ITEMS;
  const unrated = step.keys.filter((k) => !walk.ratings[k]);

  const rate = (itemId: string, value: Rating | undefined) => {
    const key = cellKey(itemId, area);
    const prev = walk.ratings[key];
    void patchRatings(walk.id, { [key]: value });
    const linked = defectsForCell(key, defects);
    if (value === 'mangel' && linked.length === 0) onNewDefect(itemId, area);
    if (prev === 'mangel' && value !== 'mangel' && linked.length) {
      toast(`Mangel Nr. ${linked.map((d) => d.nr).join(', ')} bleibt bestehen. Bei Bedarf unter Mängel löschen.`);
    }
  };

  const restOk = () => void patchRatings(walk.id, Object.fromEntries(unrated.map((k) => [k, 'ok' as const])));

  return (
    <div className="space-y-4">
      <ul className="text-sm leading-snug text-muted" aria-label="Bewertung">
        {RATING_LEGEND.split(/\s{3}/).map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>

      <nav aria-label="Bereiche" className="grid grid-cols-3 gap-1.5">
        {steps.map((s) => {
          const c = countRatings(walk, s.keys);
          const active = s.id === step.id;
          const complete = c.checked === c.total;
          return (
            <button
              key={s.id}
              type="button"
              aria-current={active ? 'step' : undefined}
              data-testid={`area-tab-${s.id}`}
              onClick={() => goTo(s.id)}
              className={`flex min-h-12 flex-col items-start justify-center rounded-lg border px-2.5 py-1.5 text-left leading-tight ${
                s.id === 'monatlich' ? 'col-span-3' : ''
              } ${active ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface'}`}
            >
              <span className="w-full truncate text-[12.5px] font-semibold tracking-tight" title={s.label}>{s.label}</span>
              <span className={`flex items-center gap-1 text-xs tabular-nums ${c.mangel ? 'text-danger' : 'text-muted'}`}>
                {complete && !c.mangel && <CheckCircle size={12} weight="fill" className="text-accent" aria-hidden />}
                {c.checked}/{c.total}
                {c.mangel > 0 && `, ${c.mangel} Mangel`}
              </span>
            </button>
          );
        })}
      </nav>

      <section aria-labelledby="step-title" className="overflow-hidden rounded-xl border border-line bg-surface">
        <header className="border-b border-line bg-surface-2 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <h2 id="step-title" className="text-base font-semibold">
              {area ? areaLabel(area) : '2.2 Monatlich'}
            </h2>
            <span className="shrink-0 text-sm text-muted tabular-nums">
              {step.keys.length - unrated.length}/{step.keys.length}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted">
            {area ? '2.1 Wöchentlich, 16 Punkte in diesem Bereich' : 'zusätzlich beim ersten Rundgang im Monat (9 Punkte)'}
          </p>
          {!ro && unrated.length > 1 && (
            <button type="button" onClick={restOk} className="mt-2 text-sm font-medium text-accent underline underline-offset-2">
              Restliche {unrated.length} Punkte auf OK setzen
            </button>
          )}
        </header>
        <ul className="divide-y divide-line">
          {items.map((item) => {
            const key = cellKey(item.id, area);
            const value = walk.ratings[key];
            const linked = defectsForCell(key, defects);
            return (
              <li key={key} id={`item-${key.replace('@', '-')}`} className={`px-4 py-3.5 ${value === 'mangel' ? 'bg-danger-soft/50' : ''}`}>
                <p className="text-[15px] leading-snug">
                  <span className="mr-1.5 font-semibold tabular-nums">{item.id}</span>
                  {item.text}
                </p>
                <p className="mt-0.5 mb-2.5 text-xs leading-snug text-muted">{legalBasisOf(item.id)}</p>
                <RatingControl
                  itemId={key}
                  label={area ? `${item.id} ${areaLabel(area)}` : item.id}
                  value={value}
                  disabled={ro}
                  onChange={(v) => rate(item.id, v)}
                />
                {(value === 'mangel' || linked.length > 0) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted">Mangel-Nr.</span>
                    {linked.map((d) => (
                      <button key={d.id} type="button" onClick={() => onEditDefect(d)} className="rounded-md border border-line-strong bg-surface px-2.5 py-1.5 font-medium">
                        {d.nr}
                        {!area && <span className="ml-1 font-normal text-muted">{areaLabel(d.area)}</span>}
                      </button>
                    ))}
                    {linked.length === 0 && <span className="font-medium text-danger">fehlt</span>}
                    {!ro && (
                      <button type="button" onClick={() => onNewDefect(item.id, area)} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 font-medium text-accent">
                        <Plus size={14} aria-hidden /> Mangel
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
        <button type="button" className="btn-primary w-full" onClick={() => goTo(next.id)} data-testid="next-area">
          Weiter: {next.label}
        </button>
      ) : (
        <Link to={`/rundgang/${walk.id}/abschluss`} replace className="btn-primary w-full">
          Weiter zum Abschluss
        </Link>
      )}
    </div>
  );
}
