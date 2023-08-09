export { solveParamsStore, storedGameState };
export type { SolveParams };

import { browser } from '$app/environment';
import { NetworkedGameState } from '$lib/network/networked_game_state';
import type { SolveClientCallback } from '$lib/network/solve_client';
import { GameState, set_from_json, to_json, type GameActionType } from 'drumline-lib';
import { get, writable, type StartStopNotifier } from 'svelte/store';
import { solveParamsStore, type SolveParams } from './solve_params_store';

const STORAGE_KEY_GAME_STATE_PREFIX = 'drumline-game-state-';

const fn_solve_key = (solveParams: SolveParams): string => STORAGE_KEY_GAME_STATE_PREFIX + solveParams.id;

const fn_start_gamestate: StartStopNotifier<NetworkedGameState | null> = (
    fn_set: (value: NetworkedGameState | null) => void,
    _fn_update: (fn: (value: NetworkedGameState | null) => NetworkedGameState | null) => void
): void | (() => void) => {
    const solveParams = get(solveParamsStore);
    if (!browser || !solveParams) {
        fn_set(null);
        return;
    }
    const networked_game_state = new NetworkedGameState(
        solveParams.size,
        solveParams.id,
        fn_handle_received_action
    );

    const key = fn_solve_key(solveParams);
    const storedString = window.localStorage.getItem(key) ?? null;
    if (storedString && storedString.length > 0) {
        set_from_json(storedString, networked_game_state);
    }
    fn_set(networked_game_state);
    networked_game_state.connect();

    // called when the last subscriber unsubscribes
    return (): void => {
        // close out old connection before starting a new one
        console.log("Closing solve client");
        networked_game_state.close();
    };
};
const storedGameState = writable<NetworkedGameState | null>(null, fn_start_gamestate);

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
    const solveParams = get(solveParamsStore);
    if (!solveParams) {
        return;
    }
    const solve_key = fn_solve_key(solveParams);
    if (!newGameState) {
        // note: don't remove the stored game state, so
        // that we can re-open it later
        return;
    }
    const json = to_json(newGameState);
    window.localStorage.setItem(solve_key!, json);
});
