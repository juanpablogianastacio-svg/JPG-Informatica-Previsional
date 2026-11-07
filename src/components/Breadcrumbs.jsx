import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';

/** items: [{ label, to? }] — el último es la página actual */
export default function Breadcrumbs({ items }) {
  return (
    <nav className="crumbs" aria-label="Ruta de navegación">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="inline-flex items-center gap-1">
            {last || !it.to ? (
              <span className={`crumb ${last ? 'current' : ''}`} aria-current={last ? 'page' : undefined}>
                {it.label}
              </span>
            ) : (
              <Link className="crumb" to={it.to}>
                {it.label}
              </Link>
            )}
            {!last && <ChevronRight size={14} className="muted" />}
          </span>
        );
      })}
    </nav>
  );
}
