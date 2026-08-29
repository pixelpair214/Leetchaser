import { Database, RotateCw, Moon, Sun } from 'lucide-react';

interface SyncStatus {
  isStale: boolean;
  lastSync: Date | null;
  totalCount: number;
}

interface HeaderProps {
  syncStatus: SyncStatus | null;
  isLoading: boolean;
  onSync: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export default function Header({
  syncStatus,
  isLoading,
  onSync,
  isDarkMode,
  onToggleTheme,
}: HeaderProps) {
  return (
    <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--card)] flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="./icon/128.png" alt="LeetJump" className="w-8 h-8" />

          <div>
            <h1 className="text-sm font-semibold text-[var(--foreground)]">LeetJump</h1>
            <p className="text-xs text-[var(--muted-foreground)]">Quick Leetcode Navigation</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {syncStatus && (
            <div className="text-right">
              <div className="text-xs font-semibold text-[var(--foreground)]">
                {syncStatus.totalCount.toLocaleString()}
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">problems</div>
            </div>
          )}

          <button
            onClick={onSync}
            disabled={isLoading}
            className="minimal-button px-2 py-1 text-xs text-[var(--muted-foreground)] border border-[var(--border)] rounded-[var(--radius-md)] hover:bg-[var(--accent)] disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center gap-1">
                <RotateCw className="w-3 h-3 animate-spin" />
                Sync
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <RotateCw className="w-3 h-3" />
                Sync
              </div>
            )}
          </button>
          <button
            onClick={onToggleTheme}
            className="minimal-button px-2 py-1 text-xs text-[var(--muted-foreground)] border border-[var(--border)] rounded-[var(--radius-md)] hover:bg-[var(--accent)]"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}
