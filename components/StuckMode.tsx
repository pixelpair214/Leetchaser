import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Search, 
  HelpCircle, 
  Sparkles, 
  ExternalLink, 
  ArrowRight, 
  Bot, 
  Flame, 
  Clock, 
  CheckCircle2, 
  Lightbulb, 
  CornerDownLeft,
  ChevronRight
} from 'lucide-react';
import { LeetCodeProblem, leetcodeDB } from '@/utils/database';
import { DailyProblemData } from '@/utils/leetcode-api';
import { redirectToChatGPT, StuckHelpType } from '@/utils/chatgpt';

interface StuckModeProps {
  onClose: () => void;
  dailyProblem?: DailyProblemData | null;
  initialProblem?: LeetCodeProblem | null;
  initialQuery?: string;
}

export default function StuckMode({
  onClose,
  dailyProblem,
  initialProblem,
  initialQuery = '',
}: StuckModeProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery || (initialProblem ? initialProblem.title : ''));
  const [selectedProblem, setSelectedProblem] = useState<LeetCodeProblem | null>(initialProblem || null);
  const [searchResults, setSearchResults] = useState<LeetCodeProblem[]>([]);
  const [historyProblems, setHistoryProblems] = useState<LeetCodeProblem[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [activeActionIndex, setActiveActionIndex] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch recent history problems for quick selection
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await browser.runtime.sendMessage({
          type: 'GET_HISTORY',
        });
        if (response?.success && response.data) {
          setHistoryProblems(response.data.slice(0, 4));
        }
      } catch (err) {
        console.error('Failed to load history for stuck mode:', err);
      }
    };
    loadHistory();
  }, []);

  // If initialProblem was passed or initialQuery was a number, search or set it
  useEffect(() => {
    if (initialProblem) {
      setSelectedProblem(initialProblem);
    } else if (initialQuery.trim()) {
      const parsedId = parseInt(initialQuery.trim(), 10);
      if (!isNaN(parsedId)) {
        leetcodeDB.getProblemById(parsedId).then(prob => {
          if (prob) {
            setSelectedProblem(prob);
          }
        });
      }
    }
  }, [initialProblem, initialQuery]);

  // Live problem search as user types
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingSearch(true);
      try {
        const parsedId = parseInt(query, 10);
        if (!isNaN(parsedId) && query === parsedId.toString()) {
          const directMatch = await leetcodeDB.getProblemById(parsedId);
          if (directMatch) {
            setSearchResults([directMatch]);
            setIsLoadingSearch(false);
            return;
          }
        }

        const results = await leetcodeDB.searchProblems(query, 6);
        setSearchResults(results);
      } catch (err) {
        console.error('Error searching problems in stuck mode:', err);
        setSearchResults([]);
      } finally {
        setIsLoadingSearch(false);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle ChatGPT prompt launch
  const handleAskChatGPT = useCallback(async (helpType: StuckHelpType) => {
    if (!selectedProblem) return;

    await redirectToChatGPT({
      problem: {
        id: selectedProblem.id,
        title: selectedProblem.title,
        slug: selectedProblem.slug,
        difficulty: selectedProblem.difficulty,
      },
      helpType,
    });
  }, [selectedProblem]);

  // Global keydown handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // If problem is selected and user is not typing in the search input or presses 1 / 2
      if (selectedProblem) {
        if (e.key === '1' && (document.activeElement !== inputRef.current || searchQuery === '')) {
          e.preventDefault();
          handleAskChatGPT('question');
        } else if (e.key === '2' && (document.activeElement !== inputRef.current || searchQuery === '')) {
          e.preventDefault();
          handleAskChatGPT('approach');
        } else if (e.key === 'Enter' && document.activeElement !== inputRef.current) {
          e.preventDefault();
          handleAskChatGPT(activeActionIndex === 0 ? 'question' : 'approach');
        }
      } else if (searchResults.length > 0 && e.key === 'Enter') {
        e.preventDefault();
        setSelectedProblem(searchResults[0]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, selectedProblem, searchResults, handleAskChatGPT, activeActionIndex, searchQuery]);

  const getDifficultyColor = (difficulty: string = '') => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'hard':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      default:
        return 'text-[var(--muted-foreground)] bg-[var(--muted)] border-[var(--border)]';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col bg-[var(--background)] px-4 py-3 space-y-4">
      {/* Top Banner / Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-sm text-[var(--foreground)]">
              <span>Stuck Assistant</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-bold border border-purple-500/20">
                @stuck
              </span>
            </div>
            <div className="text-[11px] text-[var(--muted-foreground)]">
              Guided AI hints & problem breakdown via ChatGPT
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] rounded-lg transition-colors"
          title="Close (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Problem Input / Search */}
      <div>
        <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wider">
          LeetCode Question Number or Name
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--muted-foreground)]">
            <Search className="w-4 h-4" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              if (selectedProblem) setSelectedProblem(null);
            }}
            placeholder="Type question # (e.g. 1, 42, 206) or title..."
            className="w-full pl-9 pr-16 py-2.5 text-sm bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/60 placeholder:text-[var(--muted-foreground)] transition-all font-mono"
          />
          {selectedProblem && (
            <button
              onClick={() => {
                setSelectedProblem(null);
                setSearchQuery('');
                inputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] px-1.5 py-0.5 rounded bg-[var(--muted)] hover:bg-[var(--accent)]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Live Search Suggestions Dropdown */}
      {!selectedProblem && searchResults.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)] shadow-md">
          {searchResults.map((prob, idx) => (
            <div
              key={prob.id}
              onClick={() => {
                setSelectedProblem(prob);
                setSearchQuery(`#${prob.id} - ${prob.title}`);
              }}
              className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                idx === 0 ? 'bg-purple-500/5 hover:bg-purple-500/10' : 'hover:bg-[var(--muted)]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono text-xs font-bold text-purple-400">#{prob.id}</span>
                <span className="text-xs font-medium text-[var(--foreground)] truncate">{prob.title}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${getDifficultyColor(prob.difficulty)}`}>
                  {prob.difficulty}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Picks (Daily Problem & History) if nothing is selected or typed */}
      {!selectedProblem && searchResults.length === 0 && (
        <div className="space-y-3 pt-1">
          {/* Daily Problem Pick */}
          {dailyProblem && (
            <div>
              <div className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Flame className="w-3 h-3 text-[#FF8A00]" />
                <span>Today's Daily Problem</span>
              </div>
              <div
                onClick={() => {
                  setSelectedProblem({
                    id: typeof dailyProblem.id === 'number' ? dailyProblem.id : parseInt(String(dailyProblem.id || 0), 10),
                    title: dailyProblem.title,
                    slug: dailyProblem.slug,
                    difficulty: (dailyProblem.difficulty as any) || 'Medium',
                    isPaidOnly: false,
                    acRate: 0,
                  });
                  setSearchQuery(`#${dailyProblem.id || ''} - ${dailyProblem.title}`);
                }}
                className="bg-[var(--card)] border border-[var(--border)] hover:border-purple-500/40 rounded-xl p-2.5 cursor-pointer flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#FF8A00]">
                    #{dailyProblem.id || 'Daily'}
                  </span>
                  <span className="text-xs font-semibold text-[var(--foreground)] group-hover:text-purple-400 transition-colors">
                    {dailyProblem.title}
                  </span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${getDifficultyColor(dailyProblem.difficulty)}`}>
                  {dailyProblem.difficulty}
                </span>
              </div>
            </div>
          )}

          {/* Recent History Picks */}
          {historyProblems.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Recently Opened Problems</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {historyProblems.map(prob => (
                  <div
                    key={prob.id}
                    onClick={() => {
                      setSelectedProblem(prob);
                      setSearchQuery(`#${prob.id} - ${prob.title}`);
                    }}
                    className="bg-[var(--card)] border border-[var(--border)] hover:border-purple-500/40 rounded-xl p-2 cursor-pointer flex items-center justify-between transition-all group"
                  >
                    <div className="min-w-0 pr-1">
                      <div className="text-[11px] font-mono text-[var(--muted-foreground)]">#{prob.id}</div>
                      <div className="text-xs font-medium text-[var(--foreground)] truncate group-hover:text-purple-400">
                        {prob.title}
                      </div>
                    </div>
                    <span className={`text-[9px] px-1 py-0.2 rounded font-bold border flex-shrink-0 ${getDifficultyColor(prob.difficulty)}`}>
                      {prob.difficulty}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Problem Overview Card */}
      {selectedProblem && (
        <div className="bg-[var(--card)] border border-purple-500/30 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
              Selected Target Problem
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${getDifficultyColor(selectedProblem.difficulty)}`}>
              {selectedProblem.difficulty}
            </span>
          </div>
          <div className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
            <span className="font-mono text-purple-400">#{selectedProblem.id}</span>
            <span>{selectedProblem.title}</span>
          </div>
        </div>
      )}

      {/* Two AI Modes Options */}
      {selectedProblem && (
        <div className="space-y-2.5 pt-1">
          <div className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
            Choose What You Need from ChatGPT
          </div>

          {/* Option 1: What is this question asking? */}
          <div
            onClick={() => handleAskChatGPT('question')}
            onMouseEnter={() => setActiveActionIndex(0)}
            className={`group relative bg-[var(--card)] border rounded-xl p-3.5 cursor-pointer transition-all ${
              activeActionIndex === 0
                ? 'border-purple-500 bg-purple-500/5 shadow-md ring-1 ring-purple-500/30'
                : 'border-[var(--border)] hover:border-purple-500/50 hover:bg-[var(--muted)]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--foreground)] group-hover:text-blue-400 transition-colors">
                      What is this question asking?
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[var(--muted)] text-[var(--muted-foreground)] rounded font-semibold border border-[var(--border)]">
                      Key [ 1 ]
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-1 leading-snug">
                    Clarifies requirements, inputs/outputs, constraints, and edge cases in simple plain English.
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-green-500 font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Strictly NO solutions or code spoilers</span>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 mt-1">
                <div className="w-7 h-7 rounded-lg bg-[var(--muted)] group-hover:bg-blue-500 group-hover:text-white flex items-center justify-center text-[var(--muted-foreground)] transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Option 2: What could be the approach? (Hints only) */}
          <div
            onClick={() => handleAskChatGPT('approach')}
            onMouseEnter={() => setActiveActionIndex(1)}
            className={`group relative bg-[var(--card)] border rounded-xl p-3.5 cursor-pointer transition-all ${
              activeActionIndex === 1
                ? 'border-purple-500 bg-purple-500/5 shadow-md ring-1 ring-purple-500/30'
                : 'border-[var(--border)] hover:border-purple-500/50 hover:bg-[var(--muted)]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--foreground)] group-hover:text-purple-400 transition-colors">
                      What could be the approach?
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[var(--muted)] text-[var(--muted-foreground)] rounded font-semibold border border-[var(--border)]">
                      Key [ 2 ]
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-1 leading-snug">
                    Progressive intuition, algorithmic pattern suggestions (DP, pointers, etc.), and complexity guidance.
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-purple-400 font-semibold">
                    <Sparkles className="w-3 h-3" />
                    <span>Progressive hints only — No direct full code</span>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 mt-1">
                <div className="w-7 h-7 rounded-lg bg-[var(--muted)] group-hover:bg-purple-500 group-hover:text-white flex items-center justify-center text-[var(--muted-foreground)] transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer shortcut hints */}
      <div className="pt-2 text-[10px] text-[var(--muted-foreground)] flex items-center justify-between border-t border-[var(--border)] mt-auto">
        <span>Press <kbd className="px-1 py-0.5 bg-[var(--muted)] rounded font-mono">Esc</kbd> to return</span>
        {selectedProblem && (
          <span>
            Press <kbd className="px-1 py-0.5 bg-[var(--muted)] rounded font-mono">1</kbd> or <kbd className="px-1 py-0.5 bg-[var(--muted)] rounded font-mono">2</kbd> to launch
          </span>
        )}
      </div>
    </div>
  );
}
