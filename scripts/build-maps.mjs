// Genera los contornos SVG de España (comunidades y provincias) como recurso estático de RptLib.
// Uso: node scripts/build-maps.mjs  -> public/lib/rptlib/<versión>/maps/es.js
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import geoConicConformalSpain from 'd3-composite-projections/src/conicConformalSpain.js';

const VERSION = process.argv[2] || '1.2.0';
const W = 600;
const H = 460;
const strip = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const PREFIX = /^(comunidad foral de|comunidad de|comunitat|principado de|region de|ciudad autonoma de|illes|islas)\s+/;

function aliases(name) {
  const parts = name.split(/[/.]/).map((s) => s.trim()).filter(Boolean);
  const out = new Set();
  for (const p of [name, ...parts]) {
    const s = strip(p);
    out.add(s);
    out.add(s.replace(PREFIX, ''));
  }
  return [...out].filter((s) => s.length > 1);
}

function build(file, object) {
  const topo = JSON.parse(readFileSync(new URL(`../node_modules/es-atlas/es/${file}`, import.meta.url)));
  const fc = feature(topo, topo.objects[object]);
  fc.features = fc.features.filter((f) => !/gibraltar/i.test(f.properties.name));
  const projection = geoConicConformalSpain().fitSize([W, H], fc);
  const path = geoPath(projection);
  path.digits?.(1);
  const features = fc.features.map((f) => ({
    id: f.id,
    name: f.properties.name.split('/').pop().replace(/^(Cataluña|País Vasco)$/, (m) => m),
    aliases: aliases(f.properties.name),
    d: path(f),
    c: path.centroid(f).map((v) => Math.round(v)),
  }));
  return { viewBox: `0 0 ${W} ${H}`, border: projection.getCompositionBorders(), features };
}

const maps = { 'es-comunidades': build('autonomous_regions.json', 'autonomous_regions'), 'es-provincias': build('provinces.json', 'provinces') };
const dir = new URL(`../public/lib/rptlib/${VERSION}/maps/`, import.meta.url);
mkdirSync(dir, { recursive: true });
const js = `/*! RptLib mapas de España (comunidades y provincias). Fuente: es-atlas (datos IGN, CC BY 4.0). */\n(function(){var m=${JSON.stringify(maps)};for(var k in m)window.RptLib&&window.RptLib.registerMap(k,m[k]);})();\n`;
writeFileSync(new URL('es.js', dir), js);
console.log(`maps/es.js ${(js.length / 1024).toFixed(0)} KB · ${maps['es-comunidades'].features.length} comunidades · ${maps['es-provincias'].features.length} provincias`);
