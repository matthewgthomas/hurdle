import type { CSSProperties } from 'react';

export type IconName = 'arrow' | 'close' | 'help' | 'chart' | 'globe' | 'sun' | 'snow' | 'medal' | 'flag' | 'check' | 'skip' | 'search' | 'share' | 'refresh' | 'chevron' | 'clock' | 'info' | 'up' | 'down';
const paths: Record<IconName, React.ReactNode> = {
  arrow: <><path d="M4 12h15M13 5l7 7-7 7"/></>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 8.5a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 16h.01"/></>,
  chart: <><path d="M4 20h17M7 16v-5M12 16V4M17 16V8"/></>,
  globe: <><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
  snow: <><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4M20 14l-4 1 1 4M4 14l4 1-1 4M20 10l-4-1 1-4"/></>,
  medal: <><circle cx="12" cy="15" r="6"/><path d="M8 10 4 2h5l3 7 3-7h5l-4 8M12 12v5m-1-4 1-1"/></>,
  flag: <><path d="M5 22V3c5-5 9 5 14 0v11c-5 5-9-5-14 0"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  skip: <><path d="m5 5 10 7L5 19zM19 5v14"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  share: <><path d="M12 15V3m-5 5 5-5 5 5M5 13v7h14v-7"/></>,
  refresh: <><path d="M20 10a8 8 0 0 0-14-5L3 8m0-5v5h5M4 14a8 8 0 0 0 14 5l3-3m0 5v-5h-5"/></>,
  chevron: <path d="m6 9 6 6 6-6"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/></>,
  up: <path d="M12 20V4m-6 6 6-6 6 6"/>,
  down: <path d="M12 4v16m-6-6 6 6 6-6"/>,
};
export function Icon({ name, size = 20, className = '', style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function SportIcon({ sport, size = 32 }: { sport: string; size?: number }) {
  const word = sport.toLowerCase();
  let path: React.ReactNode;
  if (/swim|aquatic|diving|water/.test(word)) path = <><circle cx="15" cy="8" r="2.2" fill="currentColor" stroke="none"/><path d="m5 13 5-4 6 4 5 1M2 18q2-3 5 0t5 0 5 0 5 0M5 10l2-5 5 1"/></>;
  else if (/cycl/.test(word)) path = <><circle cx="5" cy="16" r="4"/><circle cx="19" cy="16" r="4"/><path d="m5 16 4-7 5 7H5m9 0 3-9h3M7 6h5"/></>;
  else if (/row|canoe|sail/.test(word)) path = <><path d="M2 17h20l-3 4H5zM12 3v12H4l8-12Zm2 1 7 11h-7M5 2l14 19"/></>;
  else if (/shoot|arch/.test(word)) path = <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/><path d="M12 1v5m0 12v5M1 12h5m12 0h5"/></>;
  else if (/ski|snow|biath/.test(word)) path = <><circle cx="15" cy="4" r="2" fill="currentColor" stroke="none"/><path d="m12 7-4 5 5 3-3 4M12 7l3 5h5M3 19l16 3 3-2M3 9l5 12M19 10l2 9"/></>;
  else if (/ball|football|hockey|rugby|tennis/.test(word)) path = <><circle cx="12" cy="12" r="9"/><path d="m9 7 6 1 1 6-6 3-5-5 4-5Zm0 0 1-4m5 5 5-2m-4 8 5 2m-11 1-1 4m-4-9-2-1"/></>;
  else if (/box|wrest|judo|taek|fenc/.test(word)) path = <><circle cx="10" cy="4" r="2" fill="currentColor" stroke="none"/><path d="m9 8 4 4 6-6M5 13l4-5 2 7-6 6m6-6 8 5M13 8l3-3"/></>;
  else if (/weight|power/.test(word)) path = <><path d="M2 8h20M4 4v8m16-8v8M7 6v4m10-4v4M8 8l1 7-3 6m10-13-1 7 3 6M9 15h6"/><circle cx="12" cy="12" r="2"/></>;
  else path = <><circle cx="14" cy="4" r="2.2" fill="currentColor" stroke="none"/><path d="m12 8-4 5 5 2-3 6M12 8l5 4 4-1M8 13l-4 3H1M12 8l-5-2-3 4"/></>;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{path}</svg>;
}
