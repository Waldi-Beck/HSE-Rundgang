import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_TOOL, AiProposalSchema, SYSTEM_PROMPT, type AnalyzeRequest } from './schemas';
import type { Env } from './limiter';

export interface AnthropicClient {
  messages: { create: (params: Record<string, unknown>) => Promise<unknown> };
}

export async function analyzeWithClaude(input: AnalyzeRequest, env: Pick<Env, 'ANTHROPIC_API_KEY' | 'CLAUDE_MODEL'>, clientOverride?: AnthropicClient): Promise<{ proposal: unknown; model: string }> {
  const client = clientOverride ?? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const bytes = Uint8Array.from(atob(input.imageJpegBase64), (character) => character.charCodeAt(0));
  const context = input.context;
  const userContext = [
    `Abteilung: ${context.area}`,
    `Kontrollpunkt: ${context.itemId ? `${context.itemId}: ${context.itemText}` : 'nicht angegeben'}`,
    `Grundlage aus SOP: ${context.basis || 'keine hinterlegt'}`,
    `Nutzereingabe: ${context.userText || 'keine'}`,
    `Prioritätsdefinitionen: ${JSON.stringify(context.priorities)}`,
    'Bitte nur das Foto und den obigen Kontext als Sachinformationen verwenden.',
  ].join('\n');

  const response = await client.messages.create({
    model: env.CLAUDE_MODEL,
    max_tokens: 1800,
    system: SYSTEM_PROMPT,
    tools: [ANTHROPIC_TOOL],
    tool_choice: { type: 'tool', name: ANTHROPIC_TOOL.name },
    messages: [{ role: 'user', content: [
      { type: 'text', text: userContext },
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: input.imageJpegBase64 } },
    ] }],
  });

  const result = response as { content?: Array<{ type?: string; name?: string; input?: unknown }>; model?: string };
  const tool = result.content?.find((item) => item.type === 'tool_use' && item.name === ANTHROPIC_TOOL.name);
  if (!tool || !result.model || result.model === env.ANTHROPIC_API_KEY) throw new Error('ANALYSIS_INVALID');
  const proposal = AiProposalSchema.parse(tool.input);
  return { proposal, model: result.model };
}
