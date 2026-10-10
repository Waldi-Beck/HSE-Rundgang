import { CheckCircle, Plus } from '@phosphor-icons/react';
import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { FORM_AREAS, MONTHLY_ITEMS, MONTHLY_NOTICE, WEEKLY_ITEMS, WEEKLY_NOTICE, areaLabel, type FormAreaId } from '../../data/checklist';
import { patchMonthlyAreas, patchRatings } from '../../db';
import type { Defect, Rating, Walk } from '../../lib/types';
import { cellKey, countRatings, defectsForCell, weeklyKeys } from '../../lib/walk';
import { RatingControl } from '../../components/RatingControl';
import { useRegisterSettings } from '../../components/SettingsContext';
import { useToast } from '../../components/ui';

type ViewId = 'weekly' | 'monthly';

export function ChecklistTab({ walk, defects, onNewDefect, onEditDefect }: {
  walk: Walk;
  defects: Defect[];
  onNewDefect: (itemId: string, area?: string) => void;
  onEditDefect: (defect: Defect) => void;
}) {
  const readOnly = walk.status === 'closed';
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const requested = params.get('bereich');
  const view: ViewId = requested === 'monatlich' && walk.monthlyChecked ? 'monthly' : 'weekly';
  const monthlyKeys = MONTHLY_ITEMS.map((item) => item.id);
  const weeklyRatings = countRatings(walk, weeklyKeys());
  const monthlyRatings = countRatings(walk, monthlyKeys);

  useEffect(() => {
    const expected = view === 'monthly' ? 'monatlich' : 'wöchentlich';
    if (requested !== expected) setParams({ bereich: expected }, { replace: true });
  }, [requested, setParams, view]);

  const goTo = (next: ViewId) => {
    setParams({ bereich: next === 'monthly' ? 'monatlich' : 'wöchentlich' }, { replace: true });
    window.scrollTo({ top: 0 });
  };

  const rateWeekly = (itemId: string, area: FormAreaId, value: Rating | undefined) => {
    const key = cellKey(itemId, area);
    const previous = walk.ratings[key];
    void patchRatings(walk.id, { [key]: value });
    const linked = defectsForCell(key, defects);
    if (value === 'mangel' && linked.length === 0) onNewDefect(itemId, area);
    if (previous === 'mangel' && value !== 'mangel' && linked.length) {
      toast(`Mangel-ID ${linked.map((defect) => defect.mangelId).join(', ')} bleibt bestehen. Im Register nachführen.`);
    }
  };

  const restOkForArea = (area: FormAreaId) => {
    const patch = Object.fromEntries(WEEKLY_ITEMS.filter((item) => !walk.ratings[cellKey(item.id, area)]).map((item) => [cellKey(item.id, area), 'ok' as const]));
    void patchRatings(walk.id, patch);
  };

  const rateMonthly = (itemId: string, selectedArea: string, value: Rating | undefined) => {
    if (!selectedArea) return;
    const previous = walk.ratings[itemId];
    void patchRatings(walk.id, { [itemId]: value });
    const linked = defectsForCell(cellKey(itemId, selectedArea), defects);
    if (value === 'mangel' && linked.length === 0) onNewDefect(itemId, selectedArea);
    if (previous === 'mangel' && value !== 'mangel' && linked.length) {
      toast(`Mangel-ID ${linked.map((defect) => defect.mangelId).join(', ')} bleibt bestehen. Im Register nachführen.`);
    }
  };

  const restOkMonthly = () => {
    const patch = Object.fromEntries(monthlyKeys.filter((key) => !walk.ratings[key]).map((key) => [key, 'ok' as const]));
    void patchRatings(walk.id, patch);
  };

  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Checklistenabschnitte">
      <button type="button" role="tab" aria-selected={view === 'weekly'} data-testid="area-tab-weekly" onClick={() => goTo('weekly')} className={`min-h-11 rounded-lg border px-4 text-sm font-semibold ${view === 'weekly' ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface'}`}>
        2.1 Bei jedem Rundgang <span className="ml-1 text-xs tabular-nums text-muted">{weeklyRatings.checked}/{weeklyRatings.total}</span>
      </button>
      {walk.monthlyChecked && <button type="button" role="tab" aria-selected={view === 'monthly'} data-testid="area-tab-monthly" onClick={() => goTo('monthly')} className={`min-h-11 rounded-lg border px-4 text-sm font-semibold ${view === 'monthly' ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface'}`}>
        2.2 Monatlich <span className="ml-1 text-xs tabular-nums text-muted">{monthlyRatings.checked}/{monthlyRatings.total}</span>
      </button>}
    </div>

    {view === 'weekly' ? <>
      <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm" aria-label="Bewertungslegende">
        <span className="font-semibold">Bewertung</span><span className="mx-2 hidden text-muted sm:inline">│</span>
        <span className="ml-2"><strong className="text-accent">OK</strong> = in Ordnung</span>
        <span className="ml-3"><strong className="text-danger">Mangel</strong> = in Kapitel 3 erfassen (Punkt + Bereich)</span>
        <span className="ml-3"><strong>n.a.</strong> = nicht vorhanden / nicht begangen</span>
      </div>
      <section aria-labelledby="weekly-checklist-title" className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="border-b border-line bg-surface-2 px-4 py-3">
          <h2 id="weekly-checklist-title" className="font-semibold">{WEEKLY_NOTICE}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[660px] border-collapse text-left text-sm" data-testid="weekly-checklist-matrix">
            <thead className="bg-surface-2 text-xs"><tr>
              <th scope="col" className="w-14 border-b border-r border-line px-3 py-2.5">Nr.</th>
              <th scope="col" className="min-w-[180px] border-b border-r border-line px-3 py-2.5 sm:min-w-[330px]">Kontrollpunkt</th>
              {FORM_AREAS.map((area) => {
                const areaCounts = countRatings(walk, weeklyKeys(area.id));
                return <th scope="col" key={area.id} className="w-[145px] border-b border-r border-line px-2 py-2 text-center last:border-r-0 sm:w-[190px]">
                <div className="flex items-center justify-center gap-1 font-semibold">{areaCounts.checked === areaCounts.total && <CheckCircle size={13} weight="fill" className="text-accent" aria-hidden />}{area.label}<span data-testid={`weekly-count-${area.id}`} className="text-[10px] font-normal tabular-nums text-muted">{areaCounts.checked}/{areaCounts.total}</span></div>
                {!readOnly && <button type="button" data-testid={`rest-ok-${area.id}`} onClick={() => restOkForArea(area.id)} className="mt-1 min-h-8 text-[11px] font-medium text-accent underline underline-offset-2">Rest OK</button>}
              </th>;
              })}
            </tr></thead>
            <tbody className="divide-y divide-line">
              {WEEKLY_ITEMS.map((item) => <tr key={item.id} data-testid={`weekly-row-${item.id}`}>
                <th scope="row" className="border-r border-line px-3 py-2 align-top text-xs font-semibold tabular-nums">{item.id}</th>
                <td className="border-r border-line px-3 py-2 align-top"><div className="font-medium leading-snug">{item.text}</div><details className="mt-1 text-[11px] text-muted"><summary className="cursor-pointer">Grundlage</summary><p className="mt-1 leading-relaxed">{item.basis}</p></details></td>
                {FORM_AREAS.map((area) => {
                  const key = cellKey(item.id, area.id);
                  const linked = defectsForCell(key, defects);
                  const rating = walk.ratings[key];
                  return <td key={area.id} className={`w-[145px] border-r border-line px-2 py-2 align-middle last:border-r-0 sm:w-[190px] ${rating === 'mangel' ? 'bg-danger-soft/50' : ''}`}>
                    <RatingControl itemId={key} label={`${item.id} ${area.label}`} value={rating} disabled={readOnly} compact onChange={(value) => rateWeekly(item.id, area.id, value)} />
                    {(rating === 'mangel' || linked.length > 0) && <div className="mt-1 flex flex-wrap justify-center gap-1">
                      {linked.map((defect) => <button key={defect.id} type="button" onClick={() => onEditDefect(defect)} className="min-h-7 rounded border border-line-strong bg-surface px-1.5 text-[10px] font-medium">{defect.mangelId}</button>)}
                      {linked.length === 0 && <button type="button" onClick={() => onNewDefect(item.id, area.id)} className="inline-flex min-h-7 items-center gap-0.5 text-[10px] font-medium text-danger"><Plus size={12} aria-hidden /> Mangel erfassen</button>}
                    </div>}
                  </td>;
                })}
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </> : <MonthlyChecklist walk={walk} defects={defects} readOnly={readOnly} onRate={rateMonthly} onEditDefect={onEditDefect} restOk={restOkMonthly} />}

    <Link to={`/rundgang/${walk.id}/abschluss`} replace className="btn-primary w-full" data-testid="continue-to-close">Weiter zum Abschluss</Link>
  </div>;
}

function MonthlyChecklist({ walk, defects, readOnly, onRate, onEditDefect, restOk }: {
  walk: Walk;
  defects: Defect[];
  readOnly: boolean;
  onRate: (itemId: string, area: string, rating: Rating | undefined) => void;
  onEditDefect: (defect: Defect) => void;
  restOk: () => void;
}) {
  const settings = useRegisterSettings();
  const unrated = MONTHLY_ITEMS.filter((item) => !walk.ratings[item.id]);
  const counts = countRatings(walk, MONTHLY_ITEMS.map((item) => item.id));
  return <section aria-labelledby="monthly-checklist-title" className="overflow-hidden rounded-xl border border-line bg-surface">
    <header className="border-b border-line bg-surface-2 px-4 py-3">
      <div className="flex items-start justify-between gap-3"><h2 id="monthly-checklist-title" className="font-semibold">{MONTHLY_NOTICE}</h2><span className="shrink-0 text-sm tabular-nums text-muted">{counts.checked}/{counts.total}</span></div>
      {!readOnly && unrated.length > 0 && <button type="button" onClick={restOk} className="mt-2 min-h-11 font-medium text-accent underline underline-offset-2" data-testid="rest-ok">Rest OK ({unrated.length})</button>}
    </header>
    <ul className="divide-y divide-line">{MONTHLY_ITEMS.map((item) => {
      const selectedArea = walk.monthlyAreas[item.id] ?? '';
      const areaOptions = settings.areas.map((value) => ({ value, label: areaLabel(value, settings.areas) })).filter((option, index, all) =>
        all.findIndex((candidate) => candidate.label === option.label) === index || option.value === selectedArea);
      const linked = selectedArea ? defectsForCell(cellKey(item.id, selectedArea), defects) : defects.filter((defect) => defect.itemId === item.id);
      return <li key={item.id} className={`px-4 py-4 ${walk.ratings[item.id] === 'mangel' ? 'bg-danger-soft/45' : ''}`}>
        <p className="text-[15px] font-medium leading-snug"><span className="mr-1.5 font-semibold tabular-nums">{item.id}</span>{item.text}</p>
        <p className="mb-3 mt-1 text-xs leading-relaxed text-muted">{item.basis}</p>
        <label className="mb-3 block"><span className="label">Bereich</span><select className="field" value={selectedArea} disabled={readOnly} onChange={(event) => void patchMonthlyAreas(walk.id, { [item.id]: event.target.value || undefined })} aria-label={`Bereich ${item.id}`} data-testid={`monthly-area-${item.id}`}>
          <option value="">Bereich wählen</option>{areaOptions.map((area) => <option key={area.value} value={area.value}>{area.label}</option>)}
        </select></label>
        <RatingControl itemId={item.id} label={`${item.id} ${selectedArea ? areaLabel(selectedArea, settings.areas) : ''}`} value={walk.ratings[item.id]} disabled={readOnly || !selectedArea} onChange={(value) => onRate(item.id, selectedArea, value)} />
        {(walk.ratings[item.id] === 'mangel' || linked.length > 0) && <div className="mt-2 flex flex-wrap items-center gap-2 text-sm"><span className="text-muted">Mangel-ID</span>{linked.map((defect) => <button key={defect.id} type="button" onClick={() => onEditDefect(defect)} className="min-h-10 rounded-md border border-line-strong bg-surface px-2.5 font-medium">{defect.mangelId}</button>)}{linked.length === 0 && <span className="font-medium text-danger">Fehlt</span>}</div>}
      </li>;
    })}</ul>
  </section>;
}
