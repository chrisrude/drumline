export { storedPuzzle };

import { browser } from '$app/environment';
import { Puzzle, loadPuzzleFromJson } from 'drumline-lib';

import { writable } from 'svelte/store';

const PUZZLE_STORE = 'drumline-puzzle';

const storedString = browser ? window.localStorage.getItem(PUZZLE_STORE) ?? null : null;
const initialValue = storedString ? loadPuzzleFromJson(storedString) : null;
const storedPuzzle = writable<Puzzle | null>(initialValue);


storedPuzzle.subscribe((puzzle) => {
    if (puzzle) {
        window.localStorage.setItem(PUZZLE_STORE, JSON.stringify(puzzle.original_text));
    } else {
        window.localStorage.removeItem(PUZZLE_STORE);
    }
});
