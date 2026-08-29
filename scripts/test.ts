import { leetcodeService } from '../utils/leetcode-api.ts';

async function test() {
  console.log('Fetching friends activity...');
  const activity = await leetcodeService.getFriendsActivity();
  console.log(JSON.stringify(activity, null, 2));
}

test();
