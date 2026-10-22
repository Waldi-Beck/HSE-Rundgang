import { afterEach, describe, expect, it, vi } from 'vitest';
import worker, { createWorker, DailyUsage } from '../src/index';
import type { Env } from '../src/limiter';
import { analyzeWithClaude } from '../src/analysis';
import { AiProposalSchema, type AnalyzeRequest } from '../src/schemas';

const origin = 'https://waldi-beck.github.io';
const accessCode = 'a-long-test-access-code';
const goodPayload = {
  imageJpegBase64: '/9j/4AAQSkZJRg==',
  context: {
    area: 'QPS', itemId: 'R1', itemText: 'Fluchtwege frei', basis: 'Vorschrift X', userText: '', checklistItems: [{ id: 'R1', text: 'Fluchtwege frei', basis: 'Vorschrift X' }],
    priorities: { K: { name: 'Kritisch', days: 0 }, H: { name: 'Hoch', days: 2 }, M: { name: 'Mittel', days: 7 }, N: { name: 'Niedrig', days: 30 } },
  },
};
const validProposal = {
  mangelErkannt: true,
  gefahren: [{ beschreibung: 'Kabel liegt quer', folge: 'Stolpern' }],
  vorgeschlagenePrio: 'M', begruendungPrio: 'Stolpergefahr', sofortmassnahme: 'Kabel sichern',
  massnahmen: [{ text: 'Kabelbrücke montieren', stopStufe: 'Technisch' }], passendeGrundlage: 'Vorschrift X',
  passenderKontrollpunkt: 'R1', sicherheit: 'hoch', hinweis: 'Vorschlag fachlich prüfen.',
};
const validProposalParsed = AiProposalSchema.parse(validProposal);

function makeEnv(overrides: Partial<Env> = {}) {
  let calls = 0;
  const env = {
    ANTHROPIC_API_KEY: 'mock-secret-never-return', CLAUDE_MODEL: 'claude-test-model', ACCESS_CODE: accessCode,
    ALLOWED_ORIGINS: origin, MAX_REQUESTS_PER_DAY: '2',
    USAGE: {
      idFromName: (name: string) => ({ name }),
      get: () => ({ fetch: async () => {
        calls++;
        return Response.json({ allowed: calls <= 2 });
      } }),
    },
    ...overrides,
  } as Env;
  return { env, calls: () => calls };
}

function request(payload: unknown = goodPayload, code = accessCode, requestOrigin = origin) {
  return new Request('https://worker.test/v1/analyze', {
    method: 'POST', headers: { origin: requestOrigin, 'content-type': 'application/json', 'x-access-code': code, 'cf-connecting-ip': '192.0.2.15' }, body: JSON.stringify(payload),
  });
}

afterEach(() => vi.restoreAllMocks());

describe('AI analysis Worker security', () => {
  it('rejects a wrong access code before touching Anthropic or the daily counter', async () => {
    const { env, calls } = makeEnv();
    const response = await worker.fetch(request(goodPayload, 'wrong'), env);
    expect(response.status).toBe(401);
    expect(calls()).toBe(0);
    expect(await response.text()).not.toContain(env.ANTHROPIC_API_KEY);
  });

  it('rejects an unapproved origin and does not grant CORS', async () => {
    const { env } = makeEnv();
    const response = await worker.fetch(request(goodPayload, accessCode, 'https://evil.example'), env);
    expect(response.status).toBe(403);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('rejects oversized images before using the provider', async () => {
    const { env, calls } = makeEnv();
    const response = await worker.fetch(request({ ...goodPayload, imageJpegBase64: `/9j/${'A'.repeat(6_993_996)}` }), env);
    expect(response.status).toBe(413);
    expect(calls()).toBe(0);
  });

  it('rejects a non-JPEG base64 body before provider use', async () => {
    const { env, calls } = makeEnv();
    const response = await worker.fetch(request({ ...goodPayload, imageJpegBase64: 'iVBORw0KGgo=' }), env);
    expect(response.status).toBe(400);
    expect(calls()).toBe(0);
  });

  it('returns rate limit response and does not expose credentials', async () => {
    const { env } = makeEnv({ USAGE: { idFromName: () => ({}), get: () => ({ fetch: async () => Response.json({ allowed: false }) }) } as unknown as Env['USAGE'] });
    const response = await worker.fetch(request(), env);
    expect(response.status).toBe(429);
    const text = await response.text();
    expect(text).not.toContain(env.ANTHROPIC_API_KEY);
    expect(text).not.toContain(accessCode);
  });

  it('uses the secret model/key and returns only validated tool output', async () => {
    const create = vi.fn(async () => ({ model: 'provider-model', content: [{ type: 'tool_use', name: 'report_safety_photo_analysis', input: validProposal }] }));
    const result = await analyzeWithClaude(goodPayload as AnalyzeRequest, { ANTHROPIC_API_KEY: 'private-key', CLAUDE_MODEL: 'configured-model' }, { messages: { create } });
    expect(result.model).toBe('provider-model');
    expect(result.proposal).toEqual(validProposal);
    expect(JSON.stringify(result)).not.toContain('private-key');
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: 'configured-model' }));
  });

  it('returns a successful validated mocked analysis without exposing secrets', async () => {
    const { env } = makeEnv();
    const app = createWorker({ consume: async () => true, analyze: async () => ({ proposal: validProposalParsed, model: 'claude-mock' }) });
    const response = await app.fetch(request(), env);
    expect(response.status).toBe(200);
    const responseText = await response.text();
    expect(responseText).toContain('claude-mock');
    expect(responseText).not.toContain(env.ANTHROPIC_API_KEY);
    expect(responseText).not.toContain(accessCode);
  });

  it('sanitizes provider errors and never returns key or provider text', async () => {
    const { env } = makeEnv();
    const app = createWorker({ consume: async () => true, analyze: async () => { throw new Error(`provider error ${env.ANTHROPIC_API_KEY} confidential`); } });
    const response = await app.fetch(request(), env);
    expect(response.status).toBe(502);
    const responseText = await response.text();
    expect(responseText).toContain('PROVIDER_UNAVAILABLE');
    expect(responseText).not.toContain(env.ANTHROPIC_API_KEY);
    expect(responseText).not.toContain(accessCode);
  });

  it('rejects invalid mocked Anthropic tool output without exposing its contents', async () => {
    const { env } = makeEnv();
    const app = createWorker({ consume: async () => true, analyze: async () => ({ proposal: { mangelErkannt: true, secret: env.ANTHROPIC_API_KEY }, model: 'claude-mock' }) });
    const response = await app.fetch(request(), env);
    expect(response.status).toBe(502);
    const text = await response.text();
    expect(text).toContain('ANALYSIS_INVALID');
    expect(text).not.toContain(env.ANTHROPIC_API_KEY);
  });
});

describe('DailyUsage Durable Object', () => {
  it('enforces the configured daily request limit', async () => {
    const memory = new Map<string, unknown>();
    type MockStorage = {
      get: (key: string) => Promise<unknown>;
      put: (values: Record<string, unknown>) => Promise<void>;
      transaction: <T>(callback: (store: MockStorage) => Promise<T>) => Promise<T>;
    };
    const storage: MockStorage = {
      get: async (key: string) => memory.get(key),
      put: async (values: Record<string, unknown>) => { for (const [key, value] of Object.entries(values)) memory.set(key, value); },
      transaction: async <T>(callback: (store: typeof storage) => Promise<T>) => callback(storage),
    };
    const object = new DailyUsage({ storage } as unknown as DurableObjectState);
    const consume = () => object.fetch(new Request('https://usage.internal', { method: 'POST', body: JSON.stringify({ day: '2026-10-21', limit: 2 }) }));
    expect((await consume()).status).toBe(200);
    expect((await consume()).status).toBe(200);
    expect((await consume()).status).toBe(429);
  });
});
