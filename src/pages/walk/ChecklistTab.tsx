import { Plus } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { RATING_HELP } from '../../data/checklist';
import { patchRatings, updateWalk } from '../../db';
import type { Defect, Rating, Walk } from '../../lib/types';
import { visibleSections } from '../../lib/walk';
import { AutoField } from '../../components/AutoField';
import { RatingControl } from '../../components/RatingControl';
import { useToast } from '../../components/ui';

/** Kapitel 2 Checkliste (FR-010 bis FR-016). */
export function ChecklistTab({
  walk,
  defects,
  onNewDefect,
  onEditDefect,
}: {
  walk: Walk;
  defects: Defect[];
  onNewDefect: (itemId: string) => void;
  onEditDefect: (d: Defect) => void;
}) {
  const ro = walk.status === 'closed';
  const toast = useToast();

  const rate = (itemId: string, value: Rating | undefined) => {
    const prev = walk.ratings[itemId];
    void patchRatings(walk.id, { [itemId]: value });
    const linked = defects.filter((d) => d.itemId === itemId);
    if (value === 'nok' && linked.length === 0) onNewDefect(itemId);
    if (prev === 'nok' && value !== 'nok' && linked.length) {
      toast(`Mangel Nr. ${linked.map((d) => d.nr).join(', ')} bleibt bestehen. Bei Bedarf unter Mängel löschen.`);
    }
  };

  const allOpenOk = (ids: string[]) => {
    void patchRatings(walk.id, Object.fromEntries(ids.map((id) => [id, 'ok' as const])));
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">{RATING_HELP}</p>
      {visibleSections(walk.type).map((s) => {
        const ratable = s.items.filter((i) => !i.freeText);
        const done = ratable.filter((i) => walk.ratings[i.id]).length;
        const unrated = ratable.filter((i) => !walk.ratings[i.id]).map((i) => i.id);
        return (
          <section key={s.id} aria-labelledby={`sec-${s.id}`} className="overflow-hidden rounded-xl border border-line bg-surface">
            <header className="border-b border-line bg-surface-2 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <h2 id={`sec-${s.id}`} className="text-base font-semibold">
                  <span className="mr-1.5 text-muted">{s.id}</span>
                  {s.title}
                </h2>
                {ratable.length > 0 && <span className="shrink-0 text-sm text-muted tabular-nums">{done}/{ratable.length}</span>}
              </div>
              <p className="mt-0.5 text-sm text-muted">
                {s.rhythm === 'weekly' ? 'wöchentlich' : 'monatlich'}
                {s.legal.length > 0 && `, ${s.legal.join(', ')}`}
              </p>
              {!ro && unrated.length > 1 && (
                <button type="button" onClick={() => allOpenOk(unrated)} className="mt-2 text-sm font-medium text-accent underline underline-offset-2">
                  Restliche {unrated.length} Punkte auf OK setzen
                </button>
              )}
            </header>
            <ul className="divide-y divide-line">
              {s.items.map((item) => {
                if (item.freeText) {
                  return (
                    <li key={item.id} className="px-4 py-4">
                      <label htmlFor="w-observations" className="label">
                        {item.id}: Weitere Beobachtungen
                      </label>
                      <AutoField
                        id="w-observations"
                        multiline
                        rows={3}
                        value={walk.observations}
                        disabled={ro}
                        onSave={(v) => updateWalk(walk.id, { observations: v })}
                      />
                      {!ro && (
                        <button type="button" onClick={() => onNewDefect('G1')} className="btn-secondary mt-2 min-h-10 text-sm">
                          <Plus size={16} aria-hidden /> Mangel zu Beobachtung
                        </button>
                      )}
                    </li>
                  );
                }
                const value = walk.ratings[item.id];
                const linked = defects.filter((d) => d.itemId === item.id);
                return (
                  <li key={item.id} id={`item-${item.id}`} className={`px-4 py-3.5 ${value === 'nok' ? 'bg-danger-soft/50' : ''}`}>
                    <p className="mb-2.5 text-[15px] leading-snug">
                      <span className="mr-1.5 font-semibold tabular-nums">{item.id}</span>
                      {item.text}
                    </p>
                    <RatingControl itemId={item.id} value={value} disabled={ro} onChange={(v) => rate(item.id, v)} />
                    {(value === 'nok' || linked.length > 0) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted">Mangel-Nr.</span>
                        {linked.map((d) => (
                          <button key={d.id} type="button" onClick={() => onEditDefect(d)} className="rounded-md border border-line-strong bg-surface px-2.5 py-1.5 font-medium">
                            {d.nr}
                          </button>
                        ))}
                        {linked.length === 0 && <span className="font-medium text-danger">fehlt</span>}
                        {!ro && (
                          <button type="button" onClick={() => onNewDefect(item.id)} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 font-medium text-accent">
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
        );
      })}
      <Link to={`/rundgang/${walk.id}/abschluss`} replace className="btn-primary w-full">
        Weiter zum Abschluss
      </Link>
    </div>
  );
}
