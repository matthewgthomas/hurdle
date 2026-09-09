"""Release checks run offline in CI against the committed source snapshots."""
import json
import hashlib
from pathlib import Path
from build_data import ROOT, SOURCES, compile_catalog, mapped, plus

def validate():
    built,report=compile_catalog()
    config=json.loads((ROOT/'data/build-config.json').read_text())
    catalog=json.loads((ROOT/config['file']).read_text())
    assert catalog==built, 'Catalog is stale: run npm run data:build'
    assert report==json.loads((ROOT/config['report']).read_text()), 'Validation report is stale'
    lock=ROOT/'data/catalog-lock.json'
    if lock.exists():
        frozen=json.loads(lock.read_text())
        for entry in frozen: assert hashlib.sha256((ROOT/entry['file']).read_bytes()).hexdigest()==entry['sha256'],'A frozen catalog changed'
        assert len({c['version'] for c in frozen})==len(frozen)
        assert len({c['effectiveFrom'] for c in frozen})==len(frozen)
    assert [(c['start'],c['end'],c['editions']) for c in catalog['coverage']]==[(1896,2024,30),(1924,2026,25),(1960,2024,17),(1976,2026,14)], 'Incomplete historical coverage'
    for movement,season,years in [('olympic','summer',[y for y in range(1896,2025,4) if y not in [1916,1940,1944]]),('olympic','winter',[1924,1928,1932,1936,1948,1952,1956,1960,1964,1968,1972,1976,1980,1984,1988,1992,1994,1998,2002,2006,2010,2014,2018,2022,2026]),('paralympic','summer',list(range(1960,2025,4))),('paralympic','winter',list(range(1976,1993,4))+list(range(1994,2027,4)))]:
        found={e['year'] for t in catalog['teams'] for e in t['records'][movement]['editions'] if e['season']==season}
        assert found==set(years), (movement,season,'missing editions',set(years)-found)
    assert len({t['id'] for t in catalog['teams']})==len(catalog['teams'])
    for t in catalog['teams']:
        if t['numeric']: assert (ROOT/f"public/shapes/{t['numeric']}.svg").exists()
        if t.get('flag'): assert (ROOT/'public'/t['flag']).exists()
        for movement,r in t['records'].items():
            assert plus(r['summer'],r['winter'])==r['total'],(t['id'],movement)
            assert [sum(e['medals'][i] for e in r['editions']) for i in range(3)]==r['total']
            for m in [r['total'],r['summer'],r['winter']]+[e['medals'] for e in r['editions']]:
                assert len(m)==3 and all(isinstance(n,int) and n>=0 for n in m)
            if r['sports'] is not None: assert [sum(s['medals'][i] for s in r['sports']) for i in range(3)]==r['total'],(t['id'],movement,'sports')
            if r['categories'] is not None: assert sum(r['categories'].values())==sum(r['total']),(t['id'],movement,'categories')
    teams={t['id']:t for t in catalog['teams']}
    assert teams['EUA']['records']['olympic']['total']==[36,60,41]
    assert all(e['year']<=1988 for e in teams['URS']['records']['olympic']['editions'])
    assert all(e['year']>=1994 for e in teams['RUS']['records']['olympic']['editions'])
    assert mapped('GER','paralympic',1960)=='FRG' and mapped('GER','olympic',1960)=='EUA'
    recent=json.loads((SOURCES/'ipc-2026-winter.json').read_text())
    assert len(recent['rows'])==27 and [sum(r['medals'][i] for r in recent['rows']) for i in range(3)]==[79,79,80]
    hockey=next(s for s in recent['sports'] if s['id']=='ice-hockey')
    assert len(hockey['events'])==1 and len(hockey['events'][0]['awards'])==3,'Team medals must count once'
    assert any(len(e['awards'])==4 for s in recent['sports'] for e in s['events']),'Preserve bronze tie'
    # Source event routes can collide for + and − weight categories. They are
    # distinct events and must not be deduplicated merely by their URL.
    paris=json.loads((SOURCES/'ipc-2024-summer.json').read_text())
    events=[e for s in paris['sports'] for e in s['events']]
    assert len(events)>len({e['id'] for e in events})
    print(f"Validated {len(catalog['teams'])} profiles, 86 editions, source reconciliation, historical mappings, ties, team awards and unknowns.")

if __name__=='__main__':validate()
