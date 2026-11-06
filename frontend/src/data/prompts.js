/**
 * Writing prompts shown on the diary home screen.
 * Clicking one creates a new entry with the prompt as its opening line.
 */
export const WRITING_PROMPTS = [
  'One thing I accomplished today was...',
  'Going forward I need to improve on...',
  'What made today memorable was...',
  "Something I'm grateful for is...",
  'A conversation that stuck with me...',
  'If I could redo one moment today...',
  'Today I learned that...',
  'Right now I feel...',
  'Something I want to remember about today...',
  'A small win I almost overlooked...',
  'What I am looking forward to tomorrow...',
  'Someone who made my day better was...',
];

/** Pick `count` distinct prompts at random. */
export function pickPrompts(count = 4) {
  const pool = [...WRITING_PROMPTS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
