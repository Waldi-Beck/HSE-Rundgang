import { Plus } from '@phosphor-icons/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import type { Defect, Walk } from '../../lib/types';
import { DefectRow } from '../../components/DefectRow';
import { EmptyState } from '../../components/ui';

/** Kapitel 3 Mängel und Massnahmen aus dem aktuellen Formular. */
export function DefectsTab({
  walk,
  defects,
  onNewDefect,
  onEditDefect,
}: {
  walk: Walk;
  defects: Defect[];
  onNewDefect: (itemId?: string, area?: string) => void;
  onEditDefect: (d: Defect) => void;
}) {
  const ro = walk.status === 'closed';
  const photoCounts = useLiveQuery(async () => {
    const ps = await db.photos.where('defectId').anyOf(defects.map((d) => d.id)).toArray();
    return ps.reduce<Record<string, number>>((m, p) => ((m[p.defectId] = (m[p.defectId] ?? 0) + 1), m), {});
  }, [defects]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">3. Mängel und Massnahmen</h2>
          <p className="text-sm text-muted">Mangel-ID, Kontrollpunkt, Bereich, Gefahr, Massnahmen und Foto.</p>
        </div>
        {!ro && (
          <button type="button" className="btn-secondary shrink-0" onClick={() => onNewDefect()}>
            <Plus size={18} aria-hidden /> Mangel
          </button>
        )}
      </div>
      {defects.length === 0 ? (
        <EmptyState title="Keine Mängel erfasst">
          Einen Punkt in der Checkliste auf „Mangel“ setzen, dann öffnet sich die Mängelerfassung mit Punkt und Bereich.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {defects.map((d) => (
            <DefectRow key={d.id} defect={d} photoCount={photoCounts?.[d.id]} showOrigin={false} onOpen={() => onEditDefect(d)} />
          ))}
        </ul>
      )}
    </div>
  );
}
