import { useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { LeetCodeProblem } from '@/utils/database';
import ProblemItem, { ExtendedProblem } from './ProblemItem';
import EmptyState from './EmptyState';
import SlashCommandSuggestions from './SlashCommandSuggestions';
import { SlashCommandSuggestion } from '@/utils/slash-commands';
import { DisplayItem } from '../entrypoints/popup/App';

type SearchResult = ExtendedProblem;

const RECOMMENDED_GROUP_USERNAME = '__recommended__';

interface ResultsListProps {
  displayItems: DisplayItem[];
  query: string;
  isLoading: boolean;
  selectedIndex: number;
  onOpenProblem: (problem: LeetCodeProblem) => void;
  slashCommandSuggestions?: SlashCommandSuggestion[];
  onSelectSlashCommand?: (command: string) => void;
  isShowingHistory?: boolean;
  isShowingSuggestions?: boolean;
  onToggleGroup?: (username: string) => void;
}

export default function ResultsList({
  displayItems,
  query,
  isLoading,
  selectedIndex,
  onOpenProblem,
  slashCommandSuggestions = [],
  onSelectSlashCommand,
  isShowingHistory = false,
  isShowingSuggestions = false,
  onToggleGroup,
}: ResultsListProps) {
  const hasResults = displayItems.length > 0;
  const isCommand = query.startsWith('/') || query.startsWith('@');
  const shouldShowEmpty =
    (!hasResults && !isLoading && !isCommand) ||
    (isShowingHistory && !hasResults && !isLoading);
  const shouldShowSlashSuggestions = isCommand && slashCommandSuggestions.length > 0;

  // Check if we're in help mode
  const isHelpMode =
    query.toLowerCase().startsWith('/help') ||
    query.toLowerCase().startsWith('/commands') ||
    query.toLowerCase().startsWith('@help');

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
    const itemCount = shouldShowSlashSuggestions ? slashCommandSuggestions.length : displayItems.length;
    itemRefs.current = itemRefs.current.slice(0, itemCount);
  }, [displayItems.length, slashCommandSuggestions.length, shouldShowSlashSuggestions]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      {shouldShowEmpty && (
        <EmptyState
          hasQuery={!!query}
          isLoading={isLoading}
          isShowingHistory={isShowingHistory}
          isShowingSuggestions={isShowingSuggestions}
        />
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

      {hasResults && !isCommand && (
        <div className="space-y-0 relative">
          {(() => {
            const groupedElements = [];
            let currentGroup: { item: DisplayItem; index: number }[] = [];
            
            displayItems.forEach((item, index) => {
              if (item.type === 'header') {
                if (currentGroup.length > 0) groupedElements.push(currentGroup);
                currentGroup = [{ item, index }];
              } else {
                currentGroup.push({ item, index });
              }
            });
            if (currentGroup.length > 0) groupedElements.push(currentGroup);

            return groupedElements.map((group, groupIdx) => (
              <div key={groupIdx} className="relative">
                {group.map(({ item, index }) => {
                  if (item.type === 'header') {
                    return (
                      <div
                        key={item.id}
                        ref={(el: HTMLDivElement | null) => { itemRefs.current[index] = el; }}
                        onClick={() => onToggleGroup?.(item.groupUsername)}
                        className={`sticky top-0 z-10 flex items-center justify-between px-4 py-1.5 bg-[var(--muted)] border-b border-[var(--border)] cursor-pointer hover:bg-[var(--accent)] transition-colors ${index === selectedIndex ? 'ring-2 ring-inset ring-[var(--primary)]' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          {item.groupUsername === RECOMMENDED_GROUP_USERNAME ? (
                            <span className="text-xs font-semibold text-[var(--muted-foreground)]">
                              Recommended for you
                            </span>
                          ) : (
                            <>
                              <img
                                src={
                                  item.groupFriend?.avatarUrl ||
                                  'https://assets.leetcode.com/users/default_avatar.jpg'
                                }
                                alt={item.groupFriend?.username}
                                className="w-4 h-4 rounded-full object-cover"
                              />
                              <span className="text-xs font-semibold text-[var(--foreground)]">
                                {item.groupFriend?.username}
                              </span>
                            </>
                          )}
                        </div>
                        {item.isCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" />
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={item.id}>
                      <ProblemItem
                        ref={(el: HTMLDivElement | null) => {
                          itemRefs.current[index] = el;
                        }}
                        problem={item.problem}
                        index={index}
                        selectedIndex={selectedIndex}
                        onOpen={onOpenProblem}
                      />
                    </div>
                  );
                })}
              </div>
            ));
          })()}
        </div>
      )}

      {isCommand && slashCommandSuggestions.length === 0 && !isLoading && (
        <div className="px-4 py-12 text-center">
          <div className="text-sm font-medium text-[var(--foreground)] mb-1">No commands found</div>
          <div className="text-xs text-[var(--muted-foreground)]">Try typing @chase or /help</div>
        </div>
      )}
    </div>
  );
}
