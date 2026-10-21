import { fitWithin, JPEG_QUALITY } from './image';

export const AI_MAX_EDGE = 1568;
export const AI_MAX_BYTES = 5 * 1024 * 1024;

export async function resizeForAi(file: Blob): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('Das Foto konnte nicht gelesen werden. Bitte ein anderes Bild auswählen.');
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height, AI_MAX_EDGE);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Bildverarbeitung auf diesem Gerät ist nicht verfügbar.');
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const resized = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  if (!resized) throw new Error('Das Foto konnte nicht für die Analyse vorbereitet werden.');
  if (resized.size > AI_MAX_BYTES) throw new Error('Das verkleinerte Foto ist zu gross für die Analyse.');
  return resized;
}

export async function jpegBlobToBase64(blob: Blob): Promise<string> {
  if (blob.type !== 'image/jpeg') throw new Error('Für die KI-Analyse ist ein JPEG-Foto erforderlich.');
  if (blob.size > AI_MAX_BYTES) throw new Error('Das Foto ist zu gross. Bitte ein kleineres Foto aufnehmen.');
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  return btoa(binary);
}
