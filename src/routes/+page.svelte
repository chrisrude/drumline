<script lang="ts">
    import PuzzleEntry from '$lib/components/PuzzleEntry.svelte';
    import PuzzleView from '$lib/components/PuzzleView.svelte';
    import { storedPuzzle } from '$lib/puzzle_store';
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { blur } from 'svelte/transition';

    export let data: import('./$types').PageData;
    export let puzzle = data.puzzle;
    const loading = writable(true);

    onMount(async () => {
        loading.set(false);
    });

    $: {
        if (puzzle) {
            storedPuzzle.set(puzzle);
        }
    }

    const clean_puzzle = () => {
        puzzle = null;
        storedPuzzle.set(null);
    };
</script>

<svelte:head>
    <title>drumline</title>
</svelte:head>

{#if !$loading}
    {#if puzzle}
        <div transition:blur={{ amount: '1vw' }} class="fly-holder">
            <PuzzleView bind:puzzle on:deletePuzzle={clean_puzzle} />
        </div>
    {:else}
        <PuzzleEntry bind:puzzle />
    {/if}
{/if}

<style>
    .fly-holder {
        display: flex;
        flex-direction: column;
    }
</style>
