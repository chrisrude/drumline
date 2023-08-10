<script lang="ts">
    import type { ClueList } from 'drumline-lib';

    export let clueLists: ClueList[];
    export let clueTitle: string;
    export let highlightIdx: number = -1;
    let clueGroup: HTMLDivElement;

    $: highlightIdx != -1 && scrollToClue();

    function scrollToClue() {
        if (clueGroup === undefined) {
            // this happens when we load the page
            return;
        }
        const clue = clueGroup.children[highlightIdx];
        if (clue instanceof HTMLElement) {
            let groupTop = clueGroup.scrollTop;
            let groupBottom = groupTop + clueGroup.clientHeight;

            let clueTop = clue.offsetTop;
            let clueBottom = clueTop + clue.clientHeight;

            // if we're fully visible already, don't scroll
            let isClueVisible = clueTop >= groupTop && clueBottom <= groupBottom;
            if (!isClueVisible) {
                clueGroup.scrollTo({
                    top: clueTop,
                    behavior: 'auto'
                });
            }
        }
    }
</script>

<div class="clues">
    <div class="clues-title">
        {clueTitle}
    </div>
    <div class="clues-groups" bind:this={clueGroup}>
        {#if clueLists.length === 0}
            <div class="clues-groups-group">
                <div class="clues-group-title">Loading...</div>
            </div>
        {/if}
        {#each clueLists as clueList, idx}
            <!-- TODO: fix -->
            <!-- TODO: fix headings, marking clues as done -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                class="clues-groups-group"
                class:highlightClue={highlightIdx === idx}
                class:clueDone={false}
                on:click={() => (highlightIdx = idx)}
            >
                <div class="clues-group-title">
                    {clueList.index}
                </div>
                <div class="clues-group-list">
                    {#each clueList.clues as clue}
                        <div class="clues-group-clue">
                            <div class="clue">
                                <div class="clue-title">{clue.text}</div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    .clues {
        display: flex;
        flex-direction: column;
        align-items: start;
        background: linear-gradient(
            to bottom,
            rgba(255, 255, 255, 1) 0%,
            rgba(255, 255, 255, 0.1) 40%,
            rgba(255, 255, 255, 1) 100%
        );
        border-radius: 10px;
        max-width: 25vw;
        box-shadow: -2px -2px 20px 10px rgba(var(--color-theme-1-rgb), 0.1),
            2px 2px 20px 10px rgba(var(--color-theme-2-rgb), 0.1);
    }

    .clues-title {
        font-size: 1.2rem;
        font-weight: bold;
        margin-bottom: 0.5rem;
        margin-top: 1rem;
        margin-left: 1rem;
        color: rgb(199, 36, 177);
    }

    .clues-groups {
        position: relative;
        flex-basis: 90vh;
        flex-grow: 1;
        overflow-y: auto;
        border-top: 1px solid #e2e2e2;
        margin-top: 5px;
        padding-right: 10px;
        display: flex;
        flex-direction: column;
        width: 100%;
    }

    .clues-groups-group {
        margin-bottom: 1rem;
        flex-direction: row;
        display: flex;
        padding-right: 1rem;
    }

    .clues-group-title {
        font-size: 1.2rem;
        font-weight: bold;
        margin-bottom: 0.5rem;
        margin-left: 0.5rem;
        margin-top: 0.2rem;
    }

    .clues-group-list {
        display: flex;
        flex-direction: column;
        align-items: start;
        margin-top: 0.25rem;
    }
    .clues-group-clue {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-left: 0.5rem;
        margin-bottom: 0.5rem;
    }

    .clueDone {
        color: rgba(0, 0, 0, 0.3);
    }

    .highlightClue {
        background-color: rgba(var(--color-theme-2-rgb), 0.5) !important;
        /* background-color: rgba(218, 165, 32, 0.5) !important; */
        color: unset;
        text-decoration: unset;
    }
</style>
