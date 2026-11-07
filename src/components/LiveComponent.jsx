import { useEffect, useRef } from 'react';

/** Pinta un componente usando la misma librería RptLib que usarán los informes publicados. */
export default function LiveComponent({ type, props, source, palette, semantic, srcId, designer, data }) {
  const ref = useRef(null);
  const key = JSON.stringify(props);
  const semKey = JSON.stringify(semantic || null);
  const palKey = JSON.stringify(palette || null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.RptLib) return;
    el.__rptGrid = null; // reinicia el estado interno de las tablas al cambiar propiedades
    window.RptLib.renderComponent(el, type, props, source, { interactive: false, palette, semantic: semantic || {}, srcId, designer, data });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, key, source, palKey, semKey, srcId, data]);
  useEffect(() => () => ref.current?.__rptRO?.disconnect(), []);
  return <div ref={ref} className="rpt-c" />;
}
