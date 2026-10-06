import type { Rating } from '../lib/types';

const OPTIONS: { value: Rating; label: string; active: string }[] = [
  { value: 'ok', label: 'OK', active: 'bg-accent text-accent-ink border-accent' },
  { value: 'nok', label: 'Nicht OK', active: 'bg-danger text-white border-danger dark:text-zinc-950' },
  { value: 'na', label: 'N/A', active: 'bg-ink text-bg border-ink' },
];

/** OK / Nicht OK / N/A als Segment-Steuerung, Touch-Ziel 48 px (FR-016). Erneutes Tippen setzt zurück. */
export function RatingControl({
  itemId,
  value,
  disabled,
  onChange,
}: {
  itemId: string;
  value: Rating | undefined;
  disabled?: boolean;
  onChange: (v: Rating | undefined) => void;
}) {
  return (
    <div role="radiogroup" aria-label={`Bewertung ${itemId}`} className="grid grid-cols-[1fr_1.35fr_1fr] gap-1.5">
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
            className={`min-h-12 rounded-lg border text-[15px] font-medium transition-[transform,background-color] duration-100 active:scale-[0.97] disabled:cursor-not-allowed ${
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
