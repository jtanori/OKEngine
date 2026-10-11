// PR-DOCS-SEARCH — Search input with hybrid search, citations, FORM-SEC-01
import React, { useState } from 'react';

export interface DocsSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function DocsSearch({ onSearch, placeholder = 'Buscar en documentación...', className = '' }: DocsSearchProps) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleChange = (value: string) => {
    // FORM-SEC-01 check
    const dangerous = /<\s*(script|iframe|object|embed)\b|on\w+\s*=|(javascript|data|vbscript):/i;
    if (dangerous.test(value)) {
      setError('Contenido no permitido');
      return;
    }
    setError(null);
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={!!error}
          className={`w-full h-9 pl-8 pr-3 rounded-sm border bg-elevated text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent-subtle focus:border-accent ${error ? 'border-danger' : 'border-line'}`}
        />
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted text-xs">⌕</span>
      </div>
      {error ? <div className="text-xs text-danger" role="alert">{error}</div> : <div className="text-2xs text-ink-muted">Búsqueda híbrida semántica + keyword con citas verificables</div>}
    </div>
  );
}
