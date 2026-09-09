import { useEffect, useRef, useState } from 'react';
import { catalogByVersion, catalogForDate, catalogs } from './game/catalog';
import { CLUE_LABELS, compareClue, dailyPuzzle, dayNumber, movementLabel, outcome, practicePuzzle, recordTotal, revealedCount, shareText, submitAttempt, sum, utcDate } from './game/engine';
import { readSave, saveGame, statistics, STORAGE_KEY, writeSave } from './game/storage';
import type { Catalog, GameState, Movement, Team } from './game/types';
import { ClueCard, MedalDisplay } from './components/ClueCard';
import { GuessForm, TeamFlag } from './components/GuessForm';
import { Icon } from './components/Icon';
import { Dialog } from './components/Dialog';

function HurdleLogo() {
  return <span className="brand"><svg width="36" height="37" viewBox="0 0 36 37" fill="none" aria-hidden="true"><path d="M4 32V5h7v9h15V5h7v27h-7V21H11v11H4Z" fill="currentColor"/><path d="M0 2h36" stroke="currentColor" strokeWidth="3"/></svg><span>HURDLE<span className="brand-dot">.</span></span></span>;
}

function TrackIllustration() {
  return <svg className="track-illustration" width="184" height="112" viewBox="0 0 184 112" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="1.1"><rect x="1" y="1" width="182" height="110" rx="55"/><rect x="10" y="10" width="164" height="92" rx="46"/><rect x="19" y="19" width="146" height="74" rx="37"/><rect x="28" y="28" width="128" height="56" rx="28"/><path d="M59 1v27m9-27v27M116 84v27m9-27v27"/></g><path d="M87 42v28m0-23h23m-1-5v28" stroke="var(--accent)" strokeWidth="4"/><circle cx="146" cy="26" r="4" fill="var(--accent)"/></svg>;
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  return now;
}
function countdown(now: Date) {
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  const seconds = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
}

function History({ game, team, catalog }: { game: GameState; team: Team; catalog: Catalog }) {
  return <section className="guess-history" aria-label="Your guesses"><div className="section-heading"><h2>Your track record</h2><span>{game.attempts.length} / 6</span></div>
    {game.attempts.length === 0 ? <div className="empty-history"><span className="empty-hurdle" aria-hidden="true">⌑</span><p>A fresh start.<br/><span>Your guesses will appear here.</span></p></div> : <ol className="attempt-list">{game.attempts.map((attempt, index) => {
      const guessed = catalog.teams.find(t => t.id === attempt.teamId);
      const won = attempt.teamId === team.id;
      return <li key={index} className={won ? 'attempt-won' : ''}>{guessed ? <details open={!won && index === game.attempts.length - 1}><summary><span className="attempt-number">{String(index + 1).padStart(2, '0')}</span><TeamFlag team={guessed}/><span className="attempt-name">{guessed.name}</span><span className={`attempt-status ${won ? 'correct' : ''}`}><Icon name={won ? 'check' : 'close'} size={15}/><span className="sr-only">{won ? 'Correct' : 'Incorrect'}</span></span><Icon name="chevron" size={14}/></summary><div className="attempt-comparisons">{game.puzzle.clues.slice(0, index + 1).map((clue, i) => { const c = compareClue(clue, team, guessed); return <div key={i} className={`comparison ${c.relation}`}><span>{c.label}</span><span><Icon name={c.relation === 'higher' ? 'up' : c.relation === 'lower' ? 'down' : c.relation === 'match' ? 'check' : c.relation === 'unavailable' ? 'info' : 'close'} size={14}/>{c.detail}</span></div>; })}</div></details> : <div className="skipped-attempt"><span className="attempt-number">{String(index + 1).padStart(2, '0')}</span><span>Skipped for a clue</span><Icon name="skip" size={14}/></div>}</li>;
    })}</ol>}
  </section>;
}

function Profile({ team }: { team: Team }) {
  const [movement, setMovement] = useState<Movement>(() => recordTotal(team.records.olympic) ? 'olympic' : 'paralympic');
  const record = team.records[movement];
  return <section className="answer-profile"><div className="profile-heading"><div><span className="little-caps">BEHIND THE ANSWER</span><h2>A sporting story worth knowing.</h2></div><div className="segmented-control" aria-label="Profile competition">{(['olympic','paralympic'] as Movement[]).map(m => <button key={m} aria-pressed={m === movement} className={m === movement ? 'selected' : ''} onClick={() => setMovement(m)}>{m === 'olympic' ? 'Olympics' : 'Paralympics'}</button>)}</div></div>
    <p className="profile-description">{team.description || `${team.name} competes as a distinct sporting delegation. Every clue uses the medals awarded to this team across the full historical record.`}</p>
    <div className="profile-grid"><MedalDisplay medals={record.total} small/><div className="profile-facts"><div><span>Summer medals</span><b>{sum(record.summer).toLocaleString('en-GB')}</b></div><div><span>Winter medals</span><b>{sum(record.winter).toLocaleString('en-GB')}</b></div><div><span>Medal-winning editions</span><b>{record.editions.length}</b></div></div><div className="profile-sports"><span className="little-caps">LEADING SPORTS</span>{record.sports?.length ? record.sports.slice(0, 4).map(s => <div key={s.name}><span>{s.name}</span><b>{sum(s.medals).toLocaleString('en-GB')}</b></div>) : <p>{recordTotal(record) ? 'Sport breakdown unavailable.' : 'No medals in this competition.'}</p>}</div></div>
    <details className="edition-details"><summary>Explore every medal-winning edition<Icon name="chevron" size={16}/></summary><div className="edition-table-scroll"><table><caption className="sr-only">{team.name} — {movementLabel(movement)}</caption><thead><tr><th>Games</th><th>Season</th><th>Gold</th><th>Silver</th><th>Bronze</th></tr></thead><tbody>{record.editions.map(e => <tr key={e.id}><th scope="row">{e.city} {e.year}</th><td>{e.season}</td>{e.medals.map((n, i) => <td key={i}>{n}</td>)}</tr>)}</tbody></table></div></details>
    <details className="edition-details"><summary>All sports & event categories<Icon name="chevron" size={16}/></summary>
      {record.sports ? <div className="edition-table-scroll"><table><caption className="sr-only">Every sport — {movementLabel(movement)}</caption><thead><tr><th>Sport</th><th>Gold</th><th>Silver</th><th>Bronze</th></tr></thead><tbody>{record.sports.map(s=><tr key={s.name}><th scope="row">{s.name}</th>{s.medals.map((n,i)=><td key={i}>{n}</td>)}</tr>)}</tbody></table></div> : <p className="profile-unavailable">The all-time sport breakdown is unavailable.</p>}
      <div className="profile-categories">{record.categories ? (['w','m','x','o'] as const).map((key,i)=><div key={key}><span>{['Women’s events','Men’s events','Mixed events','Open events'][i]}</span><b>{record.categories![key].toLocaleString('en-GB')}</b></div>) : <p className="profile-unavailable">The all-time event-category breakdown is unavailable.</p>}</div>
    </details>
  </section>;
}

export default function App() {
  const now = useNow();
  const today = utcDate(now);
  const [save, setSave] = useState(() => readSave(catalogs));
  const [game, setGame] = useState<GameState>(() => {
    const saved = readSave(catalogs);
    if (saved.activeDaily && (outcome(saved.activeDaily) === 'playing' || saved.activeDaily.puzzle.date === utcDate())) return saved.activeDaily;
    return saved.games[utcDate()] ?? { puzzle: dailyPuzzle(utcDate(), catalogForDate(utcDate())), attempts: [] };
  });
  const [clueIndex, setClueIndex] = useState(() => Math.min(game.attempts.length, 5));
  const [dialog, setDialog] = useState<'help' | 'stats' | 'data' | 'share' | null>(null);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [storageFailed, setStorageFailed] = useState(false);
  const [shared, setShared] = useState(false);
  const [practiceCount, setPracticeCount] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const catalog = catalogByVersion(game.puzzle.catalogVersion);
  const team = catalog.teams.find(t => t.id === game.puzzle.targetId)!;
  const status = outcome(game);
  const revealed = revealedCount(game);
  const stats = statistics(save.results, today);
  const oldDaily = game.puzzle.mode === 'daily' && game.puzzle.date !== today;
  const todayCatalog = catalogForDate(today);
  const todayPuzzle = dailyPuzzle(today, todayCatalog);

  useEffect(() => {
    if (game.puzzle.mode !== 'daily') return;
    setSave(previous => {
      const updated = saveGame(previous, game);
      setStorageFailed(!writeSave(updated));
      return updated;
    });
  }, [game]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const latest = readSave(catalogs);
      setSave(latest);
      const incoming = latest.games[game.puzzle.date];
      if (game.puzzle.mode === 'daily' && incoming && incoming.attempts.length > game.attempts.length) {
        setGame(incoming); setClueIndex(Math.min(incoming.attempts.length, 5));
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [game]);

  const changeGame = (next: GameState) => { setGame(next); setClueIndex(Math.min(next.attempts.length, 5)); setError(''); setShared(false); setAnnouncement(next.puzzle.mode === 'practice' ? 'A new practice round is ready.' : 'Today’s puzzle is ready.'); };
  const startDaily = () => changeGame(save.games[today] ?? { puzzle: todayPuzzle, attempts: [] });
  const startPractice = () => {
    const seed = `${today}:practice:${Date.now()}:${practiceCount}:${globalThis.crypto?.randomUUID?.() ?? Math.random()}`;
    setPracticeCount(n => n + 1);
    changeGame({ puzzle: practicePuzzle(seed, today, todayCatalog, todayPuzzle.targetId), attempts: [] });
  };
  const guess = (id: string | null) => {
    const result = submitAttempt(game, id, catalog);
    if (result.error) { setError(result.error); return false; }
    const nextStatus = outcome(result.state);
    setGame(result.state); setError('');
    if (nextStatus === 'playing') setClueIndex(result.state.attempts.length);
    if (window.matchMedia('(max-width:700px)').matches) {
      (document.activeElement as HTMLElement | null)?.blur();
      requestAnimationFrame(() => {
        const destination = nextStatus === 'playing' ? contentRef.current : document.querySelector('.result-card');
        destination?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth'});
      });
    }
    setAnnouncement(nextStatus === 'won' ? `Correct! The answer is ${team.name}. You finished in ${result.state.attempts.length} attempts.` : nextStatus === 'lost' ? `The answer is ${team.name}. Your round is complete.` : `${id ? 'Not quite.' : 'Hurdle skipped.'} Clue ${result.state.attempts.length + 1} revealed: ${CLUE_LABELS[game.puzzle.clues[result.state.attempts.length].kind]}.`);
    return true;
  };
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}${import.meta.env.BASE_URL}` : '';
  const share = async () => {
    const text = shareText(game, shareUrl);
    try {
      if (navigator.share && navigator.maxTouchPoints > 0) await navigator.share({ text });
      else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else { setDialog('share'); return; }
      setShared(true); setAnnouncement('Spoiler-free results ready to share.');
    } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) setDialog('share'); }
  };

  return <><a className="skip-link" href="#game">Skip to the game</a><div className="site-shell">
    <header className="site-header"><a href={import.meta.env.BASE_URL} aria-label="Hurdle home"><HurdleLogo/></a><span className="brand-description">THE DAILY OLYMPIC<br/>GEOGRAPHY GAME</span><nav aria-label="Game information"><button className="icon-button" onClick={() => setDialog('help')} aria-label="How to play" title="How to play"><Icon name="help"/></button><button className="icon-button" onClick={() => setDialog('stats')} aria-label="Your statistics" title="Your statistics"><Icon name="chart"/></button><button className="icon-button" onClick={() => setDialog('data')} aria-label="About the data" title="About the data"><Icon name="globe"/></button></nav></header>
    <main id="game"><section className="intro"><div><div className="edition-line"><span className={`daily-badge ${game.puzzle.mode}`}><span/>{game.puzzle.mode === 'daily' ? `DAILY NO. ${String(game.puzzle.number).padStart(3, '0')}` : 'THE PRACTICE TRACK'}</span><span className="edition-date">{new Date(game.puzzle.date + 'T12:00:00Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase()}</span>{team.historical && <span className="historical-badge">Historical team</span>}</div><h1>ONE COUNTRY.<br className="mobile-br"/> <span>SIX HURDLES.</span></h1><p>A world of sporting history. A mystery country. <b>Follow the medals.</b></p></div><TrackIllustration/></section>
      {oldDaily && <div className="new-day-banner"><span><Icon name="sun"/>A new daily puzzle is ready. You can finish this round first.</span><button onClick={startDaily}>Play today<Icon name="arrow" size={16}/></button></div>}
      {game.puzzle.mode === 'practice' && <div className="practice-banner"><span><Icon name="refresh" size={16}/>Practice makes podiums. Daily statistics stay separate.</span><button onClick={startDaily}>Back to daily<Icon name="arrow" size={16}/></button></div>}
      <div className="hurdle-track" aria-label="Clue progress">{Array.from({ length: 6 }, (_, i) => {
        const crossed = game.attempts[i] != null;
        const unlocked = i < revealed;
        return <button key={i} className={`hurdle-step ${clueIndex === i ? 'active' : ''} ${crossed ? 'crossed' : ''} ${unlocked ? 'unlocked' : ''} ${game.attempts[i]?.teamId === team.id ? 'cleared' : ''}`} disabled={!unlocked} aria-current={clueIndex === i ? 'step' : undefined} aria-label={`Clue ${i + 1}${unlocked ? ': ' + CLUE_LABELS[game.puzzle.clues[i].kind] : ', locked'}`} onClick={() => setClueIndex(i)}><span className="hurdle-gate">{game.attempts[i]?.teamId === team.id ? <Icon name="check" size={17}/> : String(i + 1).padStart(2, '0')}</span><span className="hurdle-caption">{i < 4 ? 'HURDLE' : i === 4 ? 'HOME STRAIGHT' : 'FINISH LINE'}</span></button>;
      })}</div>
      <div className="game-layout" ref={contentRef}><div className="clue-area"><ClueCard clue={game.puzzle.clues[clueIndex]} index={clueIndex} team={team} catalog={catalog}/><div className="clue-navigation"><span><span className="tiny-dot"/>{status === 'playing' ? `${revealed} of 6 clues revealed` : 'All six clues are yours to explore'}</span><span>{status === 'playing' ? 'Every miss opens a new clue.' : 'A little more history, every day.'}</span></div></div><aside className="guess-panel" aria-label="Guess and results">
        {status === 'playing' ? <GuessForm teams={catalog.teams} attempt={game.attempts.length + 1} onGuess={guess} onSkip={() => guess(null)} error={error} resetKey={game.puzzle.id}/> : <section className={`result-card ${status}`} aria-label="Round result"><span className="result-overline">{status === 'won' ? 'ACROSS THE FINISH LINE' : 'A NEW ONE FOR THE ALMANAC'}</span><div className="result-flag"><TeamFlag team={team}/></div><h2>{team.name}</h2><p>{status === 'won' ? <>You cleared it in <b>{game.attempts.length} {game.attempts.length === 1 ? 'hurdle' : 'hurdles'}</b>.</> : <>Six hurdles. One discovery.<br/>There’s always the next race.</>}</p><button className="primary-button" onClick={share}>{shared ? 'Results copied' : 'Share your result'}<Icon name={shared ? 'check' : 'share'} size={18}/></button><button className="secondary-button" onClick={startPractice}>Play a practice round<Icon name="refresh" size={16}/></button>{game.puzzle.mode === 'daily' && <div className="next-puzzle"><Icon name="clock" size={14}/>Next country in <span>{countdown(now)}</span></div>}</section>}
        <History game={game} team={team} catalog={catalog}/>
      </aside></div>
      {storageFailed && <p className="storage-notice" role="status">This browser can’t save progress. You can still play this round.</p>}
      {status !== 'playing' && <Profile team={team}/>}
      <section className="bottom-note"><span className="small-hurdle" aria-hidden="true">H</span><p>BIG HISTORY. SMALL DAILY RITUAL.<span>Summer, Winter & Paralympics. Every era has a story.</span></p><button onClick={() => setDialog('help')}>New here?<span>How to play<Icon name="arrow" size={15}/></span></button></section>
    </main><footer className="site-footer"><span>MADE FOR THE LOVE OF THE GAMES.</span><div><button onClick={game.puzzle.mode === 'practice' ? startDaily : startPractice}>{game.puzzle.mode === 'practice' ? 'Daily puzzle' : 'Practice mode'}</button><span>·</span><button onClick={() => setDialog('data')}>Data & credits</button><span>·</span><a href="https://github.com/matthewgthomas/hurdle" target="_blank" rel="noreferrer">GitHub<Icon name="arrow" size={12}/></a></div></footer>
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
  </div>
  {dialog && <Dialog title={dialog === 'help' ? 'Ready, set, discover.' : dialog === 'stats' ? 'Your personal best.' : dialog === 'share' ? 'Take it to the group chat.' : 'A century of podiums.'} onClose={() => setDialog(null)}>
    {dialog === 'help' && <><p className="dialog-lead">Guess the mystery country or historical team in six attempts. You don’t need to be an Olympic expert. Just curious.</p><ol className="how-to"><li><span>01</span><div><h3>Read the sporting clues.</h3><p>Medals, favourite sports, historic breakthroughs and more. The first four clues mix things up every day.</p></div></li><li><span>02</span><div><h3>Take a guess. Clear a hurdle.</h3><p>Search for a team and submit it. A miss reveals another clue; expand a past guess to compare the clues you already knew. Arrows describe the mystery team relative to your guess.</p></div></li><li><span>03</span><div><h3>A little help down the home straight.</h3><p>The last two clues offer geography and identity hints. Skipping reveals a clue and uses one attempt.</p></div></li></ol><div className="help-note"><Icon name="clock"/><p>Everyone gets the same daily puzzle at midnight UTC. Historical teams keep their own medals. Practice rounds don’t affect your daily streak.</p></div><button className="primary-button" onClick={() => setDialog(null)}>Let’s clear some hurdles<Icon name="arrow"/></button></>}
    {dialog === 'stats' && <><p className="dialog-lead">Your daily results, saved on this device.</p><div className="stats-grid">{[[stats.played,'Played'],[`${stats.winRate}%`,'Win rate'],[stats.streak,'Current streak'],[stats.best,'Best streak']].map(([value,label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div><h3 className="little-caps">HURDLES TO THE FINISH</h3><div className="distribution">{stats.distribution.map((value,i) => <div key={i}><span>{i + 1}</span><div style={{ width: `${Math.max(8, value / Math.max(1, ...stats.distribution) * 100)}%` }} className={value ? 'has-wins' : ''}>{value}</div></div>)}</div><p className="dialog-fineprint">A streak counts consecutive UTC dates won. Practice is just for the joy of discovery.</p></>}
    {dialog === 'data' && <>
      <figure className="idea-credit">
        <img src={`${import.meta.env.BASE_URL}images/matt-corby-podium.png`} alt="Cartoon of Matt Corby celebrating a gold medal on an Olympic podium" width="1254" height="1254"/>
        <figcaption>Original idea by <strong>Matt Corby</strong></figcaption>
      </figure>
      <p className="dialog-lead">Real records. Every era. Each clue uses country medal awards, so a team medal counts once.</p><div className="coverage-list">{catalog.coverage.map(c => <div key={`${c.movement}-${c.season}`}><Icon name={c.season === 'summer' ? 'sun' : 'snow'}/><span>{c.season === 'summer' ? 'Summer' : 'Winter'} {c.movement === 'olympic' ? 'Olympics' : 'Paralympics'}</span><b>{c.start}–{c.end}</b></div>)}</div><h3>How we count</h3><p>Medals stay with the delegation that won them. The Soviet Union, East Germany and other former teams remain separate from modern countries. Women’s, men’s, mixed and open clues describe event categories, not athlete counts.</p><p>Cancelled editions, demonstration events, Youth Games, the 1906 Intercalated Games and art, aeronautics and alpinism awards are excluded. An unknown breakdown is never treated as zero. Clues with unresolved source discrepancies are suppressed.</p><h3>The source material</h3><ul className="source-list">{catalog.sources.map(s => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.name}<Icon name="arrow" size={15}/></a></li>)}</ul><p className="dialog-fineprint">Catalog {catalog.version} · retrieved {catalog.retrievedAt.slice(0,10)}. Figures reflect this published snapshot; historical revisions may differ from other tables. This is an independent fan-made game, unaffiliated with the IOC or IPC. Fonts: Barlow Condensed and DM Sans (SIL Open Font License). Geography: Natural Earth and mledoze/countries.</p><a className="text-link" href="https://github.com/matthewgthomas/hurdle/blob/main/data/README.md" target="_blank" rel="noreferrer">Read the full data methodology<Icon name="arrow" size={15}/></a></>}
    {dialog === 'share' && <><p className="dialog-lead">Copy the text below. The answer stays a mystery.</p><textarea className="share-text" readOnly rows={5} value={shareText(game, shareUrl)} onFocus={e => e.currentTarget.select()} aria-label="Spoiler-free results"/><button className="primary-button" onClick={() => setDialog(null)}>Done<Icon name="check"/></button></>}
  </Dialog>}</>;
}
