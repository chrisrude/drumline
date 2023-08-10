import { Puzzle, UserId } from '@chrisrude/drumline-lib';
export { puzzleHmac, solveHmac };
declare const puzzleHmac: (puzzle: Puzzle, salt: string) => Promise<string>;
declare const solveHmac: (puzzle: Puzzle, creator: UserId, salt: string) => Promise<string>;
