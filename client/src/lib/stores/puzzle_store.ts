export { storedPuzzle };

import { browser } from '$app/environment';
import { Puzzle, loadPuzzleFromJson } from 'drumline-lib';

import { writable } from 'svelte/store';

// a list of solve IDs that are in progress
// const ST = 'drumline-current-puzzle-id';

// the serialized puzzle object
//   this will be prepended to the solve ID for the key
//   to a given solve
// const STORAGE_KEY_PUZZLE_PREFIX = 'drumline-puzzle-';

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

// two stores:
//    puzzle_input_text store => puzzle raw input text
//    puzzle store (derived from puzzle_id store) => puzzle object with that ID
