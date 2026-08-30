import React, { useState, useEffect, useCallback } from 'react';
import { 
  Target, 
  Trophy, 
  Flame, 
  Swords, 
  RotateCw, 
  X, 
  Plus, 
  ExternalLink, 
  ChevronRight, 
  Award, 
  Zap, 
  Activity, 
  ArrowRight 
} from 'lucide-react';
import { ChasedUserData, ChaseModeData } from '@/utils/leetcode-api';

interface ChaseModeProps {
  onClose: () => void;
  onOpenProblem: (slug: string, problemData?: any) => void;
}

const STORAGE_KEY = 'chase_targets';
const MAX_TARGETS = 3;

export default function ChaseMode({ onClose, onOpenProblem }: ChaseModeProps) {
  const [targetUsernames, setTargetUsernames] = useState<string[]>([]);
  const [chaseData, setChaseData] = useState<ChaseModeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | number>('all');
  
  // Add target form state
  const [isAddingTarget, setIsAddingTarget] = useState(false);
  const [newUsernameInput, setNewUsernameInput] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Load saved target usernames from storage on mount
  useEffect(() => {
    const loadSavedTargets = async () => {
      try {
        const result = (await browser.storage.local.get(STORAGE_KEY)) as any;
        const saved: string[] = result?.[STORAGE_KEY] || [];
        setTargetUsernames(saved);
        if (saved.length === 0) {
          setIsAddingTarget(true);
        }
      } catch (err) {
        console.error('Failed to load chase targets from storage:', err);
      }
    };
    loadSavedTargets();
  }, []);

  // Global keydown handler to exit on Escape
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [onClose]);

  // Fetch chase data whenever targetUsernames change or manual sync
  const fetchChaseStats = useCallback(async (targets: string[]) => {
    setIsLoading(true);
    try {
      const response = await browser.runtime.sendMessage({
        type: 'GET_CHASE_DATA',
        targets,
      });

      if (response?.success && response.data) {
        setChaseData(response.data);
      } else {
        console.error('Failed to fetch chase data:', response?.error);
      }
    } catch (error) {
      console.error('Failed to execute GET_CHASE_DATA:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (targetUsernames.length > 0) {
      fetchChaseStats(targetUsernames);
    } else {
      setIsLoading(false);
      setChaseData(null);
    }
  }, [targetUsernames, fetchChaseStats]);

  // Handle adding a target username
  const handleAddTarget = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUsername = newUsernameInput.trim();
    if (!cleanUsername) return;

    if (targetUsernames.map(u => u.toLowerCase()).includes(cleanUsername.toLowerCase())) {
      setAddError('This user is already in your chase list');
      return;
    }

    if (targetUsernames.length >= MAX_TARGETS) {
      setAddError(`Maximum ${MAX_TARGETS} targets allowed`);
      return;
    }

    setIsValidating(true);
    setAddError(null);

    try {
      const checkRes = await browser.runtime.sendMessage({
        type: 'VALIDATE_LEETCODE_USERNAME',
        username: cleanUsername,
      });

      if (!checkRes?.isValid) {
        setAddError(`User "${cleanUsername}" was not found on LeetCode`);
        setIsValidating(false);
        return;
      }

      const updatedTargets = [...targetUsernames, cleanUsername];
      setTargetUsernames(updatedTargets);
      await browser.storage.local.set({ [STORAGE_KEY]: updatedTargets });

      setNewUsernameInput('');
      setIsAddingTarget(false);
      setActiveTab(updatedTargets.length - 1);
    } catch (err) {
      setAddError('Failed to validate username. Please check your network.');
    } finally {
      setIsValidating(false);
    }
  };

  // Handle removing a target username
  const handleRemoveTarget = async (usernameToRemove: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updatedTargets = targetUsernames.filter(
      u => u.toLowerCase() !== usernameToRemove.toLowerCase()
    );
    setTargetUsernames(updatedTargets);
    await browser.storage.local.set({ [STORAGE_KEY]: updatedTargets });

    if (activeTab !== 'all') {
      setActiveTab('all');
    }
    if (updatedTargets.length === 0) {
      setIsAddingTarget(true);
    }
  };

  // Format relative time helper
  const getRelativeTime = (timestampStr?: string) => {
    if (!timestampStr) return 'Recently';
    const timestamp = parseInt(timestampStr, 10) * 1000;
    const diffInSeconds = Math.floor((Date.now() - timestamp) / 1000);
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const currentUser = chaseData?.currentUser;
  const targets = chaseData?.targets || [];

  // Ranked list of all participants (User + Targets)
  const raceLeaderboard = React.useMemo(() => {
    const participants: Array<{ user: ChasedUserData; isMe: boolean }> = [];
    if (currentUser) {
      participants.push({ user: currentUser, isMe: true });
    }
    targets.forEach(t => {
      participants.push({ user: t, isMe: false });
    });

    return participants.sort((a, b) => {
      const aSolved = a.user.solvedStats.totalSolved;
      const bSolved = b.user.solvedStats.totalSolved;
      if (bSolved !== aSolved) return bSolved - aSolved;
      return (b.user.contestStats?.rating || 0) - (a.user.contestStats?.rating || 0);
    });
  }, [currentUser, targets]);

  const maxSolvedInRace = Math.max(
    ...raceLeaderboard.map(p => p.user.solvedStats.totalSolved),
    1
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--background)] text-[var(--foreground)] animate-fade-in">
      {/* CHASE HUD TOP BAR */}
      <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--card)] flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[#FF8A00] animate-pulse" />
          <div>
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <span className="text-[#FF8A00]">CHASE</span>
              <span className="text-[var(--foreground)]">ARENA</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#FF8A00]/10 text-[#FF8A00] rounded-full border border-[#FF8A00]/30 font-semibold">
                LIVE 1v1
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => fetchChaseStats(targetUsernames)}
            disabled={isLoading || targetUsernames.length === 0}
            className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] rounded-md transition-colors disabled:opacity-50"
            title="Refresh Live Stats"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] rounded-md transition-colors"
            title="Exit Chase Mode (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TARGET SWITCHER TABS */}
      <div className="px-4 py-2 bg-[var(--muted)]/50 border-b border-[var(--border)] flex items-center gap-1.5 overflow-x-auto flex-shrink-0">
        <button
          onClick={() => {
            setActiveTab('all');
            setIsAddingTarget(false);
          }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'all' && !isAddingTarget
              ? 'bg-[#FF8A00] text-black shadow-sm'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)]'
          }`}
        >
          <Trophy className="w-3 h-3" />
          <span>Race Grid</span>
        </button>

        {targetUsernames.map((username, idx) => {
          const targetData = targets.find(t => t.username.toLowerCase() === username.toLowerCase());
          const isActive = activeTab === idx && !isAddingTarget;

          return (
            <div
              key={username}
              onClick={() => {
                setActiveTab(idx);
                setIsAddingTarget(false);
              }}
              className={`flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all border ${
                isActive
                  ? 'bg-[var(--card)] text-[var(--foreground)] border-[#FF8A00]/50 shadow-sm'
                  : 'bg-transparent text-[var(--muted-foreground)] border-transparent hover:bg-[var(--card)] hover:text-[var(--foreground)]'
              }`}
            >
              {targetData ? (
                <img
                  src={targetData.avatarUrl}
                  alt={targetData.username}
                  className="w-3.5 h-3.5 rounded-full object-cover"
                />
              ) : (
                <Target className="w-3 h-3 text-[#FF8A00]" />
              )}
              <span className="truncate max-w-[80px]">@{username}</span>
              
              <button
                onClick={(e) => handleRemoveTarget(username, e)}
                className="opacity-40 hover:opacity-100 hover:text-red-500 transition-opacity p-0.5 rounded"
                title={`Remove ${username}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}

        {targetUsernames.length < MAX_TARGETS && (
          <button
            onClick={() => setIsAddingTarget(true)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors border border-dashed border-[var(--border)] ${
              isAddingTarget
                ? 'bg-[#FF8A00]/20 text-[#FF8A00] border-[#FF8A00]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)]'
            }`}
            title="Add Target to Chase"
          >
            <Plus className="w-3 h-3" />
            <span>Add ({targetUsernames.length}/{MAX_TARGETS})</span>
          </button>
        )}
      </div>

      {/* MAIN VIEW CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ADD TARGET FORM / ONBOARDING */}
        {isAddingTarget && (
          <div className="bg-[var(--card)] border border-[#FF8A00]/40 rounded-xl p-4 shadow-lg animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-[#FF8A00]" />
              <h3 className="text-sm font-bold text-[var(--foreground)]">
                {targetUsernames.length === 0 ? 'Initialize Chase Mode' : 'Lock Onto New Target'}
              </h3>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mb-3">
              Enter a LeetCode username to race against. The extension remembers your targets so you only enter them once!
            </p>

            <form onSubmit={handleAddTarget} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={newUsernameInput}
                  onChange={e => {
                    setNewUsernameInput(e.target.value);
                    setAddError(null);
                  }}
                  placeholder="LeetCode username (e.g. lee215)..."
                  autoFocus
                  disabled={isValidating}
                  className="w-full pl-3 pr-28 py-2 text-xs bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF8A00] text-[var(--foreground)]"
                />
                <button
                  type="submit"
                  disabled={isValidating || !newUsernameInput.trim()}
                  className="absolute right-1.5 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-[#FF8A00] hover:bg-[#FF8A00]/90 text-black text-xs font-bold rounded-md transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {isValidating ? (
                    <RotateCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <span>Lock Target</span>
                      <ArrowRight className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>

              {addError && (
                <div className="text-xs text-red-500 flex items-center gap-1 font-medium">
                  <X className="w-3 h-3" />
                  <span>{addError}</span>
                </div>
              )}

              {targetUsernames.length > 0 && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsAddingTarget(false)}
                    className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* LOADING SKELETON */}
        {isLoading && (
          <div className="space-y-3 animate-pulse">
            <div className="h-20 bg-[var(--card)] rounded-xl border border-[var(--border)]" />
            <div className="h-40 bg-[var(--card)] rounded-xl border border-[var(--border)]" />
            <div className="h-24 bg-[var(--card)] rounded-xl border border-[var(--border)]" />
          </div>
        )}

        {/* RACE TRACK (ALL TARGETS VIEW) */}
        {!isLoading && activeTab === 'all' && !isAddingTarget && (
          <div className="space-y-4">
            {/* LEADERBOARD STANDINGS */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#FF8A00]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                    Live Race Track Standings
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                  Ranked by Problems Solved
                </span>
              </div>

              <div className="space-y-3">
                {raceLeaderboard.map((item, rankIdx) => {
                  const user = item.user;
                  const isMe = item.isMe;
                  const solved = user.solvedStats.totalSolved;
                  const percentage = Math.round((solved / maxSolvedInRace) * 100);
                  const medals = ['🥇', '🥈', '🥉', '4th'];

                  const leader = raceLeaderboard[0].user;
                  const diffWithLeader = solved - leader.solvedStats.totalSolved;

                  return (
                    <div
                      key={user.username}
                      className={`p-3 rounded-lg border transition-all ${
                        isMe
                          ? 'bg-[#FF8A00]/5 border-[#FF8A00]/40 shadow-sm'
                          : 'bg-[var(--background)] border-[var(--border)] hover:border-[var(--muted-foreground)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-bold w-5 text-center">
                            {medals[rankIdx] || `${rankIdx + 1}`}
                          </span>
                          <img
                            src={user.avatarUrl}
                            alt={user.username}
                            className="w-6 h-6 rounded-full object-cover border border-[var(--border)]"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[var(--foreground)]">
                                {user.username}
                              </span>
                              {isMe && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#FF8A00] text-black rounded font-mono">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[var(--muted-foreground)]">
                              Global Rank #{user.ranking ? user.ranking.toLocaleString() : 'N/A'}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-bold text-[var(--foreground)] font-mono">
                            {solved} <span className="text-[10px] font-normal text-[var(--muted-foreground)]">solved</span>
                          </div>
                          <div className="text-[10px] font-mono font-medium">
                            {diffWithLeader === 0 ? (
                              <span className="text-green-500 font-bold">👑 Leader</span>
                            ) : diffWithLeader > 0 ? (
                              <span className="text-green-500">+{diffWithLeader} ahead</span>
                            ) : (
                              <span className="text-red-400">{diffWithLeader} behind</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* RACE PROGRESS BAR */}
                      <div className="w-full h-2 bg-[var(--muted)] rounded-full overflow-hidden flex">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isMe ? 'bg-[#FF8A00]' : 'bg-[var(--foreground)] opacity-75'
                          }`}
                          style={{ width: `${Math.max(percentage, 5)}%` }}
                        />
                      </div>

                      {/* MINI STAT PILLS */}
                      <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)] mt-2 pt-2 border-t border-[var(--border)]/50">
                        <div className="flex items-center gap-3">
                          <span className="text-green-500 font-semibold">{user.solvedStats.easySolved}E</span>
                          <span className="text-yellow-500 font-semibold">{user.solvedStats.mediumSolved}M</span>
                          <span className="text-red-500 font-semibold">{user.solvedStats.hardSolved}H</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-0.5 text-[#FF8A00] font-semibold">
                            <Flame className="w-3 h-3 fill-current" /> {user.activityStats.streak}d
                          </span>
                          {user.contestStats?.rating && (
                            <span className="flex items-center gap-0.5 text-[var(--foreground)] font-semibold">
                              <Swords className="w-3 h-3 text-purple-400" /> {user.contestStats.rating}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="text-center pt-2">
              <p className="text-xs text-[var(--muted-foreground)]">
                Click on any target above to view full 1v1 telemetry, stats comparison & live problem intercept feed.
              </p>
            </div>
          </div>
        )}

        {/* 1v1 DEEP TARGET PURSUIT VIEW */}
        {!isLoading && typeof activeTab === 'number' && targets[activeTab] && !isAddingTarget && (
          <div className="space-y-4">
            {(() => {
              const target = targets[activeTab];
              const mySolved = currentUser?.solvedStats.totalSolved || 0;
              const targetSolved = target.solvedStats.totalSolved;
              const solvedDiff = mySolved - targetSolved;

              const myRating = currentUser?.contestStats?.rating || null;
              const targetRating = target.contestStats?.rating || null;
              const ratingDiff = myRating && targetRating ? myRating - targetRating : null;

              const myStreak = currentUser?.activityStats.streak || 0;
              const targetStreak = target.activityStats.streak;
              const streakDiff = myStreak - targetStreak;

              return (
                <>
                  {/* HEAD TO HEAD HERO CARD */}
                  <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF8A00]/5 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex items-center justify-between mb-4">
                      {/* YOU */}
                      <div className="flex items-center gap-2">
                        <img
                          src={currentUser?.avatarUrl || 'https://assets.leetcode.com/users/default_avatar.jpg'}
                          alt={currentUser?.username || 'You'}
                          className="w-10 h-10 rounded-full object-cover border-2 border-[#FF8A00]"
                        />
                        <div>
                          <div className="text-[10px] font-bold text-[#FF8A00] uppercase font-mono">CHASER (YOU)</div>
                          <div className="text-sm font-bold text-[var(--foreground)] truncate max-w-[100px]">
                            {currentUser?.username || 'You'}
                          </div>
                        </div>
                      </div>

                      {/* VS BADGE */}
                      <div className="flex flex-col items-center">
                        <div className="px-2 py-0.5 rounded-full bg-[var(--muted)] text-[10px] font-bold font-mono text-[var(--muted-foreground)] border border-[var(--border)]">
                          VS
                        </div>
                      </div>

                      {/* TARGET */}
                      <div className="flex items-center gap-2 text-right">
                        <div>
                          <div className="text-[10px] font-bold text-red-400 uppercase font-mono">TARGET</div>
                          <div className="text-sm font-bold text-[var(--foreground)] truncate max-w-[100px]">
                            @{target.username}
                          </div>
                        </div>
                        <img
                          src={target.avatarUrl}
                          alt={target.username}
                          className="w-10 h-10 rounded-full object-cover border-2 border-red-400"
                        />
                      </div>
                    </div>

                    {/* LIVE PURSUIT STATUS BANNER */}
                    <div className={`p-3 rounded-lg border text-center font-mono ${
                      solvedDiff > 0
                        ? 'bg-green-500/10 border-green-500/30 text-green-500'
                        : solvedDiff < 0
                        ? 'bg-[#FF8A00]/10 border-[#FF8A00]/30 text-[#FF8A00]'
                        : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    }`}>
                      <div className="text-xs font-bold flex items-center justify-center gap-1.5">
                        {solvedDiff > 0 ? (
                          <>
                            <Trophy className="w-4 h-4" />
                            <span>TARGET OVERTAKEN: YOU LEAD BY +{solvedDiff} PROBLEMS!</span>
                          </>
                        ) : solvedDiff < 0 ? (
                          <>
                            <Target className="w-4 h-4 animate-pulse" />
                            <span>IN PURSUIT: {Math.abs(solvedDiff)} PROBLEMS TO OVERTAKE TARGET</span>
                          </>
                        ) : (
                          <>
                            <Flame className="w-4 h-4" />
                            <span>NECK AND NECK: PERFECTLY TIED!</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 3 CORE FACEOFF METRICS */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                      {/* TOTAL SOLVED */}
                      <div className="bg-[var(--background)] p-2.5 rounded-lg border border-[var(--border)] text-center">
                        <div className="text-[9px] font-bold text-[var(--muted-foreground)] uppercase">Problems Solved</div>
                        <div className="text-base font-bold font-mono text-[var(--foreground)] my-0.5">
                          {mySolved} <span className="text-[10px] text-[var(--muted-foreground)]">vs</span> {targetSolved}
                        </div>
                        <div className={`text-[10px] font-bold font-mono ${solvedDiff >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                          {solvedDiff >= 0 ? `+${solvedDiff}` : `${solvedDiff}`}
                        </div>
                      </div>

                      {/* CONTEST RATING */}
                      <div className="bg-[var(--background)] p-2.5 rounded-lg border border-[var(--border)] text-center">
                        <div className="text-[9px] font-bold text-[var(--muted-foreground)] uppercase">Contest Rating</div>
                        <div className="text-base font-bold font-mono text-[var(--foreground)] my-0.5">
                          {myRating || '—'} <span className="text-[10px] text-[var(--muted-foreground)]">vs</span> {targetRating || '—'}
                        </div>
                        <div className="text-[10px] font-bold font-mono text-[var(--muted-foreground)]">
                          {ratingDiff !== null ? (
                            <span className={ratingDiff >= 0 ? 'text-green-500' : 'text-red-400'}>
                              {ratingDiff >= 0 ? `+${ratingDiff}` : `${ratingDiff}`}
                            </span>
                          ) : 'No Rating'}
                        </div>
                      </div>

                      {/* STREAK */}
                      <div className="bg-[var(--background)] p-2.5 rounded-lg border border-[var(--border)] text-center">
                        <div className="text-[9px] font-bold text-[var(--muted-foreground)] uppercase">Daily Streak</div>
                        <div className="text-base font-bold font-mono text-[#FF8A00] my-0.5 flex items-center justify-center gap-1">
                          <Flame className="w-3.5 h-3.5 fill-current" />
                          <span>{myStreak}d</span> <span className="text-[10px] text-[var(--muted-foreground)]">vs</span> <span>{targetStreak}d</span>
                        </div>
                        <div className={`text-[10px] font-bold font-mono ${streakDiff >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                          {streakDiff >= 0 ? `+${streakDiff}d` : `${streakDiff}d`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SOLVED DIFFICULTY BREAKDOWN COMPARISON */}
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#FF8A00]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                          Difficulty Breakdown Battle
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--muted-foreground)]">You vs @{target.username}</span>
                    </div>

                    {/* EASY */}
                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span className="text-green-500 font-bold">Easy</span>
                        <span className="font-mono text-xs">
                          <span className="text-[#FF8A00] font-bold">{currentUser?.solvedStats.easySolved || 0}</span>
                          <span className="text-[var(--muted-foreground)]"> / </span>
                          <span className="text-[var(--foreground)] font-bold">{target.solvedStats.easySolved}</span>
                          <span className="text-[10px] text-[var(--muted-foreground)]"> (total: {target.solvedStats.totalEasy})</span>
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[var(--muted)] rounded-full overflow-hidden flex gap-1">
                        <div 
                          className="h-full bg-[#FF8A00] rounded-full" 
                          style={{ width: `${Math.min(((currentUser?.solvedStats.easySolved || 0) / (target.solvedStats.totalEasy || 800)) * 100, 100)}%` }} 
                        />
                        <div 
                          className="h-full bg-green-500/50 rounded-full" 
                          style={{ width: `${Math.min((target.solvedStats.easySolved / (target.solvedStats.totalEasy || 800)) * 100, 100)}%` }} 
                        />
                      </div>
                    </div>

                    {/* MEDIUM */}
                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span className="text-yellow-500 font-bold">Medium</span>
                        <span className="font-mono text-xs">
                          <span className="text-[#FF8A00] font-bold">{currentUser?.solvedStats.mediumSolved || 0}</span>
                          <span className="text-[var(--muted-foreground)]"> / </span>
                          <span className="text-[var(--foreground)] font-bold">{target.solvedStats.mediumSolved}</span>
                          <span className="text-[10px] text-[var(--muted-foreground)]"> (total: {target.solvedStats.totalMedium})</span>
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[var(--muted)] rounded-full overflow-hidden flex gap-1">
                        <div 
                          className="h-full bg-[#FF8A00] rounded-full" 
                          style={{ width: `${Math.min(((currentUser?.solvedStats.mediumSolved || 0) / (target.solvedStats.totalMedium || 1700)) * 100, 100)}%` }} 
                        />
                        <div 
                          className="h-full bg-yellow-500/50 rounded-full" 
                          style={{ width: `${Math.min((target.solvedStats.mediumSolved / (target.solvedStats.totalMedium || 1700)) * 100, 100)}%` }} 
                        />
                      </div>
                    </div>

                    {/* HARD */}
                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span className="text-red-500 font-bold">Hard</span>
                        <span className="font-mono text-xs">
                          <span className="text-[#FF8A00] font-bold">{currentUser?.solvedStats.hardSolved || 0}</span>
                          <span className="text-[var(--muted-foreground)]"> / </span>
                          <span className="text-[var(--foreground)] font-bold">{target.solvedStats.hardSolved}</span>
                          <span className="text-[10px] text-[var(--muted-foreground)]"> (total: {target.solvedStats.totalHard})</span>
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[var(--muted)] rounded-full overflow-hidden flex gap-1">
                        <div 
                          className="h-full bg-[#FF8A00] rounded-full" 
                          style={{ width: `${Math.min(((currentUser?.solvedStats.hardSolved || 0) / (target.solvedStats.totalHard || 750)) * 100, 100)}%` }} 
                        />
                        <div 
                          className="h-full bg-red-500/50 rounded-full" 
                          style={{ width: `${Math.min((target.solvedStats.hardSolved / (target.solvedStats.totalHard || 750)) * 100, 100)}%` }} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* TARGET STATISTICAL DOSSIER */}
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[#FF8A00]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                          Target Telemetry & Velocity
                        </span>
                      </div>
                      <a
                        href={`https://leetcode.com/u/${target.username}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-[#FF8A00] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>LeetCode Profile</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-[var(--background)] p-2 rounded-lg border border-[var(--border)]">
                        <div className="text-[10px] text-[var(--muted-foreground)]">Acceptance Rate</div>
                        <div className="text-sm font-bold font-mono text-[var(--foreground)] mt-0.5">
                          {target.solvedStats.acceptanceRate}%
                        </div>
                      </div>
                      <div className="bg-[var(--background)] p-2 rounded-lg border border-[var(--border)]">
                        <div className="text-[10px] text-[var(--muted-foreground)]">Solved This Week</div>
                        <div className="text-sm font-bold font-mono text-green-500 mt-0.5">
                          {target.activityStats.solvedThisWeek} questions
                        </div>
                      </div>
                      <div className="bg-[var(--background)] p-2 rounded-lg border border-[var(--border)]">
                        <div className="text-[10px] text-[var(--muted-foreground)]">Contests Attended</div>
                        <div className="text-sm font-bold font-mono text-[var(--foreground)] mt-0.5">
                          {target.contestStats?.attendedContests || 0} contests
                        </div>
                      </div>
                      <div className="bg-[var(--background)] p-2 rounded-lg border border-[var(--border)]">
                        <div className="text-[10px] text-[var(--muted-foreground)]">Contest Top %</div>
                        <div className="text-sm font-bold font-mono text-purple-400 mt-0.5">
                          {target.contestStats?.topPercentage ? `Top ${target.contestStats.topPercentage}%` : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* LIVE INTERCEPT FEED (Target's recent AC problems) */}
                  {target.recentSubmissions.length > 0 && (
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                      <div className="p-3 bg-[var(--muted)]/50 border-b border-[var(--border)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-[#FF8A00]" />
                          <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                            Target Intercept Feed
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                          Recently solved by @{target.username}
                        </span>
                      </div>

                      <div className="divide-y divide-[var(--border)]">
                        {target.recentSubmissions.slice(0, 5).map((sub) => (
                          <div
                            key={sub.id}
                            className="p-3 flex items-center justify-between hover:bg-[var(--muted)] transition-colors group cursor-pointer"
                            onClick={() => onOpenProblem(sub.slug, { title: sub.title, slug: sub.slug })}
                          >
                            <div className="min-w-0 flex-1 pr-3">
                              <div className="text-xs font-semibold text-[var(--foreground)] group-hover:text-[#FF8A00] transition-colors truncate">
                                {sub.title}
                              </div>
                              <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                                Solved {getRelativeTime(sub.timestamp)}
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenProblem(sub.slug, { title: sub.title, slug: sub.slug });
                              }}
                              className="px-2.5 py-1 bg-[#FF8A00]/10 hover:bg-[#FF8A00] text-[#FF8A00] hover:text-black text-[10px] font-bold rounded transition-colors flex items-center gap-1 font-mono flex-shrink-0"
                            >
                              <span>Chase</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TARGET BADGES */}
                  {target.badges.length > 0 && (
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-2 pb-1 border-b border-[var(--border)] text-xs font-bold text-[var(--foreground)]">
                        <Award className="w-3.5 h-3.5 text-[#FF8A00]" />
                        <span>Target Badges & Achievements</span>
                      </div>
                      <div className="flex items-center gap-3 overflow-x-auto py-1">
                        {target.badges.slice(0, 6).map((badge) => (
                          <div key={badge.id} className="flex flex-col items-center flex-shrink-0" title={badge.displayName}>
                            <img src={badge.icon} alt={badge.displayName} className="w-8 h-8 object-contain" />
                            <span className="text-[9px] text-[var(--muted-foreground)] mt-1 truncate max-w-[60px] text-center">
                              {badge.displayName}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
