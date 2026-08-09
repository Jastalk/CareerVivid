import type { LocalInterviewGuide } from './localInterviewGuideCore';

/**
 * Curated coding challenges for the quest coding stage.
 *
 * Problems are hand-written with deterministic outputs so the hidden test
 * suite is guaranteed correct — the AI grades code quality, the tests decide
 * correctness. The company guide only flavors the framing/difficulty pick.
 */

export type CodingLanguage = 'javascript' | 'python' | 'cpp' | 'java' | 'csharp';
export type ExecutableCodingLanguage = 'javascript' | 'python';

export const CODING_LANGUAGES: readonly CodingLanguage[] = [
  'javascript',
  'python',
  'cpp',
  'java',
  'csharp',
] as const;

export const EXECUTABLE_CODING_LANGUAGES: readonly ExecutableCodingLanguage[] = ['javascript', 'python'] as const;

export const CODING_LANGUAGE_LABELS: Record<CodingLanguage, string> = {
  javascript: 'JavaScript',
  python: 'Python',
  cpp: 'C++',
  java: 'Java',
  csharp: 'C#',
};

export const CODING_LANGUAGE_CODE_BLOCKS: Record<CodingLanguage, string> = {
  javascript: 'javascript',
  python: 'python',
  cpp: 'cpp',
  java: 'java',
  csharp: 'csharp',
};

export const isExecutableCodingLanguage = (language: CodingLanguage): language is ExecutableCodingLanguage =>
  language === 'javascript' || language === 'python';

/**
 * Canonical problem taxonomy, mirroring techinterview.org's "Problems by topic"
 * page (https://www.techinterview.org/problems-by-topic/) exactly and in the
 * same order. Every challenge is cross-listed under one or more of these topics,
 * the same way the source site cross-lists a problem under multiple headings
 * (e.g. LRU Cache appears under Data Structures, Hash Table, and Linked List).
 */
export type CodingTopic =
  | 'Algorithms'
  | 'Arrays'
  | 'Data Structures'
  | 'Dynamic Programming'
  | 'General'
  | 'Graphs'
  | 'Hash Table'
  | 'Heap'
  | 'Linked List'
  | 'Queue'
  | 'Strings'
  | 'Trie';

/** The 12 canonical topics, in techinterview.org's display order. */
export const CODING_TOPICS: readonly CodingTopic[] = [
  'Algorithms',
  'Arrays',
  'Data Structures',
  'Dynamic Programming',
  'General',
  'Graphs',
  'Hash Table',
  'Heap',
  'Linked List',
  'Queue',
  'Strings',
  'Trie',
] as const;

export interface CodingTestCase {
  /** Positional arguments passed to the solution function. */
  input: unknown[];
  /** Expected return value (JSON-comparable). */
  expected: unknown;
  /** Hidden tests only run on submit, not on "Run". */
  hidden?: boolean;
}

export interface CodingChallenge {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  /**
   * Canonical topics from techinterview.org's problems-by-topic taxonomy.
   * A problem may belong to several (matching how the source cross-lists them).
   */
  topics: CodingTopic[];
  /** Domain tags matched against the company's codingTopics for selection. */
  tags?: string[];
  /** Function the candidate must implement for executable languages. */
  functionName: Record<ExecutableCodingLanguage, string>;
  description: string;
  requirements: string[];
  /** Short worked example shown in the brief. */
  example: string;
  starterCode: Record<ExecutableCodingLanguage, string>;
  tests: CodingTestCase[];
}

export interface CodingBrief {
  challenge: CodingChallenge;
  /** Full text passed to the AI grader. */
  prompt: string;
}

const CHALLENGES: CodingChallenge[] = [
  // --- New techinterview.org-aligned problems (kept on top) ---
  {
    id: 'sliding-window-maximum',
    title: 'Sliding Window Maximum',
    difficulty: 'hard',
    topics: ['Queue', 'Heap', 'Algorithms'],
    tags: ['stream', 'monitoring', 'time-series', 'sliding-window', 'realtime'],
    functionName: { javascript: 'maxSlidingWindow', python: 'max_sliding_window' },
    description:
      'Given an integer array and a window size k, return an array of the maximum value in each contiguous window of size k as the window slides from left to right.',
    requirements: [
      'Return one maximum per window, in order (length = nums.length - k + 1).',
      'Assume 1 <= k <= nums.length.',
      'Aim for O(n) time using a monotonic deque — not O(n·k).',
    ],
    example: 'maxSlidingWindow([1,3,-1,-3,5,3,6,7], 3) → [3,3,5,5,6,7]',
    starterCode: {
      javascript:
        'function maxSlidingWindow(nums, k) {\n  // Return the maximum of each contiguous window of size k.\n  // Target O(n) with a monotonic deque.\n\n}\n',
      python:
        'def max_sliding_window(nums, k):\n    # Return the maximum of each contiguous window of size k.\n    # Target O(n) with a monotonic deque.\n    pass\n',
    },
    tests: [
      { input: [[1, 3, -1, -3, 5, 3, 6, 7], 3], expected: [3, 3, 5, 5, 6, 7] },
      { input: [[1], 1], expected: [1] },
      { input: [[9, 11], 2], expected: [11] },
      { input: [[4, -2], 2], expected: [4], hidden: true },
      { input: [[1, 3, 1, 2, 0, 5], 3], expected: [3, 3, 2, 5], hidden: true },
      { input: [[7, 2, 4], 2], expected: [7, 4], hidden: true },
      { input: [[-7, -8, 7, 5, 7, 1, 6, 0], 4], expected: [7, 7, 7, 7, 7], hidden: true },
    ],
  },
  {
    id: 'implement-trie',
    title: 'Implement Trie (Prefix Tree)',
    difficulty: 'medium',
    topics: ['Trie', 'Data Structures'],
    tags: ['autocomplete', 'search', 'prefix', 'dictionary', 'string', 'typeahead'],
    functionName: { javascript: 'trieOps', python: 'trie_ops' },
    description:
      'Implement a trie (prefix tree) and process a list of operations against it. Each operation is ["insert", word], ["search", word], or ["startsWith", prefix]. Return one result per operation: null for insert, and a boolean for search (is the exact word present) and startsWith (does any word start with the prefix).',
    requirements: [
      'Return null for insert, true/False for search and startsWith.',
      'search matches only complete inserted words; startsWith matches any prefix.',
      'Each operation should run in O(L) where L is the word/prefix length.',
    ],
    example:
      'trieOps([["insert","apple"],["search","apple"],["search","app"],["startsWith","app"]]) → [null, true, false, true]',
    starterCode: {
      javascript:
        'function trieOps(operations) {\n  // operations: [["insert", word] | ["search", word] | ["startsWith", prefix], ...]\n  // Return one result per operation: null for insert,\n  // boolean for search and startsWith.\n\n}\n',
      python:
        'def trie_ops(operations):\n    # operations: [["insert", word] | ["search", word] | ["startsWith", prefix], ...]\n    # Return one result per operation: None for insert,\n    # bool for search and startsWith.\n    pass\n',
    },
    tests: [
      {
        input: [[['insert', 'apple'], ['search', 'apple'], ['search', 'app'], ['startsWith', 'app'], ['insert', 'app'], ['search', 'app']]],
        expected: [null, true, false, true, null, true],
      },
      { input: [[['search', 'missing']]], expected: [false] },
      { input: [[['insert', 'a'], ['startsWith', 'a'], ['search', 'a']]], expected: [null, true, true] },
      {
        input: [[['insert', 'abc'], ['search', 'ab'], ['startsWith', 'abc'], ['startsWith', 'abcd']]],
        expected: [null, false, true, false],
        hidden: true,
      },
      {
        input: [[['insert', 'app'], ['insert', 'apple'], ['search', 'app'], ['search', 'apple'], ['startsWith', 'ap'], ['startsWith', 'b']]],
        expected: [null, null, true, true, true, false],
        hidden: true,
      },
      {
        input: [[['startsWith', 'x'], ['insert', 'xy'], ['startsWith', 'x'], ['search', 'x']]],
        expected: [false, null, true, false],
        hidden: true,
      },
    ],
  },
  {
    id: 'power-of-two',
    title: 'Check If a Number is Power of Two',
    difficulty: 'easy',
    topics: ['General', 'Algorithms'],
    tags: ['bit-manipulation', 'math', 'numbers'],
    functionName: { javascript: 'isPowerOfTwo', python: 'is_power_of_two' },
    description:
      'Given an integer n, return whether it is a power of two (i.e. n === 2^x for some non-negative integer x). Zero and negative numbers are never powers of two.',
    requirements: [
      'Return true/False.',
      'Handle zero and negative inputs (both return false).',
      'Solve in O(1) — a single bit trick or one loop, no allocation.',
    ],
    example: 'isPowerOfTwo(16) → true · isPowerOfTwo(6) → false',
    starterCode: {
      javascript:
        'function isPowerOfTwo(n) {\n  // Return true if n is a power of two, else false.\n\n}\n',
      python:
        'def is_power_of_two(n):\n    # Return True if n is a power of two, else False.\n    pass\n',
    },
    tests: [
      { input: [1], expected: true },
      { input: [16], expected: true },
      { input: [3], expected: false },
      { input: [0], expected: false, hidden: true },
      { input: [-16], expected: false, hidden: true },
      { input: [1024], expected: true, hidden: true },
      { input: [6], expected: false, hidden: true },
    ],
  },
  // --- Existing problems (preserved) ---
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'easy',
    topics: ['Arrays', 'Hash Table', 'Algorithms'],
    functionName: { javascript: 'twoSum', python: 'two_sum' },
    description:
      'Given an array of integers and a target, return the indices of the two numbers that add up to the target, sorted ascending. Exactly one solution exists; you may not use the same element twice.',
    requirements: [
      'Return the two indices as an array/list sorted ascending.',
      'Aim for better than O(n²) time.',
      'Handle negative numbers and duplicate values.',
    ],
    example: 'twoSum([2, 7, 11, 15], 9) → [0, 1]',
    starterCode: {
      javascript:
        'function twoSum(nums, target) {\n  // Return the indices of the two numbers that add up to target,\n  // sorted ascending. Exactly one solution exists.\n\n}\n',
      python:
        'def two_sum(nums, target):\n    # Return the indices of the two numbers that add up to target,\n    # sorted ascending. Exactly one solution exists.\n    pass\n',
    },
    tests: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { input: [[3, 2, 4], 6], expected: [1, 2] },
      { input: [[3, 3], 6], expected: [0, 1] },
      { input: [[-1, -2, -3, -4, -5], -8], expected: [2, 4], hidden: true },
      { input: [[0, 4, 3, 0], 0], expected: [0, 3], hidden: true },
      { input: [[5, 75, 25], 100], expected: [1, 2], hidden: true },
    ],
  },
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'easy',
    topics: ['Strings', 'Data Structures'],
    functionName: { javascript: 'isValid', python: 'is_valid' },
    description:
      "Given a string containing only the characters '(', ')', '{', '}', '[' and ']', determine whether the input is valid: every opening bracket must be closed by the same type in the correct order.",
    requirements: [
      'Return true/False for validity.',
      'An empty string is valid.',
      'Solve in a single pass, O(n) time.',
    ],
    example: "isValid('()[]{}') → true · isValid('(]') → false",
    starterCode: {
      javascript:
        "function isValid(s) {\n  // Return true if every bracket is closed by the same type\n  // in the correct order.\n\n}\n",
      python:
        'def is_valid(s):\n    # Return True if every bracket is closed by the same type\n    # in the correct order.\n    pass\n',
    },
    tests: [
      { input: ['()[]{}'], expected: true },
      { input: ['(]'], expected: false },
      { input: ['([{}])'], expected: true },
      { input: [''], expected: true, hidden: true },
      { input: ['(('], expected: false, hidden: true },
      { input: ['){'], expected: false, hidden: true },
      { input: ['{[()()]}[]'], expected: true, hidden: true },
    ],
  },
  {
    id: 'max-subarray',
    title: 'Maximum Subarray',
    difficulty: 'medium',
    topics: ['Dynamic Programming', 'Arrays', 'Algorithms'],
    functionName: { javascript: 'maxSubArray', python: 'max_sub_array' },
    description:
      'Given an integer array, find the contiguous subarray (containing at least one number) with the largest sum, and return that sum.',
    requirements: [
      'Return the maximum sum as a number.',
      'Handle arrays that are entirely negative.',
      'Aim for O(n) time and O(1) extra space (Kadane’s algorithm).',
    ],
    example: 'maxSubArray([-2,1,-3,4,-1,2,1,-5,4]) → 6  (subarray [4,-1,2,1])',
    starterCode: {
      javascript:
        'function maxSubArray(nums) {\n  // Return the largest sum of any contiguous subarray.\n\n}\n',
      python:
        'def max_sub_array(nums):\n    # Return the largest sum of any contiguous subarray.\n    pass\n',
    },
    tests: [
      { input: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
      { input: [[1]], expected: 1 },
      { input: [[5, 4, -1, 7, 8]], expected: 23 },
      { input: [[-3, -1, -2]], expected: -1, hidden: true },
      { input: [[-1, 0, -2]], expected: 0, hidden: true },
      { input: [[8, -19, 5, -4, 20]], expected: 21, hidden: true },
    ],
  },
  {
    id: 'merge-intervals',
    title: 'Merge Intervals',
    difficulty: 'medium',
    topics: ['Arrays', 'Algorithms'],
    functionName: { javascript: 'mergeIntervals', python: 'merge_intervals' },
    description:
      'Given an array of intervals [start, end], merge all overlapping intervals and return the merged intervals sorted by start.',
    requirements: [
      'Return intervals sorted ascending by start value.',
      'Intervals that touch (e.g. [1,4] and [4,5]) count as overlapping.',
      'Aim for O(n log n) time.',
    ],
    example: 'mergeIntervals([[1,3],[2,6],[8,10],[15,18]]) → [[1,6],[8,10],[15,18]]',
    starterCode: {
      javascript:
        'function mergeIntervals(intervals) {\n  // Merge overlapping intervals; return them sorted by start.\n\n}\n',
      python:
        'def merge_intervals(intervals):\n    # Merge overlapping intervals; return them sorted by start.\n    pass\n',
    },
    tests: [
      { input: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] },
      { input: [[[1, 4], [4, 5]]], expected: [[1, 5]] },
      { input: [[[1, 4]]], expected: [[1, 4]] },
      { input: [[[5, 6], [1, 2]]], expected: [[1, 2], [5, 6]], hidden: true },
      { input: [[[1, 10], [2, 3], [4, 5]]], expected: [[1, 10]], hidden: true },
      { input: [[[1, 4], [0, 0]]], expected: [[0, 0], [1, 4]], hidden: true },
    ],
  },
  {
    id: 'longest-unique-substring',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'medium',
    topics: ['Strings', 'Hash Table', 'Algorithms'],
    functionName: { javascript: 'lengthOfLongestSubstring', python: 'length_of_longest_substring' },
    description:
      'Given a string, return the length of the longest substring without repeating characters.',
    requirements: [
      'Return the length as a number.',
      'Handle empty strings and strings of one repeated character.',
      'Aim for O(n) time with a sliding window.',
    ],
    example: "lengthOfLongestSubstring('abcabcbb') → 3  ('abc')",
    starterCode: {
      javascript:
        "function lengthOfLongestSubstring(s) {\n  // Return the length of the longest substring with no\n  // repeating characters.\n\n}\n",
      python:
        'def length_of_longest_substring(s):\n    # Return the length of the longest substring with no\n    # repeating characters.\n    pass\n',
    },
    tests: [
      { input: ['abcabcbb'], expected: 3 },
      { input: ['bbbbb'], expected: 1 },
      { input: ['pwwkew'], expected: 3 },
      { input: [''], expected: 0, hidden: true },
      { input: ['au'], expected: 2, hidden: true },
      { input: ['dvdf'], expected: 3, hidden: true },
      { input: ['tmmzuxt'], expected: 5, hidden: true },
    ],
  },
  {
    id: 'product-except-self',
    title: 'Product of Array Except Self',
    difficulty: 'medium',
    topics: ['Arrays', 'Algorithms'],
    functionName: { javascript: 'productExceptSelf', python: 'product_except_self' },
    description:
      'Given an integer array nums, return an array where each element is the product of all other elements — without using division.',
    requirements: [
      'Do not use division.',
      'Handle zeros in the input.',
      'Aim for O(n) time.',
    ],
    example: 'productExceptSelf([1,2,3,4]) → [24,12,8,6]',
    starterCode: {
      javascript:
        'function productExceptSelf(nums) {\n  // Return an array where each element is the product of all\n  // the other elements. No division allowed.\n\n}\n',
      python:
        'def product_except_self(nums):\n    # Return a list where each element is the product of all\n    # the other elements. No division allowed.\n    pass\n',
    },
    tests: [
      { input: [[1, 2, 3, 4]], expected: [24, 12, 8, 6] },
      { input: [[2, 3]], expected: [3, 2] },
      { input: [[-1, 1, 0, -3, 3]], expected: [0, 0, 9, 0, 0] },
      { input: [[0, 0]], expected: [0, 0], hidden: true },
      { input: [[1, -1]], expected: [-1, 1], hidden: true },
      { input: [[4, 5, 1, 8, 2]], expected: [80, 64, 320, 40, 160], hidden: true },
    ],
  },
  {
    id: 'climbing-stairs',
    title: 'Climbing Stairs',
    difficulty: 'easy',
    topics: ['Dynamic Programming'],
    functionName: { javascript: 'climbStairs', python: 'climb_stairs' },
    description:
      'You are climbing a staircase with n steps. Each time you can climb 1 or 2 steps. In how many distinct ways can you reach the top?',
    requirements: [
      'Return the count as a number.',
      'Handle n up to 45 without recursion blowing up (use iteration/DP).',
      'Explain the recurrence in a comment.',
    ],
    example: 'climbStairs(3) → 3  (1+1+1, 1+2, 2+1)',
    starterCode: {
      javascript:
        'function climbStairs(n) {\n  // Return how many distinct ways you can climb n steps\n  // taking 1 or 2 steps at a time.\n\n}\n',
      python:
        'def climb_stairs(n):\n    # Return how many distinct ways you can climb n steps\n    # taking 1 or 2 steps at a time.\n    pass\n',
    },
    tests: [
      { input: [2], expected: 2 },
      { input: [3], expected: 3 },
      { input: [5], expected: 8 },
      { input: [1], expected: 1, hidden: true },
      { input: [10], expected: 89, hidden: true },
      { input: [45], expected: 1836311903, hidden: true },
    ],
  },
  {
    id: 'binary-search',
    title: 'Binary Search',
    difficulty: 'easy',
    topics: ['Algorithms', 'Arrays'],
    functionName: { javascript: 'search', python: 'search' },
    description:
      'Given a sorted (ascending) integer array and a target, return the index of the target, or -1 if it is not present. Your solution must run in O(log n).',
    requirements: [
      'Return the index, or -1 when absent.',
      'Must be O(log n) — no linear scans.',
      'Watch for integer-midpoint and off-by-one mistakes.',
    ],
    example: 'search([-1,0,3,5,9,12], 9) → 4',
    starterCode: {
      javascript:
        'function search(nums, target) {\n  // Sorted array: return the index of target or -1.\n  // Must run in O(log n).\n\n}\n',
      python:
        'def search(nums, target):\n    # Sorted list: return the index of target or -1.\n    # Must run in O(log n).\n    pass\n',
    },
    tests: [
      { input: [[-1, 0, 3, 5, 9, 12], 9], expected: 4 },
      { input: [[-1, 0, 3, 5, 9, 12], 2], expected: -1 },
      { input: [[5], 5], expected: 0 },
      { input: [[], 3], expected: -1, hidden: true },
      { input: [[1, 3], 3], expected: 1, hidden: true },
      { input: [[2, 4, 6, 8, 10, 12, 14, 16], 2], expected: 0, hidden: true },
    ],
  },
  {
    id: 'max-drawdown',
    title: 'Maximum Drawdown',
    difficulty: 'medium',
    topics: ['Arrays', 'Algorithms'],
    tags: ['finance', 'fintech', 'trading', 'portfolio', 'time-series', 'financial'],
    functionName: { javascript: 'maxDrawdown', python: 'max_drawdown' },
    description:
      'Given a chronological series of prices, return the maximum drawdown: the largest peak-to-trough decline (peak minus the lowest later price). Return 0 if prices never decline or fewer than two prices are given.',
    requirements: [
      'The trough must come after the peak in time.',
      'Return 0 for empty, single-element, or non-declining series.',
      'Solve in a single pass, O(n) time and O(1) space.',
    ],
    example: 'maxDrawdown([100, 90, 105, 70, 80]) → 35  (105 → 70)',
    starterCode: {
      javascript:
        'function maxDrawdown(prices) {\n  // Return the largest peak-to-trough decline, where the trough\n  // occurs after the peak. Return 0 if prices never decline.\n\n}\n',
      python:
        'def max_drawdown(prices):\n    # Return the largest peak-to-trough decline, where the trough\n    # occurs after the peak. Return 0 if prices never decline.\n    pass\n',
    },
    tests: [
      { input: [[100, 90, 105, 70, 80]], expected: 35 },
      { input: [[10, 20, 30]], expected: 0 },
      { input: [[5]], expected: 0 },
      { input: [[]], expected: 0, hidden: true },
      { input: [[100, 60, 100, 60]], expected: 40, hidden: true },
      { input: [[3, 2, 1]], expected: 2, hidden: true },
      { input: [[50, 100, 40, 120, 30]], expected: 90, hidden: true },
    ],
  },
  {
    id: 'lru-cache',
    title: 'LRU Cache',
    difficulty: 'hard',
    topics: ['Data Structures', 'Hash Table', 'Linked List'],
    tags: ['cache', 'design', 'systems', 'memory', 'data structure', 'infrastructure'],
    functionName: { javascript: 'lruCacheOps', python: 'lru_cache_ops' },
    description:
      'Implement a least-recently-used cache and process a list of operations against it. Each operation is ["put", key, value] or ["get", key]. Return one result per operation: null for put, and the value (or -1 if absent) for get. Both get and put count as "use" and must run in O(1) average time.',
    requirements: [
      'Evict the least-recently-used key when capacity is exceeded.',
      'Both get and put refresh a key\'s recency.',
      'O(1) average time per operation — no linear scans.',
    ],
    example: 'lruCacheOps(2, [["put",1,1],["put",2,2],["get",1],["put",3,3],["get",2]]) → [null, null, 1, null, -1]',
    starterCode: {
      javascript:
        'function lruCacheOps(capacity, operations) {\n  // operations: [["put", key, value] | ["get", key], ...]\n  // Return one result per operation: null for put,\n  // value or -1 for get. O(1) per operation.\n\n}\n',
      python:
        'def lru_cache_ops(capacity, operations):\n    # operations: [["put", key, value] | ["get", key], ...]\n    # Return one result per operation: None for put,\n    # value or -1 for get. O(1) per operation.\n    pass\n',
    },
    tests: [
      {
        input: [2, [['put', 1, 1], ['put', 2, 2], ['get', 1], ['put', 3, 3], ['get', 2], ['put', 4, 4], ['get', 1], ['get', 3], ['get', 4]]],
        expected: [null, null, 1, null, -1, null, -1, 3, 4],
      },
      { input: [1, [['put', 1, 1], ['get', 1], ['put', 2, 2], ['get', 1], ['get', 2]]], expected: [null, 1, null, -1, 2] },
      { input: [2, [['get', 5]]], expected: [-1] },
      {
        input: [2, [['put', 1, 1], ['put', 1, 10], ['get', 1]]],
        expected: [null, null, 10],
        hidden: true,
      },
      {
        // get refreshes recency: 1 is used, so 2 gets evicted
        input: [2, [['put', 1, 1], ['put', 2, 2], ['get', 1], ['put', 3, 3], ['get', 1], ['get', 2], ['get', 3]]],
        expected: [null, null, 1, null, 1, -1, 3],
        hidden: true,
      },
      {
        // put refreshes recency of an existing key
        input: [2, [['put', 1, 1], ['put', 2, 2], ['put', 1, 100], ['put', 3, 3], ['get', 1], ['get', 2], ['get', 3]]],
        expected: [null, null, null, null, 100, -1, 3],
        hidden: true,
      },
    ],
  },
  {
    id: 'course-schedule',
    title: 'Course Schedule',
    difficulty: 'hard',
    topics: ['Graphs', 'Algorithms'],
    tags: ['graph', 'dependency', 'topological', 'build', 'pipeline'],
    functionName: { javascript: 'canFinish', python: 'can_finish' },
    description:
      'There are numCourses courses labeled 0..numCourses-1 and a list of prerequisite pairs [a, b] meaning you must take course b before course a. Return whether it is possible to finish all courses — i.e., whether the dependency graph has no cycle.',
    requirements: [
      'Return true/False.',
      'Handle disconnected graphs and courses with no prerequisites.',
      'O(V + E) time via topological sort or DFS cycle detection.',
    ],
    example: 'canFinish(2, [[1,0]]) → true · canFinish(2, [[1,0],[0,1]]) → false',
    starterCode: {
      javascript:
        'function canFinish(numCourses, prerequisites) {\n  // prerequisites: [[a, b], ...] means b must be taken before a.\n  // Return true if all courses can be finished (no cycle).\n\n}\n',
      python:
        'def can_finish(num_courses, prerequisites):\n    # prerequisites: [[a, b], ...] means b must be taken before a.\n    # Return True if all courses can be finished (no cycle).\n    pass\n',
    },
    tests: [
      { input: [2, [[1, 0]]], expected: true },
      { input: [2, [[1, 0], [0, 1]]], expected: false },
      { input: [3, []], expected: true },
      { input: [4, [[1, 0], [2, 1], [3, 2]]], expected: true, hidden: true },
      { input: [4, [[1, 0], [2, 1], [0, 2], [3, 0]]], expected: false, hidden: true },
      { input: [5, [[1, 0], [2, 0], [3, 1], [3, 2], [4, 3]]], expected: true, hidden: true },
      { input: [1, []], expected: true, hidden: true },
    ],
  },
  {
    id: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    difficulty: 'hard',
    topics: ['Arrays', 'Dynamic Programming', 'Algorithms'],
    tags: ['array', 'two-pointer', 'simulation'],
    functionName: { javascript: 'trap', python: 'trap' },
    description:
      'Given an elevation map (array of non-negative bar heights, each bar of width 1), compute how much water it can trap after raining.',
    requirements: [
      'Return the total trapped units as a number.',
      'Handle monotonic and empty maps (trap 0).',
      'Aim for O(n) time with two pointers or prefix maxima.',
    ],
    example: 'trap([0,1,0,2,1,0,1,3,2,1,2,1]) → 6',
    starterCode: {
      javascript:
        'function trap(heights) {\n  // Return total units of water trapped between the bars.\n\n}\n',
      python:
        'def trap(heights):\n    # Return total units of water trapped between the bars.\n    pass\n',
    },
    tests: [
      { input: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expected: 6 },
      { input: [[4, 2, 0, 3, 2, 5]], expected: 9 },
      { input: [[1, 2, 3]], expected: 0 },
      { input: [[]], expected: 0, hidden: true },
      { input: [[5, 5, 5]], expected: 0, hidden: true },
      { input: [[3, 0, 3]], expected: 3, hidden: true },
      { input: [[5, 0, 1, 0, 5]], expected: 14, hidden: true },
    ],
  },
  {
    id: 'merge-k-sorted',
    title: 'Merge K Sorted Lists',
    difficulty: 'hard',
    topics: ['Heap', 'Linked List', 'Algorithms'],
    tags: ['heap', 'merge', 'sort', 'streams', 'logs'],
    functionName: { javascript: 'mergeKSorted', python: 'merge_k_sorted' },
    description:
      'Given k individually sorted (ascending) integer arrays, merge them into a single sorted array. Aim for better than concatenate-and-sort: use a heap or pairwise divide-and-conquer merging.',
    requirements: [
      'Return one sorted array containing every element.',
      'Handle empty input and empty inner arrays.',
      'Target O(N log k) where N is the total element count.',
    ],
    example: 'mergeKSorted([[1,4,5],[1,3,4],[2,6]]) → [1,1,2,3,4,4,5,6]',
    starterCode: {
      javascript:
        'function mergeKSorted(lists) {\n  // Merge k sorted arrays into one sorted array in O(N log k).\n\n}\n',
      python:
        'def merge_k_sorted(lists):\n    # Merge k sorted lists into one sorted list in O(N log k).\n    pass\n',
    },
    tests: [
      { input: [[[1, 4, 5], [1, 3, 4], [2, 6]]], expected: [1, 1, 2, 3, 4, 4, 5, 6] },
      { input: [[]], expected: [] },
      { input: [[[], [1]]], expected: [1] },
      { input: [[[5], [4], [3], [2], [1]]], expected: [1, 2, 3, 4, 5], hidden: true },
      { input: [[[-3, 0, 3], [-2, 2], [-1, 1]]], expected: [-3, -2, -1, 0, 1, 2, 3], hidden: true },
      { input: [[[1, 1, 1], [1, 1]]], expected: [1, 1, 1, 1, 1], hidden: true },
    ],
  },
];

/** Stable tiny hash so a company keeps the same challenge between visits. */
const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

export const getCodingChallengeById = (id: string): CodingChallenge | undefined =>
  CHALLENGES.find((c) => c.id === id);

/** Full bank, exposed for validation tests (see codingChallenges.test.ts). */
export const getAllCodingChallenges = (): CodingChallenge[] => [...CHALLENGES];

/**
 * Group the bank by canonical topic, mirroring techinterview.org's
 * "Problems by topic" page. Topics are returned in canonical order; a
 * challenge appears under every topic it is cross-listed in.
 */
export const getCodingChallengesByTopic = (): Record<CodingTopic, CodingChallenge[]> => {
  const grouped = Object.fromEntries(
    CODING_TOPICS.map((topic) => [topic, [] as CodingChallenge[]]),
  ) as Record<CodingTopic, CodingChallenge[]>;
  for (const challenge of CHALLENGES) {
    for (const topic of challenge.topics) grouped[topic].push(challenge);
  }
  return grouped;
};

/** How many problems make up a single company's coding pool. */
export const COMPANY_CODING_POOL_SIZE = 5;

/**
 * Build the company's coding pool — an ordered list of challenges best-fit for
 * that company, so the quest can hand out a fresh problem each time the user
 * clears one and comes back to keep practicing.
 *
 * Ordering:
 * - difficulty tier from the guide rating (>=8 hard, >=6 medium, else easy),
 *   mirroring how techinterview.org rates the company's real coding bar
 * - within the tier, prefer challenges whose domain tags appear in the
 *   company's codingTopics (fintech → drawdown, infra → LRU, etc.)
 * - the first entry is deterministic per company (so a given company always
 *   opens with the same problem), then the rest follow best-fit → rest of tier.
 * Capped at COMPANY_CODING_POOL_SIZE so "solved 2 of 5" stays meaningful.
 */
export const getCodingPool = (guide: LocalInterviewGuide): CodingChallenge[] => {
  const rating = guide.difficulty ?? 5;
  const tier: CodingChallenge['difficulty'] = rating >= 8 ? 'hard' : rating >= 6 ? 'medium' : 'easy';
  const tierPool = CHALLENGES.filter((c) => c.difficulty === tier);
  const candidates = tierPool.length ? tierPool : CHALLENGES;

  const topicsText = [...(guide.codingTopics ?? []), ...(guide.interviewStages ?? [])].join(' ').toLowerCase();
  const tagged = candidates.filter((c) => (c.tags ?? []).some((t) => topicsText.includes(t)));
  const finalPool = tagged.length ? tagged : candidates;
  const primaryIndex = hashString(guide.company) % finalPool.length;

  const ordered: CodingChallenge[] = [];
  const seen = new Set<string>();
  const push = (challenge: CodingChallenge | undefined) => {
    if (challenge && !seen.has(challenge.id)) {
      seen.add(challenge.id);
      ordered.push(challenge);
    }
  };

  // 1) Deterministic primary pick first (keeps a company's opener stable).
  push(finalPool[primaryIndex]);
  // 2) Remaining best-fit problems, rotating from the primary for variety.
  for (let i = 1; i < finalPool.length; i += 1) push(finalPool[(primaryIndex + i) % finalPool.length]);
  // 3) Rest of the same difficulty tier.
  for (const challenge of candidates) push(challenge);
  // 4) Safety fill from the whole bank if a tier is unusually small.
  for (const challenge of CHALLENGES) push(challenge);

  return ordered.slice(0, COMPANY_CODING_POOL_SIZE);
};

/**
 * Pick the next coding challenge for a company: the first pooled problem the
 * user has not yet solved. Once every pooled problem is cleared, rotate back
 * through the pool so the user can keep sharpening.
 */
export const selectNextCodingChallenge = (
  guide: LocalInterviewGuide,
  clearedChallengeIds: Iterable<string> = [],
): CodingChallenge => {
  const pool = getCodingPool(guide);
  const cleared = new Set(clearedChallengeIds);
  const next = pool.find((c) => !cleared.has(c.id));
  if (next) return next;
  return pool[cleared.size % pool.length];
};

const buildReviewOnlyStarterCode = (challenge: CodingChallenge, language: Exclude<CodingLanguage, ExecutableCodingLanguage>): string => {
  const requirements = challenge.requirements.map((r) => `// - ${r}`).join('\n');
  const title = challenge.title;
  if (language === 'cpp') {
    return [
      '#include <bits/stdc++.h>',
      'using namespace std;',
      '',
      'class Solution {',
      'public:',
      `  // ${title}`,
      requirements.replace(/^/gm, '  '),
      '  // Write the method signature that best matches the prompt, then implement it.',
      '};',
      '',
    ].join('\n');
  }
  if (language === 'java') {
    return [
      'import java.util.*;',
      '',
      'class Solution {',
      `  // ${title}`,
      requirements.replace(/^/gm, '  '),
      '  // Write the method signature that best matches the prompt, then implement it.',
      '}',
      '',
    ].join('\n');
  }
  return [
    'using System;',
    'using System.Collections.Generic;',
    '',
    'public class Solution',
    '{',
    `    // ${title}`,
    requirements.replace(/^/gm, '    '),
    '    // Write the method signature that best matches the prompt, then implement it.',
    '}',
    '',
  ].join('\n');
};

export const getCodingFunctionName = (challenge: CodingChallenge, language: ExecutableCodingLanguage): string =>
  challenge.functionName[language];

export const getCodingStarterCode = (challenge: CodingChallenge, language: CodingLanguage): string => {
  if (isExecutableCodingLanguage(language)) return challenge.starterCode[language];
  return buildReviewOnlyStarterCode(challenge, language);
};

const LANGUAGE_PATTERNS: Record<CodingLanguage, RegExp[]> = {
  cpp: [
    /\bc\+\+\b/i,
    /\bc\/c\+\+\b/i,
    /\bmodern c\+\+\b/i,
    /\bcuda\b/i,
    /\blow[-\s]?latency\b/i,
    /\bhft\b/i,
    /\bkernel\b/i,
    /\bembedded\b/i,
    /\bendpoints? agents?\b/i,
  ],
  java: [
    /\bjava\b/i,
    /\bjvm\b/i,
    /\bkotlin\b/i,
    /\bspring\b/i,
    /\bandroid\b/i,
  ],
  csharp: [
    /(?:^|[^a-z0-9])c#(?:$|[^a-z0-9])/i,
    /\bc sharp\b/i,
    /\b\.net\b/i,
    /\bdotnet\b/i,
    /\bunity\b/i,
  ],
  python: [
    /\bpython\b/i,
    /\bpytorch\b/i,
    /\bmachine learning\b/i,
    /\bml\b/i,
    /\bresearch\b/i,
    /\brag\b/i,
    /\binference\b/i,
    /\bdata[-\s]?science\b/i,
  ],
  javascript: [
    /\bjavascript\b/i,
    /\btypescript\b/i,
    /\breact\b/i,
    /\bfrontend\b/i,
    /\bfront[-\s]?end\b/i,
    /\bnode(?:\.js)?\b/i,
  ],
};

const COMPANY_LANGUAGE_OVERRIDES: Record<string, CodingLanguage> = {
  'airbyte-interview-guide': 'java',
  'bridgewater-associates-interview-guide': 'java',
  'defense-primes-lockheed-northrop-raytheon-interview-guide': 'cpp',
  'hudson-river-trading': 'cpp',
  'jump-trading': 'cpp',
  'sentinelone-interview-guide': 'cpp',
  'microsoft': 'csharp',
  'unity-interview-guide': 'csharp',
};

const LANGUAGE_TIEBREAK: CodingLanguage[] = ['cpp', 'java', 'csharp', 'python', 'javascript'];

export const getPreferredCodingLanguage = (guide: LocalInterviewGuide): CodingLanguage => {
  const override = COMPANY_LANGUAGE_OVERRIDES[guide.slug];
  if (override) return override;

  const text = [
    guide.company,
    guide.slug,
    guide.rawSummary ?? '',
    ...guide.codingTopics,
    ...guide.systemDesignTopics,
    ...guide.interviewStages,
    ...guide.tips,
    ...(guide.sampleQuestions?.coding ?? []),
  ].join('\n');

  const scores = Object.fromEntries(
    CODING_LANGUAGES.map((language) => [
      language,
      LANGUAGE_PATTERNS[language].reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0),
    ]),
  ) as Record<CodingLanguage, number>;

  if (/\b(frontend|front-end|browser|react|typescript|javascript)\b/i.test(text)) scores.javascript += 2;
  if (/\b(ai|ml|machine learning|data|research|ranking|retrieval|inference|model)\b/i.test(text)) scores.python += 1;
  if (/\b(fintech|quant|trading|market[-\s]?data|low[-\s]?latency|kernel|embedded|hardware|endpoint|security)\b/i.test(text)) scores.cpp += 1;
  if (/\b(enterprise|bank|payments|platform|backend|distributed systems?)\b/i.test(text)) scores.java += 1;
  if (/\b(microsoft|windows|xbox|game|unity|\.net)\b/i.test(text)) scores.csharp += 1;

  const best = LANGUAGE_TIEBREAK
    .map((language) => ({ language, score: scores[language] }))
    .sort((a, b) => b.score - a.score)[0];

  return best.score > 0 ? best.language : 'python';
};

const buildCodingPrompt = (guide: LocalInterviewGuide, challenge: CodingChallenge): string => [
  `Coding challenge: ${challenge.title} (${challenge.difficulty})`,
  '',
  challenge.description,
  '',
  'Requirements:',
  ...challenge.requirements.map((r) => `- ${r}`),
  '',
  `Interview context: coding round at ${guide.company}${guide.difficulty ? ` (difficulty ${guide.difficulty}/10)` : ''}.`,
].join('\n');

/**
 * Build a coding brief. Pass a specific `challenge` to serve it (used when the
 * quest advances the user through the company pool); otherwise defaults to the
 * company's opening problem — the first entry of {@link getCodingPool}.
 */
export const buildCodingBrief = (
  guide: LocalInterviewGuide,
  challenge?: CodingChallenge,
): CodingBrief => {
  const chosen = challenge ?? getCodingPool(guide)[0];
  return { challenge: chosen, prompt: buildCodingPrompt(guide, chosen) };
};

/** Serializable summary of a test run, fed to the AI grader. */
export interface CodingTestResult {
  hidden: boolean;
  pass: boolean;
  input: string;
  expected: string;
  received: string;
  error?: string;
}

export interface CodingRunSummary {
  passed: number;
  total: number;
  results: CodingTestResult[];
  durationMs: number;
}
