import { formatWalkNumber } from './dates';

export interface LegacyWalkIdentity {
  id: string;
  createdAt: string;
  date: string;
}

export function assignLegacyWalkNumbers<T extends LegacyWalkIdentity>(walks: T[]): { walks: (T & { docNr: string })[]; counters: Map<number, number> } {
  const counters = new Map<number, number>();
  const migrated = [...walks]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    .map((walk) => {
      const year = Number(walk.createdAt?.slice(0, 4)) || Number(walk.date.slice(0, 4));
      const lastNumber = (counters.get(year) ?? 0) + 1;
      counters.set(year, lastNumber);
      return { ...walk, docNr: formatWalkNumber(year, lastNumber) };
    });
  return { walks: migrated, counters };
}
