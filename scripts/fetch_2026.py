"""Import the official Milano Cortina 2026 Paralympic results books.

Only event awards are counted: guides and team roster members do not add medals.
The published C93 medallists pages are retained as text for an extraction audit.
"""
from pathlib import Path
from datetime import datetime, timezone
from collections import defaultdict
import json
import re
import sys
from urllib.request import urlopen
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache' / 'results-books'
CACHE.mkdir(parents=True, exist_ok=True)
BOOKS = {'ALP':'alpine-skiing','BTH':'biathlon','CCS':'cross-country','SBD':'snowboard','IHO':'ice-hockey','CUR':'wheelchair-curling'}

def download():
    for code in BOOKS:
        path = CACHE / (code + '.pdf')
        if path.exists():
            continue
        url = f'https://wmr-static-assets.scd.dgplatform.net/wmr/static/_PDF/PWG2026/{code}/Results_Book_{code}.pdf'
        with urlopen(url, timeout=60) as response:
            content = response.read()
        path.write_bytes(content)
        print(f'Downloaded {code}: {len(content):,} bytes', flush=True)

def inspect_books():
    for code in BOOKS:
        path = CACHE / (code + '.pdf')
        pages = []
        with pdfplumber.open(path) as pdf:
            for index, page in enumerate(pdf.pages):
                # C93 is near the front in individual sports; team medals can
                # appear after their final. Search the full book to find both.
                text = page.extract_text() or ''
                if re.search(r'\bMedallists(?: by Event)?\b', text) and ('GOLD' in text or 'Gold' in text):
                    pages.append({'page':index+1,'text':text})
                    print(code,'medallist page',index+1,text[:700],flush=True)
        (CACHE / (code + '-pages.json')).write_text(json.dumps(pages, ensure_ascii=False, indent=2))

def normalise():
    sports = []
    totals = defaultdict(lambda: [0, 0, 0])
    expected = {'ALP':30,'BTH':18,'CCS':20,'SBD':8,'IHO':1,'CUR':2}
    for code, sport_id in BOOKS.items():
        url = f'https://wmr-static-assets.scd.dgplatform.net/wmr/static/_PDF/PWG2026/{code}/Results_Book_{code}.pdf'
        pages = json.loads((CACHE / (code + '-pages.json')).read_text())
        events = []
        if code == 'IHO':
            # The embedded font on C93 has no usable Unicode mapping. This one
            # podium was transcribed after visual inspection of PDF page 6.
            events = [{'id':'p-2026-IHO-1','name':'Open Team Tournament','category':'o','sourcePage':6,'awards':[{'code':'USA','medal':0},{'code':'CAN','medal':1},{'code':'CHN','medal':2}]}]
        else:
            for page in pages:
                if 'Medallists by Event' not in page['text']:
                    continue  # Do not also count the separate C92 roster pages.
                for line in page['text'].splitlines():
                    match = re.search(r'\b(GOLD|SILVER|BRONZE)\b.*?\b([A-Z]{3})$', line)
                    if not match:
                        continue
                    medal = ['GOLD','SILVER','BRONZE'].index(match.group(1))
                    if medal == 0:
                        name = re.split(r'\s+(?:MON|TUE|WED|THU|FRI|SAT|SUN)\s+\d', line)[0]
                        category = 'w' if name.startswith("Women") else 'm' if name.startswith("Men") else 'x' if name.startswith('Mixed') else 'o'
                        events.append({'id': f'p-2026-{code}-{len(events)+1}', 'name': name, 'category': category, 'sourcePage': page['page'], 'awards': []})
                    assert events, (code,line)
                    events[-1]['awards'].append({'code':match.group(2),'medal':medal})
        assert len(events) == expected[code], (code,len(events))
        sport_totals = defaultdict(lambda:[0,0,0])
        for event in events:
            assert len(event['awards']) in [3,4], event
            for award in event['awards']:
                sport_totals[award['code']][award['medal']] += 1
                totals[award['code']][award['medal']] += 1
        sports.append({'id':sport_id,'url':url,'events':events,'rows':[{'code':c,'name':c,'medals':m} for c,m in sorted(sport_totals.items())]})
    assert totals['CHN'] == [15,13,16] and totals['USA'] == [13,5,6], 'Does not match IPC closing report'
    result = {'provider':'Milano Cortina 2026 Organising Committee / official results books','retrievedAt':datetime.now(timezone.utc).isoformat(),'id':'p-2026-winter','year':2026,'season':'winter','city':'Milano Cortina','url':'https://www.paralympic.org/news/milano-cortina-2026-italy-closing-ceremony','rows':[{'code':c,'name':c,'medals':m} for c,m in sorted(totals.items())], 'sports':sports}
    (ROOT / 'data/sources/ipc-2026-winter.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
    print('2026:',len(events),'last-sport events;',len(totals),'medal-winning teams;',sum(sum(x) for x in totals.values()),'medals',flush=True)

if __name__ == '__main__':
    if '--normalise-only' not in sys.argv:
        download()
        inspect_books()
    normalise()
