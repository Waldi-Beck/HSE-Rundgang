import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_TOOL, AiProposalSchema, SYSTEM_PROMPT, type AnalyzeRequest } from './schemas';
import type { Env } from './limiter';

export interface AnthropicClient {
  messages: { create: (params: Record<string, unknown>) => Promise<unknown> };
}

const MAX_ATTEMPTS = 2;

export async function analyzeWithClaude(input: AnalyzeRequest, env: Pick<Env, 'ANTHROPIC_API_KEY' | 'CLAUDE_MODEL'>, clientOverride?: AnthropicClient): Promise<{ proposal: unknown; model: string }> {
  const client = clientOverride ?? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const context = input.context;
  const checklist = context.checklistItems.length
    ? context.checklistItems.map((item) => `- ${item.id}: ${item.text}${item.basis ? ` (Grundlage: ${item.basis})` : ''}`).join('\n')
    : '- keine';
  const userContext = [
    `Abteilung: ${context.area}`,
    `Kontrollpunkt: ${context.itemId ? `${context.itemId}: ${context.itemText}` : 'nicht angegeben'}`,
    `Grundlage aus SOP: ${context.basis || 'keine hinterlegt'}`,
    `Nutzereingabe: ${context.userText || 'keine'}`,
    `Prioritätsdefinitionen: ${JSON.stringify(context.priorities)}`,
    `Kontrollpunktliste (nur diese IDs sind für passenderKontrollpunkt erlaubt):\n${checklist}`,
    'Bitte nur das Foto und den obigen Kontext als Sachinformationen verwenden.',
    `Antworte mit genau einem Aufruf des Tools ${ANTHROPIC_TOOL.name}.`,
  ].join('\n');

  // Current models reject a forced tool_choice; use auto + strict tool and retry once if no tool call came back.
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const response = await client.messages.create({
      model: env.CLAUDE_MODEL,
      max_tokens: 16000,
      output_config: { effort: 'medium' },
      system: SYSTEM_PROMPT,
      tools: [ANTHROPIC_TOOL],
      tool_choice: { type: 'auto', disable_parallel_tool_use: true },
      messages: [{ role: 'user', content: [
        { type: 'text', text: userContext },
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: input.imageJpegBase64 } },
      ] }],
    });

    const result = response as { content?: Array<{ type?: string; name?: string; input?: unknown }>; model?: string; stop_reason?: string };
    if (result.stop_reason === 'refusal') throw new Error('ANALYSIS_INVALID');
    const tool = result.content?.find((item) => item.type === 'tool_use' && item.name === ANTHROPIC_TOOL.name);
    if (!tool) continue;
    if (!result.model || result.model === env.ANTHROPIC_API_KEY) throw new Error('ANALYSIS_INVALID');
    const proposal = AiProposalSchema.parse(limitLists(tool.input));
    return { proposal, model: result.model };
  }
  throw new Error('ANALYSIS_INVALID');
}

// Strict tool schemas cannot carry maxItems, so cap the lists here instead of rejecting the whole analysis.
function limitLists(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input;
  const value = input as Record<string, unknown>;
  return {
    ...value,
    ...(Array.isArray(value.gefahren) ? { gefahren: value.gefahren.slice(0, 8) } : {}),
    ...(Array.isArray(value.massnahmen) ? { massnahmen: value.massnahmen.slice(0, 12) } : {}),
  };
}
