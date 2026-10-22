export interface Env {
  ANTHROPIC_API_KEY: string;
  CLAUDE_MODEL: string;
  ACCESS_CODE: string;
  ALLOWED_ORIGINS: string;
  MAX_REQUESTS_PER_DAY: string;
  USAGE: DurableObjectNamespace;
}

export class DailyUsage {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const { day, limit } = await request.json() as { day: string; limit: number };
    const result = await this.state.storage.transaction(async (transaction) => {
      const currentDay = await transaction.get<string>('day');
      const currentCount = currentDay === day ? (await transaction.get<number>('count') ?? 0) : 0;
      if (currentCount >= limit) return { allowed: false, remaining: 0 };
      await transaction.put({ day, count: currentCount + 1 });
      return { allowed: true, remaining: limit - currentCount - 1 };
    });
    return Response.json(result, { status: result.allowed ? 200 : 429 });
  }
}

export async function consumeDailyLimit(env: Pick<Env, 'USAGE' | 'MAX_REQUESTS_PER_DAY'>, key: string, limitOverride?: number): Promise<boolean> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  const id = env.USAGE.idFromName(Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(''));
  const stub = env.USAGE.get(id);
  const response = await stub.fetch('https://usage.internal/consume', {
    method: 'POST',
    body: JSON.stringify({ day: new Date().toISOString().slice(0, 10), limit: Math.max(1, limitOverride ?? (Number(env.MAX_REQUESTS_PER_DAY) || 30)) }),
    headers: { 'content-type': 'application/json' },
  });
  if (!response.ok) return false;
  return (await response.json() as { allowed: boolean }).allowed;
}
