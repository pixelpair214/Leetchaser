import React from 'react';
import { Zap, ArrowRight, Target, Sparkles } from 'lucide-react';
import { SlashCommandSuggestion } from '@/utils/slash-commands';

interface SlashCommandSuggestionsProps {
  suggestions: SlashCommandSuggestion[];
  selectedIndex: number;
  onSelect: (command: string) => void;
  isHelpMode?: boolean;
  itemRefs?: React.RefObject<(HTMLDivElement | null)[]>;
}

export default function SlashCommandSuggestions({
  suggestions,
  selectedIndex,
  onSelect,
  isHelpMode = false,
  itemRefs,
}: SlashCommandSuggestionsProps) {
  if (suggestions.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <div className="text-sm font-medium text-[var(--foreground)] mb-1">No commands found</div>
        <div className="text-xs text-[var(--muted-foreground)]">Try typing @chase or /help</div>
      </div>
    );
  }

  const isChaseSuggestion = suggestions.some(s => s.command.id === 'chase' || s.prefix === '@') && !suggestions.some(s => s.command.id === 'stuck');
  const isStuckSuggestion = suggestions.some(s => s.command.id === 'stuck');
  const isAtSuggestion = suggestions.some(s => s.prefix === '@');

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className={`flex items-center gap-2 text-xs ${
          isStuckSuggestion ? 'text-purple-400' : isChaseSuggestion ? 'text-[#FF8A00]' : 'text-[var(--chart-4)]'
        }`}>
          {isStuckSuggestion ? <Sparkles className="w-3.5 h-3.5" /> : isChaseSuggestion ? <Target className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
          <span className="font-semibold">{isHelpMode ? 'Available Commands' : 'Commands & Shortcuts'}</span>
        </div>
      </div>

      <div className="space-y-0">
        {suggestions.map((suggestion, index) => {
          const prefix = suggestion.prefix || (suggestion.command.id === 'chase' ? '@' : suggestion.command.id === 'stuck' ? '@' : '/');
          const isChase = suggestion.command.id === 'chase' || (prefix === '@' && suggestion.command.id !== 'stuck');
          const isStuck = suggestion.command.id === 'stuck';
          const accentColor = isStuck ? 'var(--purple-400, #a855f7)' : isChase ? '#FF8A00' : 'var(--chart-4)';

          return (
            <div
              key={`${suggestion.command.id}-${suggestion.matchedAlias}-${prefix}`}
              ref={el => {
                if (itemRefs && itemRefs.current) {
                  itemRefs.current[index] = el;
                }
              }}
              className={`group px-4 py-3 cursor-pointer transition-all duration-150 border-l-2 ${
                index === selectedIndex
                  ? isStuck
                    ? 'bg-purple-500/10 border-l-purple-500 border-l-4'
                    : isChase 
                    ? 'bg-[#FF8A00]/10 border-l-[#FF8A00] border-l-4'
                    : 'bg-[var(--chart-4)]/10 border-l-[var(--chart-4)] border-l-4'
                  : 'hover:bg-[var(--accent)] border-l-transparent'
              }`}
              onClick={() => onSelect(`${prefix}${suggestion.matchedAlias}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[var(--foreground)] text-sm mb-0.5 flex items-center">
                      <span style={{ color: accentColor }}>{prefix}</span>
                      <span style={{ color: accentColor }}>{suggestion.matchedAlias}</span>
                      {isHelpMode && suggestion.command.aliases.length > 1 && (
                        <span className="text-[var(--muted-foreground)] text-xs ml-2">
                          (also:{' '}
                          {suggestion.command.aliases
                            .filter(alias => alias !== suggestion.matchedAlias)
                            .map(alias => `${prefix}${alias}`)
                            .join(', ')}
                          )
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] truncate">
                      {suggestion.command.description}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <ArrowRight className="w-3 h-3 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
