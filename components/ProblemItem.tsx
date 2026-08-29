import { forwardRef } from 'react';
import { ExternalLink, CheckCircle2, MinusCircle, Sparkles } from 'lucide-react';
import { LeetCodeProblem } from '@/utils/database';

export interface FriendUser {
  username: string;
  avatarUrl?: string;
}

export interface ExtendedProblem extends LeetCodeProblem {
  matchType?: 'id' | 'title' | 'slug' | 'following' | 'similar';
  solvedByFriends?: FriendUser[];
  similarToTitle?: string;
  /** Internal grouping key used by /suggestion results to cluster a friend's
   * solved problems + their similar picks under one header. Not set for
   * plain search/history results. */
  groupFriend?: FriendUser;
}

interface ProblemItemProps {
  problem: ExtendedProblem;
  index: number;
  selectedIndex: number;
  onOpen: (problem: LeetCodeProblem) => void;
}

const ProblemItem = forwardRef<HTMLDivElement, ProblemItemProps>(
  ({ problem, index, selectedIndex, onOpen }, ref) => {
    const getDifficultyDot = (difficulty: string) => {
      const diffMap = {
        easy: 'difficulty-easy',
        medium: 'difficulty-medium',
        hard: 'difficulty-hard',
      } as const;
      return diffMap[difficulty.toLowerCase() as keyof typeof diffMap] || 'difficulty-medium';
    };

    const getDifficultyText = (difficulty: string) => {
      return difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
    };

    const getStatusIndicator = (status: LeetCodeProblem['status']) => {
      if (status === 'ac') {
        return (
          <span
            title="Solved"
            className="flex items-center gap-1 text-[0.65rem] font-semibold text-[var(--status-solved)] leading-none"
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Solved</span>
          </span>
        );
      }
      if (status === 'notac') {
        return (
          <span
            title="Attempted"
            className="flex items-center gap-1 text-[0.65rem] font-semibold text-[var(--status-attempted)] leading-none"
          >
            <MinusCircle className="w-3 h-3" />
            <span>Attempted</span>
          </span>
        );
      }
      return null;
    };

    const isSelected = index === selectedIndex;

    return (
      <div
        ref={ref}
        className={`group px-4 py-3 cursor-pointer transition-all duration-150 border-l-2 ${
          isSelected
            ? 'bg-[var(--accent)] border-l-[var(--primary)] border-l-4'
            : 'hover:bg-[var(--accent)] border-l-transparent'
        }`}
        onClick={() => onOpen(problem)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {/* Friend Avatars */}
            {problem.solvedByFriends && problem.solvedByFriends.length > 0 && (
              <div
                className="flex items-center -space-x-1.5 flex-shrink-0"
                title={`Solved by: ${problem.solvedByFriends.map(f => f.username).join(', ')}`}
              >
                {problem.solvedByFriends.map((friend, idx) => (
                  <img
                    key={idx}
                    src={friend.avatarUrl || 'https://assets.leetcode.com/users/default_avatar.jpg'}
                    alt={friend.username}
                    className="w-5 h-5 rounded-full ring-2 ring-[var(--background)] object-cover"
                  />
                ))}
              </div>
            )}

            {/* Similar Badge */}
            {problem.matchType === 'similar' && (
              <span className="flex items-center gap-1 text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded flex-shrink-0">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Similar</span>
              </span>
            )}

            {/* Problem ID */}
            <div className="flex-shrink-0">
              <span className="text-xs font-semibold text-[var(--muted-foreground)] w-8">
                {problem.id}
              </span>
            </div>

            {/* Problem Title */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[var(--foreground)] text-sm mb-0.5 truncate">
                {problem.title}
              </div>
              {problem.similarToTitle && (
                <div className="text-[10px] text-[var(--muted-foreground)] truncate">
                  Similar to {problem.similarToTitle}
                </div>
              )}
              {!problem.similarToTitle &&
                (problem.status === 'ac' || (problem.solvedByFriends && problem.solvedByFriends.length > 0)) && (
                  <div className="text-[10px] text-[var(--muted-foreground)] truncate">
                    Solved by{' '}
                    {[
                      problem.status === 'ac' ? 'You' : null,
                      ...(problem.solvedByFriends?.map(f => f.username) || []),
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                )}
            </div>
          </div>

          {/* Difficulty and Status */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Solved / Attempted badge */}
            {getStatusIndicator(problem.status)}

            <div className="flex items-center gap-1">
              <span className={`difficulty-dot ${getDifficultyDot(problem.difficulty)}`}></span>
              <span className="text-xs text-[var(--muted-foreground)]">
                {getDifficultyText(problem.difficulty)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {problem.isPaidOnly && (
                <span className="text-xs text-[var(--chart-2)] font-medium">PRO</span>
              )}
              <ExternalLink className="w-3 h-3 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ProblemItem.displayName = 'ProblemItem';

export default ProblemItem;
