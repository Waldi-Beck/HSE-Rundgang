import type { Rating } from '../lib/types';

const OPTIONS: { value: Rating; label: string; active: string }[] = [
  { value: 'ok', label: 'OK', active: 'bg-accent text-accent-ink border-accent' },
  { value: 'mangel', label: 'Mangel', active: 'bg-danger text-white border-danger dark:text-zinc-950' },
  { value: 'na', label: 'n.a.', active: 'bg-ink text-bg border-ink' },
];

/** OK / Mangel / n.a. (SOP 2 "Bewertung") als Segment-Steuerung, Touch-Ziel 48 px (FR-016). Erneutes Tippen setzt zurück. */
export function RatingControl({
  itemId,
  label,
  value,
  disabled,
  compact = false,
  onChange,
}: {
  /** Bewertungsschlüssel, z. B. "W4@qlabs" (für Test-IDs) */
  itemId: string;
  /** Lesbare Bezeichnung für Screenreader, z. B. "W4 QLabs" */
  label?: string;
  value: Rating | undefined;
  disabled?: boolean;
  compact?: boolean;
  onChange: (v: Rating | undefined) => void;
}) {
  return (
    <div role="radiogroup" aria-label={`Bewertung ${label ?? itemId}`} className={`grid ${compact ? 'grid-cols-[0.85fr_1.5fr_0.85fr] gap-1' : 'grid-cols-3 gap-1.5'}`}>
      {OPTIONS.map((o) => {
        const checked = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            data-testid={`rate-${itemId}-${o.value}`}
            disabled={disabled}
            onClick={() => onChange(checked ? undefined : o.value)}
            className={`${compact ? 'min-h-9 min-w-0 whitespace-nowrap px-0 text-[11px]' : 'min-h-12 text-[15px]'} rounded-lg border font-medium transition-[transform,background-color] duration-100 active:scale-[0.97] disabled:cursor-not-allowed ${
              checked ? o.active : 'border-line-strong bg-surface text-ink'
            } ${disabled && !checked ? 'opacity-50' : ''}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
