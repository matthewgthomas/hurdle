"""Fetch public source tables into auditable, compact snapshots.

Cached HTML stays in .cache; only extracted facts, query scopes and provenance are
committed. A normal site build is entirely offline. Run with --olympics or --ipc
to refresh one provider. Olympic POSTs submit read-only statistics filters.
"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import gzip
import hashlib
import json
from pathlib import Path
import re
import time
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache' / 'sources'
OUT = ROOT / 'data' / 'sources'
CACHE.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
STAMP = datetime.now(timezone.utc).isoformat()
HEADERS = {'User-Agent': 'Hurdle historical medal research; github.com/matthewgthomas/hurdle'}


def fetch(url, *, session=None, params=None, token=None, allow_missing=False):
    key = hashlib.sha256((url + json.dumps(params, sort_keys=True)).encode()).hexdigest()
    path = CACHE / (key + '.html.gz')
    if path.exists():
        return gzip.decompress(path.read_bytes()).decode()
    client = session or requests.Session()
    for attempt in range(6):
        try:
            if params is not None:
                response = client.post(url, data=params, headers={**HEADERS, 'X-CSRF-Token': token, 'X-Requested-With': 'XMLHttpRequest'}, timeout=50)
            else:
                response = client.get(url, headers=HEADERS, timeout=50)
            if response.status_code == 429:
                print('Source rate limit; waiting before retrying.', flush=True)
                time.sleep(min(60, max(30, int(response.headers.get('Retry-After', '60')))))
                continue
            if allow_missing and response.status_code == 404:
                text = ''
            else:
                response.raise_for_status()
                text = response.text
            path.write_bytes(gzip.compress(text.encode()))
            time.sleep(2.5 if 'olympedia.org' in url else .12)
            return text
        except requests.RequestException:
            if attempt == 5:
                raise
            time.sleep(1 + attempt * 2)
    raise RuntimeError('Source remained rate limited: ' + url)


def write(name, obj):
    path = OUT / name
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'Saved {path.relative_to(ROOT)} ({path.stat().st_size:,} bytes)', flush=True)


def olympic_rows(html):
    rows = []
    for row in BeautifulSoup(html, 'html.parser').select('table tr'):
        cells = row.select('td')
        if len(cells) == 6:
            values = [c.get_text(' ', strip=True) for c in cells]
            if re.fullmatch('[A-Z]{3}', values[1]) and all(v.isdigit() for v in values[2:]):
                medals = list(map(int, values[2:5]))
                assert sum(medals) == int(values[5]), values
                rows.append({'code': values[1], 'name': values[0], 'medals': medals})
    return rows


def fetch_olympics():
    url = 'https://www.olympedia.org/statistics/medal/country'
    session = requests.Session()
    session.headers.update(HEADERS)
    initial = session.get(url, timeout=60)
    initial.raise_for_status()
    soup = BeautifulSoup(initial.text, 'html.parser')
    token = soup.select_one('meta[name="csrf-token"]')['content']
    edition_soup = BeautifulSoup(fetch('https://www.olympedia.org/editions'), 'html.parser')
    editions = []
    for season, table in zip(['summer', 'winter'], edition_soup.select('table')[:2]):
        for row in table.select('tr'):
            cells = row.select('td')
            if len(cells) < 3 or not cells[1].get_text(strip=True).isdigit():
                continue
            year = int(cells[1].get_text(strip=True))
            link = cells[1].select_one('a[href^="/editions/"]')
            if not link or 'Not held' in row.get_text() or year > (2024 if season == 'summer' else 2026):
                continue
            editions.append({'id': link['href'].split('/')[-1], 'year': year, 'season': season, 'city': cells[2].get_text(strip=True)})
    jobs = [('total', {}), ('summer', {'season_id': '1'}), ('winter', {'season_id': '2'})]
    editions.append({'id': '48', 'year': 1956, 'season': 'summer', 'city': 'Stockholm', 'subeditionOf': '14'})
    for gender in ['m', 'w', 'o', 'x']:
        jobs.append(('gender:' + gender, {'gender': gender}))
    for edition in editions:
        jobs.append(('edition:' + edition['id'], {'edition_id': edition['id']}))
    disciplines = {}
    for option in soup.select('select[name="sport_id"] option[value]'):
        code = option['value']
        if code and code not in ['AC', 'ART', 'AER', 'ALP'] and not code.startswith('AA'):
            # ALP is Alpine Skiing and must be included; added below.
            disciplines[code] = option.get_text(strip=True).split(' - ', 1)[-1]
    disciplines['ALP'] = 'Alpine Skiing'
    for code in disciplines:
        jobs.append(('sport:' + code, {'sport_id': code}))
    # The source's art checkbox does not consistently exclude art in aggregates.
    # Fetch the explicit art sport group for deterministic subtraction instead.
    jobs.append(('excluded:total', {'sport_group_id': 'AC'}))
    for year in [1912, 1920, 1924, 1928, 1932, 1936, 1948]:
        edition = next(e for e in editions if e['year'] == year and e['season'] == 'summer')
        jobs.append(('excluded:edition:' + edition['id'], {'sport_group_id': 'AC', 'edition_id': edition['id']}))
    for gender in ['m','w','o','x']:
        jobs.append(('excluded:gender:' + gender, {'sport_group_id': 'AC', 'gender': gender}))
    tables = []
    for i, (key, extra) in enumerate(jobs):
        query = {'competition_type_id': '1', **extra}
        # Omit include_art: the source then excludes art/aeronautics/alpinism.
        html = fetch(url, session=session, params=query, token=token)
        rows = olympic_rows(html)
        if key.startswith('sport:') and not rows:
            continue
        assert rows or key.startswith('excluded:'), f'Unexpected empty Olympic table {key}'
        tables.append({'key': key, 'url': url, 'query': query, 'rows': rows})
        if i % 10 == 0:
            print(f'Olympedia {i + 1}/{len(jobs)}: {key} ({len(rows)} teams)', flush=True)
    write('olympics.json', {'provider': 'Olympedia / OlyMADMen', 'retrievedAt': STAMP, 'editions': editions, 'disciplines': disciplines, 'tables': tables})


IPC_SUMMER = [(1960,'rome'),(1964,'tokyo'),(1968,'tel-aviv'),(1972,'heidelberg'),(1976,'toronto'),(1980,'arnhem'),(1984,'stoke-mandeville-new-york'),(1988,'seoul'),(1992,'barcelona'),(1996,'atlanta'),(2000,'sydney'),(2004,'athens'),(2008,'beijing'),(2012,'london'),(2016,'rio'),(2020,'tokyo'),(2024,'paris')]
IPC_WINTER = [(1976,'ornskoldsvik'),(1980,'geilo'),(1984,'innsbruck'),(1988,'innsbruck'),(1992,'tignes-albertville'),(1994,'lillehammer'),(1998,'nagano'),(2002,'salt-lake-city'),(2006,'torino'),(2010,'vancouver'),(2014,'sochi'),(2018,'pyeongchang'),(2022,'beijing')]
SUMMER_SPORTS = ['archery','athletics','boccia','cycling','dartchery','equestrian','football-5-side','football-7-side','goalball','judo','lawn-bowls','powerlifting','sailing','shooting','snooker','swimming','table-tennis','volleyball','wheelchair-basketball','wheelchair-fencing','wheelchair-rugby','wheelchair-tennis','weightlifting','badminton','taekwondo','canoe','triathlon']
WINTER_SPORTS = ['alpine-skiing','biathlon','cross-country','ice-hockey','ice-sledge-hockey','ice-sledge-racing','wheelchair-curling','snowboard']


def ipc_rows(html):
    result = []
    for row in BeautifulSoup(html, 'html.parser').select('table tr'):
        cells = row.select('td')
        if len(cells) != 7:
            continue
        values = [c.get_text(' ', strip=True) for c in cells]
        code = values[2].strip()
        if not code and all(v.isdigit() for v in values[3:]):
            # Preserve archive rows whose country label/flag has been removed.
            # These remain excluded, unattributed delegations, never successors.
            code = 'XN' + chr(65 + sum(r['code'].startswith('XN') for r in result))
            values[1] = 'Unattributed archive delegation ' + code[-1]
        if re.fullmatch('[A-Z]{3}', code) and all(v.isdigit() for v in values[3:]):
            medals = list(map(int, values[3:6]))
            assert sum(medals) == int(values[6]), values
            result.append({'code': code, 'name': values[1], 'medals': medals})
    return result


def ipc_events(html):
    events = []
    soup = BeautifulSoup(html, 'html.parser')
    for row in soup.select('table tr'):
        event_link = row.select_one('a.event-link')
        if event_link is None:
            continue
        name = event_link.get_text(' ', strip=True)
        category = 'w' if re.match(r"Women|Female", name) else 'm' if re.match(r"Men|Male", name) else 'x' if re.match(r'Mixed', name) else 'o'
        awards = []
        for medal, column in enumerate(['Gold','Silver','Bronze']):
            cell = row.select_one('td.' + column)
            if cell:
                for medallist in cell.select(':scope > div.medallist'):
                    flag = medallist.select_one('.flag img')
                    if flag is None:
                        raise ValueError('Unidentified medal award: ' + event_link['href'])
                    match = re.search(r'/Flags/([a-zA-Z]{3})(?:\.|/)', flag['src'])
                    # Some withdrawn/neutral awards have a blank flag in the IPC
                    # archive. Preserve them as unattributed; never assign a nation.
                    if not match and flag['src']:
                        raise ValueError('Unrecognised flag: ' + str(flag))
                    code = match.group(1).upper() if match else 'UNK'
                    awards.append({'code': code, 'medal': medal})
        events.append({'id': event_link['href'], 'name': name, 'category': category, 'awards': awards})
    return events


def fetch_ipc_edition(year, city, season):
    base = f'https://www.paralympic.org/{city}-{year}/results'
    html = fetch(base, allow_missing=True)
    soup = BeautifulSoup(html, 'html.parser')
    full_link = soup.select_one('a.medalstandings-link')
    if full_link:
        medal_url = 'https://www.paralympic.org' + full_link['href']
        base = medal_url.rsplit('/', 1)[0]
    else:
        medal_url = base + '/medalstandings'
    rows = ipc_rows(fetch(medal_url, allow_missing=True))
    if not rows:
        raise ValueError(f'Missing IPC edition table: {medal_url}')
    sports = []
    candidates = (SUMMER_SPORTS + ['para-triathlon','para-canoe']) if season == 'summer' else (WINTER_SPORTS + ['para-ice-hockey','ice-sledge-speed-racing'])
    if year < 1972:
        candidates = ['archery','athletics','dartchery','lawn-bowls','snooker','swimming','table-tennis','wheelchair-basketball','wheelchair-fencing','weightlifting']
    for sport in candidates:
        sport_url = base + '/' + sport
        html = fetch(sport_url, allow_missing=True)
        if not html:
            continue
        events = ipc_events(html)
        if events:
            sport_rows = ipc_rows(fetch(sport_url + '/medalstandings', allow_missing=True))
            sports.append({'id': sport, 'url': sport_url, 'events': events, 'rows': sport_rows})
    edition = {'id': f'p-{year}-{season}', 'year': year, 'season': season, 'city': city.replace('-', ' ').title(), 'url': medal_url, 'rows': rows, 'sports': sports}
    write(f'ipc-{year}-{season}.json', {'provider': 'International Paralympic Committee', 'retrievedAt': STAMP, **edition})
    return edition


def fetch_ipc():
    jobs = [(y,c,'summer') for y,c in IPC_SUMMER] + [(y,c,'winter') for y,c in IPC_WINTER]
    errors = []
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {pool.submit(fetch_ipc_edition,*args): args for args in jobs}
        for future in as_completed(futures):
            args = futures[future]
            try:
                edition = future.result()
                print(f'IPC {args}: {len(edition["rows"])} teams, {len(edition["sports"])} sports', flush=True)
            except Exception as exc:
                errors.append((args,str(exc)))
                print('IPC ERROR',args,str(exc),flush=True)
    if errors:
        raise RuntimeError(errors)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--olympics', action='store_true')
    parser.add_argument('--ipc', action='store_true')
    args = parser.parse_args()
    if args.olympics or not args.ipc:
        fetch_olympics()
    if args.ipc or not args.olympics:
        fetch_ipc()
