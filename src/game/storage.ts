import { dailyPuzzle, dayDistance, outcome } from './engine';
import type { Catalog, DailyResult, GameState, SaveData } from './types';

export const STORAGE_KEY = 'hurdle:save:v1';
export const emptySave = (): SaveData => ({ version: 1, activeDaily: null, results: {}, games: {} });
const validDate = (date: unknown): date is string => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().startsWith(date);

export function validGame(value: unknown, catalogs: Catalog[]): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const game = value as GameState;
  const p = game.puzzle;
  if (!p || !validDate(p.date) || p.mode !== 'daily' || p.id !== `daily:${p.date}` || typeof p.seed !== 'string' || !Number.isInteger(p.number)) return false;
  const catalog = catalogs.find(c => c.version === p.catalogVersion);
  if (!catalog || !catalog.teams.some(t => t.id === p.targetId && t.eligible) || !Array.isArray(p.clues) || p.clues.length !== 6) return false;
  const families = ['cabinet','sports','seasons','timeline','mix','breakthrough','region','identity'];
  if (!p.clues.every(c => c && families.includes(c.kind) && ['olympic','paralympic'].includes(c.movement) && (c.variant === 0 || c.variant === 1))) return false;
  const expected = dailyPuzzle(p.date,catalog);
  if (p.targetId !== expected.targetId || p.seed !== expected.seed || p.number !== expected.number || JSON.stringify(p.clues) !== JSON.stringify(expected.clues)) return false;
  if (!Array.isArray(game.attempts) || game.attempts.length > 6) return false;
  const seen = new Set<string>();
  let finished = false;
  return game.attempts.every(a => {
    if (!a || finished) return false;
    if (a.teamId === null) return true;
    if (typeof a.teamId !== 'string' || seen.has(a.teamId) || !catalog.teams.some(t => t.id === a.teamId && t.eligible)) return false;
    seen.add(a.teamId);
    finished = a.teamId === p.targetId;
    return true;
  });
}

export function readSave(catalogs: Catalog[], storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): SaveData {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return emptySave();
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return emptySave();
    const save = emptySave();
    if (validGame(parsed.activeDaily, catalogs)) save.activeDaily = parsed.activeDaily;
    if (parsed.games && typeof parsed.games === 'object') {
      for (const [date, game] of Object.entries(parsed.games)) {
        if (validGame(game, catalogs) && game.puzzle.date === date) save.games[date] = game;
      }
    }
    // Results are reconstructed from completed games, avoiding stale or duplicated counters.
    for (const game of Object.values(save.games)) recordResult(save, game);
    if (save.activeDaily) recordResult(save, save.activeDaily);
    return save;
  } catch { return emptySave(); }
}

export function safeStorage(): Storage | undefined {
  try { return globalThis.localStorage; } catch { return undefined; }
}
export function writeSave(save: SaveData, storage: Pick<Storage, 'setItem'> | undefined = safeStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(save));
    return true;
  } catch { return false; }
}
function recordResult(save: SaveData, state: GameState) {
  const status = outcome(state);
  if (state.puzzle.mode !== 'daily' || status === 'playing') return;
  save.results[state.puzzle.date] = { date: state.puzzle.date, won: status === 'won', attempts: state.attempts.length };
}
export function saveGame(save: SaveData, state: GameState): SaveData {
  if (state.puzzle.mode !== 'daily') return save;
  const next = { ...save, activeDaily: state, games: { ...save.games, [state.puzzle.date]: state }, results: { ...save.results } };
  recordResult(next, state);
  return next;
}
export function statistics(results: Record<string, DailyResult>, today: string) {
  const rounds = Object.values(results).sort((a, b) => a.date.localeCompare(b.date));
  const wins = rounds.filter(r => r.won);
  const distribution = Array.from({ length: 6 }, (_, i) => wins.filter(r => r.attempts === i + 1).length);
  let streak = 0, best = 0, previous = '';
  for (const round of rounds) {
    streak = round.won ? previous && dayDistance(previous, round.date) === 1 ? streak + 1 : 1 : 0;
    best = Math.max(best, streak);
    previous = round.date;
  }
  if (!previous || dayDistance(previous, today) > 1 || dayDistance(previous, today) < 0) streak = 0;
  return { played: rounds.length, wins: wins.length, winRate: rounds.length ? Math.round(wins.length / rounds.length * 100) : 0, streak, best, distribution };
}
