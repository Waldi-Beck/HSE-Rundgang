import { ArrowLeft, Plus, Trash } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { PRIORITIES } from '../data/register';
import { saveSettings } from '../db';
import type { RegisterSettings } from '../lib/types';
import type { PriorityKey } from '../data/checklist';
import { Field, useToast } from '../components/ui';
import { useRegisterSettings } from '../components/SettingsContext';

export function SettingsPage() {
  const current = useRegisterSettings();
  const toast = useToast();
  const [draft, setDraft] = useState<RegisterSettings>(current);
  const [showAiConsent, setShowAiConsent] = useState(false);
  useEffect(() => setDraft(current), [current]);

  const setArea = (index: number, value: string) => setDraft((settings) => ({ ...settings, areas: settings.areas.map((area, i) => i === index ? value : area) }));
  const save = async () => {
    const areas = draft.areas.map((area) => area.trim()).filter(Boolean);
    if (!areas.length || new Set(areas.map((area) => area.toLocaleLowerCase())).size !== areas.length) {
      toast('Bereiche müssen eindeutig sein und mindestens einen Eintrag enthalten.');
      return;
    }
    await saveSettings({ ...draft, areas });
    toast('Einstellungen gespeichert.');
  };

  const setAiEnabled = (enabled: boolean) => {
    if (enabled && !draft.aiConsentAt) {
      setShowAiConsent(true);
      return;
    }
    setDraft((settings) => ({ ...settings, aiEnabled: enabled }));
  };

  const acceptAiConsent = () => {
    setDraft((settings) => ({ ...settings, aiEnabled: true, aiConsentAt: new Date().toISOString() }));
    setShowAiConsent(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex items-center gap-3">
        <Link to="/register" aria-label="Zurück zum Register" className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-surface"><ArrowLeft size={20} aria-hidden /></Link>
        <div><h1 className="text-2xl font-semibold tracking-tight">Einstellungen</h1><p className="text-sm text-muted">Entspricht den gelben Feldern im Excel-Blatt „Listen“.</p></div>
      </header>

      <section className="space-y-4 rounded-xl border border-line bg-surface p-4">
        <div><h2 className="text-lg font-semibold">Bereiche</h2><p className="text-sm text-muted">Bereiche für Mängelerfassung und Register.</p></div>
        {draft.areas.map((area, index) => <div key={`area-${index}`} className="flex items-end gap-2"><Field label={`Bereich ${index + 1}`} htmlFor={`setting-area-${index}`}><input id={`setting-area-${index}`} className="field" value={area} onChange={(event) => setArea(index, event.target.value)} /></Field><button type="button" aria-label={`Bereich ${index + 1} entfernen`} className="btn-danger mb-px" onClick={() => setDraft((settings) => ({ ...settings, areas: settings.areas.filter((_, i) => i !== index) }))}><Trash size={17} aria-hidden /></button></div>)}
        <button type="button" className="btn-secondary" onClick={() => setDraft((settings) => ({ ...settings, areas: [...settings.areas, ''] }))}><Plus size={17} aria-hidden />Bereich hinzufügen</button>
      </section>

      <section className="space-y-4 rounded-xl border border-line bg-surface p-4">
        <div><h2 className="text-lg font-semibold">Richtfristen für Prioritäten</h2><p className="text-sm text-muted">Richtwerte für Mängel. Neue Termine aus der Nachkontrolle haben Vorrang.</p></div>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(PRIORITIES) as PriorityKey[]).map((key) => <Field key={key} label={`${PRIORITIES[key].name} (Tage)`} htmlFor={`setting-priority-${key}`}><input id={`setting-priority-${key}`} className="field" type="number" min={0} max={365} value={draft.priorityDays[key]} onChange={(event) => setDraft((settings) => ({ ...settings, priorityDays: { ...settings.priorityDays, [key]: Number(event.target.value) } }))} /></Field>)}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <Field label="Höchstintervall zwischen Rundgängen (Tage)" htmlFor="setting-max-interval" hint="Startwert aus Excel-Listen!M2: 14 Tage."><input id="setting-max-interval" className="field" type="number" min={1} max={90} value={draft.maxIntervalDays} onChange={(event) => setDraft((settings) => ({ ...settings, maxIntervalDays: Number(event.target.value) }))} /></Field>
      </section>

      <section className="space-y-4 rounded-xl border border-line bg-surface p-4" data-testid="ai-settings">
        <div><h2 className="text-lg font-semibold">Optionale KI-Fotoanalyse</h2><p className="text-sm text-muted">Standardmässig ausgeschaltet. Die manuelle Mängelerfassung funktioniert immer, auch offline.</p></div>
        <label className="flex min-h-12 items-center gap-3 font-medium">
          <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={(draft.aiEnabled ?? false) || showAiConsent} onChange={(event) => setAiEnabled(event.target.checked)} data-testid="ai-enabled" />
          KI-Vorschläge im Mängel-Formular aktivieren
        </label>
        <Field label="KI-Server-Adresse" htmlFor="ai-server-url" hint="HTTPS-URL deines Cloudflare Workers, ohne /v1/analyze.">
          <input id="ai-server-url" className="field" type="url" autoComplete="url" value={draft.aiServerUrl ?? ''} onChange={(event) => setDraft((settings) => ({ ...settings, aiServerUrl: event.target.value }))} placeholder="https://hse-rundgang-ai.example.workers.dev" />
        </Field>
        <Field label="KI-Zugangscode" htmlFor="ai-access-code" hint="Wird nur auf diesem Gerät gespeichert und nie in die Datensicherung exportiert.">
          <input id="ai-access-code" className="field" type="password" autoComplete="new-password" value={draft.aiAccessCode ?? ''} onChange={(event) => setDraft((settings) => ({ ...settings, aiAccessCode: event.target.value }))} />
        </Field>
        {draft.aiConsentAt && <p className="text-xs text-muted">Datenschutzhinweis bestätigt am {new Date(draft.aiConsentAt).toLocaleString('de-CH')}.</p>}
      </section>

      {showAiConsent && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="presentation">
        <section role="dialog" aria-modal="true" aria-labelledby="ai-consent-title" className="max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-xl border border-line bg-surface p-5 shadow-xl">
          <h2 id="ai-consent-title" className="text-lg font-semibold">Datenschutz bei der KI-Fotoanalyse</h2>
          <p className="text-sm leading-relaxed">Wenn du ein Foto analysieren lässt, werden das ausgewählte Foto und der nötige Mängelkontext an deinen KI-Server und von dort an Anthropic in den USA übertragen. Dieser Worker speichert das Foto nicht. Anthropic verarbeitet API-Eingaben gemäss den jeweils geltenden Vertrags- und Aufbewahrungsbedingungen; API-Eingaben werden laut Anthropic standardmässig nicht zum Modelltraining verwendet. Prüfe die aktuellen <a className="font-semibold text-accent underline" href="https://www.anthropic.com/legal/commercial-terms" target="_blank" rel="noreferrer">Anthropic Commercial Terms</a> und die <a className="font-semibold text-accent underline" href="https://privacy.anthropic.com/" target="_blank" rel="noreferrer">Datenschutzinformationen</a>.</p>
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm">Sende keine Fotos mit erkennbaren Personen oder vertraulichen Unterlagen. KI-Ergebnisse sind nur Vorschläge und müssen von dir geprüft werden.</p>
          <div className="flex gap-2"><button type="button" className="btn-secondary flex-1" onClick={() => setShowAiConsent(false)}>Abbrechen</button><button type="button" className="btn-primary flex-1" data-testid="accept-ai-consent" onClick={acceptAiConsent}>Verstanden, KI aktivieren</button></div>
        </section>
      </div>}
      <button type="button" className="btn-primary w-full" onClick={() => void save()}>Einstellungen speichern</button>
    </div>
  );
}
