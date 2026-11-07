// Genera una base de datos de ejemplo determinista (JSON) que simula una BD SQL.
import { writeFileSync } from 'node:fs';

let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
const pad = (n) => String(n).padStart(2, '0');

const regiones = ['Norte', 'Sur', 'Este', 'Oeste', 'Centro'];
const ciudades = { Norte: ['Bilbao', 'Santander', 'Oviedo'], Sur: ['Sevilla', 'Málaga', 'Granada'], Este: ['Valencia', 'Barcelona', 'Alicante'], Oeste: ['Badajoz', 'Cáceres', 'Salamanca'], Centro: ['Madrid', 'Toledo', 'Segovia'] };
const nombres = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Hooli', 'Vandelay', 'Stark', 'Wayne', 'Tyrell', 'Soylent', 'Cyberdyne', 'Wonka', 'Oceanic', 'Gekko', 'Massive', 'Aperture', 'Duff', 'Monarch', 'Pied Piper', 'Dunder'];
const sufijos = ['S.L.', 'S.A.', 'Group', 'Iberia', 'Retail'];
const segmentos = ['Empresa', 'Pyme', 'Particular'];

const clientes = Array.from({ length: 60 }, (_, i) => {
  const region = pick(regiones);
  return {
    id: i + 1,
    nombre: `${pick(nombres)} ${pick(sufijos)} ${i + 1}`,
    segmento: pick(segmentos),
    region,
    ciudad: pick(ciudades[region]),
    alta: `20${pick(['21', '22', '23', '24'])}-${pad(int(1, 12))}-${pad(int(1, 28))}`,
    activo: rnd() > 0.15,
  };
});

const categorias = { Hardware: ['Portátil', 'Monitor', 'Teclado', 'Ratón', 'Docking'], Software: ['Licencia ERP', 'Antivirus', 'Suite ofimática', 'CRM'], Servicios: ['Soporte anual', 'Formación', 'Consultoría', 'Instalación'] };
const productos = [];
for (const [cat, items] of Object.entries(categorias)) {
  for (const nombre of items) {
    productos.push({ id: productos.length + 1, nombre, categoria: cat, precio: cat === 'Hardware' ? int(20, 1500) : cat === 'Software' ? int(50, 900) : int(200, 3000), stock: cat === 'Servicios' ? null : int(0, 400) });
  }
}

const empleados = ['Ana López', 'Luis Pérez', 'Marta Ruiz', 'Javier Gil', 'Lucía Martín', 'Pablo Sanz', 'Elena Díaz', 'Carlos Vega'].map((nombre, i) => ({ id: i + 1, nombre, region: regiones[i % regiones.length], objetivo_mensual: int(25, 50) * 1000 }));

const estados = ['Entregado', 'Entregado', 'Entregado', 'Enviado', 'Pendiente', 'Cancelado'];
const pedidos = [];
const lineas = [];
for (let i = 1; i <= 900; i++) {
  const year = pick([2024, 2025, 2025, 2026]);
  const month = year === 2026 ? int(1, 10) : int(1, 12);
  const cliente = pick(clientes);
  const empleado = empleados.find((e) => e.region === cliente.region) || pick(empleados);
  let total = 0;
  const n = int(1, 4);
  for (let j = 0; j < n; j++) {
    const p = pick(productos);
    const cantidad = p.categoria === 'Servicios' ? 1 : int(1, 10);
    const descuento = pick([0, 0, 0, 0.05, 0.1]);
    const importe = Math.round(p.precio * cantidad * (1 - descuento) * 100) / 100;
    total += importe;
    lineas.push({ id: lineas.length + 1, pedido_id: i, producto_id: p.id, cantidad, precio_unitario: p.precio, descuento, importe });
  }
  pedidos.push({ id: i, fecha: `${year}-${pad(month)}-${pad(int(1, 28))}`, cliente_id: cliente.id, empleado_id: empleado.id, estado: pick(estados), importe: Math.round(total * 100) / 100 });
}

const db = { clientes, productos, empleados, pedidos, lineas_pedido: lineas };
writeFileSync(new URL('../src/data/sampledb.json', import.meta.url), JSON.stringify(db));
console.log(Object.entries(db).map(([k, v]) => `${k}: ${v.length}`).join(', '));
