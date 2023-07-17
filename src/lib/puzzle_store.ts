import { browser } from '$app/environment';
import type { Puzzle } from '$lib/puzzle';
import { loadPuzzleFromJson } from '$lib/puzzle';
import { writable } from 'svelte/store';

const PUZZLE_STORE = 'drumline-puzzle';

const storedString = browser ? window.localStorage.getItem(PUZZLE_STORE) ?? null : null;
export const initialValue = storedString ? loadPuzzleFromJson(storedString) : null;
export const storedPuzzle = writable<Puzzle | null>(initialValue);

storedPuzzle.subscribe((value) => {
    if (browser) {
        if (value) {
            window.localStorage.setItem(PUZZLE_STORE, JSON.stringify(value));
        } else {
            window.localStorage.removeItem(PUZZLE_STORE);
        }
    }
});

export default storedPuzzle;
