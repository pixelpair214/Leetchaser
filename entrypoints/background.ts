import { leetcodeService } from '@/utils/leetcode-api';
import { addToHistory, getHistory } from '@/utils/history';

export default defineBackground(() => {
  // Handle extension installation
  browser.runtime.onInstalled.addListener(async details => {
    console.log('Extension installed:', details.reason);

    if (details.reason === 'install') {
      console.log('First time installation - syncing LeetCode problems...');
      browser.tabs.create({
        url: `https://leetjump.lirena.in/thanks?utm_source=extension&utm_medium=install&browser=${
          import.meta.env.BROWSER
        }`,
      });
      try {
        await leetcodeService.syncProblems((current, total) => {
          console.log(`Sync progress: ${current}/${total} problems`);
        });
        console.log('Initial sync completed successfully');
      } catch (error) {
        console.error('Failed to sync problems during installation:', error);
      }
    } else if (details.reason === 'update') {
      const previousVersion = details.previousVersion;
      const currentVersion = browser.runtime.getManifest().version;
      if (previousVersion !== currentVersion) {
        browser.tabs.create({
          url: `https://leetjump.lirena.in/release-notes/?utm_source=extension&utm_medium=update&browser=${
            import.meta.env.BROWSER
          }#v${currentVersion}`,
        });
      }
    }
  });

  // Handle messages from content scripts and popup
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);

    (async () => {
      try {
        let response;

        switch (message.type) {
          case 'SEARCH_PROBLEMS':
            const results = await leetcodeService.searchProblems(message.query);
            response = { success: true, data: results };
            break;

          case 'GET_ALL_PROBLEMS':
            const allProblems = await leetcodeService.getAllProblems();
            response = { success: true, data: allProblems };
            break;

          case 'SYNC_PROBLEMS':
            // Force sync when user clicks the button
            const didSync = await leetcodeService.syncProblems(
              message.onProgress,
              true // Force sync
            );
            response = { success: true, synced: didSync };
            break;

          case 'GET_PROBLEM_URL':
            const url = leetcodeService.getProblemUrl(message.slug);
            response = { success: true, url };
            break;

          case 'OPEN_PROBLEM':
            // Open the problem in a new tab
            await browser.tabs.create({
              url: leetcodeService.getProblemUrl(message.slug, message.envType, message.envId),
              active: true,
            });
            // Track in history
            if (message.problemData) {
              await addToHistory({
                slug: message.problemData.slug,
                title: message.problemData.title,
                difficulty: message.problemData.difficulty,
                id: message.problemData.id,
              });
            }
            response = { success: true };
            break;

          case 'OPEN_PROBLEM_SAME_TAB':
            // Open the problem in the same tab
            const [currentTab] = await browser.tabs.query({ active: true, currentWindow: true });
            if (currentTab?.id) {
              await browser.tabs.update(currentTab.id, {
                url: leetcodeService.getProblemUrl(message.slug, message.envType, message.envId),
              });
            } else {
              // Fallback to opening in new tab if current tab not found
              await browser.tabs.create({
                url: leetcodeService.getProblemUrl(message.slug, message.envType, message.envId),
                active: true,
              });
            }
            // Track in history
            if (message.problemData) {
              await addToHistory({
                slug: message.problemData.slug,
                title: message.problemData.title,
                difficulty: message.problemData.difficulty,
                id: message.problemData.id,
              });
            }
            response = { success: true };
            break;
          case 'OPEN_RANDOM_PROBLEM':
            try {
              const randomProblem = await leetcodeService.getRandomProblem();
              if (randomProblem) {
                await browser.tabs.create({
                  url: leetcodeService.getProblemUrl(randomProblem.slug),
                  active: true,
                });
                response = { success: true, data: randomProblem };
              } else {
                response = { success: false, error: 'No problem found' };
              }
            } catch (error) {
              console.error('Failed to open random problem:', error);
              response = { success: false, error: 'Failed to open random problem' };
            }
            break;

          case 'CHECK_SYNC_STATUS':
            const isStale = await leetcodeService.isDataStale();
            const lastSync = await leetcodeService.getLastSyncDate();
            const totalCount = await leetcodeService.getTotalProblemsCount();

            response = {
              success: true,
              data: {
                isStale,
                lastSync,
                totalCount,
              },
            };
            break;

          case 'GET_DAILY_PROBLEM':
            const dailyProblem = await leetcodeService.getDailyProblem();
            response = { success: true, data: dailyProblem };
            break;



          case 'OPEN_DAILY_PROBLEM':
            try {
              const dailyProblem = await leetcodeService.getDailyProblem();
              const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

              if (dailyProblem) {
                await browser.tabs.create({
                  url: leetcodeService.getProblemUrl(dailyProblem.slug, 'daily-question', today),
                  active: true,
                });
                response = { success: true, data: dailyProblem };
              } else {
                // Fallback to general daily problem page
                await browser.tabs.create({
                  url: leetcodeService.getDailyProblemUrl(today),
                  active: true,
                });
                response = { success: true, data: null };
              }
            } catch (error) {
              console.error('Failed to open daily problem:', error);
              response = { success: false, error: 'Failed to open daily problem' };
            }
            break;

          case 'GET_DASHBOARD_DATA':
            try {
              const [dailyProblem, friendSuggestions, userStats] = await Promise.all([
                leetcodeService.getDailyProblem(),
                leetcodeService.getFriendsActivity(),
                leetcodeService.getUserStats(),
              ]);
              response = { 
                success: true, 
                data: {
                  dailyProblem,
                  friendSuggestions,
                  userStats,
                }
              };
            } catch (error) {
              console.error('Failed to get dashboard data:', error);
              response = { success: false, error: 'Failed to get dashboard data' };
            }
            break;

          case 'GET_HISTORY':
            try {
              const history = await getHistory();
              response = { success: true, data: history };
            } catch (error) {
              console.error('Failed to get history:', error);
              response = { success: false, error: 'Failed to get history' };
            }
            break;

          case 'GET_FRIEND_SUGGESTIONS':
            try {
              const suggestions = await leetcodeService.getFriendSuggestions();
              response = { success: true, data: suggestions };
            } catch (error) {
              console.error('Failed to get friend suggestions:', error);
              response = { success: false, error: 'Failed to get friend suggestions' };
            }
            break;

          case 'OPEN_EXTENSION_STORE':
            try {
              const browserType = import.meta.env.BROWSER;
              const storeUrl =
                browserType === 'firefox'
                  ? 'https://addons.mozilla.org/en-US/firefox/addon/leetjump/'
                  : 'https://chromewebstore.google.com/detail/leetjump-leetcode-quick-s/mapaacjngblliffleponocgiopaclfld';

              await browser.tabs.create({
                url: storeUrl,
                active: true,
              });
              response = { success: true };
            } catch (error) {
              console.error('Failed to open extension store:', error);
              response = { success: false, error: 'Failed to open extension store' };
            }
            break;

          default:
            console.warn('Unknown message type:', message.type);
            response = { success: false, error: 'Unknown message type' };
        }

        sendResponse(response);
      } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })();

    // Return true to indicate that the response will be sent asynchronously
    return true;
  });

  browser.alarms.onAlarm.addListener(async alarm => {
    if (alarm.name === 'leetcode-sync-check') {
      console.log('Periodic sync check running...');

      try {
        const isStale = await leetcodeService.isDataStale();
        if (isStale) {
          console.log('Data is stale, syncing...');
          await leetcodeService.syncProblems(undefined, false); // Don't force on periodic sync
        } else {
          console.log('Data is fresh, skipping sync');
        }
      } catch (error) {
        console.error('Error during periodic sync:', error);
      }
    }
  });

  // Set up periodic sync alarm - runs every 6 hours, but only syncs if data is >24h old
  browser.alarms.create('leetcode-sync-check', { periodInMinutes: 360 }); // 6 hours
});
