import React, { forwardRef } from 'react';
import { Zap, ArrowRight, HelpCircle, Calendar } from 'lucide-react';
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
        <div className="text-xs text-[var(--muted-foreground)]">Try typing /potd or /help</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 text-xs text-[var(--chart-4)]">
          <Zap className="w-3 h-3" />
          <span>{isHelpMode ? 'Available Commands' : 'Slash Commands'}</span>
        </div>
      </div>

      <div className="space-y-0">
        {suggestions.map((suggestion, index) => {
          return (
            <div
              key={`${suggestion.command.id}-${suggestion.matchedAlias}`}
              ref={el => {
                if (itemRefs) {
                  itemRefs.current[index] = el;
                }
              }}
              className={`group px-4 py-3 cursor-pointer transition-all duration-150 border-l-2 ${
                index === selectedIndex
                  ? 'bg-[var(--chart-4)]/10 border-l-[var(--chart-4)] border-l-4'
                  : 'hover:bg-[var(--accent)] border-l-transparent'
              }`}
              onClick={() => onSelect(`/${suggestion.matchedAlias}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[var(--foreground)] text-sm mb-0.5">
                      <span className="text-[var(--chart-4)]">/</span>
                      <span className="text-[var(--chart-4)]">{suggestion.matchedAlias}</span>
                      {isHelpMode && suggestion.command.aliases.length > 1 && (
                        <span className="text-[var(--muted-foreground)] text-xs ml-2">
                          (also:{' '}
                          {suggestion.command.aliases
                            .filter(alias => alias !== suggestion.matchedAlias)
                            .map(alias => `/${alias}`)
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
