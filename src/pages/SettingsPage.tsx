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

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex items-center gap-3">
        <Link to="/register" aria-label="Zurück zum Register" className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-surface"><ArrowLeft size={20} aria-hidden /></Link>
        <div><h1 className="text-2xl font-semibold tracking-tight">Einstellungen</h1><p className="text-sm text-muted">Entspricht den gelben Feldern im Excel-Blatt „Listen“.</p></div>
      </header>

      <section className="space-y-4 rounded-xl border border-line bg-surface p-4">
        <div><h2 className="text-lg font-semibold">Bereiche</h2><p className="text-sm text-muted">Bereiche für Mängelregister und Prüftermine.</p></div>
        {draft.areas.map((area, index) => <div key={`area-${index}`} className="flex items-end gap-2"><Field label={`Bereich ${index + 1}`} htmlFor={`setting-area-${index}`}><input id={`setting-area-${index}`} className="field" value={area} onChange={(event) => setArea(index, event.target.value)} /></Field><button type="button" aria-label={`Bereich ${index + 1} entfernen`} className="btn-danger mb-px" onClick={() => setDraft((settings) => ({ ...settings, areas: settings.areas.filter((_, i) => i !== index) }))}><Trash size={17} aria-hidden /></button></div>)}
        <button type="button" className="btn-secondary" onClick={() => setDraft((settings) => ({ ...settings, areas: [...settings.areas, ''] }))}><Plus size={17} aria-hidden />Bereich hinzufügen</button>
      </section>

      <section className="space-y-4 rounded-xl border border-line bg-surface p-4">
        <div><h2 className="text-lg font-semibold">Richtfristen für Prioritäten</h2><p className="text-sm text-muted">Vorschlagswerte aus dem Excel-Register. Neue Termine aus der Nachkontrolle haben Vorrang.</p></div>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(PRIORITIES) as PriorityKey[]).map((key) => <Field key={key} label={`${PRIORITIES[key].name} (Tage)`} htmlFor={`setting-priority-${key}`}><input id={`setting-priority-${key}`} className="field" type="number" min={0} max={365} value={draft.priorityDays[key]} onChange={(event) => setDraft((settings) => ({ ...settings, priorityDays: { ...settings.priorityDays, [key]: Number(event.target.value) } }))} /></Field>)}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <Field label="Höchstintervall zwischen Rundgängen (Tage)" htmlFor="setting-max-interval" hint="Startwert aus Excel-Listen!M2: 14 Tage."><input id="setting-max-interval" className="field" type="number" min={1} max={90} value={draft.maxIntervalDays} onChange={(event) => setDraft((settings) => ({ ...settings, maxIntervalDays: Number(event.target.value) }))} /></Field>
      </section>
      <button type="button" className="btn-primary w-full" onClick={() => void save()}>Einstellungen speichern</button>
    </div>
  );
}
