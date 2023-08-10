<script lang="ts">
    import PuzzleEntry from '$lib/components/PuzzleEntry.svelte';
    import PuzzleView from '$lib/components/PuzzleView.svelte';
    import Router from 'svelte-spa-router';

    const routes = {
        '/': PuzzleEntry,
        '/puzzles/:size/:id': PuzzleView

        // todo: 404?
        // '*': 'NotFound
    };
</script>

<svelte:head>
    <title>drumline</title>
</svelte:head>

<Router {routes} />
