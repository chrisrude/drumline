export { solveClient, storedGameState, user_id };

import { browser } from '$app/environment';
import { storedPuzzle } from '$lib/puzzle_store';
import { GameState, UserId, set_from_json, to_json } from 'drumline-lib';
import { writable } from 'svelte/store';
import { SolveClient } from './solve_client';
import { WSClient, type ConnectionInfo, type WSClientEvent } from './ws_client';

// our private v5 uuid for this user
const STORAGE_KEY_UUID = 'drumline-uuid';
const STORAGE_KEY_GAME_STATE = 'drumline-game-state';
const TODO_SOLVE_ID = '123';

// a list of solve IDs that are in progress
// const STORAGE_KEY_PUZZLE_LIST = 'drumline-puzzle-list';

// the serialized puzzle object
//   this will be prepended to the solve ID for the key
//   to a given solve
// const STORAGE_KEY_PUZZLE_PREFIX = 'drumline-puzzle-';

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

let gameState: GameState | null = null;
let user_id: UserId | null = null;

let solveClient: SolveClient | null = null;

const ws_client = new WSClient(CONNECTION_INFO, (msg: WSClientEvent) => {
    if (solveClient === null) {
        throw new Error('No solve client');
    }
    solveClient.callback(msg);
});

const cleanup = () => {
    console.log('cleaning up');
    solveClient?.close();
    solveClient = null;
    gameState = null;
};

storedPuzzle.subscribe((puzzle) => {
    if (!puzzle) {
        storedGameState.set(null);
        return;
    }
    if (!browser) {
        return;
    }

    const storedPrivateUuid = window.localStorage.getItem(STORAGE_KEY_UUID) ?? null;
    // if we pass in null, we'll generated a new, unique, id
    user_id = new UserId(storedPrivateUuid);

    // close out old connection before starting a new one
    cleanup();

    gameState = new GameState(puzzle);
    solveClient = new SolveClient(TODO_SOLVE_ID, user_id, ws_client);

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
