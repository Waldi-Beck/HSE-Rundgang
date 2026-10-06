import { FilePdf, LockSimple, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { RESULT_LABELS } from '../../data/checklist';
import { closeWalk, deleteWalk, openDefectsBefore, updateWalk } from '../../db';
import { exportWalkPdf } from '../../export';
import { formatDate } from '../../lib/dates';
import type { Defect, ResultKey, Signature, Walk } from '../../lib/types';
import { countRatings, openPointLabel, suggestResult, validateForClose } from '../../lib/walk';
import { AutoField } from '../../components/AutoField';
import { SignaturePad } from '../../components/SignaturePad';
import { Badge, Field, useToast } from '../../components/ui';

function SignatureBlock({ title, sig, walk, onSave, testId }: {
  title: string;
  sig: Signature;
  walk: Walk;
  onSave: (s: Signature) => void;
  testId: string;
}) {
  const ro = walk.status === 'closed';
  return (
    <div className="space-y-3" data-testid={testId}>
      <h3 className="font-semibold">{title}</h3>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Field label="Name" htmlFor={`${testId}-name`}>
          <AutoField id={`${testId}-name`} value={sig.name} disabled={ro} autoComplete="name" onSave={(name) => onSave({ ...sig, name })} />
        </Field>
        <Field label="Datum" htmlFor={`${testId}-date`}>
          <input id={`${testId}-date`} type="date" className="field" value={sig.date} disabled={ro} onChange={(e) => onSave({ ...sig, date: e.target.value })} />
        </Field>
      </div>
      <div>
        <span className="label">Unterschrift</span>
        <SignaturePad label={title} value={sig.image} disabled={ro} onChange={(image) => onSave({ ...sig, image, date: sig.date || walk.date })} />
      </div>
    </div>
  );
}

/** Kapitel 3 Ergebnis und Abschluss (FR-020 bis FR-025) sowie PDF-Export (FR-050). */
export function CloseTab({ walk, defects }: { walk: Walk; defects: Defect[] }) {
  const ro = walk.status === 'closed';
  const toast = useToast();
  const navigate = useNavigate();
  const [tried, setTried] = useState(false);
  const [exporting, setExporting] = useState(false);
  const c = countRatings(walk);
  const suggestion = suggestResult(defects);
  const errors = validateForClose(walk, defects);

  // Vorbelegung Unterschrift mit "Durchgeführt von" und Rundgangsdatum
  const sig: Signature = {
    ...walk.signature,
    name: walk.signature.name || walk.inspector,
    date: walk.signature.date || walk.date,
  };

  const close = async () => {
    setTried(true);
    if (walk.signature.name !== sig.name || walk.signature.date !== sig.date) await updateWalk(walk.id, { signature: sig });
    const errs = validateForClose({ ...walk, signature: sig }, defects);
    if (errs.length) return;
    if (!confirm('Rundgang abschliessen? Danach sind Kapitel 1 bis 4 schreibgeschützt. Mängel können weiterhin als erledigt markiert werden.')) return;
    const snapshot = (await openDefectsBefore(walk)).map(openPointLabel);
    await closeWalk(walk.id, snapshot);
    toast('Rundgang abgeschlossen.');
  };

  const pdf = async () => {
    setExporting(true);
    try {
      const name = await exportWalkPdf(walk.id);
      toast(`${name} erstellt.`);
    } catch (e) {
      toast(`PDF fehlgeschlagen: ${(e as Error).message}`);
    } finally {
      setExporting(false);
    }
  };

  const remove = async () => {
    if (!confirm('Entwurf mit allen Mängeln und Fotos endgültig löschen?')) return;
    await deleteWalk(walk.id);
    navigate('/');
  };

  const stats = [
    { label: 'Kontrolliert', value: c.checked, testid: 'count-checked' },
    { label: 'OK', value: c.ok, testid: 'count-ok' },
    { label: 'Nicht OK', value: c.nok, testid: 'count-nok' },
    { label: 'N/A', value: c.na, testid: 'count-na' },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="text-lg font-semibold">3. Ergebnis und Abschluss</h2>
        <dl className="mt-3 grid grid-cols-4 divide-x divide-line rounded-lg border border-line">
          {stats.map((s) => (
            <div key={s.label} className="px-2 py-2.5 text-center">
              <dt className="text-xs text-muted">{s.label}</dt>
              <dd className={`text-xl font-semibold tabular-nums ${s.label === 'Nicht OK' && s.value ? 'text-danger' : ''}`} data-testid={s.testid}>
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-sm text-muted tabular-nums">
          {c.checked} von {c.total} Punkten bewertet.
        </p>

        <fieldset className="mt-5">
          <legend className="label">Gesamtergebnis</legend>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
            {(Object.keys(RESULT_LABELS) as ResultKey[]).map((k) => {
              const active = walk.result === k;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={ro}
                  onClick={() => updateWalk(walk.id, { result: k })}
                  className={`flex min-h-12 items-center justify-between gap-2 rounded-lg border px-3 text-left font-medium ${
                    active ? (k === 'critical' ? 'border-danger bg-danger-soft text-danger' : 'border-accent bg-accent-soft') : 'border-line-strong bg-surface'
                  }`}
                >
                  {RESULT_LABELS[k]}
                  {k === suggestion && !ro && <Badge tone="neutral">Vorschlag</Badge>}
                </button>
              );
            })}
          </div>
        </fieldset>
      </section>

      <section className="space-y-6 rounded-xl border border-line bg-surface p-4">
        <SignatureBlock title="Durchführende/r" testId="sig-main" sig={sig} walk={walk} onSave={(s) => updateWalk(walk.id, { signature: s })} />
        <details className="border-t border-line pt-4" open={!!walk.acknowledgement.name}>
          <summary className="cursor-pointer font-semibold">Kenntnisnahme (optional)</summary>
          <div className="mt-3">
            <SignatureBlock title="Kenntnisnahme" testId="sig-ack" sig={walk.acknowledgement} walk={walk} onSave={(s) => updateWalk(walk.id, { acknowledgement: s })} />
          </div>
        </details>
      </section>

      {ro ? (
        <p className="flex items-center gap-2 rounded-xl bg-accent-soft px-4 py-3 text-sm">
          <LockSimple size={18} aria-hidden />
          Abgeschlossen am {formatDate(walk.closedAt)}. Inhalte sind schreibgeschützt.
        </p>
      ) : (
        tried &&
        errors.length > 0 && (
          <div role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" data-testid="close-errors">
            <p className="font-semibold">Abschluss noch nicht möglich:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {!ro && (
          <button type="button" className="btn-primary flex-1" onClick={close} data-testid="close-walk">
            <LockSimple size={18} aria-hidden /> Rundgang abschliessen
          </button>
        )}
        <button type="button" className="btn-secondary flex-1" onClick={pdf} disabled={exporting} data-testid="export-pdf">
          <FilePdf size={20} aria-hidden /> {exporting ? 'PDF wird erstellt' : ro ? 'PDF exportieren' : 'PDF-Entwurf'}
        </button>
      </div>
      {!ro && (
        <button type="button" onClick={remove} className="mx-auto flex items-center gap-1.5 text-sm font-medium text-danger">
          <Trash size={16} aria-hidden /> Entwurf löschen
        </button>
      )}
    </div>
  );
}
