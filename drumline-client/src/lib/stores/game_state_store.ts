export { convert_params, getPuzzleInput, savePuzzleInput, storedGameState };
export type { SolveParams };

import { browser } from '$app/environment';
import { NetworkedGameState, type StoredGameState } from '$lib/network/networked_game_state';
import type { UserId } from '@chrisrude/drumline-lib';
import { params } from 'svelte-spa-router';
import { get, writable } from 'svelte/store';
import { userStore } from './user_id_store';

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
        size: size
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

const init_game_state = (solveParams: SolveParams | null, user_id: UserId): NetworkedGameState | null => {
    if (!browser) {
        return null;
    }
    if (!solveParams && !lastGameState) {
        // nothing to do
        return null;
    }
    if (
        solveParams &&
        lastGameState &&
        solveParams.id === lastGameState.solve_id &&
        solveParams.size === lastGameState.size
    ) {
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
        user_id);

    const key = fn_solve_key(solveParams.id);
    const storedString = window.localStorage.getItem(key) ?? null;
    if (storedString && storedString.length > 0) {
        const storedJson: StoredGameState = JSON.parse(storedString);
        networked_game_state.update_from_json(storedJson);
    }
    lastGameState = networked_game_state;
    return networked_game_state;
};

const storedGameState = writable<NetworkedGameState | null>(
    init_game_state(convert_params(get(params)), get(userStore)));

params.subscribe((newParams) => {
    const newSolveParams = convert_params(newParams);
    if (!newSolveParams) {
        storedGameState.set(null);
        return;
    }
    storedGameState.set(init_game_state(newSolveParams, get(userStore)));
    lastGameState!.connect();
});

storedGameState.subscribe((newGameState: NetworkedGameState | null) => {
    if (!newGameState) {
        // note: don't remove the stored game state, so
        // that we can re-open it later
        return;
    }
    const solve_key = fn_solve_key(newGameState.solve_id);
    const json = JSON.stringify(newGameState.to_json());
    window.localStorage.setItem(solve_key, json);
});

const savePuzzleInput = (input_text: string) =>
    window.localStorage.setItem('drumline-puzzle-input', input_text);

const getPuzzleInput = (): string | null =>
    window.localStorage.getItem('drumline-puzzle-input');
