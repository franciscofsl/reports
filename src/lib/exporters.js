// Exportación fiel a Word (.docx) y Excel (.xlsx) a partir del contenido que recopila RptLib (collect()).
// Las librerías se cargan solo al exportar.

const PAGE_TWIPS = { A4: [11906, 16838], A3: [16838, 23811], Letter: [12240, 15840] };
const MM = 56.7; // twips por milímetro
const fmt = (v, f, t) => (window.RptLib ? window.RptLib.format(v, f, t) : v == null ? '' : String(v));
const b64 = (dataUrl) => {
  const bin = atob(dataUrl.split(',')[1]);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
export function saveBlob(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
const hexNoHash = (c, fallback) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c.slice(1).toUpperCase() : fallback);

/* ------------------------------ Word ------------------------------ */
export async function buildDocx(payload, { brand = '#0f6cbd' } = {}) {
  const d = await import('docx');
  const { Document, Packer, Paragraph, HeadingLevel, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType, Header, Footer, PageNumber, PageOrientation, ShadingType, BorderStyle } = d;
  const paper = payload.paper || {};
  const [pw, ph] = PAGE_TWIPS[paper.size] || PAGE_TWIPS.A4;
  const landscape = paper.orientation === 'landscape';
  const margin = Math.round((Number(paper.margin) || 15) * MM);
  const contentTw = (landscape ? ph : pw) - margin * 2;
  const contentPx = Math.floor(contentTw / 15);
  const brandHex = hexNoHash(brand, '0F6CBD');
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'D0D0D0' };
  const borders = { top: border, bottom: border, left: border, right: border };
  const children = [];
  const P = (text, opts = {}) => new Paragraph({ children: [new TextRun({ text: String(text ?? ''), ...opts.run })], ...opts.p });

  children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: payload.title || 'Informe' })] }));
  if (payload.subtitle) children.push(P(payload.subtitle, { run: { color: '616161' } }));
  children.push(P(`Generado el ${new Date(payload.generatedAt).toLocaleString('es-ES')}`, { run: { size: 18, color: '808080' } }));
  if (payload.filters?.length) children.push(P(`Filtros: ${payload.filters.join(' · ')}`, { run: { italics: true, size: 18 } }));

  const kpiTable = (kpis) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: kpis.map((k) => new TableCell({
        borders, margins: { top: 100, bottom: 100, left: 120, right: 120 },
        width: { size: Math.floor(100 / kpis.length), type: WidthType.PERCENTAGE },
        children: [P(String(k.label || '').toUpperCase(), { run: { size: 16, color: '616161', bold: true } }), P(k.value, { run: { size: 32, bold: true } }), ...(k.sub ? [P(k.sub, { run: { size: 16, color: '616161' } })] : [])],
      })),
    })],
  });

  const tableOf = (it) => {
    const cols = it.columns;
    const num = (c) => c.type === 'number';
    const head = new TableRow({
      tableHeader: true,
      children: cols.map((c) => new TableCell({ borders, shading: { type: ShadingType.CLEAR, fill: brandHex, color: 'auto' }, children: [new Paragraph({ alignment: num(c) ? AlignmentType.RIGHT : AlignmentType.LEFT, children: [new TextRun({ text: c.label || c.name, bold: true, color: 'FFFFFF', size: 18 })] })] })),
    });
    const cell = (text, c, o = {}) => new TableCell({ borders, shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined, children: [new Paragraph({ alignment: c && num(c) ? AlignmentType.RIGHT : AlignmentType.LEFT, children: [new TextRun({ text: String(text ?? ''), bold: !!o.bold, size: 18 })] })] });
    const rows = [head];
    const items = it.groups || it.rows.map((r) => ({ type: 'row', row: r }));
    for (const g of items.slice(0, 3000)) {
      if (g.type === 'group') rows.push(new TableRow({ children: cols.map((c, i) => cell(i === 0 ? `${'  '.repeat(g.level - 1)}${g.label}` : g.values[c.name] != null ? fmt(g.values[c.name], c.format, c.type) : '', c, { bold: true, fill: 'F2F2F2' })) }));
      else rows.push(new TableRow({ cantSplit: true, children: cols.map((c, i) => cell(`${i === 0 && g.level ? '    '.repeat(g.level) : ''}${fmt(g.row[c.name], c.format, c.type)}`, c)) }));
    }
    if (it.totals) rows.push(new TableRow({ children: cols.map((c, i) => cell(i === 0 ? 'Total' : it.totals[c.name] != null ? fmt(it.totals[c.name], c.format, c.type) : '', c, { bold: true, fill: 'E8E8E8' })) }));
    return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
  };

  payload.pages.forEach((page, pi) => {
    if (page.name && payload.pages.length > 1) children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: pi > 0, children: [new TextRun({ text: page.name })] }));
    let kpis = [];
    const flushKpis = () => { while (kpis.length) { children.push(kpiTable(kpis.splice(0, 4))); children.push(P('')); } };
    for (const it of page.items) {
      if (it.kind === 'kpi') { kpis.push(it); continue; }
      flushKpis();
      if (it.kind === 'break') { children.push(new Paragraph({ pageBreakBefore: true, children: [] })); continue; }
      if (it.kind === 'heading') { children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: it.text })] })); if (it.sub) children.push(P(it.sub, { run: { color: '616161' } })); continue; }
      if (it.title) children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, keepNext: true, children: [new TextRun({ text: it.title })] }));
      if (it.kind === 'text') { (it.paragraphs || []).forEach((t) => children.push(P(t))); continue; }
      if (it.kind === 'image' && it.dataUrl) {
        const w = Math.min(contentPx, Math.round(contentPx * (it.span >= 8 ? 1 : 0.7)));
        const h = Math.round((it.height / it.width) * w);
        children.push(new Paragraph({ keepLines: true, children: [new ImageRun({ type: 'png', data: b64(it.dataUrl), transformation: { width: w, height: h }, altText: { title: it.title || 'Gráfico', description: it.title || 'Gráfico', name: it.title || 'grafico' } })] }));
        children.push(P(''));
        continue;
      }
      if (it.kind === 'table') { children.push(tableOf(it)); children.push(P('')); }
    }
    flushKpis();
  });

  const footerRuns = [];
  if (paper.footer) footerRuns.push(new TextRun({ text: `${paper.footer}    ` }));
  if (paper.pageNumbers !== false) footerRuns.push(new TextRun({ children: ['Página ', PageNumber.CURRENT, ' de ', PageNumber.TOTAL_PAGES] }));
  const doc = new Document({
    creator: 'RptDesigner', title: payload.title,
    styles: { default: { document: { run: { font: 'Segoe UI', size: 20 } } } },
    sections: [{
      properties: { page: { size: { width: pw, height: ph, orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT }, margin: { top: margin, bottom: margin, left: margin, right: margin } } },
      headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: paper.header || payload.title || '', size: 16, color: '808080' })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: footerRuns.length ? footerRuns.map((r) => r) : [new TextRun('')] })] }) },
      children,
    }],
  });
  return Packer.toBlob(doc);
}

/* ------------------------------ Excel ------------------------------ */
const NUMFMT = { currency: '#,##0.00 "€"', compactCurrency: '#,##0 "€"', percent: '0.0%', integer: '#,##0', number: '#,##0.00', compact: '#,##0', date: 'dd/mm/yyyy' };
const toCellValue = (v, c) => {
  if (v == null || v === '') return null;
  if (c.type === 'date' || c.format === 'date') { const d = new Date(v); return isNaN(d) ? v : d; }
  if (c.type === 'number') { const n = Number(v); return isNaN(n) ? v : n; }
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  return v;
};

export async function buildXlsx(payload, { brand = '#0f6cbd' } = {}) {
  const mod = await import('exceljs');
  const ExcelJS = mod.default || mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'RptDesigner';
  wb.created = new Date();
  const paper = payload.paper || {};
  const brandArgb = `FF${hexNoHash(brand, '0F6CBD')}`;
  const used = new Set();
  const sheetName = (t) => {
    let base = String(t || 'Tabla').replace(/[\\/?*[\]:]/g, ' ').slice(0, 28).trim() || 'Tabla';
    let n = base;
    let i = 2;
    while (used.has(n.toLowerCase())) n = `${base.slice(0, 26)} ${i++}`;
    used.add(n.toLowerCase());
    return n;
  };
  const setup = (ws) => {
    ws.pageSetup = { paperSize: paper.size === 'A3' ? 8 : paper.size === 'Letter' ? 1 : 9, orientation: paper.orientation === 'landscape' ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.6, right: 0.6, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 } };
    ws.headerFooter = { oddHeader: `&L${(paper.header || payload.title || '').replace(/&/g, '&&')}`, oddFooter: `&L${(paper.footer || '').replace(/&/g, '&&')}${paper.pageNumbers !== false ? '&RPágina &P de &N' : ''}` };
  };

  // Resumen
  const sum = wb.addWorksheet(sheetName('Resumen'));
  setup(sum);
  sum.getColumn(1).width = 34;
  sum.getColumn(2).width = 26;
  sum.getColumn(3).width = 40;
  sum.addRow([payload.title || 'Informe']).font = { bold: true, size: 16 };
  if (payload.subtitle) sum.addRow([payload.subtitle]).font = { color: { argb: 'FF616161' } };
  sum.addRow([`Generado el ${new Date(payload.generatedAt).toLocaleString('es-ES')}`]).font = { size: 9, color: { argb: 'FF808080' } };
  if (payload.filters?.length) sum.addRow([`Filtros: ${payload.filters.join(' · ')}`]).font = { italic: true };
  sum.addRow([]);
  const kpis = payload.pages.flatMap((p) => p.items.filter((i) => i.kind === 'kpi'));
  if (kpis.length) {
    const h = sum.addRow(['Indicador', 'Valor', 'Detalle']);
    h.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    h.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandArgb } }; });
    kpis.forEach((k) => sum.addRow([k.label, k.value, k.sub || '']));
    sum.addRow([]);
  }
  const texts = payload.pages.flatMap((p) => p.items.filter((i) => i.kind === 'text' && i.paragraphs?.length));
  texts.forEach((t) => { if (t.title) sum.addRow([t.title]).font = { bold: true }; t.paragraphs.forEach((x) => { const r = sum.addRow([x]); sum.mergeCells(r.number, 1, r.number, 3); r.alignment = { wrapText: true, vertical: 'top' }; r.height = Math.min(90, 15 * Math.ceil(String(x).length / 95)); }); sum.addRow([]); });
  // Imágenes de los gráficos
  let row = sum.rowCount + 1;
  payload.pages.flatMap((p) => p.items.filter((i) => i.kind === 'image' && i.dataUrl)).forEach((img) => {
    sum.getCell(row, 1).value = img.title || 'Gráfico';
    sum.getCell(row, 1).font = { bold: true };
    const id = wb.addImage({ base64: img.dataUrl, extension: 'png' });
    const w = Math.min(720, img.width);
    const hgt = Math.round((img.height / img.width) * w);
    sum.addImage(id, { tl: { col: 0, row }, ext: { width: w, height: hgt } });
    row += Math.ceil(hgt / 20) + 3;
  });

  // Una hoja por tabla (y por los datos de cada gráfico)
  const addTable = (title, it) => {
    const ws = wb.addWorksheet(sheetName(title));
    setup(ws);
    const cols = it.columns;
    ws.columns = cols.map((c) => ({ header: c.label || c.name, key: c.name, width: Math.min(48, Math.max(10, String(c.label || c.name).length + 2)), style: NUMFMT[c.format] ? { numFmt: NUMFMT[c.format] } : c.type === 'number' ? { numFmt: NUMFMT.number } : {} }));
    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    head.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandArgb } }; c.alignment = { vertical: 'middle' }; });
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    const items = it.groups || it.rows.map((r) => ({ type: 'row', row: r }));
    for (const g of items) {
      if (g.type === 'group') {
        const r = ws.addRow(cols.map((c, i) => (i === 0 ? g.label : g.values?.[c.name] ?? null)));
        r.font = { bold: true };
        r.outlineLevel = g.level - 1;
        r.eachCell({ includeEmpty: true }, (c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }; });
      } else {
        const r = ws.addRow(cols.map((c) => toCellValue(g.row[c.name], c)));
        if (it.groups) r.outlineLevel = g.level || 1;
      }
    }
    if (it.totals) {
      const r = ws.addRow(cols.map((c, i) => (i === 0 ? 'Total' : it.totals[c.name] ?? null)));
      r.font = { bold: true };
      r.eachCell((c) => { c.border = { top: { style: 'thin' } }; });
    }
    cols.forEach((c, i) => {
      let max = String(c.label || c.name).length;
      ws.getColumn(i + 1).eachCell({ includeEmpty: false }, (cell) => { max = Math.max(max, String(cell.text ?? cell.value ?? '').length); });
      ws.getColumn(i + 1).width = Math.min(48, Math.max(10, max + 2));
    });
    if (!it.groups) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
    ws.pageSetup.printTitlesRow = '1:1';
  };
  let n = 0;
  payload.pages.forEach((p) => p.items.forEach((it) => {
    if (it.kind === 'table') addTable(it.title || `Tabla ${++n}`, it);
    else if (it.kind === 'image' && it.table?.rows?.length) addTable(`Datos ${it.title || ++n}`, it.table);
  }));
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
