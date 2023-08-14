<script lang="ts">
    import { storedRecentPuzzleList } from '$lib/stores/puzzle_store';
    import { push } from 'svelte-spa-router';
    import { get } from 'svelte/store';
    import PuzzleEntry from './PuzzleEntry.svelte';
    import PuzzleList from './PuzzleList.svelte';

    const playedBefore = get(storedRecentPuzzleList).length !== 0;
</script>

<h1>Solve Marching Band Crossword Puzzles</h1>

{#if playedBefore}
    <PuzzleList />

    <div class="puzzle-or">
        <h2>Or...</h2>
        <button class="big-button" on:click={() => push('/new')}>Enter a New Puzzle</button>
    </div>
{:else}
    <PuzzleEntry />
{/if}

<style>
</style>
