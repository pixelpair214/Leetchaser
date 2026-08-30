import { LeetCodeProblem, leetcodeDB } from './database';

export interface LeetCodeApiResponse {
  stat_status_pairs: Array<{
    stat: {
      question_id: number;
      frontend_question_id: number;
      question__title: string;
      question__title_slug: string;
      total_acs: number;
      total_submitted: number;
    };
    status: string | null;
    difficulty: {
      level: number;
    };
    paid_only: boolean;
    is_favor: boolean;
    frequency: number;
    progress: number;
  }>;
  num_solved: number;
  num_total: number;
  ac_easy: number;
  ac_medium: number;
  ac_hard: number;
  stat_status_pairs_count: number;
}

export interface FriendUser {
  username: string;
  avatarUrl?: string;
  timestamp?: string;
}

export interface UserStats {
  solvedToday: number;
  solvedThisWeek: number;
  streak: number;
}

export interface DailyProblemData {
  id?: number | string;
  slug: string;
  title: string;
  difficulty: string;
}

export interface ChasedUserData {
  username: string;
  realName: string | null;
  avatarUrl: string;
  ranking: number;
  reputation: number;
  country: string | null;
  school: string | null;
  company: string | null;
  solvedStats: {
    totalSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    totalEasy: number;
    totalMedium: number;
    totalHard: number;
    totalProblems: number;
    acceptanceRate: number;
    totalSubmissions: number;
  };
  contestStats: {
    rating: number | null;
    globalRanking: number | null;
    topPercentage: number | null;
    attendedContests: number;
    badgeName: string | null;
  } | null;
  activityStats: {
    solvedToday: number;
    solvedThisWeek: number;
    streak: number;
    totalCalendarSubmissions: number;
  };
  recentSubmissions: Array<{
    id: string;
    title: string;
    slug: string;
    timestamp: string;
  }>;
  badges: Array<{
    id: string;
    displayName: string;
    icon: string;
  }>;
}

export interface ChaseModeData {
  currentUser: ChasedUserData | null;
  targets: ChasedUserData[];
}

class LeetCodeService {
  private readonly API_ENDPOINT = 'https://leetcode.com/api/problems/all/';
  private readonly DAILY_ENDPOINT = 'https://leetcode.com/graphql';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly DEFAULT_AVATAR = 'https://assets.leetcode.com/users/default_avatar.jpg';

  // Cache of slug -> friends who recently solved it, so a search keystroke
  // doesn't trigger a GraphQL round trip per friend every time.
  private friendSolvedMapCache: Map<string, FriendUser[]> | null = null;
  private friendSolvedMapCacheTime = 0;
  private readonly FRIEND_SOLVED_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getDailyProblem(): Promise<DailyProblemData | null> {
    try {
      const query = `
        query questionOfToday {
          activeDailyCodingChallengeQuestion {
            date
            userStatus
            link
            question {
              acRate
              difficulty
              freqBar
              frontendQuestionId: questionFrontendId
              isFavor
              paidOnly: isPaidOnly
              status
              title
              titleSlug
              hasVideoSolution
              hasSolution
              topicTags {
                name
                id
                slug
              }
            }
          }
        }
      `;
      const response = await fetch(this.DAILY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const dailyQuestion = data.data?.activeDailyCodingChallengeQuestion?.question;

      if (dailyQuestion) {
        return {
          id: dailyQuestion.frontendQuestionId || '',
          slug: dailyQuestion.titleSlug,
          title: dailyQuestion.title,
          difficulty: dailyQuestion.difficulty,
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch daily problem:', error);
      return null;
    }
  }

  getDailyProblemUrl(envId?: string): string {
    if (envId) {
      return `https://leetcode.com/problems/?envType=daily-question&envId=${envId}`;
    }
    return 'https://leetcode.com/problemset/all/?listId=wpwgkgt';
  }

  private async fetchProblemsWithFallback(): Promise<LeetCodeProblem[]> {
    // Try the official API first, then fall back to sample data for development
    try {
      return await this.fetchAllProblemsFromAPI();
    } catch (error) {
      console.warn('Failed to fetch from LeetCode API, using sample data:', error);
      return this.getSampleProblems();
    }
  }

  private async fetchAllProblemsFromAPI(): Promise<LeetCodeProblem[]> {
    // Simplified API call - try with a much simpler query first
    const response = await fetch('https://leetcode.com/api/problems/all/');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.stat_status_pairs) {
      throw new Error('Invalid API response format');
    }

    return data.stat_status_pairs.map((item: any, index: number) => ({
      id: item.stat.frontend_question_id,
      title: item.stat.question__title,
      slug: item.stat.question__title_slug,
      difficulty: this.mapDifficulty(item.difficulty.level),
      isPaidOnly: item.paid_only,
      acRate:
        item.stat.total_acs && item.stat.total_submitted
          ? (item.stat.total_acs / item.stat.total_submitted) * 100
          : 0,
      status: item.status ? (item.status === 'ac' ? 'ac' : 'notac') : null,
    }));
  }

  private mapDifficulty(level: number): 'Easy' | 'Medium' | 'Hard' {
    switch (level) {
      case 1:
        return 'Easy';
      case 2:
        return 'Medium';
      case 3:
        return 'Hard';
      default:
        return 'Medium';
    }
  }

  private getSampleProblems(): LeetCodeProblem[] {
    return [
      {
        id: 1,
        title: 'Two Sum',
        slug: 'two-sum',
        difficulty: 'Easy',
        isPaidOnly: false,
        acRate: 49.2,
        status: null,
      },
    ];
  }

  async fetchAllProblems(
    onProgress?: (current: number, total: number) => void
  ): Promise<LeetCodeProblem[]> {
    try {
      console.log('Attempting to fetch problems from LeetCode...');

      const problems = await this.fetchProblemsWithFallback();

      if (onProgress) {
        onProgress(problems.length, problems.length);
      }

      console.log(`Successfully fetched ${problems.length} problems`);
      return problems.sort((a, b) => a.id - b.id);
    } catch (error) {
      console.error('Error fetching problems:', error);
      throw error;
    }
  }

  async syncProblems(
    onProgress?: (current: number, total: number) => void,
    force: boolean = false
  ): Promise<boolean> {
    try {
      // Only check cache if not forcing sync
      if (!force) {
        const metadata = await leetcodeDB.getMetadata();
        const now = Date.now();

        if (metadata && now - metadata.lastFetched < this.CACHE_DURATION) {
          console.log('Problems are up to date, skipping sync');
          return false;
        }
      }

      console.log(force ? 'Force syncing problems...' : 'Syncing problems from LeetCode API...');

      const problems = await this.fetchAllProblems(onProgress);

      // Save to database
      const now = Date.now();
      await leetcodeDB.saveProblems(problems);
      await leetcodeDB.saveMetadata({
        lastFetched: now,
        totalProblems: problems.length,
        version: '1.0.0',
      });

      console.log(`Successfully synced ${problems.length} problems`);
      return true;
    } catch (error) {
      console.error('Error syncing problems:', error);
      throw error;
    }
  }

  async getAllProblems(): Promise<LeetCodeProblem[]> {
    return leetcodeDB.getAllProblems();
  }
  async getRandomProblem(): Promise<LeetCodeProblem | null> {
    const problems = await leetcodeDB.getAllProblems();
    if (problems.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * problems.length);
    return problems[randomIndex];
  }

  async searchProblems(
    query: string
  ): Promise<Array<LeetCodeProblem & { solvedByFriends?: FriendUser[] }>> {
    const results = await leetcodeDB.searchProblems(query);
    if (results.length === 0) return results;

    try {
      const friendSolvedMap = await this.getFriendSolvedMap();
      if (friendSolvedMap.size === 0) return results;

      return results.map(problem => {
        const friends = friendSolvedMap.get(problem.slug);
        return friends && friends.length > 0 ? { ...problem, solvedByFriends: friends } : problem;
      });
    } catch (e) {
      console.warn('Failed to enrich search results with friend data:', e);
      return results;
    }
  }

  getProblemUrl(slug: string, envType?: string, envId?: string): string {
    let url = `https://leetcode.com/problems/${slug}/`;

    if (envType && envId) {
      url += `?envType=${envType}&envId=${envId}`;
    }

    return url;
  }
  async isDataStale(): Promise<boolean> {
    const metadata = await leetcodeDB.getMetadata();
    if (!metadata) return true;

    const now = Date.now();
    return now - metadata.lastFetched > this.CACHE_DURATION;
  }

  async getLastSyncDate(): Promise<Date | null> {
    const metadata = await leetcodeDB.getMetadata();
    return metadata ? new Date(metadata.lastFetched) : null;
  }

  async getTotalProblemsCount(): Promise<number> {
    return leetcodeDB.getCount();
  }

  async getUserStatus(): Promise<{
    isSignedIn: boolean;
    username: string | null;
    realName: string | null;
    avatar: string | null;
  }> {
    try {
      const userStatusQuery = `
        query userStatus {
          userStatus {
            isSignedIn
            username
            avatar
            realName
          }
        }
      `;
      const statusRes = await fetch(this.DAILY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userStatusQuery }),
      });
      const statusData = await statusRes.json();
      const status = statusData.data?.userStatus;
      if (status) {
        return {
          isSignedIn: !!status.isSignedIn,
          username: status.username || null,
          realName: status.realName || null,
          avatar: status.avatar || null,
        };
      }
    } catch (e) {
      console.warn('Failed to fetch user status:', e);
    }
    return {
      isSignedIn: false,
      username: null,
      realName: null,
      avatar: null,
    };
  }

  async getUserStats(): Promise<UserStats | null> {
    try {
      const { username } = await this.getUserStatus();
      if (!username) return null;

      const query = `
        query userProfileCalendar($username: String!) {
          matchedUser(username: $username) {
            submissionCalendar
          }
        }
      `;
      const res = await fetch(this.DAILY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { username } }),
      });
      const data = await res.json();
      const calendarStr = data.data?.matchedUser?.submissionCalendar;
      if (!calendarStr) return null;

      const calendar: Record<string, number> = JSON.parse(calendarStr);
      
      // Calculate stats based on UTC
      const now = new Date();
      // LeetCode resets at 00:00 UTC. 
      const todayStartUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime() / 1000;
      
      const solvedToday = calendar[todayStartUTC.toString()] || 0;
      
      let solvedThisWeek = 0;
      // This week (last 7 days including today)
      for (let i = 0; i < 7; i++) {
        const day = todayStartUTC - (i * 86400);
        solvedThisWeek += calendar[day.toString()] || 0;
      }
      
      // Streak calculation
      let streak = 0;
      let currentDay = todayStartUTC;
      
      // If user hasn't solved today, check if they solved yesterday to maintain streak
      if (!calendar[currentDay.toString()]) {
         currentDay -= 86400;
      }
      
      while (calendar[currentDay.toString()]) {
        streak++;
        currentDay -= 86400;
      }
      
      return { solvedToday, solvedThisWeek, streak };
    } catch (e) {
      console.error('Failed to get user stats:', e);
      return null;
    }
  }

  /** Gets the signed-in user's followed users. Shared by getFriendSuggestions
   * and getFriendSolvedMap so we only write the userStatus/following queries once. */
  private async fetchFollowedUsers(): Promise<
    Array<{ userSlug: string; userAvatar?: string; realName?: string }>
  > {
    // 1. Get current user username from GraphQL
    const userStatusQuery = `
      query userStatus {
        userStatus {
          isSignedIn
          username
          avatar
        }
      }
    `;
    let username = '';
    try {
      const statusRes = await fetch(this.DAILY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userStatusQuery }),
      });
      const statusData = await statusRes.json();
      if (statusData.data?.userStatus?.isSignedIn) {
        username = statusData.data.userStatus.username;
      }
    } catch (e) {
      console.warn('Failed to fetch user status:', e);
    }

    // 2. Get followed users from GraphQL
    let followedUsers: Array<{ userSlug: string; userAvatar?: string; realName?: string }> = [];
    if (username) {
      const followingQuery = `
        query following($userSlug: String!) {
          following(userSlug: $userSlug) {
            users {
              userSlug
              userAvatar
              realName
            }
          }
        }
      `;
      try {
        const followingRes = await fetch(this.DAILY_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: followingQuery,
            variables: { userSlug: username },
          }),
        });
        const followingData = await followingRes.json();
        followedUsers = followingData.data?.following?.users || [];
      } catch (e) {
        console.warn('Failed to fetch followed users:', e);
      }
    }

    // Also include chased targets if saved
    try {
      const stored = (await browser.storage.local.get('chase_targets')) as any;
      const targets: string[] = stored?.['chase_targets'] || [];
      targets.forEach(t => {
        if (!followedUsers.some(u => u.userSlug.toLowerCase() === t.toLowerCase())) {
          followedUsers.push({
            userSlug: t,
            userAvatar: this.DEFAULT_AVATAR,
            realName: t,
          });
        }
      });
    } catch (e) {
      // ignore
    }

    // Fallback if no followed users found
    if (followedUsers.length === 0) {
      followedUsers = [
        { userSlug: 'lee215', userAvatar: this.DEFAULT_AVATAR, realName: 'Lee' },
        { userSlug: 'StefanPochmann', userAvatar: this.DEFAULT_AVATAR, realName: 'Stefan' },
      ];
    }

    return followedUsers;
  }

  /** Builds a slug -> friends map from each followed user's recent AC
   * submissions, cached for FRIEND_SOLVED_CACHE_DURATION so repeated
   * searches don't refetch on every keystroke. */
  async getFriendSolvedMap(forceRefresh = false): Promise<Map<string, FriendUser[]>> {
    const now = Date.now();
    if (
      !forceRefresh &&
      this.friendSolvedMapCache &&
      now - this.friendSolvedMapCacheTime < this.FRIEND_SOLVED_CACHE_DURATION
    ) {
      return this.friendSolvedMapCache;
    }

    const map = new Map<string, FriendUser[]>();

    try {
      const followedUsers = await this.fetchFollowedUsers();

      const acQuery = `
        query recentAcSubmissions($username: String!, $limit: Int!) {
          recentAcSubmissionList(username: $username, limit: $limit) {
            id
            title
            titleSlug
            timestamp
          }
        }
      `;

      for (const friend of followedUsers.slice(0, 5)) {
        try {
          const acRes = await fetch(this.DAILY_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: acQuery,
              variables: { username: friend.userSlug, limit: 20 },
            }),
          });
          const acData = await acRes.json();
          const submissions = acData.data?.recentAcSubmissionList || [];

          for (const sub of submissions) {
            const existing = map.get(sub.titleSlug) || [];
            if (!existing.some(f => f.username === friend.userSlug)) {
              existing.push({
                username: friend.userSlug,
                avatarUrl: friend.userAvatar || this.DEFAULT_AVATAR,
                timestamp: sub.timestamp,
              });
            }
            map.set(sub.titleSlug, existing);
          }
        } catch (e) {
          console.warn(`Failed to fetch AC submissions for ${friend.userSlug}:`, e);
        }
      }
    } catch (e) {
      console.error('Failed to build friend solved map:', e);
    }

    this.friendSolvedMapCache = map;
    this.friendSolvedMapCacheTime = now;
    return map;
  }

  async getFriendSuggestions(): Promise<any[]> {
    try {
      const followedUsers = await this.fetchFollowedUsers();

      // Fetch recent AC submissions for followed users via GraphQL
      const problemMap = new Map<string, any>();
      const acQuery = `
        query recentAcSubmissions($username: String!, $limit: Int!) {
          recentAcSubmissionList(username: $username, limit: $limit) {
            id
            title
            titleSlug
            timestamp
          }
        }
      `;

      await Promise.all(
        followedUsers.slice(0, 5).map(async (friend) => {
          try {
            const acRes = await fetch(this.DAILY_ENDPOINT, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: acQuery,
                variables: { username: friend.userSlug, limit: 8 },
              }),
            });
            const acData = await acRes.json();
            const submissions = acData.data?.recentAcSubmissionList || [];

            for (const sub of submissions) {
              if (!problemMap.has(sub.titleSlug)) {
                problemMap.set(sub.titleSlug, {
                  title: sub.title,
                  slug: sub.titleSlug,
                  solvedByFriends: [],
                  isSimilar: false,
                });
              }
              const existing = problemMap.get(sub.titleSlug);
              if (!existing.solvedByFriends.some((f: any) => f.username === friend.userSlug)) {
                existing.solvedByFriends.push({
                  username: friend.userSlug,
                  avatarUrl: friend.userAvatar || this.DEFAULT_AVATAR,
                  timestamp: sub.timestamp,
                });
              }
            }
          } catch (e) {
            console.warn(`Failed to fetch AC submissions for ${friend.userSlug}:`, e);
          }
        })
      );

      // Fetch details & similar questions via GraphQL
      const questionQuery = `
        query questionData($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            questionFrontendId
            title
            titleSlug
            difficulty
            isPaidOnly
            similarQuestions
          }
        }
      `;

      const solvedSlugs = Array.from(problemMap.keys());
      const similarMap = new Map<string, any>();

      // First pass: hydrate from local DB
      for (const slug of solvedSlugs) {
        try {
          const cached = await leetcodeDB.getProblemBySlug(slug);
          if (cached) {
            const existing = problemMap.get(slug);
            existing.id = cached.id;
            existing.difficulty = cached.difficulty;
            existing.isPaidOnly = cached.isPaidOnly;
            existing.acRate = cached.acRate;
            existing.status = cached.status;
          }
        } catch (e) {
          console.warn(`Failed DB lookup for ${slug}:`, e);
        }
      }

      // Pick representative slugs to fetch similar questions for
      const slugsToFetchSimilar = new Set<string>();
      for (const friend of followedUsers.slice(0, 5)) {
        let addedForFriend = 0;
        for (const slug of solvedSlugs) {
          const existing = problemMap.get(slug);
          if (existing.solvedByFriends.some((f: any) => f.username === friend.userSlug)) {
            slugsToFetchSimilar.add(slug);
            addedForFriend++;
            if (addedForFriend >= 2) break;
          }
        }
      }
      
      const slugsArrayToFetch = Array.from(slugsToFetchSimilar).slice(0, 6);

      await Promise.all(
        slugsArrayToFetch.map(async (slug) => {
          try {
            const existing = problemMap.get(slug);

            const qRes = await fetch(this.DAILY_ENDPOINT, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: questionQuery,
                variables: { titleSlug: slug },
              }),
            });
            const qData = await qRes.json();
            const q = qData.data?.question;

            if (q) {
              if (!existing.id) {
                existing.id = q.questionFrontendId || 0;
              }
              existing.difficulty = q.difficulty || existing.difficulty || 'Medium';
              existing.isPaidOnly = q.isPaidOnly ?? existing.isPaidOnly ?? false;

              if (q.similarQuestions) {
                try {
                  const parsed = JSON.parse(q.similarQuestions);
                  for (const sim of parsed.slice(0, 2)) {
                    if (!problemMap.has(sim.titleSlug) && !similarMap.has(sim.titleSlug)) {
                      similarMap.set(sim.titleSlug, { isPlaceholder: true });

                      let simId: string | number = 0;
                      let simStatus: string | null = null;
                      const cachedSim = await leetcodeDB.getProblemBySlug(sim.titleSlug);
                      if (cachedSim) {
                        simId = cachedSim.id;
                        simStatus = cachedSim.status ?? null;
                      }

                      similarMap.set(sim.titleSlug, {
                        id: simId,
                        title: sim.title,
                        slug: sim.titleSlug,
                        difficulty: sim.difficulty || 'Medium',
                        status: simStatus,
                        isPaidOnly: false,
                        isSimilar: true,
                        similarToTitle: q.title,
                      });
                    }
                  }
                } catch (err) {
                  console.warn('Failed to parse similarQuestions JSON:', err);
                }
              }
            }
          } catch (e) {
            console.warn(`Failed to fetch question details for ${slug}:`, e);
          }
        })
      );

      let fallbackId = 999000;
      const finalResults = [...Array.from(problemMap.values()), ...Array.from(similarMap.values())]
        .map(item => ({
          ...item,
          id: item.id || ++fallbackId,
          difficulty: item.difficulty || 'Medium',
        }))
        .filter(item => !item.isPlaceholder);

      return finalResults;
    } catch (error) {
      console.error('Error in getFriendSuggestions:', error);
      return [];
    }
  }

  async getFriendsActivity(): Promise<any[]> {
    try {
      const followedUsers = await this.fetchFollowedUsers();
      const acQuery = `
        query recentAcSubmissions($username: String!, $limit: Int!) {
          recentAcSubmissionList(username: $username, limit: $limit) {
            id
            title
            titleSlug
            timestamp
          }
        }
      `;
      const allActivities: any[] = [];
      await Promise.all(
        followedUsers.slice(0, 5).map(async (friend) => {
          try {
            const acRes = await fetch(this.DAILY_ENDPOINT, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: acQuery,
                variables: { username: friend.userSlug, limit: 10 },
              }),
            });
            const acData = await acRes.json();
            const submissions = acData.data?.recentAcSubmissionList || [];
            
            for (const sub of submissions) {
              allActivities.push({
                friendUsername: friend.userSlug,
                friendAvatar: friend.userAvatar || this.DEFAULT_AVATAR,
                title: sub.title,
                slug: sub.titleSlug,
                timestamp: sub.timestamp,
              });
            }
          } catch (e) {
            console.warn(`Failed to fetch AC submissions for ${friend.userSlug}:`, e);
          }
        })
      );
      
      return allActivities.sort((a, b) => parseInt(b.timestamp, 10) - parseInt(a.timestamp, 10));
    } catch (e) {
      console.error('Failed to get friends activity:', e);
      return [];
    }
  }

  async fetchFullUserProfile(username: string): Promise<ChasedUserData | null> {
    try {
      const query = `
        query userChaseProfile($username: String!) {
          matchedUser(username: $username) {
            username
            githubUrl
            profile {
              ranking
              userAvatar
              realName
              aboutMe
              school
              countryName
              company
              jobTitle
              reputation
            }
            submitStatsGlobal {
              acSubmissionNum {
                difficulty
                count
                submissions
              }
              totalSubmissionNum {
                difficulty
                count
                submissions
              }
            }
            badges {
              id
              displayName
              icon
              creationDate
            }
            submissionCalendar
          }
          userContestRanking(username: $username) {
            attendedContestsCount
            rating
            globalRanking
            totalParticipants
            topPercentage
            badge {
              name
            }
          }
          allQuestionsCount {
            difficulty
            count
          }
          recentAcSubmissionList(username: $username, limit: 15) {
            id
            title
            titleSlug
            timestamp
          }
        }
      `;

      const url = `${this.DAILY_ENDPOINT}?query=${encodeURIComponent(query)}&variables=${encodeURIComponent(JSON.stringify({ username }))}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const resData = await response.json();
      const user = resData.data?.matchedUser;
      if (!user) return null;

      const profile = user.profile || {};
      const contest = resData.data?.userContestRanking;
      const allQuestions = resData.data?.allQuestionsCount || [];
      const recentAc = resData.data?.recentAcSubmissionList || [];

      // Total questions in LeetCode
      let totalAll = 0;
      let totalEasy = 0;
      let totalMedium = 0;
      let totalHard = 0;
      allQuestions.forEach((q: any) => {
        if (q.difficulty === 'All') totalAll = q.count;
        if (q.difficulty === 'Easy') totalEasy = q.count;
        if (q.difficulty === 'Medium') totalMedium = q.count;
        if (q.difficulty === 'Hard') totalHard = q.count;
      });

      // Solved breakdown
      const acNums = user.submitStatsGlobal?.acSubmissionNum || [];
      const totalNums = user.submitStatsGlobal?.totalSubmissionNum || [];

      let totalSolved = 0;
      let easySolved = 0;
      let mediumSolved = 0;
      let hardSolved = 0;
      let totalAcSubmissions = 0;
      acNums.forEach((item: any) => {
        if (item.difficulty === 'All') {
          totalSolved = item.count;
          totalAcSubmissions = item.submissions;
        }
        if (item.difficulty === 'Easy') easySolved = item.count;
        if (item.difficulty === 'Medium') mediumSolved = item.count;
        if (item.difficulty === 'Hard') hardSolved = item.count;
      });

      let totalSubmissionsCount = 0;
      totalNums.forEach((item: any) => {
        if (item.difficulty === 'All') totalSubmissionsCount = item.submissions;
      });

      const acceptanceRate =
        totalSubmissionsCount > 0
          ? Number(((totalAcSubmissions / totalSubmissionsCount) * 100).toFixed(1))
          : 0;

      // Activity / Streak calculation
      let solvedToday = 0;
      let solvedThisWeek = 0;
      let streak = 0;
      let totalCalendarSubmissions = 0;

      if (user.submissionCalendar) {
        try {
          const calendar: Record<string, number> = JSON.parse(user.submissionCalendar);
          const now = new Date();
          const todayStartUTC =
            new Date(
              Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
            ).getTime() / 1000;

          solvedToday = calendar[todayStartUTC.toString()] || 0;

          for (let i = 0; i < 7; i++) {
            const day = todayStartUTC - i * 86400;
            solvedThisWeek += calendar[day.toString()] || 0;
          }

          let currentDay = todayStartUTC;
          if (!calendar[currentDay.toString()]) {
            currentDay -= 86400;
          }
          while (calendar[currentDay.toString()]) {
            streak++;
            currentDay -= 86400;
          }

          Object.values(calendar).forEach(count => {
            totalCalendarSubmissions += count;
          });
        } catch (e) {
          console.warn('Failed to parse calendar:', e);
        }
      }

      // Avatar URL handling
      let avatarUrl = profile.userAvatar || this.DEFAULT_AVATAR;
      if (avatarUrl.startsWith('/')) {
        avatarUrl = `https://leetcode.com${avatarUrl}`;
      }

      return {
        username: user.username || username,
        realName: profile.realName || null,
        avatarUrl,
        ranking: profile.ranking || 0,
        reputation: profile.reputation || 0,
        country: profile.countryName || null,
        school: profile.school || null,
        company: profile.company || null,
        solvedStats: {
          totalSolved,
          easySolved,
          mediumSolved,
          hardSolved,
          totalEasy: totalEasy || 850,
          totalMedium: totalMedium || 1750,
          totalHard: totalHard || 750,
          totalProblems: totalAll || 3350,
          acceptanceRate,
          totalSubmissions: totalSubmissionsCount,
        },
        contestStats: contest
          ? {
              rating: contest.rating ? Math.round(contest.rating) : null,
              globalRanking: contest.globalRanking || null,
              topPercentage: contest.topPercentage
                ? Number(contest.topPercentage.toFixed(2))
                : null,
              attendedContests: contest.attendedContestsCount || 0,
              badgeName: contest.badge?.name || null,
            }
          : null,
        activityStats: {
          solvedToday,
          solvedThisWeek,
          streak,
          totalCalendarSubmissions,
        },
        recentSubmissions: recentAc.map((sub: any) => ({
          id: sub.id,
          title: sub.title,
          slug: sub.titleSlug,
          timestamp: sub.timestamp,
        })),
        badges: (user.badges || []).map((b: any) => ({
          id: b.id,
          displayName: b.displayName,
          icon: b.icon?.startsWith('http') ? b.icon : `https://leetcode.com${b.icon || ''}`,
        })),
      };
    } catch (error) {
      console.error(`Failed to fetch user profile for ${username}:`, error);
      return null;
    }
  }

  async fetchChaseData(targetUsernames: string[]): Promise<ChaseModeData> {
    const { username: currentUsername } = await this.getUserStatus();

    // Fetch current user and all target users in parallel
    const allUsernamesToFetch = Array.from(
      new Set([
        ...(currentUsername ? [currentUsername] : []),
        ...targetUsernames.filter(Boolean),
      ])
    );

    const userResults = await Promise.all(
      allUsernamesToFetch.map(u => this.fetchFullUserProfile(u))
    );

    const userMap = new Map<string, ChasedUserData>();
    userResults.forEach(res => {
      if (res) {
        userMap.set(res.username.toLowerCase(), res);
      }
    });

    const currentUser = currentUsername
      ? userMap.get(currentUsername.toLowerCase()) || null
      : null;
    const targets = targetUsernames
      .map(u => userMap.get(u.toLowerCase()))
      .filter((u): u is ChasedUserData => !!u);

    return {
      currentUser,
      targets,
    };
  }

  async validateUsername(username: string): Promise<boolean> {
    if (!username || !username.trim()) return false;
    try {
      const query = `
        query checkUser($username: String!) {
          matchedUser(username: $username) {
            username
          }
        }
      `;
      const url = `${this.DAILY_ENDPOINT}?query=${encodeURIComponent(query)}&variables=${encodeURIComponent(JSON.stringify({ username: username.trim() }))}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      const data = await res.json();
      return !!data.data?.matchedUser?.username;
    } catch (e) {
      return false;
    }
  }
}

export const leetcodeService = new LeetCodeService();
