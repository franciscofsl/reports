// Construye RPT_DATA para un informe completo: orígenes, modelo semántico y subinformes.
import { buildReportData, defaultParamValue } from './sqlEngine.js';
import { allRows } from './htmlGenerator.js';
import { getReport } from './store.js';

export const emptySemantic = () => ({ relations: [], measures: [], hierarchies: [], autoRelate: true, associative: false });

/**
 * @param report { id?, dataSources, params, semantic, model }
 * @param values valores de parámetros aplicados por el lector
 */
export function buildFullData(report, values = {}) {
  const { data, errors } = buildReportData(report.dataSources || [], report.params || [], values);
  const semantic = structuredClone(report.semantic || emptySemantic());
  data.semantic = semantic;
  data.subreports = {};
  let n = 0;
  const seen = new Set([report.id]);
  for (const row of allRows(report.model)) {
    for (const cell of row.cells) {
      const id = cell.type === 'subreport' ? cell.props?.report : null;
      if (!id || data.subreports[id] || seen.has(id)) continue;
      const sub = getReport(id);
      if (!sub) { errors[`subinforme ${id}`] = 'El informe enlazado ya no existe'; continue; }
      seen.add(id);
      n += 1;
      const prefix = `sub${n}_`;
      // Parámetros: los del padre con el mismo nombre se heredan.
      const merged = {};
      for (const p of sub.params || []) merged[p.name] = values[p.name] ?? (report.params || []).find((x) => x.name === p.name && x.type === p.type)?.default ?? defaultParamValue(p);
      const r = buildReportData(sub.dataSources || [], sub.params || [], merged);
      for (const [k, v] of Object.entries(r.errors)) errors[`${sub.name} · ${k}`] = v;
      for (const [k, v] of Object.entries(r.data.sources)) data.sources[prefix + k] = v;
      const ren = {};
      const subSem = sub.semantic || {};
      for (const m of subSem.measures || []) { ren[`m:${m.name}`] = `m:${prefix}${m.name}`; semantic.measures.push({ ...m, name: prefix + m.name, source: m.source ? prefix + m.source : m.source }); }
      for (const h of subSem.hierarchies || []) { ren[`h:${h.name}`] = `h:${prefix}${h.name}`; semantic.hierarchies.push({ ...h, name: prefix + h.name, source: h.source ? prefix + h.source : h.source }); }
      for (const rel of subSem.relations || []) semantic.relations.push({ from: { ...rel.from, source: prefix + rel.from.source }, to: { ...rel.to, source: prefix + rel.to.source } });
      const remap = (props) => JSON.parse(JSON.stringify(props || {}).replace(/"([mh]:[^"]+)"/g, (m0, k) => (ren[k] ? `"${ren[k]}"` : m0)));
      data.subreports[id] = {
        title: sub.model?.title || sub.name,
        rows: allRows(sub.model).map((rw) => ({ cells: rw.cells.filter((c) => c.type !== 'subreport').map((c) => ({ ...c, source: c.source ? prefix + c.source : '', props: remap(c.props) })) })),
      };
    }
  }
  return { data, errors };
}
