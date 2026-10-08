import { DownloadSimple } from '@phosphor-icons/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { DEFECT_STATUS_LABELS, PRIORITY_KEY_TO_TEXT, RESULT_LABELS } from '../data/register';
import { db, updateDefect } from '../db';
import { exportRegisterXlsx } from '../export';
import { formatDate, toISODate } from '../lib/dates';
import { defectDaysOpen, roundRegisterRows, validDefectDue } from '../lib/register';
import type { Defect, DefectStatus, Walk } from '../lib/types';
import { EmptyState, useToast } from '../components/ui';
import { useRegisterSettings } from '../components/SettingsContext';

const VIEWS = [
  { id: 'rundgaenge', label: 'Rundgänge' },
  { id: 'maengel', label: 'Mängel' },
] as const;
type ViewId = (typeof VIEWS)[number]['id'];

export function RegisterPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('view') as ViewId | null;
  const [view, setView] = useState<ViewId>(VIEWS.some((item) => item.id === requested) ? requested! : 'rundgaenge');
  const toast = useToast();
  const settings = useRegisterSettings();
  const walks = useLiveQuery(() => db.walks.toArray());
  const defects = useLiveQuery(() => db.defects.toArray());
  const ready = !!walks && !!defects;
  const rows = ready ? roundRegisterRows(walks, defects, settings).slice().reverse() : [];

  useEffect(() => {
    if (requested && VIEWS.some((item) => item.id === requested)) setView(requested);
  }, [requested]);

  const chooseView = (next: ViewId) => {
    setView(next);
    setParams({ view: next }, { replace: true });
  };
  const downloadXlsx = async () => toast(`${await exportRegisterXlsx()} erstellt.`);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Register</h1><p className="mt-1 text-sm text-muted">Rundgänge und Mängel.</p></div>
        <div className="flex gap-2"><Link to="/einstellungen" className="btn-secondary">Einstellungen</Link><button type="button" className="btn-primary" onClick={() => void downloadXlsx()}><DownloadSimple size={18} aria-hidden /> Excel exportieren</button></div>
      </header>

      <div role="tablist" aria-label="Registerblätter" className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface p-1">
        {VIEWS.map((item) => <button key={item.id} role="tab" aria-selected={view === item.id} type="button" onClick={() => chooseView(item.id)} className={`min-h-11 rounded-md px-2 text-sm font-medium ${view === item.id ? 'bg-ink text-bg' : 'text-muted'}`}>{item.label}</button>)}
      </div>

      {!ready ? <div className="h-40 animate-pulse rounded-xl bg-surface" aria-label="Register wird geladen" /> : view === 'rundgaenge' ? <RoundsRegister rows={rows} /> : <DefectsRegister walks={walks} defects={defects} />}
    </div>
  );
}

function RoundsRegister({ rows }: { rows: ReturnType<typeof roundRegisterRows> }) {
  if (!rows.length) return <EmptyState title="Noch keine Rundgänge">Nach dem ersten Rundgang erscheinen hier die berechneten Registerwerte.</EmptyState>;
  return <div className="overflow-x-auto rounded-xl border border-line bg-surface"><table className="min-w-[1900px] border-collapse text-left text-xs"><thead className="sticky top-0 bg-surface-2"><tr>{['Nr.', 'Datum', 'KW', 'Tage seit letztem', 'Intervall', 'Monatspunkte 2.2 geprüft', 'Beginn', 'Ende', 'Dauer', 'Durchgeführt von', 'Begleitperson', 'Mängel erfasst', 'davon kritisch', 'davon noch offen', 'Gesamtbewertung', 'Ablage (PDF-Datei)', 'Bemerkung', 'Rundgang-Nr.'].map((title) => <th key={title} className="border-b border-line px-3 py-3 font-semibold">{title}</th>)}</tr></thead><tbody className="divide-y divide-line">
    {rows.map((row) => <tr key={row.walk.id} className={row.monthlyWarning ? 'bg-warn-soft/70' : ''} data-testid={`round-row-${row.walk.id}`}>
      <td className="px-3 py-3 tabular-nums">{row.index}</td><td className="px-3 py-3 whitespace-nowrap">{formatDate(row.walk.date)}</td><td className="px-3 py-3">{row.walk.isoYear}-KW{String(row.walk.week).padStart(2, '0')}</td>
      <td className="px-3 py-3 tabular-nums">{row.daysSincePrevious ?? '–'}</td><td className={`px-3 py-3 ${row.interval === 'überschritten' ? 'font-semibold text-warn' : ''}`}>{row.interval}</td>
      <td className={`px-3 py-3 ${row.monthlyWarning ? 'font-semibold text-warn' : ''}`}>{row.walk.monthlyChecked ? 'Ja' : 'Nein'}{row.monthlyWarning ? ' · 2.2 fehlt' : ''}</td>
      <td className="px-3 py-3">{row.walk.startTime}</td><td className="px-3 py-3">{row.walk.endTime || '–'}</td><td className="px-3 py-3">{row.durationMinutes === null ? '–' : `${Math.floor(row.durationMinutes / 60)}:${String(row.durationMinutes % 60).padStart(2, '0')}`}</td>
      <td className="px-3 py-3">{row.walk.inspector}</td><td className="px-3 py-3">{row.walk.companion || '–'}</td><td className="px-3 py-3">{row.defectCount}</td><td className="px-3 py-3">{row.criticalCount}</td><td className="px-3 py-3">{row.openCount}</td>
      <td className="px-3 py-3">{row.walk.result ? RESULT_LABELS[row.walk.result] : '–'}</td><td className="px-3 py-3"><Link className="text-accent underline" to={`/rundgang/${row.walk.id}/abschluss`}>{row.pdfFilename}</Link></td><td className="max-w-48 truncate px-3 py-3">{row.walk.note}</td><td className="px-3 py-3 font-medium">{row.walk.docNr}</td>
    </tr>)}
  </tbody></table></div>;
}

function DefectsRegister({ walks, defects }: { walks: Walk[]; defects: Defect[] }) {
  const [filter, setFilter] = useState('all');
  const byWalk = new Map(walks.map((walk) => [walk.id, walk]));
  const visible = defects.filter((defect) => filter === 'all' || defect.status === filter).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.nr - b.nr);
  if (!defects.length) return <EmptyState title="Noch keine Mängel">Mängel aus der Checkliste erscheinen hier mit gültiger Frist und Nachkontrolle.</EmptyState>;
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2" aria-label="Mängelfilter">{[['all', 'Alle'], ['open', 'Offen'], ['inProgress', 'In Bearbeitung'], ['recheck', 'Nachkontrolle'], ['done', 'Erledigt']].map(([id, label]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)} className={`min-h-10 rounded-lg border px-3 text-sm ${filter === id ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface'}`}>{label}</button>)}</div>
    <div className="overflow-x-auto rounded-xl border border-line bg-surface"><table className="min-w-[2500px] border-collapse text-left text-xs"><thead className="bg-surface-2"><tr>{['Mangel-ID', 'Datum', 'KW', 'Nr. im Formular', 'Bereich', 'Kontrollpunkt', 'Beschreibung des Mangels', 'Festgestellte Gefahr', 'Priorität', 'Sofortmassnahme', 'Massnahme', 'Verantwortlich', 'Frist', 'Status', 'Erledigt am', 'Nachkontrolle am', 'Kontrolliert von', 'Mangel behoben?', 'Neuer Termin (bei Nein)', 'Gültige Frist', 'Tage offen', 'Überfällig', 'Bemerkung'].map((title) => <th key={title} className="border-b border-line px-3 py-3 font-semibold">{title}</th>)}</tr></thead><tbody className="divide-y divide-line">
    {visible.map((defect) => <DefectRegisterRow key={defect.id} defect={defect} walk={byWalk.get(defect.walkId)} />)}
    </tbody></table></div>
  </div>;
}

function DefectRegisterRow({ defect, walk }: { defect: Defect; walk?: Walk }) {
  const settings = useRegisterSettings();
  const baseDate = walk?.date ?? defect.createdAt.slice(0, 10);
  const validDue = validDefectDue(baseDate, defect, settings);
  const daysOpen = defectDaysOpen(baseDate, defect);
  const overdue = defect.status !== 'done' && validDue < toISODate(new Date());
  const patch = (changes: Partial<Defect>) => void updateDefect(defect.id, changes);
  return <tr className={overdue ? 'bg-danger-soft/45' : ''} data-testid={`defect-${defect.id}`}>
    <td className="px-3 py-2 font-medium">{defect.mangelId}</td><td className="px-3 py-2 whitespace-nowrap">{formatDate(baseDate)}</td><td className="px-3 py-2">{walk ? `${walk.isoYear}-KW${String(walk.week).padStart(2, '0')}` : '–'}</td><td className="px-3 py-2">{defect.nr}</td><td className="px-3 py-2">{defect.area}</td><td className="px-3 py-2">{defect.itemId}</td><td className="px-3 py-2">{defect.description}</td><td className="px-3 py-2">{defect.hazard}</td><td className="px-3 py-2">{PRIORITY_KEY_TO_TEXT[defect.priority]}</td><td className="px-3 py-2">{defect.immediateAction}</td><td className="px-3 py-2">{defect.action}</td><td className="px-3 py-2">{defect.responsible}</td><td className="px-3 py-2">{formatDate(defect.due)}</td>
    <td className="min-w-52 px-3 py-2"><select className="field min-w-48 py-1.5 text-xs" value={defect.status} onChange={(event) => patch({ status: event.target.value as DefectStatus, doneAt: event.target.value === 'done' ? toISODate(new Date()) : defect.doneAt })}>{Object.entries(DEFECT_STATUS_LABELS).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select></td>
    <td className="px-3 py-2">{formatDate(defect.doneAt)}</td><td className="px-3 py-2"><input aria-label={`Nachkontrolle am ${defect.mangelId}`} className="field min-w-32 py-1.5 text-xs" type="date" value={defect.recheckAt ?? ''} onChange={(event) => patch({ recheckAt: event.target.value || null })} /></td><td className="px-3 py-2"><input aria-label={`Kontrolliert von ${defect.mangelId}`} className="field min-w-36 py-1.5 text-xs" value={defect.controlledBy} onChange={(event) => patch({ controlledBy: event.target.value })} /></td>
    <td className="px-3 py-2"><select aria-label={`Mangel behoben ${defect.mangelId}`} className="field min-w-28 py-1.5 text-xs" value={defect.fixed === null ? '' : defect.fixed ? 'yes' : 'no'} onChange={(event) => patch({ fixed: event.target.value === '' ? null : event.target.value === 'yes', status: event.target.value === 'no' ? 'recheck' : defect.status })}><option value="">–</option><option value="yes">Ja</option><option value="no">Nein</option></select></td>
    <td className="px-3 py-2"><input aria-label={`Neuer Termin ${defect.mangelId}`} className="field min-w-32 py-1.5 text-xs" type="date" value={defect.newDue} onChange={(event) => patch({ newDue: event.target.value })} /></td><td className={`px-3 py-2 whitespace-nowrap ${overdue ? 'font-semibold text-danger' : ''}`}>{formatDate(validDue)}</td><td className="px-3 py-2">{daysOpen}</td><td className={`px-3 py-2 ${overdue ? 'font-bold text-danger' : ''}`}>{overdue ? 'ÜBERFÄLLIG' : ''}</td><td className="px-3 py-2"><input aria-label={`Bemerkung ${defect.mangelId}`} className="field min-w-44 py-1.5 text-xs" value={defect.note} onChange={(event) => patch({ note: event.target.value })} /></td>
  </tr>;
}

