import { Puzzle } from './puzzle';
export { loadPuzzleFromJson, savePuzzleToJson };
declare const loadPuzzleFromJson: (storedString: string) => Puzzle | null;
declare const savePuzzleToJson: (puzzle: Puzzle) => string;
