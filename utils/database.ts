import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface LeetCodeProblem {
  id: number;
  title: string;
  slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  isPaidOnly: boolean;
  acRate: number;
  status?: 'ac' | 'notac' | null;
}

interface LeetCodeDB extends DBSchema {
  problems: {
    key: number;
    value: LeetCodeProblem;
    indexes: {
      'by-slug': string;
    };
  };
  metadata: {
    key: string;
    value: {
      lastFetched: number;
      totalProblems: number;
      version: string;
    };
  };
}

class LeetCodeDatabase {
  private db: IDBPDatabase<LeetCodeDB> | null = null;
  private readonly DB_NAME = 'leetjump';
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<LeetCodeDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Create problems store
        const problemStore = db.createObjectStore('problems', {
          keyPath: 'id',
        });
        problemStore.createIndex('by-slug', 'slug', { unique: true });
        // Removed unused indexes for better performance

        // Create metadata store
        db.createObjectStore('metadata', {
          keyPath: 'key',
        });
      },
    });
  }

  async getAllProblems(): Promise<LeetCodeProblem[]> {
    await this.init();
    return this.db!.getAll('problems');
  }

  async getProblemById(id: number): Promise<LeetCodeProblem | undefined> {
    await this.init();
    return this.db!.get('problems', id);
  }

  async getProblemBySlug(slug: string): Promise<LeetCodeProblem | undefined> {
    await this.init();
    return this.db!.getFromIndex('problems', 'by-slug', slug);
  }

  async searchProblems(query: string, limit = 50): Promise<LeetCodeProblem[]> {
    await this.init();
    const all = await this.getAllProblems();
    const lowerQuery = query.toLowerCase();

    return all
      .filter(
        problem =>
          problem.title.toLowerCase().includes(lowerQuery) ||
          problem.id.toString().includes(query) ||
          problem.slug.toLowerCase().includes(lowerQuery)
      )
      .slice(0, limit);
  }

  async saveProblems(problems: LeetCodeProblem[]): Promise<void> {
    await this.init();
    const tx = this.db!.transaction('problems', 'readwrite');
    await Promise.all([...problems.map(problem => tx.store.put(problem)), tx.done]);
  }

  async saveMetadata(metadata: {
    lastFetched: number;
    totalProblems: number;
    version: string;
  }): Promise<void> {
    await this.init();
    await this.db!.put('metadata', { key: 'sync', ...metadata });
  }

  async getMetadata(): Promise<
    { lastFetched: number; totalProblems: number; version: string } | undefined
  > {
    await this.init();
    return this.db!.get('metadata', 'sync');
  }

  async clearAll(): Promise<void> {
    await this.init();
    const tx = this.db!.transaction(['problems', 'metadata'], 'readwrite');
    await Promise.all([
      tx.objectStore('problems').clear(),
      tx.objectStore('metadata').clear(),
      tx.done,
    ]);
  }

  async getCount(): Promise<number> {
    await this.init();
    return this.db!.count('problems');
  }
}

export const leetcodeDB = new LeetCodeDatabase();
