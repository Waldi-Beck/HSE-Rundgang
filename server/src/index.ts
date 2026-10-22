import { analyzeWithClaude } from './analysis';
import { AiProposalSchema, AnalyzeRequestSchema, type AiProposal, type AnalyzeRequest } from './schemas';
import { consumeDailyLimit, DailyUsage, type Env } from './limiter';
import { ZodError } from 'zod';

export { DailyUsage };

export interface AnalysisServices {
  consume: (env: Env, key: string, limit?: number) => Promise<boolean>;
  analyze: (input: AnalyzeRequest, env: Env) => Promise<{ proposal: unknown; model: string }>;
}

const defaultServices: AnalysisServices = {
  consume: consumeDailyLimit,
  analyze: (input, env) => analyzeWithClaude(input, env),
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_BODY_BYTES = 7_200_000;

function allowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
}

function corsHeaders(origin: string, env: Env): HeadersInit {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-access-code',
    'access-control-max-age': '600',
    'vary': 'Origin',
  };
}

function json(body: unknown, status: number, headers: HeadersInit = {}): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store', ...headers } });
}

function equalSecret(received: string, expected: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(received);
  const right = encoder.encode(expected);
  let diff = left.length ^ right.length;
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

async function readBodyLimited(request: Request): Promise<string | null> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const all = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(all);
}

export function createWorker(services: AnalysisServices = defaultServices) {
  return {
    async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('origin') ?? '';
    const origins = allowedOrigins(env);
    if (origins.length === 0 || !origin || !origins.includes(origin)) return json({ error: 'ORIGIN_NOT_ALLOWED' }, 403);
    const headers = corsHeaders(origin, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/v1/analyze') return json({ error: 'NOT_FOUND' }, 404, headers);
    if (!env.ACCESS_CODE || !equalSecret(request.headers.get('x-access-code') ?? '', env.ACCESS_CODE)) return json({ error: 'UNAUTHORIZED' }, 401, headers);
    if (!env.ANTHROPIC_API_KEY || !env.CLAUDE_MODEL) return json({ error: 'SERVER_NOT_CONFIGURED' }, 503, headers);

    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) return json({ error: 'IMAGE_TOO_LARGE' }, 413, headers);
    let raw: unknown;
    try {
      const body = await readBodyLimited(request);
      if (!body) return json({ error: 'IMAGE_TOO_LARGE' }, 413, headers);
      raw = JSON.parse(body);
    }
    catch { return json({ error: 'INVALID_REQUEST' }, 400, headers); }
    const parsed = AnalyzeRequestSchema.safeParse(raw);
    if (!parsed.success) return json({ error: 'INVALID_REQUEST' }, 400, headers);
    const imageBytes = Math.floor(parsed.data.imageJpegBase64.length * 3 / 4) - (parsed.data.imageJpegBase64.endsWith('==') ? 2 : parsed.data.imageJpegBase64.endsWith('=') ? 1 : 0);
    if (imageBytes > MAX_IMAGE_BYTES) return json({ error: 'IMAGE_TOO_LARGE' }, 413, headers);
    if (parsed.data.imageJpegBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(parsed.data.imageJpegBase64) || parsed.data.imageJpegBase64.slice(0, -2).includes('=')) return json({ error: 'INVALID_IMAGE' }, 400, headers);
    const image = atob(parsed.data.imageJpegBase64);
    if (image.length < 3 || image.charCodeAt(0) !== 0xff || image.charCodeAt(1) !== 0xd8 || image.charCodeAt(2) !== 0xff) return json({ error: 'INVALID_IMAGE' }, 400, headers);

    let allowed: boolean;
    const clientAddress = request.headers.get('cf-connecting-ip');
    if (!clientAddress) return json({ error: 'RATE_LIMIT_UNAVAILABLE' }, 503, headers);
    try {
      const ipAllowed = await services.consume(env, `ip:${clientAddress}`, 120);
      if (!ipAllowed) return json({ error: 'RATE_LIMITED' }, 429, headers);
      allowed = await services.consume(env, `code:${request.headers.get('x-access-code')!}`);
    }
    catch { return json({ error: 'RATE_LIMIT_UNAVAILABLE' }, 503, headers); }
    if (!allowed) return json({ error: 'RATE_LIMITED' }, 429, headers);

    try {
      const result = await services.analyze(parsed.data, env);
      const proposal = AiProposalSchema.parse(result.proposal);
      return json({ proposal, model: result.model.slice(0, 120) }, 200, headers);
    } catch (error) {
      // Do not log request data, photos, provider response bodies, or credentials.
      const code = (error as Error)?.message === 'ANALYSIS_INVALID' || error instanceof ZodError ? 'ANALYSIS_INVALID' : 'PROVIDER_UNAVAILABLE';
      return json({ error: code }, 502, headers);
    }
    },
  };
}

export default createWorker();
