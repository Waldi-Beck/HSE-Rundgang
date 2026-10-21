import { AiProposalSchema } from './ai-schema';
import { jpegBlobToBase64 } from './ai-image';
import type { AiProposal, PriorityKey } from './types';

export interface AiAnalysisContext {
  area: string;
  itemId: string;
  itemText: string;
  basis: string;
  userText: string;
  checklistItems: { id: string; text: string; basis: string }[];
  priorities: Record<PriorityKey, { name: string; days: number }>;
}

export interface AiAnalysisConfig {
  serverUrl: string;
  accessCode: string;
  enabled: boolean;
  consentAt?: string | null;
}

export class AiAnalysisError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = 'AiAnalysisError';
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_SERVER_URL: 'Die KI-Server-Adresse ist ungültig. Bitte in den Einstellungen korrigieren.',
  INSECURE_SERVER_URL: 'Der KI-Server muss HTTPS verwenden (ausser lokal auf localhost).',
  UNAUTHORIZED: 'Der KI-Zugangscode stimmt nicht. Bitte die Einstellungen prüfen.',
  RATE_LIMITED: 'Das tägliche KI-Analyse-Limit ist erreicht. Bitte später erneut versuchen.',
  IMAGE_TOO_LARGE: 'Das Foto ist zu gross. Bitte ein kleineres Foto aufnehmen.',
  INVALID_IMAGE: 'Das Fotoformat konnte nicht gelesen werden. Bitte ein JPEG-Foto verwenden.',
  INVALID_REQUEST: 'Die Anfrage konnte nicht verarbeitet werden. Bitte Einstellungen und Foto prüfen.',
  ORIGIN_NOT_ALLOWED: 'Diese App-Adresse ist für den KI-Dienst nicht freigegeben.',
  SERVER_NOT_CONFIGURED: 'Der KI-Dienst ist noch nicht vollständig eingerichtet.',
  RATE_LIMIT_UNAVAILABLE: 'Das KI-Limit ist momentan nicht verfügbar. Bitte später erneut versuchen.',
  ANALYSIS_INVALID: 'Die KI-Antwort war unvollständig. Bitte manuell weiterarbeiten.',
  PROVIDER_UNAVAILABLE: 'Der KI-Dienst ist vorübergehend nicht erreichbar. Bitte später erneut versuchen.',
};

export async function analyzeDefectPhoto(photo: Blob, context: AiAnalysisContext, config: AiAnalysisConfig, signal?: AbortSignal): Promise<{ proposal: AiProposal; model: string }> {
  if (!config.enabled) throw new AiAnalysisError('Die KI-Fotoanalyse ist deaktiviert.', 'DISABLED');
  if (!navigator.onLine) throw new AiAnalysisError('Keine Internetverbindung. Du kannst den Mangel weiterhin manuell erfassen.', 'OFFLINE');
  if (!config.serverUrl.trim() || !config.accessCode.trim()) throw new AiAnalysisError('Bitte zuerst Server-Adresse und Zugangscode in den Einstellungen eintragen.', 'NOT_CONFIGURED');
  if (!config.consentAt) throw new AiAnalysisError('Bitte zuerst den Datenschutzhinweis in den Einstellungen bestätigen.', 'CONSENT_REQUIRED');
  let server: URL;
  try { server = new URL(config.serverUrl); }
  catch { throw new AiAnalysisError('Die KI-Server-Adresse ist ungültig.', 'INVALID_SERVER_URL'); }
  const localHost = server.hostname === 'localhost' || server.hostname === '127.0.0.1' || server.hostname === '::1';
  if ((server.protocol !== 'https:' && !(localHost && server.protocol === 'http:')) || server.username || server.password) {
    throw new AiAnalysisError('Der KI-Server muss über HTTPS erreichbar sein (ausser lokal auf localhost).', 'INSECURE_SERVER_URL');
  }

  const imageJpegBase64 = await jpegBlobToBase64(photo);
  let response: Response;
  try {
    response = await fetch(`${server.toString().replace(/\/+$/, '')}/v1/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-access-code': config.accessCode },
      body: JSON.stringify({ imageJpegBase64, context }),
      signal,
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new AiAnalysisError('Der KI-Server ist nicht erreichbar. Prüfe die Verbindung; manuelle Eingabe funktioniert weiter.', 'UNREACHABLE');
  }

  const body = await response.json().catch(() => null) as { proposal?: unknown; model?: unknown; error?: string } | null;
  if (!response.ok) {
    const code = body?.error ?? 'PROVIDER_UNAVAILABLE';
    throw new AiAnalysisError(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.PROVIDER_UNAVAILABLE, code);
  }
  const parsed = AiProposalSchema.safeParse(body?.proposal);
  if (!parsed.success || typeof body?.model !== 'string' || !body.model) throw new AiAnalysisError(ERROR_MESSAGES.ANALYSIS_INVALID, 'ANALYSIS_INVALID');
  return { proposal: parsed.data, model: body.model };
}
