import { Check, EnvelopeSimple, FilePdf, LockSimple, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { RESULT_LABELS } from '../../data/register';
import { closeWalk, deleteWalk, openDefectsBefore, updateWalk } from '../../db';
import { exportWalkPdf, shareWalkPdf } from '../../export';
import { formatDate } from '../../lib/dates';
import { suggestedResult } from '../../lib/register';
import type { Defect, ResultKey, Signature, Walk } from '../../lib/types';
import { countRatings, openPointLabel, validateForClose } from '../../lib/walk';
import { useRegisterSettings } from '../../components/SettingsContext';
import { AutoField } from '../../components/AutoField';
import { SignaturePad } from '../../components/SignaturePad';
import { Badge, Field, useToast } from '../../components/ui';

function SignatureBlock({ title, sig, walk, onSave, testId }: { title: string; sig: Signature; walk: Walk; onSave: (signature: Signature) => void; testId: string }) {
  const readOnly = walk.status === 'closed';
  return (
    <div className="space-y-3" data-testid={testId}>
      <h3 className="font-semibold">{title}</h3>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" htmlFor={`${testId}-name`}><AutoField id={`${testId}-name`} value={sig.name} disabled={readOnly} onSave={(name) => onSave({ ...sig, name })} /></Field>
        <Field label="Datum" htmlFor={`${testId}-date`}><input id={`${testId}-date`} type="date" className="field" value={sig.date} disabled={readOnly} onChange={(event) => onSave({ ...sig, date: event.target.value })} /></Field>
      </div>
      <div><span className="label">Unterschrift</span><SignaturePad label={title} value={sig.image} disabled={readOnly} onChange={(image) => onSave({ ...sig, image, date: sig.date || walk.date })} /></div>
    </div>
  );
}

export function CloseTab({ walk, defects }: { walk: Walk; defects: Defect[] }) {
  const settings = useRegisterSettings();
  const readOnly = walk.status === 'closed';
  const toast = useToast();
  const navigate = useNavigate();
  const [tried, setTried] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);
  const [emailFallback, setEmailFallback] = useState(false);
  const counts = countRatings(walk);
  const proposal = suggestedResult(defects);
  const errors = validateForClose(walk, defects, settings.areas);
  const signature: Signature = { ...walk.signature, name: walk.signature.name || walk.inspector, date: walk.signature.date || walk.date };

  const complete = async () => {
    setTried(true);
    if (walk.signature.name !== signature.name || walk.signature.date !== signature.date) await updateWalk(walk.id, { signature });
    const currentErrors = validateForClose({ ...walk, signature }, defects, settings.areas);
    if (currentErrors.length) return;
    if (!confirm('Rundgang abschliessen? Danach sind Formulardaten und Mängel schreibgeschützt. Nachkontrolle bleibt im Register möglich.')) return;
    const previous = await openDefectsBefore(walk);
    await closeWalk(walk.id, previous.map(({ defect, walk: source }) => openPointLabel(defect, source)));
    toast('Rundgang abgeschlossen.');
  };

  const downloadPdf = async () => {
    setExporting(true);
    try { toast(`${await exportWalkPdf(walk.id)} erstellt.`); }
    catch (error) { toast(`PDF fehlgeschlagen: ${(error as Error).message}`); }
    finally { setExporting(false); }
  };

  const sharePdf = async () => {
    setSharingPdf(true);
    try {
      const result = await shareWalkPdf(walk.id);
      if (result.shared) {
        toast('PDF wurde zum Teilen geöffnet.');
      } else {
        setEmailFallback(true);
        toast('PDF heruntergeladen. Hänge es in deiner E-Mail als Anhang an.');
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') toast(`PDF teilen fehlgeschlagen: ${(error as Error).message}`);
    } finally {
      setSharingPdf(false);
    }
  };

  const emailSubject = encodeURIComponent(`HSE-Rundgang ${walk.docNr}`);
  const emailBody = encodeURIComponent(`Anbei der HSE-Rundgang ${walk.docNr} als PDF.`);

  const remove = async () => {
    if (!confirm('Entwurf mit allen Mängeln und Fotos endgültig löschen?')) return;
    await deleteWalk(walk.id);
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="text-lg font-semibold">3. Abschluss</h2>
        <p className="mt-1 text-sm text-muted">{counts.checked} von {counts.total} Feldern bewertet · {defects.length} Mängel · {defects.filter((defect) => defect.priority === 'K').length} kritisch.</p>
        <fieldset className="mt-4">
          <legend className="label">Gesamtbewertung</legend>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Gesamtbewertung">
            {(Object.keys(RESULT_LABELS) as ResultKey[]).map((key) => {
              const active = walk.result === key;
              return <button key={key} type="button" role="radio" aria-checked={active} disabled={readOnly} onClick={() => void updateWalk(walk.id, { result: key })} className={`flex min-h-14 items-center gap-3 rounded-lg border px-3 text-left font-medium ${active ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface'}`}>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded border ${active ? 'border-accent bg-accent text-white' : 'border-line-strong'}`}>{active && <Check size={16} weight="bold" aria-hidden />}</span>
                <span>{RESULT_LABELS[key]}</span>
                {key === proposal && !readOnly && <Badge tone="neutral">Vorschlag</Badge>}
              </button>;
            })}
          </div>
        </fieldset>
      </section>

      <section className="space-y-6 rounded-xl border border-line bg-surface p-4">
        <SignatureBlock title="Durchführende/r" testId="sig-main" sig={signature} walk={walk} onSave={(value) => void updateWalk(walk.id, { signature: value })} />
        <details className="border-t border-line pt-4" open={!!walk.acknowledgement.name}>
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">Kenntnisnahme (optional)</summary>
          <SignatureBlock title="Kenntnisnahme" testId="sig-ack" sig={walk.acknowledgement} walk={walk} onSave={(value) => void updateWalk(walk.id, { acknowledgement: value })} />
        </details>
      </section>

      {readOnly ? <p className="flex items-center gap-2 rounded-xl bg-accent-soft px-4 py-3 text-sm"><LockSimple size={18} aria-hidden />Abgeschlossen am {formatDate(walk.closedAt)}. Formulardaten sind schreibgeschützt.</p> : tried && errors.length > 0 ? <div role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" data-testid="close-errors"><p className="font-semibold">Abschluss noch nicht möglich:</p><ul className="mt-1 list-disc pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div> : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        {!readOnly && <button type="button" className="btn-primary flex-1" onClick={() => void complete()} data-testid="close-walk"><LockSimple size={18} aria-hidden />Rundgang abschliessen</button>}
        <button type="button" className="btn-secondary flex-1" onClick={() => void sharePdf()} disabled={sharingPdf} data-testid="share-pdf"><EnvelopeSimple size={19} aria-hidden />{sharingPdf ? 'PDF wird vorbereitet' : 'PDF per E-Mail teilen'}</button>
        <button type="button" className="btn-secondary flex-1" onClick={() => void downloadPdf()} disabled={exporting} data-testid="export-pdf"><FilePdf size={20} aria-hidden />{exporting ? 'PDF wird erstellt' : 'PDF exportieren'}</button>
      </div>
      {emailFallback && <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">Das PDF wurde heruntergeladen. <a className="font-semibold text-accent underline" href={`mailto:?subject=${emailSubject}&body=${emailBody}`}>E-Mail öffnen</a> und die PDF-Datei aus deinen Downloads anhängen.</p>}
      {!readOnly && <button type="button" onClick={() => void remove()} className="mx-auto flex min-h-10 items-center gap-1.5 text-sm font-medium text-danger"><Trash size={16} aria-hidden />Entwurf löschen</button>}
    </div>
  );
}
