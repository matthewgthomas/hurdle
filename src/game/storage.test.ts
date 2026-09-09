import { describe,expect,it } from 'vitest';
import { catalogs } from './catalog';
import { dailyPuzzle,practicePuzzle,submitAttempt } from './engine';
import { emptySave,readSave,saveGame,statistics,validGame,writeSave } from './storage';
import type { GameState } from './types';
const date='2026-09-08';const catalog=catalogs[0];
const fresh=():GameState=>({puzzle:dailyPuzzle(date,catalog),attempts:[]});
const storage=(value:string)=>({getItem:()=>value});

describe('resilient persistence',()=>{
 it('recovers a valid round after reloading',()=>{
   const game=submitAttempt(fresh(),null,catalog).state;
   const saved=saveGame(emptySave(),game);
   expect(readSave(catalogs,storage(JSON.stringify(saved))).activeDaily).toEqual(game);
 });
 it('counts a completed daily result exactly once',()=>{
   const g=fresh(),won=submitAttempt(g,g.puzzle.targetId,catalog).state;
   let saved=saveGame(emptySave(),won);saved=saveGame(saved,won);
   saved=readSave(catalogs,storage(JSON.stringify(saved)));
   expect(statistics(saved.results,date).played).toBe(1);
   expect(statistics(saved.results,date).distribution).toEqual([1,0,0,0,0,0]);
 });
 it('keeps practice out of daily progress and statistics',()=>{
   const p={puzzle:practicePuzzle('test',date,catalog,fresh().puzzle.targetId),attempts:[]};
   const original=saveGame(emptySave(),fresh());
   expect(saveGame(original,p)).toBe(original);
 });
 it('survives malformed, unavailable and unsupported storage',()=>{
   for(const raw of ['{bad','null','{}','{"version":100}','{"version":1,"games":{"bad":null}}'])expect(readSave(catalogs,storage(raw))).toEqual(emptySave());
   expect(readSave(catalogs,{getItem:()=>{throw Error('private')}})).toEqual(emptySave());
   expect(writeSave(emptySave(),{setItem:()=>{throw Error('quota')}})).toBe(false);
 });
 it('rejects corrupted targets, unsupported clues and guesses after a win',()=>{
   const g=fresh();g.puzzle.targetId='USA';expect(validGame(g,catalogs)).toBe(false);
   const h=fresh();h.puzzle.clues[0].kind='identity';expect(validGame(h,catalogs)).toBe(false);
   const j=fresh();j.attempts=[{teamId:j.puzzle.targetId},{teamId:null}];expect(validGame(j,catalogs)).toBe(false);
 });
 it('retains an unfinished round across UTC midnight',()=>{
   const g=submitAttempt(fresh(),null,catalog).state;
   const save=readSave(catalogs,storage(JSON.stringify(saveGame(emptySave(),g))));
   expect(save.activeDaily?.puzzle.date).toBe(date);
   expect(save.games['2026-09-09']).toBeUndefined();
 });
 it('handles streak gaps, losses, yesterday and out-of-order completions',()=>{
   const results={'2026-09-06':{date:'2026-09-06',won:true,attempts:2},'2026-09-07':{date:'2026-09-07',won:true,attempts:4}};
   expect(statistics(results,date)).toMatchObject({streak:2,best:2});
   expect(statistics(results,'2026-09-09').streak).toBe(0);
   expect(statistics({...results,[date]:{date,won:false,attempts:6}},date).streak).toBe(0);
 });
});
