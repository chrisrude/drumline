export { addRecentPuzzle, getCachedPuzzle, setCachedPuzzle, storedRecentPuzzleList };

import { browser } from '$app/environment';
import { Puzzle, loadPuzzleFromJson, type PuzzleListInfo } from '@chrisrude/drumline-lib';

import { writable, type StartStopNotifier } from 'svelte/store';

const PUZZLE_STORE_PREFIX = 'drumline-puzzle-';
const RECENT_PUZZLE_LIST = 'drumline-recent-puzzle-list';

const puzzle_store_key = (puzzle_id: string): string => PUZZLE_STORE_PREFIX + puzzle_id;

const getCachedPuzzle = (puzzle_id: string): Puzzle | null => {
    const storedString = browser
        ? window.localStorage.getItem(puzzle_store_key(puzzle_id)) ?? null
        : null;
    if (!storedString) {
        return null;
    }
    return loadPuzzleFromJson(storedString);
};

const setCachedPuzzle = (puzzle: Puzzle, puzzle_id: string) => {
    window.localStorage.setItem(puzzle_store_key(puzzle_id), JSON.stringify(puzzle.original_text));
    addRecentPuzzle(puzzle, puzzle_id);
};

const initStoredPuzzleList: StartStopNotifier<PuzzleListInfo[]> = (
    set: (value: PuzzleListInfo[]) => void
) => {
    // set the value to what's in local storage
    const storedList = browser ? window.localStorage.getItem(RECENT_PUZZLE_LIST) ?? null : null;
    if (storedList) {
        set(JSON.parse(storedList));
    }
};

const storedRecentPuzzleList = writable<PuzzleListInfo[]>([], initStoredPuzzleList);

const addRecentPuzzle = (puzzle: Puzzle, puzzle_id: string) => {
    storedRecentPuzzleList.update((list) => {
        const existingIdx = list.findIndex((p) => p.puzzle_id === puzzle_id);
        if (-1 === existingIdx) {
            // add the new puzzle to the list
            const newEntry: PuzzleListInfo = {
                puzzle_id,
                size: puzzle.size,
                your_puzzle: false // todo: is this important?
            };
            list.unshift(newEntry);
        }
        return list;
    });
};

storedRecentPuzzleList.subscribe((list) => {
    if (list) {
        window.localStorage.setItem(RECENT_PUZZLE_LIST, JSON.stringify(list));
    } else {
        window.localStorage.removeItem(RECENT_PUZZLE_LIST);
    }
});
