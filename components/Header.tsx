import { Moon, Sun, RotateCw, Flame, CheckCircle2 } from 'lucide-react';
import { UserStats } from '@/utils/leetcode-api';

interface HeaderProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onSync: () => void;
  isLoading: boolean;
  userStats: UserStats | null;
}

export default function Header({ isDarkMode, onToggleTheme, onSync, isLoading, userStats }: HeaderProps) {
  return (
    <div className="px-4 py-4 flex-shrink-0 border-b border-[var(--border)]">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span>
            <span className="text-[var(--foreground)]">Leet</span>
            <span className="text-[#FF8A00]">Chaser</span>
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)] mt-1">
            1.1.1
          </span>
        </h1>
        
        <div className="flex items-center gap-2">
          {userStats && (
            <div className="flex items-center gap-2 text-xs font-bold bg-[var(--muted)] px-2 py-1.5 rounded-md border border-[var(--border)] mr-1">
              <div className="flex items-center gap-1 text-[var(--foreground)]" title="Solved Today">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span>{userStats.solvedToday}</span>
              </div>
              <div className="w-px h-3 bg-[var(--border)]" />
              <div className="flex items-center gap-1 text-[#FF8A00]" title="Current Streak">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>{userStats.streak}d</span>
              </div>
            </div>
          )}

          <button
            onClick={onSync}
            disabled={isLoading}
            className="minimal-button p-1.5 text-[var(--muted-foreground)] border border-[var(--border)] rounded-md hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
            title="Sync Data"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={onToggleTheme}
            className="minimal-button p-1.5 text-[var(--muted-foreground)] border border-[var(--border)] rounded-md hover:bg-[var(--accent)] transition-colors"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
