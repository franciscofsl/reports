const P = {
  add: 'M12 5v14M5 12h14',
  delete: 'M5 7h14M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3',
  copy: 'M8 8h11v11H8z M5 16V5h11',
  up: 'm6 14 6-6 6 6',
  down: 'm6 10 6 6 6-6',
  left: 'm14 6-6 6 6 6',
  right: 'm10 6 6 6-6 6',
  save: 'M5 4h11l3 3v13H5z M8 4v5h7V4 M8 20v-6h8v6',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  edit: 'M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4',
  db: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6 M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  code: 'm8 7-5 5 5 5 M16 7l5 5-5 5 M14 4l-4 16',
  history: 'M4 12a8 8 0 1 0 2.3-5.7L4 8.6 M4 4v4.6h4.6 M12 8v4l3 2',
  upload: 'M12 16V4 M7 9l5-5 5 5 M5 20h14',
  download: 'M12 4v12 M7 11l5 5 5-5 M5 20h14',
  play: 'M7 5v14l12-7z',
  back: 'M19 12H5 M11 6l-6 6 6 6',
  close: 'M6 6l12 12M18 6 6 18',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  wand: 'M4 20 15 9 M14 4v2M18 6l-1.4 1.4M20 10h-2M12 8h.01M17 3l.7.7 M19 13l.7.7',
  external: 'M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6',
  layout: 'M4 4h16v16H4z M4 10h16 M10 10v10',
  table: 'M4 5h16v14H4z M4 10h16 M4 15h16 M10 5v14',
  check: 'm5 12 5 5 9-10',
  restore: 'M4 12a8 8 0 1 0 2.3-5.7L4 8.6 M4 4v4.6h4.6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19 12l2-1-1-3-2 .3-1.3-1.3.3-2-3-1-1 2h-2l-1-2-3 1 .3 2L6 7.3 4 7 3 10l2 1v2l-2 1 1 3 2-.3 1.3 1.3-.3 2 3 1 1-2h2l1 2 3-1-.3-2 1.3-1.3 2 .3 1-3-2-1z',
  report: 'M6 3h9l4 4v14H6z M14 3v5h5 M9 17v-3 M12 17v-6 M15 17v-2',
  people: 'M9 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5 M16 5.2a3 3 0 0 1 0 5.6 M18 14.4c1.6.7 2.6 2.2 3 4.6',
  box: 'M12 3 4 7v10l8 4 8-4V7z M4 7l8 4 8-4 M12 11v10',
  filter: 'M4 5h16l-6 8v6l-4-2v-4z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-4-4',
  share: 'M8 12h8 M12 8l4 4-4 4 M4 4h7 M4 4v16h16v-7',
};

export default function Icon({ name, path, size = 18, className = '', title }) {
  return (
    <svg className={`ui-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      <path d={path || P[name] || ''} />
    </svg>
  );
}
