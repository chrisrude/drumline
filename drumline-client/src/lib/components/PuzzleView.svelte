<script lang="ts">
    import ClueGrid from '$lib/components/ClueGrid.svelte';
    import ClueList from '$lib/components/ClueList.svelte';
    import { puzzles_read } from '$lib/network/puzzle_rest_client';
    import type { ConnectionInfo } from '$lib/network/reconnect_ws_client';
    import { storedGameState } from '$lib/stores/game_state_store';
    import { storedPuzzle } from '$lib/stores/puzzle_store';
    import { params as paramsStore } from 'svelte-spa-router';
    import { blur } from 'svelte/transition';

    let highlightRow = -1;
    let highlightBand = -1;

    export const params = null;

    // todo: read config
    const CONNECTION_INFO: ConnectionInfo = {
        use_tls: false,
        host: 'localhost',
        port: 8080
    };
    const base_url = `http${CONNECTION_INFO.use_tls ? 's' : ''}://${CONNECTION_INFO.host}:${
        CONNECTION_INFO.port
    }`;

    if (!$storedPuzzle) {
        paramsStore.subscribe((params) => {
            if (!params) {
                console.log('no params');
                return;
            }
            const puzzle_id = params.id;
            puzzles_read(puzzle_id, base_url).then((puzzle) => {
                storedPuzzle.set(puzzle);
            });
        });
    }
</script>

{#if $storedGameState && $storedGameState.is_solved}
    <!-- e.g. https://github.com/andreasmcdermott/svelte-canvas-confetti -->
    TODO: CONFETTI
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
                        clueLists={$storedPuzzle?.row_clues ?? []}
                        bind:highlightIdx={highlightRow}
                    />
                </div>
                <div class="clue-set">
                    <ClueList
                        clueTitle="Bands"
                        clueLists={$storedPuzzle?.band_clues ?? []}
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
