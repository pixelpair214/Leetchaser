import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LeetCodeProblem } from '@/utils/database';
import { slashCommandService, SlashCommandSuggestion } from '@/utils/slash-commands';

import Header from '@/components/Header';
import SearchInput from '@/components/SearchInput';
import ResultsList from '@/components/ResultsList';
import Footer from '@/components/Footer';
import Dashboard, { DashboardData } from '@/components/Dashboard';
import ChaseMode from '@/components/ChaseMode';

export interface FriendUser {
  username: string;
  avatarUrl?: string;
}

export interface SearchResult extends LeetCodeProblem {
  matchType?: 'id' | 'title' | 'slug' | 'following' | 'similar';
  solvedByFriends?: FriendUser[];
  similarToTitle?: string;
  /** Set on /suggestion results only. Items sharing the same groupFriend.username
   * are rendered consecutively under one friend header by ResultsList. */
  groupFriend?: FriendUser;
}

// Sentinel used for similar-problem items that aren't tied to any followed
// friend's solved problem (e.g. general recommendations).
const RECOMMENDED_GROUP: FriendUser = { username: '__recommended__' };

export type DisplayItem =
  | { type: 'header'; id: string; groupUsername: string; groupFriend?: FriendUser; isCollapsed: boolean }
  | { type: 'problem'; id: string; problem: SearchResult };

/**
 * Reorders flat /suggestion results into friend blocks:
 * [friend A header] A's solved problems -> similar picks stemming from those
 * [friend B header] B's solved problems -> similar picks stemming from those
 * [Recommended header] any similar picks not tied to a followed problem
 *
 * The array order IS the render/selection order, so keyboard nav and
 * selectedIndex in App.tsx keep working unchanged - ResultsList just draws
 * a header whenever `groupFriend.username` changes between consecutive items.
 */
function groupSuggestionsByFriend(items: SearchResult[]): SearchResult[] {
  const following = items.filter(i => i.matchType === 'following');
  const similar = items.filter(i => i.matchType === 'similar');
  const others = items.filter(i => i.matchType !== 'following' && i.matchType !== 'similar');

  // Group followed problems by their primary (first) friend, preserving
  // first-seen order of friends
  const friendOrder: string[] = [];
  const friendBlocks = new Map<string, { friend: FriendUser; solved: SearchResult[] }>();
  following.forEach(item => {
    const friend = item.solvedByFriends?.[0];
    if (!friend) return;
    if (!friendBlocks.has(friend.username)) {
      friendBlocks.set(friend.username, { friend, solved: [] });
      friendOrder.push(friend.username);
    }
    friendBlocks.get(friend.username)!.solved.push(item);
  });

  const grouped: SearchResult[] = [];

  friendOrder.forEach(username => {
    const { friend, solved } = friendBlocks.get(username)!;
    solved.forEach(item => {
      grouped.push({ ...item, groupFriend: friend });
    });
  });

  similar.forEach(item => {
    grouped.push({ ...item, groupFriend: RECOMMENDED_GROUP });
  });

  grouped.push(...others);

  return grouped;
}

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    isStale: boolean;
    lastSync: Date | null;
    totalCount: number;
  } | null>(null);
  const [slashCommandSuggestions, setSlashCommandSuggestions] = useState<SlashCommandSuggestion[]>(
    []
  );
  const [isShowingHistory, setIsShowingHistory] = useState(false);
  const [isShowingSuggestions, setIsShowingSuggestions] = useState(false);
  const [isShowingChaseMode, setIsShowingChaseMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);

  const displayItems = React.useMemo(() => {
    if (!isShowingSuggestions || results.length === 0) {
      return results.map(p => ({ type: 'problem' as const, id: `prob-${p.id}`, problem: p }));
    }
    const items: DisplayItem[] = [];
    let currentGroup = '';

    results.forEach(p => {
      const groupUsername = p.groupFriend?.username;
      if (groupUsername && groupUsername !== currentGroup) {
        currentGroup = groupUsername;
        items.push({
          type: 'header',
          id: `header-${groupUsername}`,
          groupUsername,
          groupFriend: p.groupFriend,
          isCollapsed: !expandedGroups.has(groupUsername)
        });
      }

      if (!groupUsername || expandedGroups.has(groupUsername)) {
        items.push({
          type: 'problem',
          id: `prob-${p.id}-${p.slug}`,
          problem: p
        });
      }
    });
    return items;
  }, [results, isShowingSuggestions, expandedGroups]);

  const toggleGroup = useCallback((username: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  }, []);

  // Initialize theme from storage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const result = (await browser.storage.local.get('theme')) as any;
        const savedTheme = result?.theme || 'light';
        const isDark = savedTheme === 'dark';
        setIsDarkMode(isDark);
        document.documentElement.setAttribute('data-theme', savedTheme);
      } catch (error) {
        console.error('Failed to load theme:', error);
      }
    };
    loadTheme();
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    const loadDashboard = async () => {
      setIsDashboardLoading(true);
      try {
        const response = await browser.runtime.sendMessage({
          type: 'GET_DASHBOARD_DATA',
        });
        if (response?.success) {
          setDashboardData(response.data);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsDashboardLoading(false);
      }
    };
    loadDashboard();
  }, []);

  // Toggle theme
  const handleToggleTheme = useCallback(async () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    document.documentElement.setAttribute('data-theme', newTheme);

    try {
      await browser.storage.local.set({ theme: newTheme });
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }, [isDarkMode]);

  // Fetch suggestions: friend-solved questions + similar questions
  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await browser.runtime.sendMessage({
        type: 'GET_FRIEND_SUGGESTIONS',
      });

      if (response?.success) {
        const suggestionsData = response.data || [];

        const formattedResults: SearchResult[] = suggestionsData
          .filter((entry: any) => entry.status !== 'ac')
          .map((entry: any) => ({
          id: entry.id,
          title: entry.title,
          slug: entry.slug,
          difficulty: entry.difficulty,
          isPaidOnly: entry.isPaidOnly ?? false,
          acRate: entry.acRate ?? 0,
          status: entry.status ?? null,
          matchType: entry.isSimilar ? 'similar' : 'following',
          solvedByFriends: entry.solvedByFriends || [],
          similarToTitle: entry.similarToTitle,
        }));

        const grouped = groupSuggestionsByFriend(formattedResults);
        const allFriendGroups = new Set<string>();
        grouped.forEach(r => {
          if (r.groupFriend?.username) {
            allFriendGroups.add(r.groupFriend.username);
          }
        });

        setResults(grouped);
        setIsShowingSuggestions(true);
        setIsShowingHistory(false);
        setIsShowingChaseMode(false);
        setExpandedGroups(allFriendGroups);
        setQuery('');
        setSlashCommandSuggestions([]);
      } else {
        console.error('Failed to get friend suggestions:', response?.error);
        setResults([]);
      }
    } catch (error) {
      console.error('Failed to execute SUGGESTION command:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize slash commands
  useEffect(() => {
    // Register chase command
    slashCommandService.registerCommand({
      id: 'chase',
      aliases: ['chase', 'target', 'race'],
      description: 'Enter Chase Mode: 1v1 telemetry & race up to 3 LeetCode members',
      prefix: '@',
      execute: async () => {
        setIsShowingChaseMode(true);
        setIsShowingHistory(false);
        setIsShowingSuggestions(false);
        setQuery('');
        setSlashCommandSuggestions([]);
      },
    });

    slashCommandService.registerCommand({
      id: 'random',
      aliases: ['random'],
      description: 'Open a random problem',
      prefix: '/',
      execute: async () => {
        setIsLoading(true);
        try {
          const response = await browser.runtime.sendMessage({
            type: 'OPEN_RANDOM_PROBLEM',
          });
          if (response?.success) {
            setQuery('');
            setSlashCommandSuggestions([]);
          } else {
            console.error('Failed to open random problem:', response?.error);
          }
        } catch (error) {
          console.error('Failed to execute RANDOM command:', error);
        } finally {
          setIsLoading(false);
        }
      },
    });

    // Register /suggestion command
    slashCommandService.registerCommand({
      id: 'suggestion',
      aliases: ['suggestion', 'suggestions', 'recommend'],
      description: 'Show questions recently solved by followed users & similar recommended questions',
      prefix: '/',
      execute: async () => {
        await fetchSuggestions();
      },
    });

    // Register help command
    slashCommandService.registerCommand({
      id: 'help',
      aliases: ['help', 'commands'],
      description: 'Show all available commands',
      prefix: '/',
      execute: async () => {
        setQuery('/help');
        const suggestions = slashCommandService.getSuggestions('/help');
        setSlashCommandSuggestions(suggestions);
      },
    });

    // Register history command
    slashCommandService.registerCommand({
      id: 'history',
      aliases: ['history', 'recent'],
      description: 'View your last 10 opened problems',
      prefix: '/',
      execute: async () => {
        setIsLoading(true);
        try {
          const response = await browser.runtime.sendMessage({
            type: 'GET_HISTORY',
          });

          if (response?.success) {
            const historyData = response.data || [];

            if (historyData.length > 0) {
              // Convert history entries to SearchResult format
              const historyResults: SearchResult[] = historyData.map((entry: any) => ({
                id: entry.id,
                title: entry.title,
                slug: entry.slug,
                difficulty: entry.difficulty,
                isPaidOnly: false,
                acRate: 0,
                status: null,
                matchType: 'title' as const,
              }));
              setResults(historyResults);
              setIsShowingHistory(true);
              setIsShowingSuggestions(false);
              setIsShowingChaseMode(false);
            } else {
              // Empty history - show empty state
              setResults([]);
              setIsShowingHistory(true);
              setIsShowingSuggestions(false);
              setIsShowingChaseMode(false);
            }
            setQuery('');
            setSlashCommandSuggestions([]);
          } else {
            console.error('Failed to get history:', response?.error);
            setResults([]);
            setIsShowingHistory(false);
          }
        } catch (error) {
          console.error('Failed to execute HISTORY command:', error);
          setResults([]);
          setIsShowingHistory(false);
        } finally {
          setIsLoading(false);
        }
      },
    });

    // Register theme toggle command
    slashCommandService.registerCommand({
      id: 'theme',
      aliases: ['theme', 'dark', 'light'],
      description: 'Toggle between dark and light mode',
      prefix: '/',
      execute: async () => {
        handleToggleTheme();
        setQuery('');
        setSlashCommandSuggestions([]);
      },
    });

    // Register rate command
    /* slashCommandService.registerCommand({
      id: 'review',
      aliases: ['rate', 'review', 'store'],
      description: 'Rate this extension on the store',
      prefix: '/',
      execute: async () => {
        try {
          await browser.runtime.sendMessage({
            type: 'OPEN_EXTENSION_STORE',
          });
          setQuery('');
          setSlashCommandSuggestions([]);
        } catch (error) {
          console.error('Failed to execute RATE command:', error);
        }
      },
    }); */
  }, [handleToggleTheme, fetchSuggestions]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load sync status on mount
  useEffect(() => {
    const loadSyncStatus = async () => {
      try {
        const response = await browser.runtime.sendMessage({
          type: 'CHECK_SYNC_STATUS',
        });

        if (response?.success) {
          setSyncStatus({
            isStale: response.data.isStale,
            lastSync: response.data.lastSync ? new Date(response.data.lastSync) : null,
            totalCount: response.data.totalCount,
          });
        }
      } catch (error) {
        console.error('Failed to load sync status:', error);
      }
    };

    loadSyncStatus();
  }, []);

  // Handle query changes
  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);
    setSelectedIndex(0);
    setIsShowingHistory(false); // Clear history mode when user types
    setIsShowingSuggestions(false); // Clear suggestions mode when user types
    setExpandedGroups(new Set());

    if (newQuery.startsWith('/') || newQuery.startsWith('@')) {
      // Handle slash/at commands
      const suggestions = slashCommandService.getSuggestions(newQuery);
      setSlashCommandSuggestions(suggestions);
      setResults([]);
    } else {
      // Clear command suggestions for regular search
      setSlashCommandSuggestions([]);
    }
  }, []);

  // Search function with debouncing
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.startsWith('/') || searchQuery.startsWith('@')) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await browser.runtime.sendMessage({
        type: 'SEARCH_PROBLEMS',
        query: searchQuery,
      });

      if (response?.success) {
        const enhancedResults: SearchResult[] = response.data.map((problem: SearchResult) => {
          const lowerQuery = searchQuery.toLowerCase();
          let matchType: 'id' | 'title' | 'slug' = 'title';

          if (problem.id.toString() === searchQuery) {
            matchType = 'id';
          } else if (problem.slug.toLowerCase().includes(lowerQuery)) {
            matchType = 'slug';
          }

          return { ...problem, matchType };
        });

        setResults(enhancedResults);
        setSelectedIndex(0);
      } else {
        console.warn('Search failed:', response?.error || 'Unknown error');
        setResults([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (!query.startsWith('/') && !query.startsWith('@') && !isShowingHistory && !isShowingSuggestions && !isShowingChaseMode) {
      const timer = setTimeout(() => {
        performSearch(query);
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [query, performSearch, isShowingHistory, isShowingSuggestions, isShowingChaseMode]);

  // Handle command selection
  const handleSlashCommandSelect = useCallback(async (command: string) => {
    const cleanCmd = command.startsWith('/') || command.startsWith('@') ? command.slice(1).toLowerCase() : command.toLowerCase();
    
    if (cleanCmd === 'chase' || cleanCmd === 'target' || cleanCmd === 'race') {
      setIsShowingChaseMode(true);
      setIsShowingHistory(false);
      setIsShowingSuggestions(false);
      setQuery('');
      setSlashCommandSuggestions([]);
      return;
    }

    if (slashCommandService.isValidCommand(command)) {
      await slashCommandService.executeCommand(command);
    } else {
      setQuery(command);
      const suggestions = slashCommandService.getSuggestions(command);
      setSlashCommandSuggestions(suggestions);
    }
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent) => {
      const isCommandMode = query.startsWith('/') || query.startsWith('@');
      const maxIndex = isCommandMode ? slashCommandSuggestions.length - 1 : displayItems.length - 1;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, maxIndex));
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;

        case 'Enter':
          e.preventDefault();
          const cleanQuery = query.trim().toLowerCase();
          const isChaseTrigger =
            cleanQuery === '@chase' ||
            cleanQuery === '/chase' ||
            cleanQuery === '@target' ||
            cleanQuery === '@race';

          if (isChaseTrigger) {
            setIsShowingChaseMode(true);
            setIsShowingHistory(false);
            setIsShowingSuggestions(false);
            setQuery('');
            setSlashCommandSuggestions([]);
            return;
          }

          if (isCommandMode) {
            if (slashCommandSuggestions[selectedIndex]) {
              const suggestion = slashCommandSuggestions[selectedIndex];

              if (suggestion.command.id === 'chase') {
                setIsShowingChaseMode(true);
                setIsShowingHistory(false);
                setIsShowingSuggestions(false);
                setQuery('');
                setSlashCommandSuggestions([]);
                return;
              }

              if (suggestion.command.id === 'help') {
                setQuery('/help');
                const helpSuggestions = slashCommandService.getSuggestions('/help');
                setSlashCommandSuggestions(helpSuggestions);
              } else {
                await suggestion.command.execute();
              }
            } else if (slashCommandService.isValidCommand(query)) {
              await slashCommandService.executeCommand(query);
            }
          } else if (!isCommandMode && displayItems[selectedIndex]) {
            const item = displayItems[selectedIndex];
            if (item.type === 'problem') {
              const openInNewTab = !e.shiftKey;
              openProblem(item.problem, openInNewTab);
            } else if (item.type === 'header') {
              toggleGroup(item.groupUsername);
            }
          }
          break;

        case 'Escape':
          e.preventDefault();
          setQuery('');
          setResults([]);
          setSlashCommandSuggestions([]);
          setIsShowingHistory(false);
          setIsShowingSuggestions(false);
          setIsShowingChaseMode(false);
          break;
      }
    },
    [results, selectedIndex, query, slashCommandSuggestions, displayItems, toggleGroup]
  );

  // Open problem in new tab or same tab
  const openProblem = async (problem: LeetCodeProblem, openInNewTab: boolean = true) => {
    try {
      await browser.runtime.sendMessage({
        type: openInNewTab ? 'OPEN_PROBLEM' : 'OPEN_PROBLEM_SAME_TAB',
        slug: problem.slug,
        problemData: {
          slug: problem.slug,
          title: problem.title,
          difficulty: problem.difficulty,
          id: problem.id,
        },
      });
    } catch (error) {
      console.error('Failed to open problem:', error);
    }
  };

  // Sync problems
  const handleSync = async () => {
    setIsLoading(true);
    try {
      const syncResponse = await browser.runtime.sendMessage({
        type: 'SYNC_PROBLEMS',
      });

      // Show feedback based on sync result
      if (syncResponse?.synced) {
        console.log('Sync completed successfully');
      } else {
        console.log('Sync was not needed or failed');
      }

      const response = await browser.runtime.sendMessage({
        type: 'CHECK_SYNC_STATUS',
      });

      if (response?.success) {
        setSyncStatus({
          isStale: response.data.isStale,
          lastSync: response.data.lastSync ? new Date(response.data.lastSync) : null,
          totalCount: response.data.totalCount,
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-screen bg-[var(--background)] overflow-hidden font-[var(--font-sans)] flex flex-col">
      <Header 
        isDarkMode={isDarkMode} 
        onToggleTheme={handleToggleTheme}
        onSync={handleSync}
        isLoading={isLoading || isDashboardLoading}
        userStats={dashboardData?.userStats || null}
      />

      {!isShowingChaseMode && (
        <SearchInput
          query={query}
          isLoading={isLoading}
          inputRef={inputRef}
          onQueryChange={handleQueryChange}
          onKeyDown={handleKeyDown}
        />
      )}

      {isShowingChaseMode ? (
        <ChaseMode
          onClose={() => setIsShowingChaseMode(false)}
          onOpenProblem={(slug, data) => openProblem({ slug, ...data } as any, true)}
        />
      ) : (!query && !isShowingHistory && !isShowingSuggestions) ? (
        <Dashboard
          data={dashboardData}
          isLoading={isDashboardLoading}
          onOpenProblem={(slug, data) => openProblem({ slug, ...data } as any, true)}
          onEnterChaseMode={() => setIsShowingChaseMode(true)}
        />
      ) : (
        <ResultsList
          displayItems={displayItems}
          query={query}
          isLoading={isLoading}
          selectedIndex={selectedIndex}
          onOpenProblem={openProblem}
          slashCommandSuggestions={slashCommandSuggestions}
          onSelectSlashCommand={handleSlashCommandSelect}
          isShowingHistory={isShowingHistory}
          isShowingSuggestions={isShowingSuggestions}
          onToggleGroup={toggleGroup}
        />
      )}

      <Footer />
    </div>
  );
}

export default App;
