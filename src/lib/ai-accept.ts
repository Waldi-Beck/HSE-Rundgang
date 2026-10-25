import type { AiAcceptedField, AiProposal, Defect } from './types';

export type AiFieldValue = string | Defect['priority'] | null;

export function aiFieldValue(proposal: AiProposal, field: AiAcceptedField, validChecklistItemIds: string[] = []): AiFieldValue {
  switch (field) {
    case 'description':
      return proposal.mangelBeschreibung;
    case 'hazard':
      return proposal.gefahren.map(({ beschreibung, folge }) => `${beschreibung}${folge ? ` (Mögliche Folge: ${folge})` : ''}`).join('\n');
    case 'priority':
      return proposal.vorgeschlagenePrio;
    case 'immediateAction':
      return proposal.sofortmassnahme;
    case 'action':
      return proposal.massnahmen.map(({ stopStufe, text }) => `${stopStufe}: ${text}`).join('\n');
    case 'itemId': {
      const candidate = proposal.passenderKontrollpunkt?.trim() ?? '';
      return validChecklistItemIds.includes(candidate) ? candidate : null;
    }
  }
}

export function applyAiFields(draft: Defect, proposal: AiProposal, fields: AiAcceptedField[], validChecklistItemIds: string[] = []): Defect {
  const next = { ...draft };
  for (const field of fields) {
    const value = aiFieldValue(proposal, field, validChecklistItemIds);
    if (value === null || value === '') continue;
    if (field === 'priority') next.priority = value as Defect['priority'];
    else if (field === 'itemId') next.itemId = value;
    else if (field === 'description') next.description = value;
    else if (field === 'hazard') next.hazard = value;
    else if (field === 'immediateAction') next.immediateAction = value;
    else if (field === 'action') next.action = value;
  }
  return next;
}
