export { storedGameState };
export type { SolveParams };

import { browser } from '$app/environment';
import { NetworkedGameState } from '$lib/network/networked_game_state';
import type { SolveClientCallback } from '$lib/network/solve_client';
import { GameState, set_from_json, to_json, type GameActionType } from 'drumline-lib';
import { params } from 'svelte-spa-router';
import { get, writable } from 'svelte/store';

type SolveParams = {
    id: string;
    size: number;
};

const STORAGE_KEY_GAME_STATE_PREFIX = 'drumline-game-state-';

const fn_solve_key = (id: string): string => STORAGE_KEY_GAME_STATE_PREFIX + id;

const convert_params = (params: Record<string, string> | undefined): SolveParams | null => {
    if (!params || !params.size || !params.id) {
        return null;
    }
    const size = parseInt(params.size);
    if (isNaN(size)) {
        return null;
    }
    return {
        id: params.id,
        size: size,
    };
};

let lastGameState: NetworkedGameState | null = null;

const cleanup_game_state = () => {
    if (!lastGameState) {
        return;
    }
    lastGameState.close();
    lastGameState = null;
};

const init_game_state = (solveParams: SolveParams | null): NetworkedGameState | null => {
    if (!browser) {
        return null;
    }
    if (!solveParams && !lastGameState) {
        // nothing to do
        return null;
    }
    if (solveParams && lastGameState && solveParams.id === lastGameState.solve_id && solveParams.size === lastGameState.size) {
        // nothing to do
        return lastGameState;
    }
    cleanup_game_state();
    if (!solveParams) {
        return null;
    }
    const networked_game_state = new NetworkedGameState(
        solveParams.size,
        solveParams.id,
        fn_handle_received_action
    );

    const key = fn_solve_key(solveParams.id);
    const storedString = window.localStorage.getItem(key) ?? null;
    if (storedString && storedString.length > 0) {
        set_from_json(storedString, networked_game_state);
    }
    lastGameState = networked_game_state;
    return networked_game_state;
};

const storedGameState = writable<NetworkedGameState | null>(
    init_game_state(convert_params(get(params)))
);

params.subscribe((newParams) => {
    const newSolveParams = convert_params(newParams);
    if (!newSolveParams) {
        storedGameState.set(null);
        return;
    }
    storedGameState.set(init_game_state(newSolveParams));
    lastGameState!.connect();
});

const fn_handle_received_action: SolveClientCallback = (action: GameActionType, pending_actions: GameActionType[]) => {
    storedGameState.update((game_state) => {
        if (null === game_state) {
            return null;
        }
        console.log('Action from server: ', action);
        game_state.apply(action);

        // directly reapply all our pending actions...
        // todo: I think this is always ok to do without "undoing"
        // anything.  But is that correct?
        for (const pending_action of pending_actions) {
            game_state.apply(pending_action);
        }
        return game_state;
    });
};

storedGameState.subscribe((newGameState: GameState | null) => {
    if (!newGameState) {
        // note: don't remove the stored game state, so
        // that we can re-open it later
        return;
    }
    const solve_key = fn_solve_key(newGameState.solve_id);
    const json = to_json(newGameState);
    window.localStorage.setItem(solve_key, json);
});
