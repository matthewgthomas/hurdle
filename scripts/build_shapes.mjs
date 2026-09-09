import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';
import { geoMercator, geoPath } from 'd3-geo';
const atlas = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/countries-110m.json', import.meta.url)));
const dir = new URL('../public/shapes/', import.meta.url);
mkdirSync(dir, { recursive: true });
for (const country of feature(atlas, atlas.objects.countries).features) {
  if (country.id == null) continue;
  const projection = geoMercator().fitExtent([[12,12],[588,338]],country);
  const path = geoPath(projection)(country);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 350"><path fill="#243d39" d="${path}"/></svg>\n`;
  writeFileSync(new URL(`${String(country.id).padStart(3,'0')}.svg`,dir),svg);
}
console.log('Built local Natural Earth silhouettes.');
