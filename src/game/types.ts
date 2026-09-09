export type Movement = 'olympic' | 'paralympic';
export type Season = 'summer' | 'winter';
export type EventCategory = 'm' | 'w' | 'x' | 'o';
export type Medals = [number, number, number];
export interface Edition {
  id: string;
  year: number;
  season: Season;
  city: string;
  medals: Medals;
}
export interface SportingRecord {
  total: Medals;
  summer: Medals;
  winter: Medals;
  sports: { name: string; medals: Medals }[] | null;
  categories: Record<EventCategory, number> | null;
  editions: Edition[];
}
export interface Team {
  id: string;
  name: string;
  aliases: string[];
  iso2: string | null;
  numeric: string | null;
  region: string;
  subregion: string;
  historical: boolean;
  eligible: boolean;
  period?: string;
  description: string;
  identityHint: string;
  flag?: string;
  records: Record<Movement, SportingRecord>;
}
export interface Catalog {
  version: string;
  effectiveFrom: string;
  retrievedAt: string;
  coverage: { movement: Movement; season: Season; start: number; end: number; editions: number }[];
  sources: { name: string; url: string }[];
  teams: Team[];
}
export type ClueKind = 'cabinet' | 'sports' | 'seasons' | 'timeline' | 'mix' | 'breakthrough' | 'region' | 'identity';
export interface Clue {
  kind: ClueKind;
  movement: Movement;
  variant: number;
}
export interface Puzzle {
  id: string;
  mode: 'daily' | 'practice';
  date: string;
  number: number;
  seed: string;
  catalogVersion: string;
  targetId: string;
  clues: Clue[];
}
export interface Attempt {
  teamId: string | null;
}
export interface GameState {
  puzzle: Puzzle;
  attempts: Attempt[];
}
export type Outcome = 'playing' | 'won' | 'lost';
export interface Comparison {
  label: string;
  relation: 'higher' | 'lower' | 'match' | 'different' | 'unavailable';
  detail: string;
}
export interface DailyResult {
  date: string;
  won: boolean;
  attempts: number;
}
export interface SaveData {
  version: 1;
  activeDaily: GameState | null;
  results: Record<string, DailyResult>;
  games: Record<string, GameState>;
}
