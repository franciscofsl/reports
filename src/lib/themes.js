// Temas JSON del informe: formato propio y compatibilidad con los temas de Power BI.
import { THEME_DEFAULTS } from './catalog.js';

const HEX = /^#[0-9a-f]{6}$/i;
const hex = (v) => {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (/^#[0-9a-f]{3}$/i.test(s)) return `#${s.slice(1).split('').map((c) => c + c).join('')}`.toLowerCase();
  return HEX.test(s) ? s.toLowerCase() : null;
};

/** Convierte un tema importado (propio o de Power BI) al tema del informe. Lanza Error si no es válido. */
export function parseTheme(json) {
  let t;
  try { t = typeof json === 'string' ? JSON.parse(json) : json; } catch { throw new Error('El archivo no es un JSON válido.'); }
  if (!t || typeof t !== 'object' || Array.isArray(t)) throw new Error('El tema debe ser un objeto JSON.');
  const out = { ...THEME_DEFAULTS };
  const warnings = [];
  // Formato propio
  if (t.format === 'rpt-theme') Object.assign(out, t.theme || {});
  // Power BI: name, dataColors, background, foreground, tableAccent, good/bad/neutral, textClasses
  const colors = (t.dataColors || t.colors || []).map(hex).filter(Boolean);
  if (colors.length) { out.colors = colors; out.palette = 'custom'; }
  const brand = hex(t.tableAccent) || hex(t.brand) || colors[0];
  if (brand) out.brand = brand;
  if (hex(t.background)) out.background = hex(t.background);
  const font = t.font || t.textClasses?.label?.fontFace || t.textClasses?.title?.fontFace || t.visualStyles?.['*']?.['*']?.general?.[0]?.fontFamily;
  if (typeof font === 'string' && font.length < 120) out.font = font;
  if (t.mode === 'dark' || t.mode === 'light') out.mode = t.mode;
  if (['compact', 'normal', 'comfortable'].includes(t.density)) out.density = t.density;
  if (t.visualStyles) warnings.push('Los estilos por visual (visualStyles) de Power BI no se aplican; se usan colores, fondo y fuente.');
  if (!colors.length && !brand && !out.background && !out.font) throw new Error('El tema no contiene colores ni fuente reconocibles (dataColors, tableAccent, background, textClasses…).');
  return { theme: { ...out, name: t.name || out.name || 'Tema importado' }, warnings };
}

/** Exporta el tema en el formato propio, incluyendo claves compatibles con Power BI. */
export function exportTheme(theme, palettes = {}) {
  const t = { ...THEME_DEFAULTS, ...theme };
  const dataColors = t.palette === 'custom' && t.colors?.length ? t.colors : palettes[t.palette] || [];
  return {
    format: 'rpt-theme', version: 1, name: t.name || 'Tema del informe',
    theme: { brand: t.brand, palette: t.palette, colors: t.colors, density: t.density, mode: t.mode, font: t.font, background: t.background },
    dataColors, tableAccent: t.brand, ...(t.background ? { background: t.background } : {}),
    ...(t.font ? { textClasses: { label: { fontFace: t.font } } } : {}),
  };
}
