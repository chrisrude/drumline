export { initialValue, storedPuzzle };

import { browser } from '$app/environment';
import { Puzzle } from '$lib/puzzle';

import { writable } from 'svelte/store';

const PUZZLE_STORE = 'drumline-puzzle';

const storedString = browser ? window.localStorage.getItem(PUZZLE_STORE) ?? null : null;
const initialValue = storedString ? loadPuzzleFromJson(storedString) : null;
const storedPuzzle = writable<Puzzle | null>(initialValue);

storedPuzzle.subscribe((value) => {
    if (browser) {
        if (value) {
            window.localStorage.setItem(PUZZLE_STORE, JSON.stringify(value.original_text));
        } else {
            window.localStorage.removeItem(PUZZLE_STORE);
        }
    }
});

function loadPuzzleFromJson(storedString: string): Puzzle {
    let original_text = JSON.parse(storedString);

    // is there an "original_text" attr on original_text?
    // this is what the previous code did
    if (typeof original_text == 'object' && 'input_text' in original_text) {
        original_text = original_text.input_text;
    }
    const result = new Puzzle(original_text);
    return result;
}
