<script lang="ts">
    import PuzzleEntry from '$lib/components/PuzzleEntry.svelte';
    import PuzzleList from '$lib/components/PuzzleList.svelte';
    import PuzzleView from '$lib/components/PuzzleView.svelte';
    import Router from 'svelte-spa-router';

    const routes = {
        '/': PuzzleEntry,
        '/list': PuzzleList,
        '/puzzles/:size/:id': PuzzleView
    };
</script>

<svelte:head>
    <title>drumline</title>
</svelte:head>

<Router {routes} />
