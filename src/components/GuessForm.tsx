import { useEffect, useId, useRef, useState } from 'react';
import { resolveTeam, searchTeams } from '../game/engine';
import type { Team } from '../game/types';
import { Icon } from './Icon';

export function TeamFlag({ team, className = '' }: { team: Team; className?: string }) {
  if (team.flag) return <img className={`team-flag ${className}`} src={`${import.meta.env.BASE_URL}${team.flag}`} alt=""/>;
  if (team.iso2) return <span className={`emoji-flag ${className}`} aria-hidden="true">{[...team.iso2.toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')}</span>;
  return <span className={`historical-flag ${className}`} aria-hidden="true"><Icon name="flag" size={18}/></span>;
}

export function GuessForm({ teams, attempt, onGuess, onSkip, error, resetKey }: { teams: Team[]; attempt: number; onGuess: (id: string | null) => boolean; onSkip: () => void; error: string; resetKey: string }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [selected, setSelected] = useState<Team | undefined>();
  const [localError, setLocalError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const options = searchTeams(query, teams);
  const visible = open && query.trim().length > 0;
  useEffect(() => { setQuery(''); setSelected(undefined); setLocalError(''); setOpen(false); setActive(-1); }, [resetKey]);
  useEffect(() => { if (active >= 0 && options[active]) document.getElementById(`${listId}-${options[active].id}`)?.scrollIntoView({block:'nearest'}); }, [active, query, listId]);
  const choose = (team: Team) => { setQuery(team.name); setSelected(team); setOpen(false); setActive(-1); setLocalError(''); input.current?.focus(); };
  const submit = () => {
    const team = selected ?? resolveTeam(query, teams);
    if (!team) { setLocalError('Select a country or historical team from the list.'); setOpen(true); input.current?.focus(); return; }
    if (onGuess(team.id)) { setQuery(''); setSelected(undefined); setOpen(false); setActive(-1); setLocalError(''); }
  };
  return <div className="guess-form-wrap"><div className="section-heading"><label htmlFor="country-guess">Make your guess</label><span>{attempt} OF 6</span></div>
    <form onSubmit={e => { e.preventDefault(); submit(); }} noValidate>
      <div className={`autocomplete ${visible ? 'is-open' : ''}`}>
        <Icon name="search" size={19} className="search-icon"/>
        <input ref={input} id="country-guess" type="text" role="combobox" aria-autocomplete="list" aria-controls={visible ? listId : undefined} aria-expanded={visible} aria-invalid={!!(localError || error)} aria-activedescendant={visible && active >= 0 && options[active] ? `${listId}-${options[active].id}` : undefined} aria-describedby={localError || error ? 'guess-error' : 'guess-hint'} autoComplete="off" autoCorrect="off" spellCheck={false} placeholder="Country or historical team…" value={query}
          onChange={e => { setQuery(e.target.value); setSelected(undefined); setActive(-1); setLocalError(''); setOpen(true); }}
          onFocus={() => { if (!selected) setOpen(true); }} onBlur={e => { if (!e.currentTarget.parentElement?.contains(e.relatedTarget)) setOpen(false); }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(i => options.length ? Math.min(i + 1, options.length - 1) : -1); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
            if (e.key === 'Escape') { setOpen(false); setActive(-1); }
            if (e.key === 'Enter' && visible && active >= 0 && options[active]) { e.preventDefault(); choose(options[active]); }
          }}/>
        {query && <button type="button" className="input-clear" aria-label="Clear country search" onClick={() => { setQuery(''); setSelected(undefined); setLocalError(''); input.current?.focus(); }}><Icon name="close" size={16}/></button>}
        {visible && <ul id={listId} role="listbox" aria-label="Countries and historical teams" className="country-options">{options.length ? options.map((team, i) => <li key={team.id} id={`${listId}-${team.id}`} role="option" aria-selected={i === active} onMouseDown={e => e.preventDefault()} onClick={() => choose(team)} onMouseMove={() => setActive(i)}><TeamFlag team={team}/><span>{team.name}{team.historical && <small>Historical team{team.period ? ` · ${team.period}` : ''}</small>}</span><span className="option-code">{team.id}</span></li>) : <li className="no-results" role="presentation">No teams found. Try another spelling.</li>}</ul>}
      </div>
      <div className="guess-error-space">{localError || error ? <p id="guess-error" className="error-text" role="alert">{localError || error}</p> : <p id="guess-hint">Start typing, then choose your team.</p>}</div>
      <button className="primary-button submit-guess" type="submit">Clear this hurdle<Icon name="arrow" size={20}/></button>
      <button type="button" className="skip-button" onClick={() => { onSkip(); setQuery(''); setSelected(undefined); setOpen(false); setLocalError(''); }}>Skip for another clue<Icon name="skip" size={14}/></button>
    </form>
  </div>;
}
