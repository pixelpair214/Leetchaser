import { useEffect, useRef } from 'react';
import { LeetCodeProblem } from '@/utils/database';
import ProblemItem from './ProblemItem';
import EmptyState from './EmptyState';
import SlashCommandSuggestions from './SlashCommandSuggestions';
import { SlashCommandSuggestion } from '@/utils/slash-commands';

interface SearchResult extends LeetCodeProblem {
  matchType?: 'id' | 'title' | 'slug';
}

interface ResultsListProps {
  results: SearchResult[];
  query: string;
  isLoading: boolean;
  selectedIndex: number;
  onOpenProblem: (problem: LeetCodeProblem) => void;
  slashCommandSuggestions?: SlashCommandSuggestion[];
  onSelectSlashCommand?: (command: string) => void;
  isShowingHistory?: boolean;
}

export default function ResultsList({
  results,
  query,
  isLoading,
  selectedIndex,
  onOpenProblem,
  slashCommandSuggestions = [],
  onSelectSlashCommand,
  isShowingHistory = false,
}: ResultsListProps) {
  const hasResults = results.length > 0;
  const isSlashCommand = query.startsWith('/');
  const shouldShowEmpty =
    (!hasResults && !isLoading && !isSlashCommand) ||
    (isShowingHistory && !hasResults && !isLoading);
  const shouldShowSlashSuggestions = isSlashCommand && slashCommandSuggestions.length > 0;

  // Check if we're in help mode
  const isHelpMode =
    query.toLowerCase().startsWith('/help') || query.toLowerCase().startsWith('/commands');

  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Auto-scroll to selected item
  useEffect(() => {
    if ((hasResults || shouldShowSlashSuggestions) && selectedIndex >= 0) {
      const targetElement = itemRefs.current[selectedIndex];
      const container = containerRef.current;

      if (targetElement && container) {
        targetElement.scrollIntoView({
          behavior: 'auto',
          block: 'nearest',
        });
      }
    }
  }, [selectedIndex, hasResults, shouldShowSlashSuggestions]);

  // Reset refs when results change
  useEffect(() => {
    const itemCount = shouldShowSlashSuggestions ? slashCommandSuggestions.length : results.length;
    itemRefs.current = itemRefs.current.slice(0, itemCount);
  }, [results.length, slashCommandSuggestions.length, shouldShowSlashSuggestions]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      {shouldShowEmpty && (
        <EmptyState hasQuery={!!query} isLoading={isLoading} isShowingHistory={isShowingHistory} />
      )}

      {shouldShowSlashSuggestions && (
        <SlashCommandSuggestions
          suggestions={slashCommandSuggestions}
          selectedIndex={selectedIndex}
          onSelect={onSelectSlashCommand || (() => {})}
          isHelpMode={isHelpMode}
          itemRefs={itemRefs}
        />
      )}

      {hasResults && !isSlashCommand && (
        <div className="space-y-0">
          {results.map((problem, index) => (
            <ProblemItem
              key={problem.id}
              ref={(el: HTMLDivElement | null) => {
                itemRefs.current[index] = el;
              }}
              problem={problem}
              index={index}
              selectedIndex={selectedIndex}
              onOpen={onOpenProblem}
            />
          ))}
        </div>
      )}

      {isSlashCommand && slashCommandSuggestions.length === 0 && !isLoading && (
        <div className="px-4 py-12 text-center">
          <div className="text-sm font-medium text-[var(--foreground)] mb-1">No commands found</div>
          <div className="text-xs text-[var(--muted-foreground)]">Try typing /potd or /help</div>
        </div>
      )}
    </div>
  );
}
