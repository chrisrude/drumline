<script lang="ts">
    import ClueGrid from '$lib/components/ClueGrid.svelte';
    import ClueList from '$lib/components/ClueList.svelte';
    import { storedGameState } from '$lib/stores/game_state_store';
    import { storedPuzzle } from '$lib/stores/puzzle_store';
    import { blur } from 'svelte/transition';

    let highlightRow = -1;
    let highlightBand = -1;
</script>

{#if $storedGameState && $storedGameState.is_solved}
    <!-- e.g. https://github.com/andreasmcdermott/svelte-canvas-confetti -->
    TODO: CONFETTI
{/if}
{#if $storedGameState && $storedPuzzle}
    <div transition:blur={{ amount: '1vw' }} class="fly-holder">
        <div class="puzzle">
            <div class="puzzle-grid">
                <ClueGrid bind:highlightRow bind:highlightBand bind:gameState={$storedGameState} />
            </div>
            <div class="clue-sets">
                <div class="clue-set">
                    <ClueList
                        clueTitle="Rows"
                        clueLists={$storedPuzzle.row_clues}
                        bind:highlightIdx={highlightRow}
                    />
                </div>
                <div class="clue-set">
                    <ClueList
                        clueTitle="Bands"
                        clueLists={$storedPuzzle.band_clues}
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
