export { solveClient, storedGameState };

import { browser } from '$app/environment';
import { ReconnectWsClient, type ConnectionInfo, type WSClientEvent } from '$lib/network/reconnect_ws_client';
import { SolveClient } from '$lib/network/solve_client';
import { storedPuzzle } from '$lib/stores/puzzle_store';
import { GameState, set_from_json, to_json } from 'drumline-lib';
import { writable } from 'svelte/store';

// store for current solve id

// derived store from puzzle store + solve id
//   this will be the current game state

const STORAGE_KEY_GAME_STATE = 'drumline-game-state';
const TODO_SOLVE_ID = '123';

// todo: have a map of
// _solve_id => GameState


// currently known solve state
//   this will be prepended to the solve ID for the key
//   to a given solve
// const STORAGE_KEY_GAME_STATE_PREFIX = 'drumline-game-state-';

const storedGameState = writable<GameState | null>(null);

// todo: set from config
const CONNECTION_INFO: ConnectionInfo = {
    use_tls: false,
    host: 'localhost',
    port: 8080
};


let solveClient: SolveClient | null = null;

const ws_client = new ReconnectWsClient(CONNECTION_INFO, (msg: WSClientEvent) => {
    if (solveClient === null) {
        throw new Error('No solve client');
    }
    solveClient.callback(msg);
});

const cleanup = () => {
    console.log('cleaning up');
    solveClient?.close();
    solveClient = null;
};

storedPuzzle.subscribe((puzzle) => {
    if (!puzzle) {
        storedGameState.set(null);
        return;
    }
    if (!browser) {
        return;
    }


    // close out old connection before starting a new one
    cleanup();

    const gameState = new GameState(puzzle.size, TODO_SOLVE_ID);
    solveClient = new SolveClient(TODO_SOLVE_ID, ws_client);

    const storedString = window.localStorage.getItem(STORAGE_KEY_GAME_STATE) ?? null;
    if (storedString && storedString.length > 0) {
        set_from_json(storedString, gameState);
    }

    storedGameState.set(gameState);

    solveClient.connect();
});

storedGameState.subscribe((value) => {
    if (browser) {
        if (value) {
            const json = to_json(value);
            window.localStorage.setItem(STORAGE_KEY_GAME_STATE, json);
        } else {
            window.localStorage.removeItem(STORAGE_KEY_GAME_STATE);
            solveClient?.close();
        }
    }
});
