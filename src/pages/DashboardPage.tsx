import { CaretRight, Plus } from '@phosphor-icons/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { TYPE_LABELS } from '../data/checklist';
import { createWalk, db } from '../db';
import { LAST_BACKUP_KEY } from '../export';
import { formatDate, isOverdue, isoWeek, toISODate, weekLabel } from '../lib/dates';
import { countRatings } from '../lib/walk';
import { Badge, EmptyState } from '../components/ui';

function lastBackup(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const walks = useLiveQuery(() => db.walks.orderBy('date').reverse().toArray());
  const defects = useLiveQuery(() => db.defects.toArray());

  const today = toISODate(new Date());
  const thisWeek = isoWeek(today);
  const open = defects?.filter((d) => d.status === 'open') ?? [];
  const overdue = open.filter((d) => isOverdue(d.due, today));
  const doneThisWeek = walks?.some((w) => w.isoYear === thisWeek.year && w.week === thisWeek.week);
  const backup = lastBackup();

  const start = async () => {
    setCreating(true);
    const w = await createWalk();
    navigate(`/rundgang/${w.id}/daten`);
  };

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Rundgänge</h1>
        <p className="mt-1 text-[15px] text-muted">
          Heute {formatDate(today)}, KW {thisWeek.week}.{' '}
          {walks && (doneThisWeek ? 'Rundgang dieser Woche ist erfasst.' : 'Für diese Woche ist noch kein Rundgang erfasst.')}
        </p>
        <button type="button" className="btn-primary mt-4 w-full sm:w-auto" onClick={start} disabled={creating} data-testid="new-walk">
          <Plus size={20} weight="bold" aria-hidden />
          Neuer Rundgang
        </button>
      </section>

      <section aria-label="Kennzahlen" className="grid grid-cols-2 divide-x divide-line rounded-xl border border-line bg-surface">
        <Link to="/maengel" className="px-4 py-3">
          <div className="text-sm text-muted">Offene Mängel</div>
          <div className="text-2xl font-semibold tabular-nums">{defects ? open.length : ' '}</div>
        </Link>
        <Link to="/maengel" className="px-4 py-3">
          <div className="text-sm text-muted">Davon überfällig</div>
          <div className={`text-2xl font-semibold tabular-nums ${overdue.length ? 'text-warn' : ''}`}>{defects ? overdue.length : ' '}</div>
        </Link>
      </section>

      {walks && walks.length > 0 && (!backup || Date.now() - Date.parse(backup) > 30 * 864e5) && (
        <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
          Daten liegen nur auf diesem Gerät.{' '}
          <Link to="/sicherung" className="font-medium underline underline-offset-2">
            {backup ? `Letzte Sicherung ${formatDate(backup.slice(0, 10))}. Jetzt sichern.` : 'Noch keine Sicherung. Jetzt sichern.'}
          </Link>
        </p>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">Verlauf</h2>
        {!walks ? (
          <div className="space-y-2" aria-label="Lädt">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[72px] animate-pulse rounded-xl bg-surface" />
            ))}
          </div>
        ) : walks.length === 0 ? (
          <EmptyState title="Noch kein Rundgang erfasst">
            Mit "Neuer Rundgang" starten. Datum, Kalenderwoche und Rundgangsart werden vorgeschlagen.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {walks.map((w) => {
              const c = countRatings(w);
              const nDefects = defects?.filter((d) => d.walkId === w.id).length ?? 0;
              return (
                <li key={w.id}>
                  <Link to={`/rundgang/${w.id}/${w.status === 'closed' ? 'abschluss' : 'checkliste'}`} className="flex items-center gap-3 px-4 py-3 active:bg-surface-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold tabular-nums">{weekLabel(w.isoYear, w.week)}</span>
                        {w.status === 'closed' ? <Badge tone="ok">abgeschlossen</Badge> : <Badge tone="warn">Entwurf</Badge>}
                      </div>
                      <div className="mt-0.5 truncate text-sm text-muted">
                        {formatDate(w.date)}, {TYPE_LABELS[w.type]}, {w.inspector || 'ohne Namen'}
                      </div>
                      <div className="mt-0.5 text-sm text-muted tabular-nums">
                        {c.checked}/{c.total} bewertet, {nDefects} {nDefects === 1 ? 'Mangel' : 'Mängel'}
                      </div>
                    </div>
                    <CaretRight size={18} className="shrink-0 text-muted" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
