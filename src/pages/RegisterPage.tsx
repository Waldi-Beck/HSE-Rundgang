import { FileCsv } from '@phosphor-icons/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { db } from '../db';
import { exportRegisterCsv } from '../export';
import { isOverdue, toISODate } from '../lib/dates';
import { DefectRow } from '../components/DefectRow';
import { EmptyState, useToast } from '../components/ui';

type Filter = 'open' | 'done' | 'all';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'open', label: 'Offen' },
  { key: 'done', label: 'Erledigt' },
  { key: 'all', label: 'Alle' },
];

/** Mängelregister über alle Rundgänge (FR-040 bis FR-042), ersetzt die Nachkontrolle im Excel-Register. */
export function RegisterPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('open');
  const data = useLiveQuery(async () => {
    const [walks, defects, photos] = await Promise.all([db.walks.toArray(), db.defects.toArray(), db.photos.toArray()]);
    const photoCounts = photos.reduce<Record<string, number>>((m, p) => ((m[p.defectId] = (m[p.defectId] ?? 0) + 1), m), {});
    return { walks: new Map(walks.map((w) => [w.id, w])), defects, photoCounts };
  });

  const today = toISODate(new Date());
  const list = (data?.defects ?? [])
    .filter((d) => filter === 'all' || d.status === filter)
    .sort((a, b) => {
      // offene: überfällige und früheste Frist zuerst; erledigte: zuletzt erledigt zuerst
      if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
      if (a.status === 'done') return (b.doneAt ?? '').localeCompare(a.doneAt ?? '');
      return a.due.localeCompare(b.due);
    });
  const overdue = data?.defects.filter((d) => d.status === 'open' && isOverdue(d.due, today)).length ?? 0;

  const csv = async () => toast(`${await exportRegisterCsv()} erstellt.`);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mängelregister</h1>
          <p className="mt-0.5 text-sm text-muted">
            Nachkontrolle über alle Rundgänge{overdue ? `, ${overdue} überfällig` : ''}.
          </p>
        </div>
        <button type="button" className="btn-secondary shrink-0" onClick={csv} disabled={!data?.defects.length}>
          <FileCsv size={20} aria-hidden /> CSV
        </button>
      </div>

      <div role="tablist" aria-label="Filter" className="grid grid-cols-3 gap-1 rounded-lg border border-line bg-surface p-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`min-h-10 rounded-md text-[15px] font-medium ${filter === f.key ? 'bg-ink text-bg' : 'text-muted'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="h-32 animate-pulse rounded-xl bg-surface" aria-label="Lädt" />
      ) : list.length === 0 ? (
        <EmptyState title={filter === 'open' ? 'Keine offenen Mängel' : 'Keine Einträge'}>
          Mängel entstehen im Rundgang, wenn ein Punkt auf "Mangel" gesetzt wird.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {list.map((d) => (
            <DefectRow
              key={d.id}
              defect={d}
              walk={data.walks.get(d.walkId)}
              photoCount={data.photoCounts[d.id]}
              onOpen={() => navigate(`/rundgang/${d.walkId}/maengel`)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
