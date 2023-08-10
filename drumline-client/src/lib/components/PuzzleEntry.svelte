<script lang="ts">
    import { puzzles_create } from '$lib/network/puzzle_rest_client';
    import type { ConnectionInfo } from '$lib/network/reconnect_ws_client';
    import { storedPuzzle } from '$lib/stores/puzzle_store';
    import { userStore } from '$lib/stores/user_id_store';
    import { Puzzle } from '@chrisrude/drumline-lib';
    import { push } from 'svelte-spa-router';
    import { get } from 'svelte/store';

    let validInput = false;
    let inputText = get(storedPuzzle)?.original_text ?? '';
    let parseError = '';

    // todo: read config
    const CONNECTION_INFO: ConnectionInfo = {
        use_tls: true,
        host: 'drumline-server.rudesoftware.net',
        port: 443
    };
    const base_url = `http${CONNECTION_INFO.use_tls ? 's' : ''}://${CONNECTION_INFO.host}:${
        CONNECTION_INFO.port
    }`;

    const parse_puzzle = () => {
        try {
            const puzzle = new Puzzle(inputText);
            storedPuzzle.set(puzzle);
            parseError = '';

            puzzles_create(puzzle.original_text, $userStore, base_url).then((puzzle_id: string) => {
                const puzzle_url = `/puzzles/${puzzle.size}/${puzzle_id}`;
                push(puzzle_url);
            });
        } catch (error) {
            if (error instanceof Error) {
                parseError = error.message;
            }
        }
    };

    $: {
        if (inputText) {
            try {
                new Puzzle(inputText);
                parseError = '';
                validInput = true;
            } catch (error) {
                if (error instanceof Error) {
                    parseError = error.message;
                }
                validInput = false;
            }
        } else {
            parseError = '';
            validInput = false;
        }
    }
</script>

<div class="puzzle-entry">
    <h1>Solve Marching Band Crossword Puzzles</h1>
    <div class="puzzle-entry-cols">
        <div class="puzzle-entry-col-1">
            <div class="puzzle-entry-instructions">
                <h2>Paste your puzzle below</h2>
            </div>

            <div class="puzzle-entry-input">
                <textarea bind:value={inputText} rows="20" />
                <button on:click={parse_puzzle} disabled={!validInput}
                    >🥁🥁🥁 let's play 🥁🥁🥁</button
                >
            </div>
        </div>

        <div class="puzzle-entry-col-2">
            <h2>Expected input</h2>

            <pre>
ROWS
1 a first row clue
b second row clue
2 a first row clue
of the second row
b second row clue of the second row
3 a first row clue.


BANDS
A a first band clue
of the outermost band
b if we had a second band,
it would start with a capital B
but we don't since we only have 3
rows.  Instead this clue is just
very long.
</pre>

            {#if parseError}
                <div class="puzzle-entry-errors">
                    <h3>Could not read puzzle</h3>
                    <p>{parseError}</p>
                </div>
            {/if}
        </div>
    </div>
    <div class="puzzle-about">
        <a href="https://www.nytimes.com/2023/06/22/crosswords/variety-marching-bands.html">
            ℹ️ What are marching band crosswords?
        </a>
    </div>
</div>

<style>
    .puzzle-entry {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
    }
    .puzzle-entry-cols {
        display: flex;
        flex-direction: row;
    }
    .puzzle-entry-cols h2 {
        font-size: 1.5rem;
    }
    .puzzle-entry-col-1 {
        display: flex;
        flex-direction: column;
        width: 100%;
        flex: 1 1 0px;
        flex-basis: 0;
    }
    .puzzle-entry-col-2 {
        display: flex;
        flex-direction: column;
        width: 100%;
        margin-left: 2rem;
        flex: 1 1 0px;
        flex-basis: 0;
    }
    .puzzle-entry-col-2 pre {
        margin-top: 0;
    }
    .puzzle-entry-input {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }
    .puzzle-entry-input textarea {
        width: 100%;
        margin-bottom: 1rem;
        font-family: var(--font-mono);
        font-size: 1.2rem;
    }
    .puzzle-entry-input button {
        font-size: 1.5rem;
        padding: 1em;
        border-radius: 3em;
    }
    .puzzle-entry-input button:hover:enabled {
        background-color: var(--color-theme-1);
        color: var(--color-bg-0);
    }
    .puzzle-entry-errors {
        margin-top: 1rem;
        background-color: rgba(var(--color-theme-1-rgb), 0.1);
        border-radius: 1rem;
        padding: 1rem;
    }
    .puzzle-entry-errors h3 {
        margin-top: 0;
    }
    .puzzle-about {
        margin-top: 3rem;
        padding: 1em;
    }
    .puzzle-about a {
        color: unset;
    }
</style>
