const OPENERS = ['Sehr gut gemacht', 'Stark umgesetzt', 'Sauber erledigt', 'Prima gelöst', 'Klasse Einsatz'];
const CLOSERS = [
  'der Mangel ist behoben und der Bereich wieder sicherer.',
  'so werden Stolper- und Unfallrisiken reduziert.',
  'damit ist die vereinbarte Massnahme umgesetzt.',
  'die sorgfältige Arbeit trägt zu einem sicheren Arbeitsplatz bei.',
  'die Nachkontrolle zeigt: Die Massnahme wirkt.',
  'vielen Dank für den Beitrag zur Arbeitssicherheit.',
];

const PRAISE_LINES = OPENERS.flatMap((opener) => CLOSERS.map((closer) => `${opener} – ${closer}`));

/** Select an automatically generated completion note not used by an earlier resolution. */
export function uniqueResolutionPraise(existingNotes: string[], random: () => number = Math.random): string {
  const available = PRAISE_LINES.filter((candidate) => !existingNotes.some((note) => note.includes(candidate)));
  if (available.length) {
    const index = Math.min(available.length - 1, Math.floor(random() * available.length));
    return available[index];
  }
  return `Sehr gut gemacht – eine weitere Behebung wurde erfolgreich dokumentiert. Danke für den Beitrag zur Sicherheit (Nr. ${existingNotes.length + 1}).`;
}
