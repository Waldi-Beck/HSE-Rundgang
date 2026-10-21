import { z } from 'zod';
import type { AiProposal } from './types';

const boundedText = z.string().max(1600);

export const AiProposalSchema = z.object({
  mangelErkannt: z.boolean(),
  gefahren: z.array(z.object({ beschreibung: z.string().min(1).max(1200), folge: z.string().min(1).max(1200) }).strict()).max(8),
  vorgeschlagenePrio: z.enum(['K', 'H', 'M', 'N']).nullable(),
  begruendungPrio: boundedText,
  sofortmassnahme: boundedText,
  massnahmen: z.array(z.object({ text: z.string().min(1).max(1200), stopStufe: z.enum(['Substitution', 'Technisch', 'Organisatorisch', 'Persönlich']) }).strict()).max(12),
  passendeGrundlage: z.string().max(1000),
  passenderKontrollpunkt: z.string().max(500).nullable(),
  sicherheit: z.enum(['hoch', 'mittel', 'niedrig']),
  hinweis: boundedText,
}).strict() satisfies z.ZodType<AiProposal>;

export type AiProposalResult = z.infer<typeof AiProposalSchema>;
