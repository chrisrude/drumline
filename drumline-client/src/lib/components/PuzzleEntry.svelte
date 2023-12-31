<script lang="ts">
    import { puzzles_create } from '$lib/network/puzzle_rest_client';
    import { getPuzzleInput, savePuzzleInput } from '$lib/stores/game_state_store';
    import { HTTP_BASE_URL } from '$lib/stores/settings_store';
    import { userStore } from '$lib/stores/user_id_store';
    import { Puzzle } from '@chrisrude/drumline-lib';
    import { push } from 'svelte-spa-router';
    import { get } from 'svelte/store';

    let validInput = false;
    let inputText = getPuzzleInput() ?? '';
    let internalError = '';
    let parseError = '';

    const _inner_parse_puzzle = async (inputText: string): Promise<string> => {
        savePuzzleInput(inputText);
        const puzzle = new Puzzle(inputText);
        const puzzle_id = await puzzles_create(puzzle.original_text, get(userStore), HTTP_BASE_URL);
        return `/puzzles/${puzzle.size}/${puzzle_id}`;
    };

    const parse_puzzle = async (event: Event) => {
        parseError = '';
        internalError = '';

        const button = event.target as HTMLButtonElement;
        button.disabled = true;
        _inner_parse_puzzle(inputText)
            .then((url) => push(url))
            .finally(() => {
                button.disabled = false;
            })
            .catch((error) => {
                if (error.name === 'PuzzleValidationError') {
                    parseError = error.message;
                } else if (error instanceof Error) {
                    internalError = error.message;
                } else {
                    internalError = 'Unknown error';
                }
            });
    };

    $: {
        if (inputText) {
            try {
                new Puzzle(inputText);
                parseError = '';
                validInput = true;
            } catch (error) {
                if (error instanceof Error && error.name === 'PuzzleValidationError') {
                    parseError = error.message;
                } else {
                    internalError = 'Unknown error';
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
    <div class="puzzle-entry-cols">
        <div class="puzzle-entry-col-1">
            <div class="puzzle-entry-instructions">
                <h2>Paste your puzzle below</h2>
            </div>

            <div class="puzzle-entry-input">
                <textarea bind:value={inputText} rows="20" />
                <button class="big-button" on:click={parse_puzzle} disabled={!validInput}
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
            {#if internalError}
                <div class="puzzle-entry-errors">
                    <h3>Could not create puzzle</h3>
                    <p>{internalError}</p>
                    <a href="https://github.com/chrisrude/drumline/issues/new"
                        >We don't log activity for your own privacy, so we don't know this error
                        occurred. But we might be able to fix it if you report the bug here.</a
                    >
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
