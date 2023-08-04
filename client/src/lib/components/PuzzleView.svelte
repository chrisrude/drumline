<script lang="ts">
    import ClueGrid from '$lib/components/ClueGrid.svelte';
    import ClueList from '$lib/components/ClueList.svelte';
    import type { GameState } from 'drumline-lib';
    import { createEventDispatcher } from 'svelte';

    export let gameState: GameState;
    export let highlightRow = -1;
    export let highlightBand = -1;

    const dispatch = createEventDispatcher();
</script>

{#if gameState.is_solved}
    <!-- e.g. https://github.com/andreasmcdermott/svelte-canvas-confetti -->
    TODO: CONFETTI
{/if}
<div class="puzzle">
    <div class="puzzle-grid">
        <ClueGrid
            bind:highlightRow
            bind:highlightBand
            bind:gameState
            on:deletePuzzle={() => {
                dispatch('deletePuzzle');
            }}
            on:apply={(action) => {
                dispatch('apply', action.detail);
            }}
        />
    </div>
    <div class="clue-sets">
        <div class="clue-set">
            <ClueList
                bind:gameState
                clueTitle="Rows"
                clueLists={gameState.puzzle.rows}
                bind:highlightIdx={highlightRow}
            />
        </div>
        <div class="clue-set">
            <ClueList
                bind:gameState
                clueTitle="Bands"
                clueLists={gameState.puzzle.bands}
                bind:highlightIdx={highlightBand}
            />
        </div>
    </div>
</div>

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
</style>
