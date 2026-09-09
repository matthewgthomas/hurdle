import { publishedCatalogs } from './catalog-manifest';
import type { Catalog } from './types';

// Keep published versions here. New data must have a future effectiveFrom date.
export const catalogs: Catalog[] = publishedCatalogs;
export function catalogForDate(date: string): Catalog {
  return [...catalogs].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)).find(c => c.effectiveFrom <= date) ?? catalogs[0];
}
export function catalogByVersion(version: string): Catalog {
  const catalog = catalogs.find(c => c.version === version);
  if (!catalog) throw new Error('This saved puzzle uses an unavailable catalog.');
  return catalog;
}
