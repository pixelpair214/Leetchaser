import React from 'react';
import { Search, RotateCw, Zap, Target, Sparkles } from 'lucide-react';

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
  const isAtCommand = query.startsWith('@');
  const isSlashCommand = query.startsWith('/');
  const isCommand = isAtCommand || isSlashCommand;
  const isStuckCommand = isAtCommand && (
    query.toLowerCase().startsWith('@stuck') ||
    query.toLowerCase().startsWith('@hint') ||
    query.toLowerCase().startsWith('@ask')
  );

  return (
    <div className="px-4 py-3 flex-shrink-0">
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          {isStuckCommand ? (
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
          ) : isAtCommand ? (
            <Target className="w-4 h-4 text-[#FF8A00] animate-pulse" />
          ) : isSlashCommand ? (
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
          placeholder={
            isStuckCommand
              ? 'Type @stuck to get AI hints & problem breakdown...'
              : isAtCommand
              ? 'Type @chase to enter chase mode...'
              : isSlashCommand
              ? 'Type /random, /suggestion, /help...'
              : 'Search problems, /commands, or @stuck...'
          }
          className={`w-full pl-10 pr-16 py-3 text-sm border border-[var(--border)] rounded-xl focus:outline-none focus:ring-1 focus:ring-[var(--ring)] transition-all placeholder:text-[var(--muted-foreground)] ${
            isStuckCommand
              ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 font-medium'
              : isAtCommand
              ? 'bg-[#FF8A00]/10 text-[#FF8A00] border-[#FF8A00]/30 font-medium'
              : isSlashCommand
              ? 'bg-[var(--chart-4)]/10 text-[var(--chart-4)] border-[var(--chart-4)]/30 font-medium'
              : 'bg-[var(--card)] text-[var(--foreground)] focus:bg-[var(--background)]'
          }`}
        />
        {isLoading ? (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <RotateCw className="w-4 h-4 text-[var(--muted-foreground)] animate-spin" />
          </div>
        ) : !isCommand ? (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            <div className="flex items-center justify-center px-1.5 h-5 rounded bg-[var(--muted)] border border-[var(--border)] text-[10px] text-purple-400 font-mono font-bold">
              @stuck
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
