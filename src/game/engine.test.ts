import { describe, expect, it } from 'vitest';
import { catalogs, catalogForDate } from './catalog';
import { compareClue, dailyPuzzle, dayNumber, eligibleTeams, makeClues, normalise, outcome, practicePuzzle, resolveTeam, revealedCount, shareText, submitAttempt, utcDate } from './engine';
import type { Catalog, GameState, Team } from './types';

const catalog = catalogs[0];
const date = (offset: number) => new Date(Date.UTC(2026,8,8+offset)).toISOString().slice(0,10);
const team = (id:string) => catalog.teams.find(t=>t.id===id)!;
const game = (): GameState => ({puzzle:dailyPuzzle(date(0),catalog),attempts:[]});

describe('daily calendar and immutable catalog',()=>{
  it('uses UTC and numbers the launch date as one',()=>{
    expect(utcDate(new Date('2026-09-09T00:30:00+01:00'))).toBe('2026-09-08');
    expect(utcDate(new Date('2026-09-09T01:00:00+01:00'))).toBe('2026-09-09');
    expect(dayNumber(date(0))).toBe(1);
    expect(dayNumber('2028-03-01')-dayNumber('2028-02-28')).toBe(2);
  });
  it('is deterministic and does not mutate catalog order',()=>{
    const before = JSON.stringify(catalog);
    expect(dailyPuzzle(date(123),catalog)).toEqual(dailyPuzzle(date(123),catalog));
    expect(JSON.stringify(catalog)).toBe(before);
  });
  it('rotates without repetition inside cycles or across their boundaries',()=>{
    const count = eligibleTeams(catalog).length;
    let last = '';
    for(let cycle=0;cycle<8;cycle++){
      const ids = Array.from({length:count},(_,i)=>dailyPuzzle(date(cycle*count+i),catalog).targetId);
      expect(new Set(ids).size).toBe(count);
      expect(ids[0]).not.toBe(last);
      last=ids.at(-1)!;
    }
  });
  it('retains a prior version when a future catalog is registered',()=>{
    const original=dailyPuzzle(date(0),catalogForDate(date(0)));
    const next={...catalog,version:'2.0.0',effectiveFrom:date(50)};
    catalogs.push(next);
    try{
      expect(catalogForDate(date(49)).version).toBe(catalog.version);
      expect(catalogForDate(date(50)).version).toBe(next.version);
      expect(dailyPuzzle(date(0),catalogForDate(date(0)))).toEqual(original);
    }finally{catalogs.pop();}
  });
  it('handles a minimal two-team pool without boundary repeats',()=>{
    const c:Catalog={...catalog,teams:[team('USA'),team('CAN')]};
    const ids=Array.from({length:10},(_,i)=>dailyPuzzle(date(i),c).targetId);
    expect(ids.every((id,i)=>!i||id!==ids[i-1])).toBe(true);
  });
});

describe('clues and practice',()=>{
  it('builds six supported clues with four distinct sporting families for every answer',()=>{
    for(const t of eligibleTeams(catalog)) for(let i=0;i<5;i++){
      const clues=makeClues(t,String(i));
      expect(clues).toHaveLength(6);
      expect(new Set(clues.slice(0,4).map(c=>c.kind)).size).toBe(4);
      expect(clues.slice(4).map(c=>c.kind)).toEqual(['region','identity']);
      for(const c of clues.slice(0,4)){
        const r=t.records[c.movement];
        expect(r.total.reduce((a,b)=>a+b,0)).toBeGreaterThan(0);
        if(c.kind==='sports') expect(r.sports?.length).toBeGreaterThan(0);
        if(c.kind==='mix') expect(r.categories).not.toBeNull();
      }
    }
  });
  it('varies the first family and excludes today from independent practice',()=>{
    const today=game().puzzle.targetId;
    const first=new Set();
    for(let i=0;i<100;i++){
      const p=practicePuzzle(String(i),date(0),catalog,today);
      expect(p.targetId).not.toBe(today);
      expect(p.mode).toBe('practice');
      first.add(p.clues[0].kind);
    }
    expect(first.size).toBe(6);
  });
  it('retains historical teams and excludes non-geographic delegations',()=>{
    const ids=eligibleTeams(catalog).map(t=>t.id);
    for(const id of ['URS','GDR','ANZ','EUA','EUN'])expect(ids).toContain(id);
    for(const id of ['AIN','MIX','ROC','XNA','EOR'])expect(ids).not.toContain(id);
  });
});

describe('guesses and comparison',()=>{
  it('resolves names, codes, diacritics and aliases',()=>{
    for(const [input,id] of [['uk','GBR'],['usa','USA'],['USSR','URS'],['Turkey','TUR'],['Ivory Coast','CIV'],['Cote d’Ivoire','CIV'],['Burma','MYA']])expect(resolveTeam(input,catalog.teams)?.id).toBe(id);
    expect(normalise('  Côte-d’Ivoire ')).toBe('cotedivoire');
    expect(resolveTeam('somewhere',catalog.teams)).toBeUndefined();
  });
  it('rejects invalid and duplicate guesses without consuming an attempt',()=>{
    const g=game();
    expect(submitAttempt(g,'invalid',catalog).state).toEqual(g);
    expect(submitAttempt(g,'',catalog).state).toEqual(g);
    const id=eligibleTeams(catalog).find(t=>t.id!==g.puzzle.targetId)!.id;
    const once=submitAttempt(g,id,catalog).state;
    expect(submitAttempt(once,id,catalog).state).toEqual(once);
    expect(revealedCount(once)).toBe(2);
  });
  it('ends on the sixth miss or skip, and accepts a sixth-attempt win',()=>{
    let g=game();
    for(let i=0;i<5;i++)g=submitAttempt(g,null,catalog).state;
    expect(outcome(g)).toBe('playing');
    const win=submitAttempt(g,g.puzzle.targetId,catalog).state;
    expect(outcome(win)).toBe('won');
    const loss=submitAttempt(g,null,catalog).state;
    expect(outcome(loss)).toBe('lost');
    expect(submitAttempt(loss,loss.puzzle.targetId,catalog).state).toEqual(loss);
    expect(revealedCount(win)).toBe(6);
  });
  it('phrases numerical comparisons relative to the mystery team',()=>{
    const c={kind:'cabinet',movement:'olympic',variant:0} as const;
    expect(compareClue(c,team('USA'),team('CAN')).relation).toBe('higher');
    expect(compareClue(c,team('CAN'),team('USA')).relation).toBe('lower');
    expect(compareClue(c,team('USA'),team('USA')).relation).toBe('match');
  });
  it('uses the displayed region granularity and unknowns stay unavailable',()=>{
    expect(compareClue({kind:'region',movement:'olympic',variant:1},team('JPN'),team('IND')).relation).toBe('different');
    expect(compareClue({kind:'sports',movement:'olympic',variant:0},team('GER'),team('USA')).relation).toBe('unavailable');
  });
  it('matches tied leading sports',()=>{
    const a=structuredClone(team('USA')),b=structuredClone(team('CAN'));
    a.records.olympic.sports=[{name:'A',medals:[1,0,0]},{name:'B',medals:[0,1,0]}];
    b.records.olympic.sports=[{name:'B',medals:[1,0,0]}];
    expect(compareClue({kind:'sports',movement:'olympic',variant:0},a,b).relation).toBe('match');
  });
  it('shares no answer or clue values',()=>{
    const g=game();const won=submitAttempt(g,g.puzzle.targetId,catalog).state;
    const text=shareText(won,'https://example.com/hurdle/');
    expect(text).toContain('1/6');expect(text).toContain('🟩');
    expect(text).not.toContain(team(g.puzzle.targetId).name);
  });
});
