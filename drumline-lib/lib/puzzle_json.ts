import { Puzzle } from './puzzle';

export { loadPuzzleFromJson, savePuzzleToJson };
export type { PuzzleListInfo };

type PuzzleListInfo = {
    puzzle_id: string;
    size: number;
    your_puzzle: boolean;
};

// The stored form of a puzzle is just its original clue text, as a
// JSON string.  Everything else can be re-derived by parsing it.
const loadPuzzleFromJson = (storedString: string): Puzzle | null => {
    try {
        const original_text = JSON.parse(storedString);
        if (typeof original_text !== 'string') {
            throw new Error('stored puzzle is not a string');
        }
        return new Puzzle(original_text);
    } catch (e) {
        console.error('could not load puzzle from json: ', e);
        return null;
    }
};

const savePuzzleToJson = (puzzle: Puzzle): string => JSON.stringify(puzzle.original_text);
