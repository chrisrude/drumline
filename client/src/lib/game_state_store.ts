export { storedGameState };

import { browser } from '$app/environment';
import { storedPuzzle } from '$lib/puzzle_store';
import { GameState, set_from_json, to_json } from 'drumline-lib';
import { writable } from 'svelte/store';

const GAME_STATE_STORE = 'drumline-game-state';

const storedGameState = writable<GameState | null>(null);

storedPuzzle.subscribe((puzzle) => {
    if (!puzzle) {
        storedGameState.set(null);
        return;
    }
    if (!browser) {
        return;
    }

    const puzzleState = new GameState(puzzle);

    const storedString = window.localStorage.getItem(GAME_STATE_STORE) ?? null;
    if (storedString && storedString.length > 0) {
        set_from_json(storedString, puzzleState);
    }

    storedGameState.set(puzzleState);
});

storedGameState.subscribe((value) => {
    if (browser) {
        if (value) {
            const json = to_json(value);
            window.localStorage.setItem(GAME_STATE_STORE, json);
        } else {
            window.localStorage.removeItem(GAME_STATE_STORE);
        }
    }
});
