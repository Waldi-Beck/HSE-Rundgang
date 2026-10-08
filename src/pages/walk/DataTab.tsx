import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { FORM_INTRO, FORM_SUBTITLE, FORM_TITLE, MONTHLY_NOTICE } from '../../data/checklist';
import { db, openDefectsBefore, updateWalk } from '../../db';
import { durationMinutes, formatDuration, weekLabel } from '../../lib/dates';
import type { Walk } from '../../lib/types';
import { AutoField } from '../../components/AutoField';
import { DefectRow } from '../../components/DefectRow';
import { Field } from '../../components/ui';

/** Kapitel 1 Rundgangdaten aus dem aktuellen Formular. */
export function DataTab({ walk }: { walk: Walk }) {
  const readOnly = walk.status === 'closed';
  const save = (patch: Partial<Walk>) => updateWalk(walk.id, patch);
  const openPoints = useLiveQuery(() => openDefectsBefore(walk), [walk.id, walk.date]);
  const photoCounts = useLiveQuery(async () => {
    const photos = await db.photos.toArray();
    return photos.reduce<Record<string, number>>((counts, photo) => ((counts[photo.defectId] = (counts[photo.defectId] ?? 0) + 1), counts), {});
  });
  const duration = durationMinutes(walk.startTime, walk.endTime);

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-line bg-surface p-4">
        <h1 className="text-xl font-semibold">{FORM_TITLE} <span className="text-sm font-normal text-muted">{FORM_SUBTITLE}</span></h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{FORM_INTRO}</p>
      </section>
      <section className="space-y-4 rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-lg font-semibold">1. Rundgangdaten</h2>
          <span className="rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-medium tabular-nums text-muted">{weekLabel(walk.isoYear, walk.week)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Datum" htmlFor="w-date">
            <input id="w-date" type="date" className="field" value={walk.date} disabled={readOnly} onChange={(event) => event.target.value && save({ date: event.target.value })} />
          </Field>
          <Field label="Dauer" htmlFor="w-duration" hint="Aus Beginn und Ende berechnet">
            <input id="w-duration" className="field tabular-nums" value={formatDuration(duration)} disabled readOnly />
          </Field>
          <Field label="Uhrzeit Beginn" htmlFor="w-start">
            <input id="w-start" type="time" className="field" value={walk.startTime} disabled={readOnly} onChange={(event) => save({ startTime: event.target.value })} />
          </Field>
          <Field label="Uhrzeit Ende" htmlFor="w-end">
            <input id="w-end" type="time" className="field" value={walk.endTime} disabled={readOnly} onChange={(event) => save({ endTime: event.target.value })} />
          </Field>
        </div>
        <Field label="Durchgeführt von" htmlFor="w-inspector">
          <AutoField id="w-inspector" value={walk.inspector} disabled={readOnly} autoComplete="name" onSave={(value) => save({ inspector: value })} />
        </Field>
        <Field label="Begleitperson" htmlFor="w-companion">
          <AutoField id="w-companion" value={walk.companion} disabled={readOnly} onSave={(value) => save({ companion: value })} />
        </Field>
        <div className={`rounded-xl border p-4 ${walk.monthlyChecked ? 'border-accent/40 bg-accent-soft' : 'border-line bg-surface-2'}`}>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 font-medium">
            <input
              type="checkbox"
              className="h-6 w-6 accent-[var(--accent)]"
              checked={walk.monthlyChecked}
              disabled={readOnly}
              onChange={(event) => save({ monthlyChecked: event.target.checked })}
              data-testid="monthly-checked"
            />
            <span>2.2 geprüft</span>
          </label>
          <p className="ml-9 text-sm text-muted">{MONTHLY_NOTICE}. Beim ersten Rundgang des Monats ist die Prüfung vorgeschlagen.</p>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface">
        <div className="p-4 pb-2">
          <h2 className="text-lg font-semibold">Offene Punkte letzter Rundgang</h2>
          <p className="mt-1 text-sm text-muted">Wird automatisch aus offenen Mängeln früherer Rundgänge übernommen.</p>
        </div>
        {!openPoints ? (
          <div className="mx-4 mb-3 h-16 animate-pulse rounded-lg bg-surface-2" aria-label="Offene Punkte werden geladen" />
        ) : openPoints.length ? (
          <ul className="divide-y divide-line border-t border-line" data-testid="open-points">
            {openPoints.map(({ defect, walk: source }) => (
              <DefectRow key={defect.id} defect={defect} walk={source} photoCount={photoCounts?.[defect.id]} showOrigin />
            ))}
          </ul>
        ) : (
          <p className="px-4 pb-4 text-sm text-muted">Keine offenen Mängel aus früheren Rundgängen.</p>
        )}
        <div className="border-t border-line p-4">
          <Field label="Bemerkung" htmlFor="w-note">
            <AutoField id="w-note" multiline rows={2} value={walk.note} disabled={readOnly} onSave={(value) => save({ note: value })} />
          </Field>
        </div>
      </section>

      <Link to={`/rundgang/${walk.id}/checkliste`} replace className="btn-primary w-full" data-testid="to-checklist">
        Weiter zur Checkliste
      </Link>
    </div>
  );
}
