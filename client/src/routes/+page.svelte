<script lang="ts">
    import PuzzleEntry from '$lib/components/PuzzleEntry.svelte';
    import PuzzleView from '$lib/components/PuzzleView.svelte';
    import { solveClient, storedGameState } from '$lib/game_state_store';
    import { storedPuzzle } from '$lib/puzzle_store';
    import type { GameActions } from 'drumline-lib';
    import { onMount } from 'svelte';
    import { blur } from 'svelte/transition';

    export let loading = true;

    onMount(async () => {
        loading = false;
    });

    const apply = (event: CustomEvent<GameActions>) => {
        const action = event.detail;
        solveClient!.apply(action);
    };

    const clean_puzzle = () => {
        storedPuzzle.set(null);
        storedGameState.set(null);
    };
</script>

<svelte:head>
    <title>drumline</title>
</svelte:head>

{#if !loading}
    {#if $storedPuzzle && $storedGameState}
        <div transition:blur={{ amount: '1vw' }} class="fly-holder">
            <PuzzleView
                bind:gameState={$storedGameState}
                on:deletePuzzle={clean_puzzle}
                on:apply={apply}
            />
        </div>
    {:else}
        <PuzzleEntry />
    {/if}
{/if}

<style>
    .fly-holder {
        display: flex;
        flex-direction: column;
    }
</style>
