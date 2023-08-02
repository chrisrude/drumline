import { Puzzle } from './puzzle';

export { loadPuzzleFromJson, savePuzzleToJson };

const loadPuzzleFromJson = (storedString: string): Puzzle | null => {
    const json = JSON.parse(storedString);
    try {
        return new Puzzle(json);
    } catch (e) {
        console.error("could not load puzzle from json: ", e);
        return null;
    }
}

const savePuzzleToJson = (puzzle: Puzzle): string => {
    const json = JSON.stringify(puzzle);
    return json;
}
