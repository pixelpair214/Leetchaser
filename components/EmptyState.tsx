interface EmptyStateProps {
  hasQuery: boolean;
  isLoading: boolean;
  isShowingHistory?: boolean;
}

export default function EmptyState({
  hasQuery,
  isLoading,
  isShowingHistory = false,
}: EmptyStateProps) {
  // History empty state
  if (isShowingHistory) {
    return (
      <div className="px-4 py-12 text-center">
        <div className="text-sm font-medium text-[var(--foreground)] mb-1">No history yet</div>
        <div className="text-xs text-[var(--muted-foreground)]">
          Open some problems to see them here
        </div>
      </div>
    );
  }

  if (hasQuery && !isLoading) {
    return (
      <div className="px-4 py-12 text-center">
        <div className="text-sm font-medium text-[var(--foreground)] mb-1">No problems found</div>
        <div className="text-xs text-[var(--muted-foreground)]">
          Try searching by number or title
        </div>
      </div>
    );
  }

  if (!hasQuery) {
    return (
      <div className="px-4 py-12 text-center">
        <div className="text-sm font-medium text-[var(--foreground)] mb-2">
          Ready to search problems
        </div>
        <div className="text-xs text-[var(--muted-foreground)] space-y-2">
          <div>
            Try:{' '}
            <code className="bg-[var(--muted)] px-1.5 py-0.5 rounded-[var(--radius-md)] text-xs">
              "two sum"
            </code>{' '}
            or{' '}
            <code className="bg-[var(--muted)] px-1.5 py-0.5 rounded-[var(--radius-md)] text-xs">
              "1"
            </code>
          </div>
          <div className="pt-2 border-t border-[var(--border)]">
            <div className="text-xs font-medium text-[var(--chart-4)] mb-1">⚡ Slash Commands</div>
            <div>
              <code className="bg-[var(--chart-4)]/10 text-[var(--chart-4)] px-1.5 py-0.5 rounded-[var(--radius-md)] text-xs">
                /potd
              </code>{' '}
              - Problem of the Day
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
