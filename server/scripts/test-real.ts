import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeWithClaude } from '../src/analysis';
import { AnalyzeRequestSchema, SYSTEM_PROMPT } from '../src/schemas';

const here = fileURLToPath(new URL('.', import.meta.url));
const varsText = await readFile(resolve(here, '../.dev.vars'), 'utf8').catch(() => {
  throw new Error('server/.dev.vars fehlt. Lege sie lokal aus .dev.vars.example an.');
});
const vars = Object.fromEntries(varsText.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#')).map((line) => {
  const separator = line.indexOf('=');
  return [line.slice(0, separator), line.slice(separator + 1)];
}));
if (!vars.ANTHROPIC_API_KEY || !vars.CLAUDE_MODEL) throw new Error('ANTHROPIC_API_KEY oder CLAUDE_MODEL fehlt in server/.dev.vars.');
const imageArgument = process.argv.slice(2).find((argument) => !argument.startsWith('-'));
const imagePath = resolve(process.cwd(), imageArgument ?? '../tests/fixtures/mangel-fluchtweg.jpg');
const bytes = await readFile(imagePath);
const input = AnalyzeRequestSchema.parse({
  imageJpegBase64: bytes.toString('base64'),
  context: {
    area: 'QLabs', itemId: 'R1', itemText: 'Fluchtwege frei, mind. 1,2 m breit',
    basis: 'ArGV 4 Art. 8 (Fluchtwege)', userText: '', checklistItems: [{ id: 'R1', text: 'Fluchtwege frei, mind. 1,2 m breit', basis: 'ArGV 4 Art. 8 (Fluchtwege)' }],
    priorities: { K: { name: 'Kritisch', days: 0 }, H: { name: 'Hoch', days: 2 }, M: { name: 'Mittel', days: 7 }, N: { name: 'Niedrig', days: 30 } },
  },
});
try {
  const result = await analyzeWithClaude(input, { ANTHROPIC_API_KEY: vars.ANTHROPIC_API_KEY, CLAUDE_MODEL: vars.CLAUDE_MODEL });
  if (result.proposal.hinweis.toLowerCase().includes('api_key') || SYSTEM_PROMPT.includes(vars.ANTHROPIC_API_KEY)) throw new Error('Sicherheitsprüfung fehlgeschlagen.');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const status = (error as { status?: number }).status;
  if (status === 401) throw new Error('Anthropic hat den API-Schlüssel abgelehnt (401). Prüfe .dev.vars; teile den Schlüssel nie.');
  if (status === 403) throw new Error('Anthropic hat den Zugriff verweigert (403). Prüfe Konto, Modellberechtigung und Abrechnung.');
  if (status === 429) throw new Error('Anthropic Rate-Limit oder Kontingent erreicht (429). Bitte später erneut versuchen.');
  throw new Error('Der manuelle Anthropic-Test ist fehlgeschlagen. Prüfe Netzwerk, Modellkennung und Konto; Details/Schlüssel werden aus Sicherheitsgründen nicht ausgegeben.');
}
