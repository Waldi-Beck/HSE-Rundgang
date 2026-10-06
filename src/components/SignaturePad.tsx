import { useEffect, useRef } from 'react';

/** Unterschrift per Finger/Stift. Liefert PNG-Data-URL ('' = leer). */
export function SignaturePad({
  value,
  onChange,
  disabled,
  label,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  // Vorhandene Unterschrift beim Mount anzeigen
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#18181b';
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, c.offsetWidth, c.offsetHeight);
      img.src = value;
    }
    // Nur beim Mount: danach zeichnet der Nutzer direkt auf das Canvas.
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = (e: React.PointerEvent) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.1, p.y + 0.1);
    ctx.stroke();
    dirty.current = true;
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (dirty.current) onChange(canvasRef.current!.toDataURL('image/png'));
  };
  const clear = () => {
    const c = canvasRef.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    dirty.current = false;
    onChange('');
  };

  return (
    <div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          aria-label={label}
          data-testid={`sig-${label}`}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className={`h-36 w-full touch-none rounded-lg border border-line-strong bg-white ${disabled ? 'opacity-80' : 'cursor-crosshair'}`}
        />
        {!value && !disabled && (
          <span className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-sm text-zinc-500">
            Hier mit dem Finger unterschreiben
          </span>
        )}
      </div>
      {!disabled && (
        <button type="button" onClick={clear} className="mt-2 text-sm font-medium text-muted underline underline-offset-2">
          Unterschrift löschen
        </button>
      )}
    </div>
  );
}
