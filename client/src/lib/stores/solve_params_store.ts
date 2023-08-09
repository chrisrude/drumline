import { browser } from "$app/environment";
import { writable } from "svelte/store";

export { solveParamsStore };
export type { SolveParams };

type SolveParams = {
    id: string;
    size: number;
};

const STORAGE_KEY_CURRENT_SOLVE_PARAMS = 'drumline-solve-params';

const initSolveParams = (): SolveParams | null => {
    const storedSolveParams = browser ? window.localStorage.getItem(STORAGE_KEY_CURRENT_SOLVE_PARAMS) ?? null : null;
    return storedSolveParams ? JSON.parse(storedSolveParams) : null;
}

const solveParamsStore = writable<SolveParams | null>(initSolveParams());

solveParamsStore.subscribe((newSolveParams: SolveParams | null) => {
    if (!browser) {
        return;
    }
    if (!newSolveParams) {
        // remove the stored local storage
        window.localStorage.removeItem(STORAGE_KEY_CURRENT_SOLVE_PARAMS);

        // if we've removed our current key, we should also remove
        // the game state
        // if (get(storedGameState)) {
        //     storedGameState.set(null);
        // }
    } else {
        const json = JSON.stringify(newSolveParams);
        window.localStorage.setItem(STORAGE_KEY_CURRENT_SOLVE_PARAMS, json);
    }
});
