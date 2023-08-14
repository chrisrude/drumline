<script lang="ts">
    import ClueGrid from '$lib/components/ClueGrid.svelte';
    import ClueList from '$lib/components/ClueList.svelte';
    import { puzzles_read } from '$lib/network/puzzle_rest_client';
    import { convert_params, storedGameState } from '$lib/stores/game_state_store';
    import { getCachedPuzzle, setCachedPuzzle } from '$lib/stores/puzzle_store';
    import { HTTP_BASE_URL } from '$lib/stores/settings_store';
    import type { Puzzle } from '@chrisrude/drumline-lib';
    import { Confetti } from 'svelte-canvas-confetti';
    import { params as paramsStore } from 'svelte-spa-router';
    import { blur } from 'svelte/transition';

    let highlightRow = -1;
    let highlightBand = -1;

    let puzzle: Puzzle | null = null;

    paramsStore.subscribe((params) => {
        const solve_params = convert_params(params);
        if (!solve_params) {
            return;
        }
        // is there a cached puzzle?
        const storedPuzzle = getCachedPuzzle(solve_params.id);
        if (storedPuzzle) {
            puzzle = storedPuzzle;
            return;
        }
        puzzles_read(solve_params.id, HTTP_BASE_URL).then((loaded_puzzle) => {
            puzzle = loaded_puzzle;
            setCachedPuzzle(loaded_puzzle, solve_params.id);
        });
    });
</script>

{#if $storedGameState && $storedGameState.is_solved}
    <Confetti />
{/if}
{#if $storedGameState}
    <div transition:blur={{ amount: '1vw' }} class="fly-holder">
        <div class="puzzle">
            <div class="puzzle-grid">
                <ClueGrid bind:highlightRow bind:highlightBand bind:gameState={$storedGameState} />
            </div>
            <div class="clue-sets">
                <div class="clue-set">
                    <ClueList
                        clueTitle="Rows"
                        clueLists={puzzle?.row_clues ?? []}
                        bind:highlightIdx={highlightRow}
                    />
                </div>
                <div class="clue-set">
                    <ClueList
                        clueTitle="Bands"
                        clueLists={puzzle?.band_clues ?? []}
                        bind:highlightIdx={highlightBand}
                    />
                </div>
            </div>
        </div>
    </div>
{:else}
    <div>WHOOPS NO PUZZLE</div>
{/if}

<style>
    .puzzle {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-around;
        margin: auto 0;
    }
    .puzzle-grid {
        flex-grow: 2;
        width: 50vw;
        display: flex;
        flex-direction: column;
        align-self: flex-start;
    }
    .clue-sets {
        display: flex;
        flex-grow: 1;
    }
    .clue-set {
        margin-left: 1rem;
    }
    .fly-holder {
        display: flex;
        flex-direction: column;
    }
</style>
