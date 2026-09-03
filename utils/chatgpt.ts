export type StuckHelpType = 'question' | 'approach';

export interface StuckPromptOptions {
  problem: {
    id: number | string;
    title: string;
    slug?: string;
    difficulty?: string;
  };
  helpType: StuckHelpType;
}

export function generateChatGPTStuckPrompt({ problem, helpType }: StuckPromptOptions): string {
  const problemName = `#${problem.id} - ${problem.title}`;
  const leetcodeUrl = problem.slug
    ? `https://leetcode.com/problems/${problem.slug}/`
    : '';

  if (helpType === 'question') {
    return [
      `I am practicing the LeetCode problem ${problemName}${leetcodeUrl ? ` (${leetcodeUrl})` : ''}.`,
      '',
      'I want to understand WHAT THIS QUESTION IS ASKING before trying to solve it.',
      '',
      'Please follow these strict guidelines:',
      '1. Rephrase the problem statement in simple, plain English with an intuitive real-world analogy.',
      '2. Clearly explain what the inputs represent, what the output must be, and any key constraints to keep in mind.',
      '3. Walk through one simple example step-by-step to show how the input transforms to the output.',
      '4. Point out common edge cases, tricky conditions, or misunderstandings people often have.',
      '',
      '⚠️ STRICT RULES:',
      '- DO NOT give any solution, algorithm, data structure recommendation, or code.',
      '- DO NOT spoil the approach or how to solve it.',
      '- ONLY help me understand the problem requirements and rules.',
    ].join('\n');
  }

  // helpType === 'approach'
  return [
    `I am currently stuck on the LeetCode problem ${problemName}${leetcodeUrl ? ` (${leetcodeUrl})` : ''}.`,
    '',
    'I want guidance on the APPROACH and intuition, but NOT the solution code.',
    '',
    'Please follow these strict guidelines:',
    '1. High-level Intuition: What is the core observation or mental model needed to solve this problem?',
    '2. Progressive Hints: Provide 2-3 progressive hints from gentle nudge to algorithmic pattern (e.g. Two Pointers, Monotonic Stack, Dynamic Programming, BFS/DFS, etc.).',
    '3. Step-by-step Strategy: Outline the logical thought process without writing code.',
    '4. Target Complexity: Mention the expected Time and Space complexity for the optimal solution.',
    '',
    '⚠️ STRICT RULES:',
    '- DO NOT write the complete solution or full code in any programming language.',
    '- Provide ONLY hints, conceptual guidance, and thought processes so I can write the code myself.',
  ].join('\n');
}

export async function redirectToChatGPT(options: StuckPromptOptions): Promise<void> {
  const prompt = generateChatGPTStuckPrompt(options);
  const targetUrl = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;

  try {
    await browser.runtime.sendMessage({
      type: 'OPEN_CHATGPT_URL',
      url: targetUrl,
      problemData: options.problem,
    });
  } catch (error) {
    // Fallback if runtime messaging fails
    window.open(targetUrl, '_blank');
  }
}
