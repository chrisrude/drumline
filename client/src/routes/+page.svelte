<script lang="ts">
    import PuzzleEntry from '$lib/components/PuzzleEntry.svelte';
    import PuzzleView from '$lib/components/PuzzleView.svelte';
    import { storedGameState } from '$lib/game_state_store';
    import { storedPuzzle } from '$lib/puzzle_store';
    import type { GameActions, GameState } from 'drumline-lib';
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { blur } from 'svelte/transition';

    export let data: import('./$types').PageData;
    export let puzzle = data.puzzle;
    export let gameState: GameState | null = null;
    const loading = writable(true);

    onMount(async () => {
        loading.set(false);
    });

    storedGameState.subscribe((value) => {
        gameState = value;
    });

    const applyGameState = (event: CustomEvent<GameActions>) => {
        const action = event.detail as GameActions;
        if (gameState && action) {
            gameState = gameState.apply(action);
        }
    };

    const saveGameState = () => {
        if (gameState) {
            storedGameState.set(gameState);
        }
    };
    $: gameState !== null && saveGameState();

    const clean_puzzle = () => {
        puzzle = null;
        storedPuzzle.set(null);
        gameState = null;
        storedGameState.set(null);
    };
</script>

<svelte:head>
    <title>drumline</title>
</svelte:head>

{#if !$loading}
    {#if puzzle && gameState}
        <div transition:blur={{ amount: '1vw' }} class="fly-holder">
            <PuzzleView bind:gameState on:deletePuzzle={clean_puzzle} on:apply={applyGameState} />
        </div>
    {:else}
        <PuzzleEntry bind:puzzle bind:gameState />
    {/if}
{/if}

<style>
    .fly-holder {
        display: flex;
        flex-direction: column;
    }
</style>
