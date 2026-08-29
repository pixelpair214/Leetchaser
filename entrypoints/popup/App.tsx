import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LeetCodeProblem } from '@/utils/database';
import { slashCommandService, SlashCommandSuggestion } from '@/utils/slash-commands';

import Header from '@/components/Header';
import SearchInput from '@/components/SearchInput';
import ResultsList from '@/components/ResultsList';
import Footer from '@/components/Footer';

interface SearchResult extends LeetCodeProblem {
  matchType?: 'id' | 'title' | 'slug';
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
  const [isDarkMode, setIsDarkMode] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize theme from storage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const result = await browser.storage.local.get('theme');
        const savedTheme = result.theme || 'light';
        const isDark = savedTheme === 'dark';
        setIsDarkMode(isDark);
        document.documentElement.setAttribute('data-theme', savedTheme);
      } catch (error) {
        console.error('Failed to load theme:', error);
      }
    };
    loadTheme();
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

  // Initialize slash commands
  useEffect(() => {
    // Register POTD command
    slashCommandService.registerCommand({
      id: 'potd',
      aliases: ['potd', 'today', 'daily'],
      description: "Open today's Problem of the Day",
      execute: async () => {
        setIsLoading(true);
        try {
          const response = await browser.runtime.sendMessage({
            type: 'OPEN_DAILY_PROBLEM',
          });

          if (response?.success) {
            setQuery('');
          } else {
            console.error('Failed to open daily problem:', response?.error);
          }
        } catch (error) {
          console.error('Failed to execute POTD command:', error);
        } finally {
          setIsLoading(false);
        }
      },
    });



    slashCommandService.registerCommand({
      id: 'random',
      aliases: ['random'],
      description: 'Open a random problem',
      execute: async () => {
        setIsLoading(true);
        try {
          const response = await browser.runtime.sendMessage({
            type: 'OPEN_RANDOM_PROBLEM',
          });
          if (response?.success) {
            setQuery('');
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

    // Register help command
    slashCommandService.registerCommand({
      id: 'help',
      aliases: ['help', 'commands'],
      description: 'Show all available slash commands',
      execute: async () => {
        const suggestions = slashCommandService.getSuggestions('/help');
        setSlashCommandSuggestions(suggestions);
      },
    });

    // Register history command
    slashCommandService.registerCommand({
      id: 'history',
      aliases: ['history', 'recent'],
      description: 'View your last 10 opened problems',
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
            } else {
              // Empty history - show empty state
              setResults([]);
              setIsShowingHistory(true);
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
      execute: async () => {
        handleToggleTheme();
        setQuery('');
      },
    });

    // Register rate command
    slashCommandService.registerCommand({
      id: 'review',
      aliases: ['rate', 'review', 'store'],
      description: 'Rate this extension on the store',
      execute: async () => {
        try {
          await browser.runtime.sendMessage({
            type: 'OPEN_EXTENSION_STORE',
          });
          setQuery('');
        } catch (error) {
          console.error('Failed to execute RATE command:', error);
        }
      },
    });
  }, [handleToggleTheme]);

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

    if (newQuery.startsWith('/')) {
      // Handle slash commands
      const suggestions = slashCommandService.getSuggestions(newQuery);
      setSlashCommandSuggestions(suggestions);
      setResults([]);
    } else {
      // Clear slash command suggestions for regular search
      setSlashCommandSuggestions([]);
    }
  }, []);

  // Search function with debouncing
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.startsWith('/')) {
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
        const enhancedResults: SearchResult[] = response.data.map((problem: LeetCodeProblem) => {
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
    if (!query.startsWith('/') && !isShowingHistory) {
      const timer = setTimeout(() => {
        performSearch(query);
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [query, performSearch, isShowingHistory]);

  // Handle slash command selection
  const handleSlashCommandSelect = useCallback((command: string) => {
    setQuery(command);
    const suggestions = slashCommandService.getSuggestions(command);
    setSlashCommandSuggestions(suggestions);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const isSlashMode = query.startsWith('/');
      const maxIndex = isSlashMode ? slashCommandSuggestions.length - 1 : results.length - 1;

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
          if (isSlashMode && slashCommandSuggestions[selectedIndex]) {
            const suggestion = slashCommandSuggestions[selectedIndex];

            // Special handling for help command - don't execute, just show suggestions
            if (suggestion.command.id === 'help') {
              setQuery('/help');
              const helpSuggestions = slashCommandService.getSuggestions('/help');
              setSlashCommandSuggestions(helpSuggestions);
            } else {
              // Execute other commands
              suggestion.command.execute();
            }
          } else if (!isSlashMode && results[selectedIndex]) {
            // Open selected problem - Enter opens in new tab, Shift+Enter in same tab
            const openInNewTab = !e.shiftKey;
            openProblem(results[selectedIndex], openInNewTab);
          }
          break;

        case 'Escape':
          e.preventDefault();
          setQuery('');
          setResults([]);
          setSlashCommandSuggestions([]);
          setIsShowingHistory(false);
          break;
      }
    },
    [results, selectedIndex, query, slashCommandSuggestions]
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
        syncStatus={syncStatus}
        isLoading={isLoading}
        onSync={handleSync}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
      />

      <SearchInput
        query={query}
        isLoading={isLoading}
        inputRef={inputRef}
        onQueryChange={handleQueryChange}
        onKeyDown={handleKeyDown}
      />

      <ResultsList
        results={results}
        query={query}
        isLoading={isLoading}
        selectedIndex={selectedIndex}
        onOpenProblem={openProblem}
        slashCommandSuggestions={slashCommandSuggestions}
        onSelectSlashCommand={handleSlashCommandSelect}
        isShowingHistory={isShowingHistory}
      />

      <Footer />
    </div>
  );
}

export default App;
