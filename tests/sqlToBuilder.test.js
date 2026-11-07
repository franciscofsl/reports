import { describe, expect, it } from 'vitest';
import { sqlToBuilder } from '../src/lib/sqlToBuilder.js';
import { toSql } from '../src/lib/queryBuilder.js';
import { runQuery } from '../src/lib/sqlEngine.js';
import { QUERY_SNIPPETS, TEMPLATES } from '../src/lib/templates.js';

const params = { anio: 2025, q: null, periodo_desde: '2025-01-01', periodo_hasta: '2025-12-31' };
const same = (a, b) => {
  const ra = runQuery(a, params).rows;
  const rb = runQuery(b, params).rows;
  const norm = (rows) => rows.map((r) => JSON.stringify(Object.values(r)));
  expect(norm(rb)).toEqual(norm(ra));
};

describe('sqlToBuilder: ida y vuelta', () => {
  const convertible = {
    'join con alias, agregaciones, filtros, orden y límite': `SELECT DISTINCT c.region AS region, SUM(p.importe) AS importe, COUNT(*) AS n, COUNT(DISTINCT p.cliente_id) AS cl
FROM pedidos AS p INNER JOIN clientes c ON p.cliente_id = c.id LEFT JOIN empleados AS e ON p.empleado_id = e.id
WHERE p.estado <> 'Cancelado' AND YEAR(p.fecha) = :anio AND (:q IS NULL OR c.nombre LIKE '%' + :q + '%') AND p.fecha BETWEEN :periodo_desde AND :periodo_hasta AND c.region IN ('Sur','Norte') AND p.importe > 100 AND c.ciudad IS NOT NULL
GROUP BY c.region ORDER BY importe DESC LIMIT 5`,
    'sin alias ni prefijos': 'SELECT nombre, region FROM clientes WHERE activo = true ORDER BY nombre',
    'SELECT *': 'SELECT * FROM productos',
    'funciones en columnas y GROUP BY': "SELECT YEAR(fecha) AS anio, SUBSTRING(fecha, 1, 7) AS mes, AVG(ROUND(importe, 2)) AS media FROM pedidos GROUP BY YEAR(fecha), SUBSTRING(fecha, 1, 7) ORDER BY mes",
    'LIKE literal y BETWEEN con valores': "SELECT id, nombre FROM clientes WHERE nombre LIKE '%Acme%' AND id BETWEEN 1 AND 40",
  };
  for (const [name, sql] of Object.entries(convertible)) {
    it(`convierte: ${name}`, () => {
      const b = sqlToBuilder(sql);
      same(sql, toSql(b).sql);
    });
  }

  it('todas las consultas de ejemplo se convierten con el mismo resultado o explican por qué no', () => {
    const all = [...QUERY_SNIPPETS.map((q) => q.sql), ...TEMPLATES.flatMap((t) => t.build().dataSources.map((d) => d.sql))];
    let converted = 0;
    for (const sql of all) {
      let b;
      try { b = sqlToBuilder(sql); } catch (e) { expect(e.message.length).toBeGreaterThan(5); continue; }
      same(sql, toSql(b).sql);
      converted++;
    }
    expect(converted).toBeGreaterThanOrEqual(6);
  });

  const unsupported = {
    'expresión aritmética': ['SELECT objetivo_mensual * 12 AS anual FROM empleados', /aritméticas/],
    CASE: ["SELECT CASE WHEN importe > 1 THEN 'a' END AS x FROM pedidos", /CASE/],
    'origen derivado': ['SELECT * FROM origen.pedidos', /orígenes derivados/],
    HAVING: ['SELECT region, COUNT(*) AS n FROM clientes GROUP BY region HAVING COUNT(*) > 1', /HAVING/],
    OR: ["SELECT * FROM clientes WHERE region = 'Sur' OR region = 'Norte'", /OR/],
    'subconsulta': ['SELECT * FROM pedidos WHERE cliente_id IN (SELECT id FROM clientes)', /subconsulta/],
    'RIGHT JOIN': ['SELECT p.id FROM pedidos p RIGHT JOIN clientes c ON p.cliente_id = c.id', /RIGHT/],
    'tabla inexistente': ['SELECT * FROM facturas', /no existe/],
    'agregación dentro de función': ['SELECT ROUND(AVG(importe), 2) AS m FROM pedidos', /agregación dentro/],
  };
  for (const [name, [sql, re]] of Object.entries(unsupported)) {
    it(`explica por qué no convierte: ${name}`, () => {
      expect(() => sqlToBuilder(sql)).toThrow(re);
    });
  }

  it('conserva la posición de las tablas del diseño anterior', () => {
    const prev = { tables: [{ alias: 'p', table: 'pedidos', x: 400, y: 120 }] };
    const b = sqlToBuilder('SELECT p.id FROM pedidos p', prev);
    expect(b.tables[0]).toMatchObject({ x: 400, y: 120 });
  });
});
