import { CaretRight, Plus, WarningCircle } from '@phosphor-icons/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { createWalk, db } from '../db';
import { formatDate, weekLabel } from '../lib/dates';
import { overviewMetrics, roundRegisterRows } from '../lib/register';
import { Badge, EmptyState } from '../components/ui';
import { useRegisterSettings } from '../components/SettingsContext';

export function DashboardPage() {
  const navigate = useNavigate();
  const settings = useRegisterSettings();
  const [creating, setCreating] = useState(false);
  const walks = useLiveQuery(() => db.walks.toArray());
  const defects = useLiveQuery(() => db.defects.toArray());
  const dataReady = !!walks && !!defects;
  const metrics = dataReady ? overviewMetrics(walks, defects, settings) : null;
  const recentRounds = dataReady ? roundRegisterRows(walks, defects, settings).slice().reverse().slice(0, 8) : [];

  const start = async () => {
    setCreating(true);
    try {
      const walk = await createWalk();
      navigate(`/rundgang/${walk.id}/daten`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Übersicht</h1>
          <p className="mt-1 text-sm text-muted">Rundgänge und Mängel.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link to="/register" className="btn-secondary flex-1 sm:flex-none">Register öffnen</Link>
          <button type="button" className="btn-primary flex-1 sm:flex-none" onClick={start} disabled={creating} data-testid="new-walk">
            <Plus size={19} weight="bold" aria-hidden /> Neuer Rundgang
          </button>
        </div>
      </section>

      {!metrics ? (
        <div className="grid grid-cols-2 gap-3" aria-label="Übersicht wird geladen">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-surface" />)}
        </div>
      ) : (
        <>
          {(metrics.roundWarning || metrics.nextLatestDate && metrics.daysSinceLastWalk !== null && metrics.daysSinceLastWalk >= settings.maxIntervalDays) && (
            <div role="status" className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${metrics.intervalExceeded ? 'border-danger/30 bg-danger-soft text-danger' : 'border-warn/30 bg-warn-soft text-warn'}`}>
              <WarningCircle size={21} className="mt-0.5 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">{metrics.intervalExceeded ? 'Rundgang überfällig' : 'Nächster Rundgang ist fällig'}</p>
                <p className="text-sm">Spätestens am {formatDate(metrics.nextLatestDate)} (Höchstintervall {settings.maxIntervalDays} Tage).</p>
              </div>
            </div>
          )}

          <section aria-label="Rundgang-Kennzahlen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Rundgänge gesamt" value={metrics.walkCount} testId="overview-round-count" />
            <Metric label="Letzter Rundgang" value={metrics.lastWalk ? formatDate(metrics.lastWalk.date) : 'Noch keiner'} />
            <Metric label="Tage seit letztem" value={metrics.daysSinceLastWalk ?? '–'} />
            <Metric label="Nächster spätestens" value={metrics.nextLatestDate ? formatDate(metrics.nextLatestDate) : '–'} />
          </section>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Mängel-Kennzahlen">
            <Metric label="Mängel gesamt" value={metrics.defectCount} link="/register?view=maengel" />
            <Metric label="Offen" value={metrics.openDefectCount} link="/register?view=maengel" />
            <Metric label="Überfällig" value={metrics.overdueDefectCount} alert={metrics.overdueDefectCount > 0} link="/register?view=maengel" />
            <Metric label="Kritisch / Hoch offen" value={metrics.criticalOrHighOpenCount} link="/register?view=maengel" />
            <Metric label="Nachkontrolle" value={metrics.recheckCount} link="/register?view=maengel" />
            <Metric label="Erledigt" value={metrics.doneCount} link="/register?view=maengel" />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface p-4">
              <h2 className="text-lg font-semibold">Mängel nach Bereich</h2>
              <div className="mt-3 divide-y divide-line">
                {metrics.defectsByArea.map((item) => (
                  <div key={item.area} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>{item.area}</span><span className="tabular-nums text-muted">{item.open} offen / {item.done} erledigt / {item.total} total</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-line bg-surface p-4">
              <h2 className="text-lg font-semibold">Offene Mängel nach Priorität</h2>
              <div className="mt-3 divide-y divide-line">
                {metrics.defectsByPriority.map((item) => (
                  <div key={item.priority} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>{item.label}</span><span className="tabular-nums text-muted">{item.open} offen / {item.total} total</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <div className="rounded-xl border border-line bg-surface p-4">
              <h2 className="font-semibold">Monatspunkte</h2>
              <p className="mt-1 text-sm text-muted">{metrics.monthlyCheckedThisMonth ? '2.2 wurde diesen Monat geprüft.' : '2.2 wurde diesen Monat noch nicht als geprüft erfasst.'}</p>
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Letzte Rundgänge</h2>
              <Link to="/register?view=rundgaenge" className="text-sm font-medium text-accent underline underline-offset-2">Alle anzeigen</Link>
            </div>
            {recentRounds.length ? (
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                {recentRounds.map(({ walk, defectCount, interval, monthlyWarning }) => (
                  <li key={walk.id}>
                    <Link to={`/rundgang/${walk.id}/daten`} className="flex items-center gap-3 px-4 py-3 active:bg-surface-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{walk.docNr}</span>
                          <span className="text-sm text-muted">{weekLabel(walk.isoYear, walk.week)}</span>
                          {walk.status === 'closed' ? <Badge tone="ok">abgeschlossen</Badge> : <Badge tone="warn">Entwurf</Badge>}
                          {monthlyWarning && <Badge tone="warn">2.2 fehlt</Badge>}
                        </div>
                        <p className="mt-0.5 text-sm text-muted">{formatDate(walk.date)} · {walk.inspector || 'ohne Namen'} · {defectCount} Mängel{interval === 'überschritten' ? ' · Intervall überschritten' : ''}</p>
                      </div>
                      <CaretRight size={18} className="shrink-0 text-muted" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Noch kein Rundgang erfasst">Mit „Neuer Rundgang“ beginnen. Monatspunkte, Uhrzeit und Personen werden im Formular erfasst.</EmptyState>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, testId, alert = false, link }: { label: string; value: string | number; testId?: string; alert?: boolean; link?: string }) {
  const content = <div className={`min-h-24 rounded-xl border border-line bg-surface p-3 ${alert ? 'border-danger/40 text-danger' : ''}`}>
    <div className="text-xs leading-snug text-muted">{label}</div><div className="mt-1 text-xl font-semibold tabular-nums" data-testid={testId}>{value}</div>
  </div>;
  return link ? <Link to={link}>{content}</Link> : content;
}
