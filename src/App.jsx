import { useEffect, useState, useSyncExternalStore } from 'react';
import { listReports, subscribe } from './lib/store.js';
import ReportList from './pages/ReportList.jsx';
import ReportEditor from './pages/ReportEditor.jsx';
import Wizard from './pages/Wizard.jsx';
import Icon from './components/Icon.jsx';

function useHash() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const on = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

let cache = null;
const getSnapshot = () => (cache ??= listReports());
const sub = (fn) => subscribe(() => { cache = null; fn(); });

export default function App() {
  const hash = useHash();
  const reports = useSyncExternalStore(sub, getSnapshot);
  const go = (h) => { window.location.hash = h; window.scrollTo(0, 0); };
  const [path, query] = hash.slice(1).split('?');
  const parts = path.split('/').filter(Boolean);

  let page;
  if (parts[0] === 'new') page = <Wizard key={hash} go={go} initialMode={new URLSearchParams(query).get('mode')} />;
  else if (parts[0] === 'report' && parts[1]) page = <ReportEditor key={parts[1]} id={parts[1]} tab={parts[2] || 'preview'} go={go} />;
  else page = <ReportList reports={reports} go={go} />;

  return (
    <div className="app">
      <header className="appbar">
        <a href="#/" className="appbar-brand"><span className="appbar-logo"><Icon path="M7 17V11M12 17V7M17 17v-4" size={18} /></span>Informes</a>
        <span className="appbar-sub">Prototipo de diseñador de informes HTML</span>
        <span className="ui-spacer" />
        <a className="appbar-link" href="./lib/rptlib/1.0.0/rptlib.js" target="_blank" rel="noreferrer">RptLib 1.0.0</a>
      </header>
      <main className="app-main">{page}</main>
    </div>
  );
}
