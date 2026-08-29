import React from 'react';
import { Search, RotateCw, Zap } from 'lucide-react';

interface SearchInputProps {
  query: string;
  isLoading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onQueryChange: (query: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export default function SearchInput({
  query,
  isLoading,
  inputRef,
  onQueryChange,
  onKeyDown,
}: SearchInputProps) {
  const isSlashCommand = query.startsWith('/');

  return (
    <div className="px-4 py-3 flex-shrink-0">
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          {isSlashCommand ? (
            <Zap className="w-4 h-4 text-[var(--chart-4)]" />
          ) : (
            <Search className="w-4 h-4 text-[var(--muted-foreground)]" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={isSlashCommand ? 'Type command name...' : 'Search problems...'}
          className={`w-full pl-10 pr-12 py-3 text-sm border border-[var(--border)] rounded-xl focus:outline-none focus:ring-1 focus:ring-[var(--ring)] transition-all placeholder:text-[var(--muted-foreground)] ${
            isSlashCommand
              ? 'bg-[var(--chart-4)]/10 text-[var(--chart-4)] border-[var(--chart-4)]/30'
              : 'bg-[var(--card)] text-[var(--foreground)] focus:bg-[var(--background)]'
          }`}
        />
        {isLoading ? (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <RotateCw className="w-4 h-4 text-[var(--muted-foreground)] animate-spin" />
          </div>
        ) : !isSlashCommand ? (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded bg-[var(--muted)] border border-[var(--border)] text-[10px] text-[var(--muted-foreground)] font-mono">
            /
          </div>
        ) : null}
      </div>
    </div>
  );
}
