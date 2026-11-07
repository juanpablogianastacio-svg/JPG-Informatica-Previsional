import { Search, X } from 'lucide-react';

export default function SearchInput({ value, onChange, placeholder = 'Buscar…', className = '' }) {
  return (
    <label className={`search-input ${className}`}>
      <Search size={18} className="muted shrink-0" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      {value && (
        <button type="button" className="muted" style={{ border: 0, background: 'none', cursor: 'pointer', padding: 0, display: 'flex' }} onClick={() => onChange('')} aria-label="Limpiar búsqueda">
          <X size={16} />
        </button>
      )}
    </label>
  );
}
