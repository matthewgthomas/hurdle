import type { Catalog, Clue, ClueKind, Comparison, GameState, Movement, Outcome, Puzzle, SportingRecord, Team } from './types';

export const EPOCH = '2026-09-08';
export const MAX_ATTEMPTS = 6;
const DAY = 86_400_000;
export const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);
export const utcDate = (now = new Date()) => now.toISOString().slice(0, 10);
export const dayNumber = (date: string) => Math.floor((Date.parse(date + 'T00:00:00Z') - Date.parse(EPOCH + 'T00:00:00Z')) / DAY) + 1;
export const dayDistance = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY);
export const normalise = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export const movementLabel = (movement: Movement) => movement === 'olympic' ? 'Olympic Games' : 'Paralympic Games';
export const recordTotal = (record: SportingRecord) => sum(record.total);

export function randomFrom(seed: string): () => number {
  let value = 2166136261;
  for (const char of seed) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return () => {
    value += 0x6D2B79F5;
    let t = Math.imul(value ^ value >>> 15, 1 | value);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function eligibleTeams(catalog: Catalog) {
  return catalog.teams.filter(t => t.eligible && (recordTotal(t.records.olympic) + recordTotal(t.records.paralympic) > 0));
}

export function makeClues(team: Team, seed: string): Clue[] {
  const random = randomFrom(seed + ':clues');
  const movements: Movement[] = ['olympic', 'paralympic'];
  const families: ClueKind[] = ['cabinet', 'sports', 'seasons', 'timeline', 'mix', 'breakthrough'];
  const candidates = shuffle(families, random).flatMap(kind => {
    const choices = movements.filter(movement => {
      const record = team.records[movement];
      if (!recordTotal(record)) return false;
      if (kind === 'sports') return !!record.sports?.length;
      if (kind === 'mix') return !!record.categories;
      if (kind === 'timeline') return record.editions.length > 1;
      return true;
    });
    if (!choices.length) return [];
    return [{ kind, movement: choices[Math.floor(random() * choices.length)], variant: Math.floor(random() * 2) }];
  });
  // One-medal countries still have cabinet, sports, seasons and breakthrough.
  if (candidates.length < 4) throw new Error(`Insufficient supported clue families for ${team.id}`);
  const sporting = candidates.slice(0, 4);
  // Use both movements when four families permit it, without repeating a family.
  const present = new Set(sporting.map(c => c.movement));
  if (present.size === 1) {
    const missing: Movement = sporting[0].movement === 'olympic' ? 'paralympic' : 'olympic';
    if (recordTotal(team.records[missing])) {
      const replace = sporting.find(c => c.kind === 'cabinet' || c.kind === 'seasons' || c.kind === 'breakthrough');
      if (replace) replace.movement = missing;
    }
  }
  return [...sporting, { kind: 'region', movement: 'olympic', variant: Math.floor(random() * 2) }, { kind: 'identity', movement: 'olympic', variant: Math.floor(random() * 2) }];
}

export function dailyPuzzle(date: string, catalog: Catalog): Puzzle {
  const pool = eligibleTeams(catalog).sort((a, b) => a.id.localeCompare(b.id, 'en'));
  if (pool.length < 2) throw new Error('At least two eligible teams are required.');
  const offset = Math.max(0, dayDistance(catalog.effectiveFrom, date));
  const cycle = Math.floor(offset / pool.length);
  const roster = (n: number) => shuffle(pool, randomFrom(`${catalog.version}:roster:${pool.length === 2 ? 0 : n}`));
  const ordered = roster(cycle);
  // Swapping only the first two leaves the previous cycle's last entry stable.
  if (pool.length > 2 && cycle > 0 && ordered[0].id === roster(cycle - 1).at(-1)!.id) {
    [ordered[0], ordered[1]] = [ordered[1], ordered[0]];
  }
  const target = ordered[offset % pool.length];
  const seed = `${catalog.version}:${date}`;
  return { id: `daily:${date}`, mode: 'daily', date, number: dayNumber(date), seed, catalogVersion: catalog.version, targetId: target.id, clues: makeClues(target, seed) };
}

export function practicePuzzle(seed: string, date: string, catalog: Catalog, dailyTargetId: string): Puzzle {
  const pool = eligibleTeams(catalog).filter(team => team.id !== dailyTargetId);
  if (!pool.length) throw new Error('No practice teams available.');
  const target = pool[Math.floor(randomFrom(seed)() * pool.length)];
  return { id: `practice:${seed}`, mode: 'practice', date, number: 0, seed, catalogVersion: catalog.version, targetId: target.id, clues: makeClues(target, seed) };
}

export const outcome = (state: GameState): Outcome => state.attempts.some(a => a.teamId === state.puzzle.targetId) ? 'won' : state.attempts.length >= MAX_ATTEMPTS ? 'lost' : 'playing';
export const revealedCount = (state: GameState) => outcome(state) === 'playing' ? Math.min(MAX_ATTEMPTS, state.attempts.length + 1) : MAX_ATTEMPTS;

export function submitAttempt(state: GameState, teamId: string | null, catalog: Catalog): { state: GameState; error?: string } {
  if (outcome(state) !== 'playing') return { state, error: 'This round is finished.' };
  if (teamId !== null && !catalog.teams.some(t => t.id === teamId && t.eligible)) return { state, error: 'Choose a country or historical team from the list.' };
  if (teamId && state.attempts.some(a => a.teamId === teamId)) return { state, error: 'You’ve already guessed that team. Try another.' };
  return { state: { ...state, attempts: [...state.attempts, { teamId }] } };
}

export function searchTeams(query: string, teams: Team[]): Team[] {
  const key = normalise(query);
  if (!key) return [];
  return teams.filter(t => t.eligible).map(team => {
    const names = [team.name, team.id, ...team.aliases].map(normalise);
    const rank = names.includes(key) ? 0 : names.some(n => n.startsWith(key)) ? 1 : names.some(n => n.includes(key)) ? 2 : 3;
    return { team, rank };
  }).filter(x => x.rank < 3).sort((a, b) => a.rank - b.rank || a.team.name.localeCompare(b.team.name, 'en')).slice(0, 8).map(x => x.team);
}

export function resolveTeam(query: string, teams: Team[]): Team | undefined {
  const key = normalise(query);
  const matches = teams.filter(t => t.eligible && [t.name, t.id, ...t.aliases].some(n => normalise(n) === key));
  return matches.length === 1 ? matches[0] : undefined;
}

export function topEdition(record: SportingRecord) {
  return [...record.editions].sort((a, b) => sum(b.medals) - sum(a.medals) || a.year - b.year || a.id.localeCompare(b.id))[0];
}
export function firstEdition(record: SportingRecord) {
  return [...record.editions].sort((a, b) => a.year - b.year || a.id.localeCompare(b.id))[0];
}
const percent = (part: number, total: number) => total ? Math.round(part / total * 100) : null;
export const winterShare = (record: SportingRecord) => percent(sum(record.winter), recordTotal(record));
export const womenShare = (record: SportingRecord) => record.categories ? percent(record.categories.w, recordTotal(record)) : null;

export const CLUE_TITLES: Record<ClueKind, string> = { cabinet: 'A cabinet of clues.', sports: 'Their home advantage.', seasons: 'Summer or snow?', timeline: 'A history of podiums.', mix: 'Who takes the podium?', breakthrough: 'A moment in history.', region: 'A little closer to home.', identity: 'The final stretch.' };
export const CLUE_LABELS: Record<ClueKind, string> = { cabinet: 'Medal cabinet', sports: 'Signature sports', seasons: 'Summer or snow', timeline: 'Podium timeline', mix: 'Event mix', breakthrough: 'Breakthrough', region: 'Around the world', identity: 'The final clue' };

export function compareClue(clue: Clue, target: Team, guess: Team): Comparison {
  const label = CLUE_LABELS[clue.kind];
  const actual = target.records[clue.movement];
  const other = guess.records[clue.movement];
  const numeric = (a: number | null | undefined, b: number | null | undefined, noun: string): Comparison => {
    if (a == null || b == null) return { label, relation: 'unavailable', detail: 'Unavailable for this comparison' };
    const relation = a > b ? 'higher' : a < b ? 'lower' : 'match';
    return { label, relation, detail: relation === 'match' ? `Same ${noun}` : `Mystery team: ${relation} ${noun}` };
  };
  switch (clue.kind) {
    case 'cabinet': return numeric(recordTotal(actual), recordTotal(other), 'medal total');
    case 'sports': {
      const a = actual.sports?.[0]?.name, b = other.sports?.[0]?.name;
      if (!a || !b) return { label, relation: 'unavailable', detail: 'Unavailable: no supported sport ranking' };
      // Include tied leading sports, not just the alphabetical first entry.
      const leading = (r: SportingRecord) => r.sports!.filter(s => sum(s.medals) === sum(r.sports![0].medals)).map(s => s.name);
      const match = leading(actual).some(s => leading(other).includes(s));
      return { label, relation: match ? 'match' : 'different', detail: match ? 'Shares a leading sport' : 'Different leading sport' };
    }
    case 'seasons': return numeric(winterShare(actual), winterShare(other), 'Winter medal share');
    case 'timeline': return numeric(topEdition(actual) ? sum(topEdition(actual).medals) : null, topEdition(other) ? sum(topEdition(other).medals) : null, 'best-edition medal total');
    case 'mix': return numeric(womenShare(actual), womenShare(other), 'women’s event medal share');
    case 'breakthrough': {
      const a = clue.variant ? topEdition(actual) : firstEdition(actual);
      const b = clue.variant ? topEdition(other) : firstEdition(other);
      const result = numeric(a?.year, b?.year, clue.variant ? 'best-edition year' : 'first-medal year');
      if (result.relation === 'higher') result.detail = 'Mystery team: a later year';
      if (result.relation === 'lower') result.detail = 'Mystery team: an earlier year';
      return result;
    }
    case 'region': {
      const narrow = clue.variant && target.subregion;
      const a = narrow ? target.subregion : target.region;
      const b = narrow ? guess.subregion : guess.region;
      return { label, relation: a === b ? 'match' : 'different', detail: `${a === b ? 'Same' : 'Different'} ${narrow ? 'subregion' : 'world region'}` };
    }
    default: return { label, relation: target.id === guess.id ? 'match' : 'different', detail: target.id === guess.id ? 'That’s the team!' : 'Different team' };
  }
}

export function shareText(state: GameState, url: string): string {
  const status = outcome(state);
  const score = status === 'won' ? state.attempts.length : 'X';
  const marks = state.attempts.map(a => a.teamId === state.puzzle.targetId ? '🟩' : a.teamId === null ? '⬜' : '🟥');
  return `Hurdle ${state.puzzle.mode === 'daily' ? '#' + state.puzzle.number : 'Practice'} · ${score}/6\n${marks.join('')}\nOne country. Six hurdles.\n${url}`;
}
