"""Offline, deterministic catalog compiler. Never converts an unknown breakdown to zero."""
from collections import defaultdict
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'data/sources'
ARTS = {'ATT', 'LIT', 'MUS', 'PNT', 'SKL', 'AER', 'APN'}
EXCLUDED = {'MIX', 'ROC', 'AIN', 'IOA', 'EOR', 'IPP', 'UNK', 'NPA', 'RPC', 'IPA', 'XNA', 'XNB', 'XNC'}
SPORT_NAMES = {'ice-hockey':'Para ice hockey','ice-sledge-hockey':'Para ice hockey','para-ice-hockey':'Para ice hockey','ice-sledge-racing':'Ice sledge racing','ice-sledge-speed-racing':'Ice sledge racing','cross-country':'Cross-country skiing','para-triathlon':'Triathlon','triathlon':'Triathlon','para-canoe':'Canoe','canoe':'Canoe','football-5-side':'Blind football','football-7-side':'Football 7-a-side','volleyball':'Sitting volleyball'}
HISTORICAL = {
 'RUE': ('Russian Empire', 'Europe & Asia', 'Eastern Europe & Northern Asia', '1900–1912 Olympics', ['Imperial Russia', 'RU1', 'Tsarist Russia'], 'The pre-revolutionary Russian Empire is kept separate from the Soviet Union and the modern Russian delegation.', 'This imperial team competed before the Russian Revolution of 1917.'),
 'URS': ('Soviet Union', 'Europe & Asia', 'Eastern Europe & Central Asia', '1952–1988', ['USSR', 'Union of Soviet Socialist Republics'], 'A former union of 15 republics, including Russia and Ukraine. Its medals remain separate from its successor teams.', 'This former union included Russia, Ukraine and 13 other republics.'),
 'EUN': ('Unified Team', 'Europe & Asia', 'Former Soviet republics', '1992', ['CIS', 'Commonwealth of Independent States'], 'A combined delegation of former Soviet republics at the 1992 Games, following the dissolution of the USSR.', 'Former Soviet republics competed together under this name in 1992.'),
 'EUA': ('United Team of Germany', 'Europe', 'Central Europe', '1956–1964', ['Unified Team of Germany', 'East and West Germany'], 'East and West Germany competed together at the Summer and Winter Olympics in 1956, 1960 and 1964.', 'East and West Germany came together under one sporting banner.'),
 'GDR': ('East Germany', 'Europe', 'Central Europe', '1968–1988 Olympics · 1984 Paralympics', ['DDR', 'German Democratic Republic'], 'The German Democratic Republic competed separately from West Germany before German reunification in 1990.', 'This former German state lay east of the Iron Curtain.'),
 'FRG': ('West Germany', 'Europe', 'Central Europe', '1968–1988 Olympics · 1960–1988 Paralympics', ['Federal Republic of Germany', 'BRD'], 'The West German delegation is kept separate from East Germany and reunified Germany. Olympic 1952 results retain Olympedia’s Germany identity.', 'Bonn was the capital of this former western German state.'),
 'TCH': ('Czechoslovakia', 'Europe', 'Central Europe', '1920–1992', ['Czechoslovak Republic'], 'This former country split into the Czech Republic and Slovakia in 1993. Its medals are not reassigned to either successor.', 'Its two successor countries are Czechia and Slovakia.'),
 'YUG': ('Yugoslavia', 'Europe', 'Southern Europe', '1920–1992', ['Socialist Federal Republic of Yugoslavia'], 'The historical Yugoslav delegation is preserved separately from the later Serbia and Montenegro delegation and today’s successor countries.', 'A former Balkan federation whose republics included Serbia, Croatia and Slovenia.'),
 'SCG': ('Serbia and Montenegro', 'Europe', 'Southern Europe', '1996–2006', ['Federal Republic of Yugoslavia'], 'Olympedia groups the later Federal Republic of Yugoslavia with Serbia and Montenegro. This identity is separate from the earlier Yugoslav federation.', 'These two Balkan neighbours became separate countries in 2006.'),
 'ANZ': ('Australasia', 'Oceania', 'Australia and New Zealand', '1908–1912', [], 'Australia and New Zealand competed as a combined Olympic delegation in 1908 and 1912.', 'Australia and New Zealand shared this Olympic team.'),
 'BOH': ('Bohemia', 'Europe', 'Central Europe', '1900–1912', [], 'Bohemia competed separately while part of Austria-Hungary. The region is now part of Czechia.', 'Prague was the centre of this historical region, now part of Czechia.'),
 'UAR': ('United Arab Republic', 'Africa', 'Northern Africa', '1960–1968', [], 'Egypt competed under the United Arab Republic name, including after its political union with Syria ended. These results remain separate from Egypt’s other editions.', 'Egypt competed under this name after forming a union with Syria.'),
 'AHO': ('Netherlands Antilles', 'Americas', 'Caribbean', '1952–2008', ['Dutch Antilles'], 'A former Caribbean territory within the Kingdom of the Netherlands. Its delegation remains separate from its successor territories.', 'A former Dutch Caribbean territory that included Curaçao.'),
 'WIF': ('West Indies Federation', 'Americas', 'Caribbean', '1960', ['British West Indies', 'Antilles'], 'This Olympic delegation represented the short-lived West Indies Federation, with athletes from Jamaica, Trinidad and Tobago, and Barbados.', 'Jamaica, Trinidad and Tobago, and Barbados supplied this combined Caribbean team.'),
 'RHO': ('Rhodesia', 'Africa', 'Southern Africa', '1960–1972 Paralympics', ['Southern Rhodesia'], 'The historical Rhodesian Paralympic delegation is retained separately from Zimbabwe.', 'This historical delegation came from the territory now known as Zimbabwe.'),
}
NAME_OVERRIDES = {'GBR':'Great Britain','USA':'United States','CHN':'China','KOR':'South Korea','PRK':'North Korea','TPE':'Chinese Taipei','HKG':'Hong Kong','IRI':'Iran','RUS':'Russia','SYR':'Syria','TUR':'Türkiye','CIV':"Côte d’Ivoire",'CZE':'Czechia'}
ALIASES = {'GBR':['UK','United Kingdom','Britain','Team GB'],'USA':['US','America','United States of America'],'KOR':['Republic of Korea'],'PRK':["Democratic People’s Republic of Korea"],'TPE':['Taiwan','Republic of China'],'TUR':['Turkey'],'CIV':['Ivory Coast'],'MYA':['Burma','BIR'],'CZE':['Czech Republic'],'SWZ':['Swaziland'],'MKD':['Macedonia'],'TLS':['East Timor'],'COD':['DR Congo','Zaire','Democratic Republic of the Congo'],'CGO':['Congo Republic','Republic of the Congo']}

def load(path):
    return json.loads(path.read_text())

def plus(a, b):
    return [x+y for x,y in zip(a,b)]

def minus(a,b):
    value = [x-y for x,y in zip(a,b)]
    assert min(value) >= 0, (a,b)
    return value

def rows_map(rows):
    assert len({r['code'] for r in rows}) == len(rows), 'Duplicate delegation row'
    return {r['code']:r['medals'] for r in rows}

def blank():
    return {'total':[0,0,0], 'summer':[0,0,0], 'winter':[0,0,0], 'sports':[], 'categories':dict.fromkeys('mwxo',0), 'editions':[]}

def mapped(code, movement, year):
    if movement == 'olympic' and code == 'RUS' and year < 1917:
        return 'RUE'
    if movement == 'olympic' and code == 'GER' and year in [1956,1960,1964]:
        return 'EUA'
    if movement == 'paralympic' and code == 'GER' and year in [1960,1964]:
        return 'FRG'
    if movement == 'paralympic' and code == 'YUG' and year >= 1996:
        return 'SCG'
    if code == 'BIR':
        return 'MYA'  # Renaming, not a successor delegation.
    return code

def add_edition(records, code, movement, edition, medals):
    if not sum(medals):
        return
    rec = records[code][movement]
    rec['total'] = plus(rec['total'],medals)
    rec[edition['season']] = plus(rec[edition['season']],medals)
    rec['editions'].append({**{k:edition[k] for k in ['id','year','season','city']}, 'medals':medals})

def compile_catalog():
    config = load(ROOT/'data/build-config.json')
    oly = load(SOURCES / 'olympics.json')
    ipcs = sorted((load(p) for p in SOURCES.glob('ipc-*.json')), key=lambda d:(d['year'],d['season']))
    tables = {t['key']:rows_map(t['rows']) for t in oly['tables']}
    records = defaultdict(lambda:{'olympic':blank(),'paralympic':blank()})
    names = {r['code']:r['name'] for t in oly['tables'] for r in t['rows']}
    issues = []
    # Merge Melbourne and the separately hosted Stockholm equestrian events.
    editions = {}
    for e in oly['editions']:
        key = e.get('subeditionOf',e['id'])
        if key not in editions:
            editions[key] = {**e,'rows':{}}
        for code, medals in tables['edition:'+e['id']].items():
            corrected = minus(medals,tables.get('excluded:edition:'+e['id'],{}).get(code,[0,0,0]))
            editions[key]['rows'][code] = plus(editions[key]['rows'].get(code,[0,0,0]),corrected)
        if e.get('subeditionOf'):
            editions[key]['city'] = 'Melbourne / Stockholm'
    for e in editions.values():
        for code, medals in e['rows'].items():
            add_edition(records,mapped(code,'olympic',e['year']),'olympic',e,medals)
    # Independently reconcile the complete source by edition, sport and category.
    for code, raw in tables['total'].items():
        expected = minus(raw,tables['excluded:total'].get(code,[0,0,0]))
        by_edition = [0,0,0]
        for e in editions.values():
            by_edition = plus(by_edition,e['rows'].get(code,[0,0,0]))
        assert expected == by_edition, ('Olympic edition reconciliation',code,expected,by_edition)
        sports = [{'name':oly['disciplines'][key[6:]],'medals':m[code]} for key,m in tables.items() if key.startswith('sport:') and key[6:] not in ARTS and code in m]
        sport_sum = [sum(s['medals'][i] for s in sports) for i in range(3)]
        assert expected == sport_sum, ('Olympic sport reconciliation',code)
        cats = {g:sum(minus(tables['gender:'+g].get(code,[0,0,0]),tables['excluded:gender:'+g].get(code,[0,0,0]))) for g in 'mwxo'}
        assert sum(cats.values()) == sum(expected), ('Olympic category reconciliation',code)
        rec = records[code]['olympic']
        if code in ['GER','RUS']:
            # All-time source sport/gender tables combine GER and EUA. We can
            # split editions exactly, but cannot pretend to split these fields.
            rec['sports'] = rec['categories'] = None
            split = 'EUA' if code == 'GER' else 'RUE'
            records[split]['olympic']['sports'] = records[split]['olympic']['categories'] = None
        else:
            rec['sports'],rec['categories'] = sports,cats
    para_sports = defaultdict(lambda:defaultdict(lambda:[0,0,0]))
    para_categories = defaultdict(lambda:dict.fromkeys('mwxo',0))
    bad_sports,bad_categories = set(),set()
    for e in ipcs:
        official = rows_map(e['rows'])
        for r in e['rows']:
            if len(r['name']) > 3: names.setdefault(r['code'],r['name'])
            add_edition(records,mapped(r['code'],'paralympic',e['year']),'paralympic',e,r['medals'])
        sporting = defaultdict(lambda:[0,0,0])
        events_total = defaultdict(lambda:[0,0,0])
        seen_events = set()
        for sport in e['sports']:
            event_rows = defaultdict(lambda:[0,0,0])
            for event in sport['events']:
                event_key = (sport['id'],event['id'],event['name'])
                assert event_key not in seen_events, ('Duplicate event',e['id'],event_key)
                seen_events.add(event_key)
                for award in event['awards']:
                    raw,medal = award['code'],award['medal']
                    code = mapped(raw,'paralympic',e['year'])
                    event_rows[raw][medal] += 1
                    events_total[raw][medal] += 1
                    para_categories[code][event['category']] += 1
            sport_rows = rows_map(sport.get('rows',[])) or event_rows
            name = SPORT_NAMES.get(sport['id'],sport.get('name') or sport['id'].replace('-',' ').title())
            for raw,medals in sport_rows.items():
                code = mapped(raw,'paralympic',e['year'])
                para_sports[code][name] = plus(para_sports[code][name],medals)
                sporting[raw] = plus(sporting[raw],medals)
        for raw in sorted(set(official)|set(sporting)|set(events_total)):
            code = mapped(raw,'paralympic',e['year'])
            expected = official.get(raw,[0,0,0])
            for family,actual,bad in [('sports',sporting[raw],bad_sports),('categories',events_total[raw],bad_categories)]:
                if expected != actual:
                    bad.add(code)
                    issues.append({'edition':e['id'],'sourceCode':raw,'team':code,'family':family,'official':expected,'breakdown':actual})
    for code,record in records.items():
        rec = record['paralympic']
        rec['sports'] = None if code in bad_sports else [{'name':s,'medals':m} for s,m in para_sports[code].items()]
        rec['categories'] = None if code in bad_categories else para_categories[code]
    metadata = load(SOURCES/'countries.json')
    by_code = {c['cioc']:c for c in metadata if c['cioc']}
    by_code['FRO'] = next(c for c in metadata if c['cca3']=='FRO')
    shapes = {str(g['id']).zfill(3) for g in load(ROOT/'node_modules/world-atlas/countries-110m.json')['objects']['countries']['geometries'] if 'id' in g}
    teams = []
    for code in sorted(set(by_code)|set(records)|set(HISTORICAL)):
        if code == 'BIR': continue
        meta = by_code.get(code)
        historical = HISTORICAL.get(code)
        if not meta and not historical and code not in EXCLUDED:
            raise ValueError('Unmapped delegation: '+code)
        name = NAME_OVERRIDES.get(code,meta['name']['common'] if meta else names.get(code,code))
        aliases = ALIASES.get(code,[]) + ([meta['name']['official'],meta['cca3'],*meta['altSpellings']] if meta else [])
        description, hint,period = '', '',None
        region,subregion = (meta['region'],meta['subregion']) if meta else ('International','International')
        if historical:
            name,region,subregion,period,extra,description,hint = historical
            aliases = aliases + extra
        elif meta:
            capitals = meta.get('capital',[])
            hint = f"Its capital is {capitals[0]}." if capitals else f"Its international country code is {meta['cca2']}."
        if code == 'GER': description = 'Germany’s medals here exclude the combined East–West team of 1956–1964, East Germany and West Germany. The 1952 Olympic delegation retains Olympedia’s Germany attribution.'
        numeric = meta['ccn3'] if meta and meta['ccn3'] in shapes else None
        team = {'id':code,'name':name,'aliases':sorted(set(aliases+[names.get(code,name)])), 'iso2':meta['cca2'] if meta else None,'numeric':numeric,'region':region,'subregion':subregion,'historical':bool(historical),'eligible':code not in EXCLUDED,'description':description,'identityHint':hint,'records':records[code]}
        if period: team['period']=period
        if (ROOT/f'public/flags/{code}.svg').exists(): team['flag']=f'flags/{code}.svg'
        for rec in team['records'].values():
            rec['editions'].sort(key=lambda e:(e['year'],e['season']))
            if rec['sports'] is not None: rec['sports'].sort(key=lambda s:(-sum(s['medals']),s['name']))
        teams.append(team)
    coverage = []
    for movement,all_editions in [('olympic',list(editions.values())),('paralympic',ipcs)]:
        for season in ['summer','winter']:
            es = [e for e in all_editions if e['season']==season]
            coverage.append({'movement':movement,'season':season,'start':min(e['year'] for e in es),'end':max(e['year'] for e in es),'editions':len(es)})
    catalog = {'version':config['version'],'effectiveFrom':config['effectiveFrom'],'retrievedAt':max([oly['retrievedAt']]+[e['retrievedAt'] for e in ipcs]),'coverage':coverage,'sources':[{'name':'Olympedia · historical medal statistics','url':'https://www.olympedia.org/statistics/medal/country'},{'name':'IPC · Paralympic results archive','url':'https://www.paralympic.org/results/historical'},{'name':'Milano Cortina 2026 · official results books','url':'https://www.paralympic.org/milano-cortina-2026/results'}],'teams':teams}
    report = {'catalog':catalog['version'],'coverage':coverage,'olympicReconciliation':'All source delegations reconcile across editions, disciplines and event categories before identity splitting.','suppressedParalympicBreakdowns':{'sports':sorted(bad_sports),'categories':sorted(bad_categories)},'discrepancies':issues,'snapshotSha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(SOURCES.glob('*.json'))}}
    return catalog,report

if __name__ == '__main__':
    catalog,report = compile_catalog()
    config = load(ROOT/'data/build-config.json')
    content = json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+'\n'
    lock = ROOT/'data/catalog-lock.json'
    if lock.exists():
        existing = next((c for c in load(lock) if c['version']==catalog['version']),None)
        if existing and existing['sha256'] != hashlib.sha256(content.encode()).hexdigest():
            raise SystemExit('This version is frozen. Set a new version, future effectiveFrom and new output file in data/build-config.json. Keep every published catalog unchanged.')
    (ROOT/config['file']).write_text(content)
    (ROOT/config['report']).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(f"Built {len(catalog['teams'])} team profiles; {len(report['discrepancies'])} source discrepancies explicitly suppressed.")
