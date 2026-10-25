// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiAnalysisError, analyzeDefectPhoto } from '../../src/lib/ai-analysis';
import type { AiAnalysisConfig } from '../../src/lib/ai-analysis';

const config: AiAnalysisConfig = { enabled: true, consentAt: '2026-10-21T12:00:00Z', serverUrl: 'https://worker.example', accessCode: 'local-code' };
const proposal = {
  mangelErkannt: true, mangelBeschreibung: 'Ein Kabel liegt quer über dem Gehweg.', gefahren: [{ beschreibung: 'Kabel liegt im Weg', folge: 'Sturz' }], vorgeschlagenePrio: 'H',
  begruendungPrio: 'Verkehrsweg blockiert.', sofortmassnahme: 'Kabel sichern.',
  massnahmen: [{ text: 'Kabelbrücke montieren.', stopStufe: 'Technisch' }], passendeGrundlage: 'VUV Art. 19',
  passenderKontrollpunkt: 'R6', sicherheit: 'hoch', hinweis: 'Bitte vor Ort prüfen.',
};
const context = {
  area: 'QPS', itemId: 'R6', itemText: 'Verkehrswege frei', basis: 'VUV Art. 19', userText: 'Kabel liegt da.',
  checklistItems: [{ id: 'R6', text: 'Verkehrswege frei', basis: 'VUV Art. 19' }],
  priorities: { K: { name: 'Kritisch', days: 0 }, H: { name: 'Hoch', days: 2 }, M: { name: 'Mittel', days: 7 }, N: { name: 'Niedrig', days: 30 } },
};

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('optionaler KI-Client', () => {
  it('sends a JPEG and SOP context to the configured worker and validates structured output', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ proposal, model: 'claude-test' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await analyzeDefectPhoto(new Blob(['jpeg'], { type: 'image/jpeg' }), context, config);
    expect(result).toEqual({ proposal, model: 'claude-test' });
    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://worker.example/v1/analyze');
    expect(new Headers(options.headers).get('x-access-code')).toBe('local-code');
    const payload = JSON.parse(String(options.body));
    expect(payload.context.basis).toBe('VUV Art. 19');
    expect(payload.context.checklistItems).toHaveLength(1);
  });

  it('explains offline, wrong code, limits, invalid result and unreachable worker', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    await expect(analyzeDefectPhoto(new Blob(['jpeg'], { type: 'image/jpeg' }), context, config)).rejects.toMatchObject({ code: 'OFFLINE' });
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 })));
    await expect(analyzeDefectPhoto(new Blob(['jpeg'], { type: 'image/jpeg' }), context, config)).rejects.toThrow(/Zugangscode/);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'RATE_LIMITED' }), { status: 429 })));
    await expect(analyzeDefectPhoto(new Blob(['jpeg'], { type: 'image/jpeg' }), context, config)).rejects.toThrow(/Limit/);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ proposal: { mangelErkannt: true }, model: 'x' }), { status: 200 })));
    await expect(analyzeDefectPhoto(new Blob(['jpeg'], { type: 'image/jpeg' }), context, config)).rejects.toMatchObject({ code: 'ANALYSIS_INVALID' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network'); }));
    await expect(analyzeDefectPhoto(new Blob(['jpeg'], { type: 'image/jpeg' }), context, config)).rejects.toMatchObject({ code: 'UNREACHABLE' });
  });

  it('never sends anything when KI is disabled or consent is absent', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(analyzeDefectPhoto(new Blob(['jpeg'], { type: 'image/jpeg' }), context, { ...config, enabled: false })).rejects.toBeInstanceOf(AiAnalysisError);
    await expect(analyzeDefectPhoto(new Blob(['jpeg'], { type: 'image/jpeg' }), context, { ...config, consentAt: null })).rejects.toMatchObject({ code: 'CONSENT_REQUIRED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('converts an internal network timeout into a clear German timeout error', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason ?? new DOMException('aborted', 'AbortError')), { once: true });
    })));
    const pending = analyzeDefectPhoto(new Blob(['jpeg'], { type: 'image/jpeg' }), context, config);
    const expectation = expect(pending).rejects.toMatchObject({ code: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(45_001);
    await expectation;
    vi.useRealTimers();
  });
});
