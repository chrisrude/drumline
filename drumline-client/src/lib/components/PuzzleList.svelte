<script lang="ts">
    import { puzzles_list } from '$lib/network/puzzle_rest_client';
    import { storedRecentPuzzleList } from '$lib/stores/puzzle_store';
    import { HTTP_BASE_URL } from '$lib/stores/settings_store';
    import { userStore } from '$lib/stores/user_id_store';
    import { link } from 'svelte-spa-router';
    import { get } from 'svelte/store';

    const user = get(userStore);
</script>

<div class="puzzle-list">
    <h1>Existing Puzzles</h1>
    <div class="puzzle-list-recent">
        <h2>Recently Played</h2>
        {#if get(storedRecentPuzzleList).length === 0}
            <p>No recently played puzzles</p>
        {/if}
        {#each get(storedRecentPuzzleList) as puzzle_info}
            <div class="puzzle-list-list-item">
                <a href="/puzzles/{puzzle_info.size}/{puzzle_info.puzzle_id}" use:link
                    >{puzzle_info.puzzle_id}</a
                >
            </div>
        {/each}
    </div>
    <div class="puzzle-list-all">
        <h2>All Puzzles</h2>
        {#await puzzles_list(user, HTTP_BASE_URL)}
            <p>Loading...</p>
        {:then puzzleList}
            {#each puzzleList as puzzle_list_info}
                <div class="puzzle-list-list-item">
                    <a href="/puzzles/{puzzle_list_info.size}/{puzzle_list_info.puzzle_id}" use:link
                        >{puzzle_list_info.puzzle_id}</a
                    >
                </div>
            {/each}
        {:catch error}
            <p>Error: {error.message}</p>
        {/await}
    </div>
</div>

<style>
    .puzzle-list h2 {
        font-size: 1.5em;
    }
</style>
