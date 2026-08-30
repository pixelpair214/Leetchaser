import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'LeetChaser - Quick navigation and competitive LeetCoding',
    description: 'Quick navigation, friend-tracking, and competitive LeetCoding right from your keyboard',
    version: '1.1.0',
    permissions: ['alarms', 'storage'],
    host_permissions: ['https://leetcode.com/*', 'https://leetcode.cn/*'],
    commands: {
      _execute_action: {
        suggested_key: {
          default: 'Alt+L',
          mac: 'Alt+L',
          windows: 'Alt+L',
          chromeos: 'Alt+L',
          linux: 'Alt+L',
        },
        description: 'Activate the extension',
      },
    },
  },
});
