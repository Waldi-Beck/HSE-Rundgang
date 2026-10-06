import { useEffect, useRef, useState } from 'react';

/**
 * Eingabefeld mit lokalem Zustand und verzögertem Speichern (FR-061).
 * Verhindert verlorene Zeichen bei asynchroner Speicherung.
 */
export function AutoField({
  id,
  value,
  onSave,
  multiline,
  rows = 3,
  type = 'text',
  disabled,
  autoComplete,
}: {
  id: string;
  value: string;
  onSave: (v: string) => void;
  multiline?: boolean;
  rows?: number;
  type?: string;
  disabled?: boolean;
  autoComplete?: string;
}) {
  const [local, setLocal] = useState(value);
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(value);

  // Externe Änderungen übernehmen, solange nicht gerade getippt wird
  useEffect(() => {
    if (timer.current === undefined) setLocal(value);
  }, [value]);

  const flush = () => {
    if (timer.current !== undefined) {
      window.clearTimeout(timer.current);
      timer.current = undefined;
      onSave(latest.current);
    }
  };
  useEffect(() => flush, []); // beim Verlassen speichern

  const change = (v: string) => {
    setLocal(v);
    latest.current = v;
    if (timer.current !== undefined) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      onSave(v);
    }, 350);
  };

  const common = { id, className: 'field', value: local, disabled, onBlur: flush, autoComplete };
  return multiline ? (
    <textarea {...common} rows={rows} onChange={(e) => change(e.target.value)} />
  ) : (
    <input {...common} type={type} onChange={(e) => change(e.target.value)} />
  );
}
