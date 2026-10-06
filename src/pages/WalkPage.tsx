import { ArrowLeft, LockSimple } from '@phosphor-icons/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useState } from 'react';
import { Link, NavLink, Navigate, useParams } from 'react-router';
import { TYPE_LABELS } from '../data/checklist';
import { db, newDefectDraft } from '../db';
import { weekLabel } from '../lib/dates';
import type { Defect } from '../lib/types';
import { countRatings } from '../lib/walk';
import { DefectSheet } from '../components/DefectSheet';
import { Badge, EmptyState } from '../components/ui';
import { DataTab } from './walk/DataTab';
import { ChecklistTab } from './walk/ChecklistTab';
import { DefectsTab } from './walk/DefectsTab';
import { CloseTab } from './walk/CloseTab';

const TABS = [
  { key: 'daten', label: 'Daten' },
  { key: 'checkliste', label: 'Checkliste' },
  { key: 'maengel', label: 'Mängel' },
  { key: 'abschluss', label: 'Abschluss' },
] as const;

export function WalkPage() {
  const { id = '', tab = 'daten' } = useParams();
  const walk = useLiveQuery(async () => (await db.walks.get(id)) ?? null, [id]);
  const defects = useLiveQuery(() => db.defects.where('walkId').equals(id).sortBy('nr'), [id]);
  const [editing, setEditing] = useState<Defect | null>(null);

  const openNewDefect = useCallback(
    (itemId = '') => walk && defects && setEditing(newDefectDraft(walk, defects, itemId)),
    [walk, defects],
  );
  const closeSheet = useCallback(() => setEditing(null), []);

  if (walk === undefined || defects === undefined) {
    return <div className="h-40 animate-pulse rounded-xl bg-surface" aria-label="Lädt" />;
  }
  if (walk === null) {
    return (
      <EmptyState title="Rundgang nicht gefunden" action={<Link className="btn-secondary" to="/">Zur Übersicht</Link>}>
        Der Rundgang wurde gelöscht oder liegt auf einem anderen Gerät.
      </EmptyState>
    );
  }
  if (!TABS.some((t) => t.key === tab)) return <Navigate to={`/rundgang/${id}/daten`} replace />;

  const c = countRatings(walk);
  const closed = walk.status === 'closed';

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 border-b border-line bg-bg/95 px-4 pt-1 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link to="/" aria-label="Zur Übersicht" className="-ml-2 grid h-11 w-11 place-items-center rounded-lg">
            <ArrowLeft size={22} aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg leading-tight font-semibold tabular-nums">{weekLabel(walk.isoYear, walk.week)}</h1>
            <p className="truncate text-sm text-muted">
              {TYPE_LABELS[walk.type]}, {c.checked}/{c.total} bewertet
            </p>
          </div>
          {closed ? (
            <Badge tone="ok">
              <LockSimple size={12} className="mr-1" aria-hidden /> abgeschlossen
            </Badge>
          ) : (
            <Badge tone="warn">Entwurf</Badge>
          )}
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line" aria-hidden>
          <div className="h-full bg-accent transition-[width]" style={{ width: `${c.total ? (c.checked / c.total) * 100 : 0}%` }} />
        </div>
        <nav aria-label="Kapitel" className="-mx-1 mt-1 grid grid-cols-4">
          {TABS.map((t) => (
            <NavLink
              key={t.key}
              to={`/rundgang/${id}/${t.key}`}
              replace
              className={({ isActive }) =>
                `flex min-h-11 items-center justify-center border-b-2 px-1 text-[15px] font-medium ${
                  isActive ? 'border-accent text-ink' : 'border-transparent text-muted'
                }`
              }
            >
              {t.label}
              {t.key === 'maengel' && defects.length > 0 && <span className="ml-1 text-xs tabular-nums text-muted">({defects.length})</span>}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="pt-4">
        {tab === 'daten' && <DataTab walk={walk} />}
        {tab === 'checkliste' && <ChecklistTab walk={walk} defects={defects} onNewDefect={openNewDefect} onEditDefect={setEditing} />}
        {tab === 'maengel' && <DefectsTab walk={walk} defects={defects} onNewDefect={openNewDefect} onEditDefect={setEditing} />}
        {tab === 'abschluss' && <CloseTab walk={walk} defects={defects} />}
      </div>

      {editing && <DefectSheet key={editing.id} walk={walk} defect={editing} onClose={closeSheet} />}
    </div>
  );
}
