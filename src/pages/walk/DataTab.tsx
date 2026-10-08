import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { TYPE_FORM_LABELS, TYPE_HINT } from '../../data/checklist';
import { db, openDefectsBefore, updateWalk } from '../../db';
import type { Walk, WalkType } from '../../lib/types';
import { hiddenRatingsOnWeekly } from '../../lib/walk';
import { AutoField } from '../../components/AutoField';
import { DefectRow } from '../../components/DefectRow';
import { Field } from '../../components/ui';

/** Kapitel 1 Rundgangdaten (FR-001 bis FR-005). */
export function DataTab({ walk }: { walk: Walk }) {
  const ro = walk.status === 'closed';
  const save = (patch: Partial<Walk>) => updateWalk(walk.id, patch);
  const openPoints = useLiveQuery(() => openDefectsBefore(walk), [walk.id, walk.date]);
  const photoCounts = useLiveQuery(async () => {
    const ps = await db.photos.toArray();
    return ps.reduce<Record<string, number>>((m, p) => ((m[p.defectId] = (m[p.defectId] ?? 0) + 1), m), {});
  });

  const setType = (type: WalkType) => {
    if (type === walk.type) return;
    const hidden = type === 'weekly' ? hiddenRatingsOnWeekly(walk) : [];
    if (hidden.length && !confirm(`${hidden.length} Bewertungen aus 2.2 Monatlich werden ausgeblendet und nicht gezählt. Fortfahren?`)) return;
    void save({ type });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-line bg-surface p-4">
        <h2 className="text-lg font-semibold">1. Rundgangdaten</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Datum" htmlFor="w-date">
            <input id="w-date" type="date" className="field" value={walk.date} disabled={ro} onChange={(e) => e.target.value && save({ date: e.target.value })} />
          </Field>
          <Field label="Kalenderwoche" htmlFor="w-kw" hint="aus Datum berechnet">
            <input id="w-kw" className="field tabular-nums" value={`KW ${walk.week} / ${walk.isoYear}`} disabled readOnly />
          </Field>
          <Field label="Durchgeführt von" htmlFor="w-inspector">
            <AutoField id="w-inspector" value={walk.inspector} disabled={ro} autoComplete="name" onSave={(v) => save({ inspector: v })} />
          </Field>
          <Field label="Uhrzeit" htmlFor="w-time">
            <input id="w-time" type="time" className="field" value={walk.time} disabled={ro} onChange={(e) => save({ time: e.target.value })} />
          </Field>
        </div>
        <Field label="Begleitperson" htmlFor="w-companion">
          <AutoField id="w-companion" value={walk.companion} disabled={ro} onSave={(v) => save({ companion: v })} />
        </Field>

        <fieldset>
          <legend className="label">Rundgangsart</legend>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
            {(['weekly', 'monthly'] as WalkType[]).map((t) => {
              const active = walk.type === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={ro}
                  onClick={() => setType(t)}
                  className={`min-h-14 rounded-lg border px-3 py-2 text-left ${active ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface'}`}
                >
                  <div className="font-medium">{TYPE_FORM_LABELS[t]}</div>
                  <div className="text-sm text-muted">{TYPE_HINT[t]}</div>
                </button>
              );
            })}
          </div>
        </fieldset>
      </section>

      <section className="rounded-xl border border-line bg-surface">
        <div className="p-4 pb-2">
          <h2 className="text-lg font-semibold">Offene Punkte Vorwoche</h2>
          <p className="mt-0.5 text-sm text-muted">Offene Mängel aus früheren Rundgängen. Bei der Nachkontrolle als erledigt markieren.</p>
        </div>
        {ro && walk.openPointsSnapshot ? (
          walk.openPointsSnapshot.length ? (
            <ul className="space-y-1 px-4 pb-3 text-sm">
              {walk.openPointsSnapshot.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : (
            <p className="px-4 pb-3 text-sm text-muted">Beim Abschluss keine offenen Punkte.</p>
          )
        ) : !openPoints ? (
          <div className="mx-4 mb-3 h-16 animate-pulse rounded-lg bg-surface-2" />
        ) : openPoints.length === 0 ? (
          <p className="px-4 pb-3 text-sm text-muted">Keine offenen Punkte aus früheren Rundgängen.</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line" data-testid="open-points">
            {openPoints.map(({ defect, walk: w }) => (
              <DefectRow key={defect.id} defect={defect} walk={w} photoCount={photoCounts?.[defect.id]} />
            ))}
          </ul>
        )}
        <div className="border-t border-line p-4">
          <Field label="Ergänzung (Freitext)" htmlFor="w-open-note">
            <AutoField id="w-open-note" multiline rows={2} value={walk.openPointsNote} disabled={ro} onSave={(v) => save({ openPointsNote: v })} />
          </Field>
        </div>
      </section>

      <Link to={`/rundgang/${walk.id}/checkliste`} replace className="btn-primary w-full" data-testid="to-checklist">
        Weiter zur Checkliste
      </Link>
    </div>
  );
}
