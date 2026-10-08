import { DownloadSimple, UploadSimple } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { SOP_META } from '../data/checklist';
import { importBackupData } from '../db';
import { exportBackupJson } from '../export';
import { backupPhotosToBlobs, parseBackup } from '../lib/backup';
import { formatDate } from '../lib/dates';
import { useToast } from '../components/ui';

/** JSON-Sicherung und Wiederherstellung (FR-052). */
export function BackupPage() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState<string>('');
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => {
      if (e.usage !== undefined) setUsage(`${(e.usage / 1024 / 1024).toFixed(1)} MB belegt`);
    });
    navigator.storage?.persisted?.().then(setPersisted);
  }, []);

  const exportJson = async () => {
    setBusy(true);
    try {
      toast(`${await exportBackupJson()} erstellt.`);
    } finally {
      setBusy(false);
    }
  };

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const b = parseBackup(await file.text());
      const photos = await backupPhotosToBlobs(b.photos);
      const result = await importBackupData(b.walks, b.defects, photos, b.inspections, b.settings);
      const collisions = result.collisions.length
        ? ` Nummernkonflikte übersprungen: ${[...new Set(result.collisions)].join(', ')}.`
        : '';
      toast(`Importiert: ${result.walks} Rundgänge, ${result.defects} Mängel, ${result.photos} Fotos, ${result.inspections} Prüftermine.${collisions}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const persist = async () => setPersisted((await navigator.storage?.persist?.()) ?? false);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Datensicherung</h1>
        <p className="mt-1 max-w-[60ch] text-[15px] text-muted">
          Alle Rundgänge, Mängel und Fotos liegen nur in diesem Browser auf diesem Gerät. Regelmässig als Datei sichern, z. B. auf
          das Firmenlaufwerk. Die Datei kann auf einem anderen Gerät wieder eingelesen werden.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
        <button type="button" className="btn-primary w-full" onClick={exportJson} disabled={busy} data-testid="export-json">
          <DownloadSimple size={20} aria-hidden /> Sicherung herunterladen
        </button>
        <label className="btn-secondary w-full cursor-pointer">
          <UploadSimple size={20} aria-hidden /> Sicherung einlesen
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              void importJson(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        <p className="text-sm text-muted">Beim Einlesen werden Einträge mit gleicher ID ersetzt, alle anderen bleiben erhalten.</p>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-line bg-surface p-4 text-sm">
        <h2 className="text-base font-semibold">Speicher</h2>
        <p className="mt-1 text-muted">{usage || 'Belegung unbekannt'}.</p>
        {persisted === false && (
          <button type="button" onClick={persist} className="mt-2 font-medium text-accent underline underline-offset-2">
            Dauerhafte Speicherung anfordern
          </button>
        )}
        {persisted && <p className="mt-1 text-accent">Dauerhafte Speicherung ist aktiv.</p>}
      </section>

      <section className="rounded-xl border border-line bg-surface p-4 text-sm">
        <h2 className="text-base font-semibold">Grundlage</h2>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted">Dokument</dt>
          <dd>{SOP_META.docId}</dd>
          <dt className="text-muted">Titel</dt>
          <dd>{SOP_META.title}</dd>
          <dt className="text-muted">Version</dt>
          <dd>{SOP_META.version}</dd>
          <dt className="text-muted">Gültig ab</dt>
          <dd>{formatDate(SOP_META.validFrom)}</dd>
          <dt className="text-muted">Ersteller</dt>
          <dd>{SOP_META.author}</dd>
        </dl>
      </section>
    </div>
  );
}
