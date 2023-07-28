import { initialValue } from '$lib/puzzle_store';

/** @type {import('./$types').PageLoad} */
export async function load() {
    return {
        puzzle: initialValue
    };
}
