// Concatena los módulos fuente de RptLib en el fichero publicado (un único script sin dependencias).
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const VERSION = '1.2.0';
const src = new URL('../lib-src/rptlib-1.2/', import.meta.url);
const parts = readdirSync(src).filter((f) => f.endsWith('.js')).sort();
const raw = parts.map((f) => `/* ---- ${f} ---- */\n${readFileSync(new URL(f, src), 'utf8')}`).join('\n');
// Escapa todo lo no ASCII (\uXXXX): el script funciona aunque el servidor no declare el charset.
const body = raw.replace(/[^\x00-\x7f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
const out = new URL(`../public/lib/rptlib/${VERSION}/`, import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(new URL('rptlib.js', out), body);
console.log(`rptlib ${VERSION}: ${parts.length} módulos, ${(body.length / 1024).toFixed(0)} KB`);
