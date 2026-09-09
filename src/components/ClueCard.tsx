import { CLUE_LABELS, CLUE_TITLES, firstEdition, movementLabel, recordTotal, sum, topEdition } from '../game/engine';
import type { Catalog, Clue, SportingRecord, Team } from '../game/types';
import { Icon, SportIcon } from './Icon';

const number = (n: number) => n.toLocaleString('en-GB');

export function MedalDisplay({ medals, small = false }: { medals: readonly number[]; small?: boolean }) {
  return <div className={`medal-display ${small ? 'small' : ''}`}>
    {['Gold', 'Silver', 'Bronze'].map((name, i) => <div className={`medal-column ${name.toLowerCase()}`} key={name}>
      <div className="medal-illustration" aria-hidden="true"><span className="ribbon left"/><span className="ribbon right"/><span className="medal-disc"><span>{i + 1}</span></span></div>
      <strong>{number(medals[i])}</strong><span className="medal-label">{name}</span>
    </div>)}
  </div>;
}

function SportBars({ record }: { record: SportingRecord }) {
  const sports = record.sports!.slice(0, 3);
  const top = sum(sports[0].medals);
  return <div className="sport-bars" role="img" aria-label={sports.map(s => `${s.name}: ${sum(s.medals)} medals`).join('; ')}>
    {sports.map((sport, index) => <div className="sport-row" key={sport.name}>
      <span className={`sport-icon sport-icon-${index}`}><SportIcon sport={sport.name}/></span>
      <div className="sport-data"><div className="sport-name"><span>{sport.name}</span><strong>{number(sum(sport.medals))}</strong></div><div className="bar-track"><span style={{ width: `${sum(sport.medals) / top * 100}%` }} className={`sport-bar-${index}`}/></div></div>
    </div>)}
    <p className="chart-caption">Most decorated sports · all medal colours</p>
  </div>;
}

function SeasonDisplay({ record }: { record: SportingRecord }) {
  const summer = sum(record.summer), winter = sum(record.winter), total = summer + winter;
  return <div className="season-display"><div className="season-figures">
    <div className="summer-stat"><Icon name="sun" size={48}/><strong>{number(summer)}</strong><span>Summer medals</span></div>
    <span className="season-divider">/</span>
    <div className="winter-stat"><Icon name="snow" size={48}/><strong>{number(winter)}</strong><span>Winter medals</span></div>
  </div><div className="season-meter" role="img" aria-label={`${Math.round(summer / total * 100)} percent Summer, ${Math.round(winter / total * 100)} percent Winter medals`}><span style={{ width: `${summer / total * 100}%` }}/><span style={{ width: `${winter / total * 100}%` }}/></div><p className="chart-caption">Two seasons. One sporting story.</p></div>;
}

function Timeline({ record, catalog, movement }: { record: SportingRecord; catalog: Catalog; movement: Clue['movement'] }) {
  const medalYears = [...new Set(record.editions.map(e => e.year))].sort((a, b) => a - b);
  const first = medalYears[0];
  const end = Math.max(...catalog.coverage.filter(c => c.movement === movement).map(c => c.end));
  const start = Math.min(first, end - 16);
  const years = Array.from({ length: Math.floor((end - start) / 2) + 1 }, (_, i) => start + i * 2);
  const totals = years.map(year => sum(record.editions.filter(e => e.year === year).map(e => sum(e.medals))));
  const max = Math.max(...totals, 1);
  const peak = topEdition(record);
  return <div className="timeline-display"><div className="timeline-head"><span><strong>{record.editions.length}</strong><small>medal-winning editions</small></span><span className="timeline-peak">BEST EDITION<br/><b>{peak.city} {peak.year}</b><br/><b>{number(sum(peak.medals))} medals</b></span></div>
    <div className="timeline-bars" role="img" aria-label={record.editions.map(e => `${e.city} ${e.year} ${e.season}: ${sum(e.medals)} medals`).join('; ')}>{years.map((year, i) => <span key={year} className={totals[i] === max ? 'peak-bar' : ''} style={{ height: `${Math.max(2, totals[i] / max * 100)}%`, opacity: totals[i] ? 1 : .15 }} title={`${year}: ${totals[i]} medals`}/>)}</div><div className="timeline-axis"><span>{start}</span><span>{end}</span></div><p className="chart-caption">Medals by year · Summer + Winter</p></div>;
}

function EventMix({ record }: { record: SportingRecord }) {
  const cats = record.categories!;
  const total = recordTotal(record);
  const items = [{ key: 'w', label: 'Women’s', value: cats.w }, { key: 'm', label: 'Men’s', value: cats.m }, { key: 'x', label: 'Mixed', value: cats.x }, { key: 'o', label: 'Open', value: cats.o }];
  return <div className="mix-display"><div className="mix-lead"><strong>{Math.round(cats.w / total * 100)}<em>%</em></strong><p>of their medals came<br/>in women’s events.</p></div><div className="mix-meter" aria-hidden="true">{items.map(item => <span className={`mix-${item.key}`} key={item.key} style={{ flex: item.value }}/>)}</div><div className="mix-legend">{items.map(item => <div key={item.key}><span className={`legend-dot mix-${item.key}`}/><span>{item.label}</span><b>{number(item.value)}</b></div>)}</div><p className="chart-caption">Event categories · team medals counted once</p></div>;
}

function Breakthrough({ record, variant }: { record: SportingRecord; variant: number }) {
  const edition = variant ? topEdition(record) : firstEdition(record);
  return <div className="breakthrough-display"><span className="little-caps">{variant ? 'Their most decorated edition' : 'Their first trip to the podium'}</span><strong className="edition-year">{edition.year}</strong><div className="edition-location"><Icon name={edition.season === 'summer' ? 'sun' : 'snow'}/>{edition.city}<span>·</span>{edition.season === 'summer' ? 'Summer' : 'Winter'} Games</div><p><b>{number(sum(edition.medals))} medals</b> at these Games.</p></div>;
}

function Region({ team, variant }: { team: Team; variant: number }) {
  return <div className="region-display"><div className="globe-orbit" aria-hidden="true"><Icon name="globe" size={128}/><span className="orbit-marker"/></div><span className="little-caps">{variant && team.subregion ? 'Narrow your search to' : 'Find this team in'}</span><strong>{variant && team.subregion ? team.subregion : team.region}</strong>{team.historical && <p>A historical delegation{team.period ? ` · ${team.period}` : ''}</p>}</div>;
}

function Identity({ team, variant }: { team: Team; variant: number }) {
  const outline = team.numeric ? `${import.meta.env.BASE_URL}shapes/${team.numeric}.svg` : null;
  // Historical teams use a sourced identity clue, never present-day borders.
  if (outline && !team.historical && !variant) return <div className="identity-display"><img className="silhouette" src={outline} alt="Outline of the mystery country"/><p className="chart-caption">Does this shape ring a bell?</p></div>;
  return <div className="identity-display"><div className="identity-stamp"><Icon name="flag" size={44}/></div><span className="little-caps">One last nudge</span><p className="identity-hint">{team.identityHint}</p>{team.historical && <span className="period-label">{team.period}</span>}</div>;
}

export function ClueCard({ clue, index, team, catalog }: { clue: Clue; index: number; team: Team; catalog: Catalog }) {
  const record = team.records[clue.movement];
  const geographic = index >= 4;
  const coverage = catalog.coverage.filter(c => c.movement === clue.movement);
  const scope = `${Math.min(...coverage.map(c => c.start))}–${Math.max(...coverage.map(c => c.end))}`;
  let chart;
  switch (clue.kind) {
    case 'cabinet': chart = <><MedalDisplay medals={record.total}/><div className="total-rule"><span>ALL-TIME MEDALS</span><strong>{number(recordTotal(record))}</strong></div></>; break;
    case 'sports': chart = <SportBars record={record}/>; break;
    case 'seasons': chart = <SeasonDisplay record={record}/>; break;
    case 'timeline': chart = <Timeline record={record} catalog={catalog} movement={clue.movement}/>; break;
    case 'mix': chart = <EventMix record={record}/>; break;
    case 'breakthrough': chart = <Breakthrough record={record} variant={clue.variant}/>; break;
    case 'region': chart = <Region team={team} variant={clue.variant}/>; break;
    case 'identity': chart = <Identity team={team} variant={clue.variant}/>; break;
  }
  return <article className={`clue-card clue-${clue.kind}`} aria-labelledby="clue-heading" key={`${team.id}-${index}`}>
    <div className="clue-topline"><span className="clue-kicker"><span className="clue-number">0{index + 1}</span>{CLUE_LABELS[clue.kind]}</span><span className={`competition-label ${clue.movement}`}>{geographic ? 'A LITTLE HELP' : clue.movement === 'olympic' ? 'OLYMPICS' : 'PARALYMPICS'}</span></div>
    <h2 id="clue-heading">{CLUE_TITLES[clue.kind]}</h2>
    <p className="clue-description">{geographic ? 'The finish line is getting closer.' : clue.kind === 'cabinet' ? 'Every podium tells part of the story.' : clue.kind === 'sports' ? 'Some countries have a particular set of skills.' : clue.kind === 'mix' ? 'A different way to look at their sporting history.' : clue.kind === 'seasons' ? 'Do they shine in the sun, or thrive on the snow?' : clue.kind === 'timeline' ? 'Follow the shape of their sporting history.' : 'Every sporting nation starts somewhere.'}</p>
    <div className="clue-visual">{chart}</div>
    <div className="clue-footnote"><Icon name={geographic ? 'globe' : 'info'} size={14}/><span>{geographic ? team.historical ? 'Historical geography · original team identity' : 'Geography clue · a helping hand' : `${movementLabel(clue.movement)} · ${scope} · all editions`}</span><span className="clue-page">{index + 1} / 6</span></div>
  </article>;
}
