import { storage } from '#imports';

export interface HistoryEntry {
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timestamp: number;
  id: number;
}

// Define storage item for problem history using WXT storage
// Using local: for fast, synchronous-like access without sync overhead
export const problemHistory = storage.defineItem<HistoryEntry[]>('local:problemHistory', {
  fallback: [],
  version: 1,
});

const MAX_HISTORY_SIZE = 10;

/**
 * Add a problem to history. Maintains max 10 items, most recent first.
 * Removes duplicates - if problem already exists, moves it to top.
 * Lightning fast with WXT storage's optimized local storage.
 */
export async function addToHistory(entry: Omit<HistoryEntry, 'timestamp'>): Promise<void> {
  const currentHistory = (await problemHistory.getValue()) || [];

  // Remove existing entry with same slug (if any)
  const filteredHistory = currentHistory.filter((item: HistoryEntry) => item.slug !== entry.slug);

  // Add new entry at the beginning with timestamp
  const newHistory: HistoryEntry[] = [
    {
      ...entry,
      timestamp: Date.now(),
    },
    ...filteredHistory,
  ].slice(0, MAX_HISTORY_SIZE); // Keep only last 10

  await problemHistory.setValue(newHistory);
}

/**
 * Get the complete history (max 10 items, sorted by most recent)
 */
export async function getHistory(): Promise<HistoryEntry[]> {
  return (await problemHistory.getValue()) || [];
}

/**
 * Clear all history
 */
export async function clearHistory(): Promise<void> {
  await problemHistory.setValue([]);
}

/**
 * Check if history has any entries
 */
export async function hasHistory(): Promise<boolean> {
  const history = await getHistory();
  return history.length > 0;
}
