import { Link, NavLink } from 'react-router';
import { ClipboardText, Database, GearSix, House, Table } from '@phosphor-icons/react';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { SOP_META } from '../data/checklist';
import { formatDate } from '../lib/dates';

export function BrandHeader() {
  return (
    <header className="border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink text-[11px] font-bold tracking-tight text-bg">
            QPS
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[15px] font-semibold">{SOP_META.title}</div>
            <div className="truncate text-xs text-muted">{SOP_META.docId}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right text-xs leading-tight text-muted">
            <div>Version {SOP_META.version}</div>
            <div>Gültig ab {formatDate(SOP_META.validFrom)}</div>
          </div>
          <Link to="/einstellungen" aria-label="Einstellungen" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2">
            <GearSix size={20} aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}

const navItems = [
  { to: '/', label: 'Übersicht', icon: House, end: true },
  { to: '/register', label: 'Register', icon: Table, end: false },
  { to: '/sicherung', label: 'Sicherung', icon: Database, end: false },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-3">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                  isActive ? 'text-accent' : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} weight={isActive ? 'fill' : 'regular'} aria-hidden />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-surface px-5 py-8 text-center">
      <ClipboardText size={32} className="mx-auto text-muted" aria-hidden />
      <h3 className="mt-3 font-semibold">{title}</h3>
      {children && <p className="mx-auto mt-1 max-w-[42ch] text-sm text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Badge({ tone, children }: { tone: 'neutral' | 'ok' | 'danger' | 'warn'; children: ReactNode }) {
  const cls = {
    neutral: 'bg-surface-2 text-muted border-line',
    ok: 'bg-accent-soft text-accent border-transparent',
    danger: 'bg-danger-soft text-danger border-transparent',
    warn: 'bg-warn-soft text-warn border-transparent',
  }[tone];
  return <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function Field({ label, htmlFor, hint, error, children }: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}

/* Toast für kurze Rückmeldungen (Export, Import) */
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg((cur) => (cur === m ? null : cur)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4">
        {msg && (
          <div role="status" className="rounded-lg bg-ink px-4 py-2.5 text-sm text-bg shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
            {msg}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  );
}
