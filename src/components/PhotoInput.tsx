import { Camera, ImageSquare, Trash } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import { resizeImage } from '../lib/image';

export interface PhotoDraft {
  id: string;
  blob: Blob;
  width: number;
  height: number;
  createdAt: string;
  isNew: boolean;
}

function Thumb({ photo, onRemove, disabled }: { photo: PhotoDraft; onRemove: () => void; disabled?: boolean }) {
  const url = useMemo(() => URL.createObjectURL(photo.blob), [photo.blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <figure className="relative aspect-square overflow-hidden rounded-lg border border-line bg-surface-2">
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt="Foto zum Mangel" className="h-full w-full object-cover" />
      </a>
      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Foto entfernen"
          className="absolute top-1.5 right-1.5 grid h-9 w-9 place-items-center rounded-lg bg-surface/90 text-danger"
        >
          <Trash size={18} aria-hidden />
        </button>
      )}
    </figure>
  );
}

/** Kamera (Rückkamera) oder Galerie, mehrere Fotos, clientseitig verkleinert (FR-032, FR-033). */
export function PhotoInput({
  photos,
  onAdd,
  onRemove,
  disabled,
}: {
  photos: PhotoDraft[];
  onAdd: (p: PhotoDraft[]) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handle = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError('');
    const added: PhotoDraft[] = [];
    for (const f of Array.from(files)) {
      try {
        const r = await resizeImage(f);
        added.push({ id: crypto.randomUUID(), ...r, createdAt: new Date().toISOString(), isNew: true });
      } catch (e) {
        setError(`${f.name}: ${(e as Error).message}`);
      }
    }
    onAdd(added);
    setBusy(false);
  };

  return (
    <div>
      {!disabled && (
        <div className="grid grid-cols-2 gap-2">
          <label className="btn-secondary cursor-pointer">
            <Camera size={20} aria-hidden />
            Foto aufnehmen
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="sr-only"
              data-testid="photo-camera"
              onChange={(e) => {
                void handle(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          <label className="btn-secondary cursor-pointer">
            <ImageSquare size={20} aria-hidden />
            Aus Galerie
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              data-testid="photo-gallery"
              onChange={(e) => {
                void handle(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      )}
      {busy && (
        <div className="mt-3 grid grid-cols-3 gap-2" aria-label="Foto wird verarbeitet">
          <div className="aspect-square animate-pulse rounded-lg bg-surface-2" />
        </div>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {photos.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 gap-2" data-testid="photo-list">
          {photos.map((p) => (
            <Thumb key={p.id} photo={p} disabled={disabled} onRemove={() => onRemove(p.id)} />
          ))}
        </div>
      ) : (
        !busy && <p className="mt-2 text-sm text-muted">Noch kein Foto.</p>
      )}
    </div>
  );
}
