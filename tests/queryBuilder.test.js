import { describe, expect, it } from 'vitest';
import { addTable, emptyBuilder, removeTable, toggleColumn, toSql } from '../src/lib/queryBuilder.js';
import { runQuery } from '../src/lib/sqlEngine.js';

function salesBuilder() {
  let b = emptyBuilder();
  b = addTable(b, 'pedidos');
  b = addTable(b, 'clientes');
  b = toggleColumn(b, 'c', 'region');
  b = toggleColumn(b, 'p', 'importe');
  b.columns[1] = { ...b.columns[1], agg: 'SUM', sort: 'DESC' };
  return b;
}

describe('queryBuilder', () => {
  it('une tablas automáticamente por clave foránea', () => {
    const b = salesBuilder();
    expect(b.joins).toHaveLength(1);
    expect(b.joins[0]).toMatchObject({ left: 'p', leftCol: 'cliente_id', right: 'c', rightCol: 'id' });
  });

  it('genera SQL ejecutable con agregación, GROUP BY y ORDER BY', () => {
    const { sql, warnings } = toSql(salesBuilder());
    expect(sql).toContain('INNER JOIN clientes AS c ON p.cliente_id = c.id');
    expect(sql).toContain('GROUP BY c.region');
    expect(sql).toContain('ORDER BY importe DESC');
    expect(warnings).toEqual([]);
    const r = runQuery(sql);
    expect(r.rows).toHaveLength(5);
    expect(r.rows[0].importe).toBeGreaterThan(r.rows[4].importe);
  });

  it('soporta filtros con valor, parámetros opcionales, rangos y funciones de fecha', () => {
    const b = salesBuilder();
    b.columns.push({ id: 'x', alias: 'p', col: 'fecha', fn: 'YEAR', agg: '', as: 'anio', sort: '' });
    b.filters.push({ id: 'f1', alias: 'p', col: 'estado', op: '<>', kind: 'value', value: 'Cancelado' });
    b.filters.push({ id: 'f2', alias: 'c', col: 'nombre', op: 'LIKE', kind: 'param', param: 'q', optional: true });
    b.filters.push({ id: 'f3', alias: 'p', col: 'fecha', op: 'BETWEEN', kind: 'param', param: 'periodo' });
    const { sql } = toSql(b);
    expect(sql).toContain('(:q IS NULL OR');
    expect(sql).toContain('BETWEEN :periodo_desde AND :periodo_hasta');
    const all = runQuery(sql, { q: null, periodo_desde: '2025-01-01', periodo_hasta: '2025-12-31' }).rows;
    const some = runQuery(sql, { q: 'Acme', periodo_desde: '2025-01-01', periodo_hasta: '2025-12-31' }).rows;
    expect(all.every((r) => r.anio === 2025)).toBe(true);
    expect(some.length).toBeLessThanOrEqual(all.length);
  });

  it('avisa de tablas sin relación y quita sus columnas al eliminarlas', () => {
    let b = addTable(addTable(emptyBuilder(), 'productos'), 'empleados');
    expect(toSql(b).warnings.join(' ')).toMatch(/no está relacionada/);
    b = toggleColumn(b, 'e', 'nombre');
    b = removeTable(b, 'e');
    expect(b.columns).toHaveLength(0);
    expect(b.tables).toHaveLength(1);
  });
});
