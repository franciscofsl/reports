import { useEffect, useRef } from 'react';

/** Pinta un componente usando la misma librería RptLib que usarán los informes publicados. */
export default function LiveComponent({ type, props, source, palette }) {
  const ref = useRef(null);
  const key = JSON.stringify(props);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.RptLib) return;
    el.__rptGrid = null; // reinicia el estado interno de las tablas al cambiar propiedades
    window.RptLib.renderComponent(el, type, props, source, { interactive: false, palette });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, key, source, palette]);
  useEffect(() => () => ref.current?.__rptRO?.disconnect(), []);
  return <div ref={ref} className="rpt-c" />;
}
